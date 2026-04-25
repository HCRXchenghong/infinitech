import path from "node:path";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { buildConfigSchema } from "../lib/management/config-schema.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const REPO_ROOT = path.resolve(__dirname, "../..");
export const DEFAULT_SECRET_ROTATION_EVIDENCE_FILE = "artifacts/security/secret-rotation.json";
export const REQUIRED_ROTATION_ENVIRONMENTS = Object.freeze(["dev", "test", "staging", "prod"]);
export const REQUIRED_ROTATION_VALIDATIONS = Object.freeze([
  Object.freeze({
    checkId: "runtime-doctor",
    description: "Run the runtime security doctor and archive the environment baseline output.",
  }),
  Object.freeze({
    checkId: "auth-smoke",
    description: "Verify login, token refresh, and role-scoped auth flows after rotation.",
  }),
  Object.freeze({
    checkId: "upload-smoke",
    description: "Verify private upload and protected asset preview paths still work after rotation.",
  }),
  Object.freeze({
    checkId: "payment-sms-smoke",
    description: "Verify payment callback, withdraw callback, SMS, and password reset paths after rotation.",
  }),
  Object.freeze({
    checkId: "desktop-secret-audit",
    description: "Verify Win and macOS admin shells no longer store stale local secrets or fallback keys.",
  }),
]);

function normalizeString(value = "") {
  return String(value || "").trim();
}

function uniqueNormalizedValues(values = []) {
  return Array.from(
    new Set(
      values
        .map((value) => normalizeString(value))
        .filter(Boolean),
    ),
  );
}

function createEvidencePlaceholder(type, note) {
  return {
    type,
    path: "",
    url: "",
    note,
  };
}

function normalizeEvidenceItems(value) {
  return Array.isArray(value) ? value : [];
}

function hasEvidenceItem(item) {
  if (!item || typeof item !== "object") {
    return false;
  }
  return Boolean(
    normalizeString(item.path) ||
    normalizeString(item.url),
  );
}

export function listRequiredSecretMetadata(options = {}) {
  if (Array.isArray(options.requiredSecrets) && options.requiredSecrets.length > 0) {
    return options.requiredSecrets.map((item) => ({
      key: normalizeString(item.key),
      label: normalizeString(item.label) || normalizeString(item.key),
      group: normalizeString(item.group) || "Uncategorized",
      affectedServices: uniqueNormalizedValues(item.affectedServices || []),
    }));
  }

  return buildConfigSchema(options.repoRoot || REPO_ROOT)
    .filter((meta) => meta && meta.sensitive)
    .map((meta) => ({
      key: normalizeString(meta.key),
      label: normalizeString(meta.label) || normalizeString(meta.key),
      group: normalizeString(meta.group) || "Uncategorized",
      affectedServices: uniqueNormalizedValues(meta.affectedServices || []),
    }))
    .sort((left, right) => left.key.localeCompare(right.key));
}

function listRequiredValidations(options = {}) {
  if (Array.isArray(options.requiredValidations) && options.requiredValidations.length > 0) {
    return options.requiredValidations.map((item) => ({
      checkId: normalizeString(item.checkId),
      description: normalizeString(item.description),
    }));
  }
  return REQUIRED_ROTATION_VALIDATIONS.map((item) => ({ ...item }));
}

function buildSecretEntry(secret) {
  return {
    key: secret.key,
    label: secret.label,
    group: secret.group,
    affectedServices: [...secret.affectedServices],
    status: "pending",
    rotatedAt: "",
    rotatedBy: "",
    valueReference: "",
    previousVersionRevoked: false,
    notes: "",
    evidence: [
      createEvidencePlaceholder(
        "audit-log",
        "Vault/KMS/provider audit log or environment change receipt for this secret.",
      ),
    ],
  };
}

function buildValidationEntry(validation) {
  return {
    checkId: validation.checkId,
    description: validation.description,
    status: "pending",
    executedAt: "",
    owner: "",
    notes: "",
    evidence: [
      createEvidencePlaceholder(
        "report",
        "Attach the command output, screenshot, or report proving this validation passed.",
      ),
    ],
  };
}

export function createSecretRotationTemplate(options = {}) {
  const generatedAt = normalizeString(options.generatedAt) || new Date().toISOString();
  const environments = uniqueNormalizedValues(
    Array.isArray(options.environments) && options.environments.length > 0
      ? options.environments
      : REQUIRED_ROTATION_ENVIRONMENTS,
  );
  const secrets = listRequiredSecretMetadata(options);
  const validations = listRequiredValidations(options);

  return {
    version: 1,
    generatedAt,
    environments: environments.map((name) => ({
      name,
      status: "pending",
      changeTicket: "",
      rotatedAt: "",
      approvedBy: "",
      notes: "",
      evidence: [
        createEvidencePlaceholder(
          "report",
          "Attach the environment rotation checklist, rollout log, or change request receipt.",
        ),
      ],
      secrets: secrets.map((secret) => buildSecretEntry(secret)),
      validations: validations.map((validation) => buildValidationEntry(validation)),
    })),
  };
}

