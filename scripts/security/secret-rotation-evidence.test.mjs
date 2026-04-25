import test from "node:test";
import assert from "node:assert/strict";

import {
  createSecretRotationTemplate,
  REQUIRED_ROTATION_ENVIRONMENTS,
  REQUIRED_ROTATION_VALIDATIONS,
  validateSecretRotationEvidence,
} from "./secret-rotation-evidence.mjs";

test("createSecretRotationTemplate scaffolds every required environment and sensitive key", () => {
  const template = createSecretRotationTemplate({
    environments: ["dev", "prod"],
    requiredSecrets: [
      {
        key: "JWT_SECRET",
        label: "JWT Secret",
        group: "Auth",
        affectedServices: ["go-api", "bff"],
      },
    ],
    requiredValidations: [
      {
        checkId: "runtime-doctor",
        description: "Run runtime doctor",
      },
    ],
    generatedAt: "2026-04-25T00:00:00.000Z",
  });

  assert.equal(template.version, 1);
  assert.equal(template.generatedAt, "2026-04-25T00:00:00.000Z");
  assert.deepEqual(
    template.environments.map((environment) => environment.name),
    ["dev", "prod"],
  );
  assert.equal(template.environments[0].secrets[0].key, "JWT_SECRET");
  assert.equal(template.environments[0].validations[0].checkId, "runtime-doctor");
});

test("validateSecretRotationEvidence rejects missing environments and incomplete evidence", () => {
  const report = {
    version: 1,
    generatedAt: "2026-04-25T00:00:00.000Z",
    environments: [
      {
        name: "dev",
        status: "pending",
        changeTicket: "",
        rotatedAt: "",
        approvedBy: "",
        evidence: [],
        secrets: [],
        validations: [],
      },
    ],
  };

  const failures = validateSecretRotationEvidence(report, {
    requiredSecrets: [{ key: "JWT_SECRET", label: "JWT Secret", group: "Auth" }],
    requiredValidations: [{ checkId: "runtime-doctor", description: "Run runtime doctor" }],
  });

  assert.ok(failures.some((failure) => /environment dev status/.test(failure)));
  assert.ok(failures.some((failure) => /missing rotation environment prod/.test(failure)));
  assert.ok(failures.some((failure) => /missing rotated secret JWT_SECRET/.test(failure)));
});

test("validateSecretRotationEvidence accepts a fully completed report", () => {
  const requiredSecrets = [
    { key: "JWT_SECRET", label: "JWT Secret", group: "Auth", affectedServices: ["go-api"] },
    { key: "SOCKET_SERVER_API_SECRET", label: "Socket Secret", group: "Auth", affectedServices: ["socket-server"] },
  ];
  const requiredValidations = REQUIRED_ROTATION_VALIDATIONS.map((item) => ({ ...item }));

  const report = {
    version: 1,
    generatedAt: "2026-04-25T00:00:00.000Z",
    environments: REQUIRED_ROTATION_ENVIRONMENTS.map((name) => ({
      name,
      status: "passed",
      changeTicket: `CHG-${name}`,
      rotatedAt: "2026-04-25T08:00:00.000Z",
      approvedBy: "platform-owner",
      evidence: [{ type: "report", path: `artifacts/security/${name}/rotation.md`, note: "rotation report" }],
      secrets: requiredSecrets.map((secret) => ({
        key: secret.key,
        label: secret.label,
        group: secret.group,
        affectedServices: secret.affectedServices,
        status: "rotated",
        rotatedAt: "2026-04-25T08:05:00.000Z",
        rotatedBy: "ops-user",
        valueReference: `vault://${name}/${secret.key}`,
        previousVersionRevoked: true,
        evidence: [{ type: "audit-log", path: `artifacts/security/${name}/${secret.key}.json`, note: "audit log" }],
      })),
      validations: requiredValidations.map((validation) => ({
        checkId: validation.checkId,
        description: validation.description,
        status: "passed",
        executedAt: "2026-04-25T08:10:00.000Z",
        owner: "qa-owner",
        evidence: [{ type: "report", path: `artifacts/security/${name}/${validation.checkId}.json`, note: "validation report" }],
      })),
    })),
  };

  const failures = validateSecretRotationEvidence(report, {
    requiredSecrets,
    requiredValidations,
  });

  assert.deepEqual(failures, []);
});