function validateEnvironmentEvidence(report, failures, options = {}) {
  const requiredSecretKeys = new Set(
    listRequiredSecretMetadata(options).map((item) => item.key),
  );
  const requiredValidationIds = new Set(
    listRequiredValidations(options).map((item) => item.checkId),
  );
  const seenEnvironmentNames = new Set();

  for (const environment of Array.isArray(report.environments) ? report.environments : []) {
    const environmentName = normalizeString(environment && environment.name);
    if (!environmentName) {
      failures.push("environment entry is missing name");
      continue;
    }
    if (seenEnvironmentNames.has(environmentName)) {
      failures.push(`duplicate rotation environment: ${environmentName}`);
      continue;
    }
    seenEnvironmentNames.add(environmentName);

    if (!REQUIRED_ROTATION_ENVIRONMENTS.includes(environmentName)) {
      continue;
    }

    const status = normalizeString(environment.status).toLowerCase();
    if (status !== "passed") {
      failures.push(`environment ${environmentName} status is ${status || "missing"}`);
    }
    if (!normalizeString(environment.changeTicket)) {
      failures.push(`environment ${environmentName} is missing changeTicket`);
    }
    if (!normalizeString(environment.rotatedAt)) {
      failures.push(`environment ${environmentName} is missing rotatedAt`);
    }
    if (!normalizeString(environment.approvedBy)) {
      failures.push(`environment ${environmentName} is missing approvedBy`);
    }
    if (!normalizeEvidenceItems(environment.evidence).some(hasEvidenceItem)) {
      failures.push(`environment ${environmentName} is missing rotation evidence`);
    }

    const secrets = Array.isArray(environment.secrets) ? environment.secrets : [];
    const seenSecretKeys = new Set();
    const secretMap = new Map();
    for (const secret of secrets) {
      const key = normalizeString(secret && secret.key);
      if (!key) {
        failures.push(`environment ${environmentName} has a secret entry without key`);
        continue;
      }
      if (seenSecretKeys.has(key)) {
        failures.push(`environment ${environmentName} has duplicate secret key ${key}`);
        continue;
      }
      seenSecretKeys.add(key);
      secretMap.set(key, secret);
    }

    for (const requiredKey of requiredSecretKeys) {
      const secret = secretMap.get(requiredKey);
      if (!secret) {
        failures.push(`environment ${environmentName} is missing rotated secret ${requiredKey}`);
        continue;
      }
      const secretStatus = normalizeString(secret.status).toLowerCase();
      if (secretStatus !== "rotated" && secretStatus !== "passed") {
        failures.push(`environment ${environmentName} secret ${requiredKey} status is ${secretStatus || "missing"}`);
      }
      if (!normalizeString(secret.rotatedAt)) {
        failures.push(`environment ${environmentName} secret ${requiredKey} is missing rotatedAt`);
      }
      if (!normalizeString(secret.rotatedBy)) {
        failures.push(`environment ${environmentName} secret ${requiredKey} is missing rotatedBy`);
      }
      if (!normalizeString(secret.valueReference)) {
        failures.push(`environment ${environmentName} secret ${requiredKey} is missing valueReference`);
      }
      if (secret.previousVersionRevoked !== true) {
        failures.push(`environment ${environmentName} secret ${requiredKey} did not confirm previousVersionRevoked=true`);
      }
      if (!normalizeEvidenceItems(secret.evidence).some(hasEvidenceItem)) {
        failures.push(`environment ${environmentName} secret ${requiredKey} is missing evidence`);
      }
    }

    const validations = Array.isArray(environment.validations) ? environment.validations : [];
    const seenValidationIds = new Set();
    const validationMap = new Map();
    for (const validation of validations) {
      const checkId = normalizeString(validation && validation.checkId);
      if (!checkId) {
        failures.push(`environment ${environmentName} has a validation entry without checkId`);
        continue;
      }
      if (seenValidationIds.has(checkId)) {
        failures.push(`environment ${environmentName} has duplicate validation ${checkId}`);
        continue;
      }
      seenValidationIds.add(checkId);
      validationMap.set(checkId, validation);
    }

    for (const requiredCheckId of requiredValidationIds) {
      const validation = validationMap.get(requiredCheckId);
      if (!validation) {
        failures.push(`environment ${environmentName} is missing validation ${requiredCheckId}`);
        continue;
      }
      const validationStatus = normalizeString(validation.status).toLowerCase();
      if (validationStatus !== "passed") {
        failures.push(`environment ${environmentName} validation ${requiredCheckId} status is ${validationStatus || "missing"}`);
      }
      if (!normalizeString(validation.executedAt)) {
        failures.push(`environment ${environmentName} validation ${requiredCheckId} is missing executedAt`);
      }
      if (!normalizeString(validation.owner)) {
        failures.push(`environment ${environmentName} validation ${requiredCheckId} is missing owner`);
      }
      if (!normalizeEvidenceItems(validation.evidence).some(hasEvidenceItem)) {
        failures.push(`environment ${environmentName} validation ${requiredCheckId} is missing evidence`);
      }
    }
  }

  for (const requiredEnvironment of REQUIRED_ROTATION_ENVIRONMENTS) {
    if (!seenEnvironmentNames.has(requiredEnvironment)) {
      failures.push(`missing rotation environment ${requiredEnvironment}`);
    }
  }
}

export function validateSecretRotationEvidence(report = {}, options = {}) {
  const failures = [];
  if (!report || typeof report !== "object") {
    return ["secret rotation evidence must be a JSON object"];
  }

  if (!Number.isInteger(report.version) || report.version < 1) {
    failures.push("secret rotation evidence must contain a positive integer version");
  }
  if (!normalizeString(report.generatedAt)) {
    failures.push("secret rotation evidence is missing generatedAt");
  }
  if (!Array.isArray(report.environments) || report.environments.length === 0) {
    failures.push("secret rotation evidence must contain environments");
    return failures;
  }

  validateEnvironmentEvidence(report, failures, options);
  return failures;
}

export async function writeJsonReport(filePath, payload) {
  const target = normalizeString(filePath);
  if (!target) {
    return;
  }
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

export async function readJsonReport(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}
