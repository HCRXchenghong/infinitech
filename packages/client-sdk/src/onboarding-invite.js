import { extractEnvelopeData, extractUploadAsset } from "../../contracts/src/http.js";

function trimText(value) {
  return String(value == null ? "" : value).trim();
}

function normalizePositiveNumber(value, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

function normalizeNonNegativeNumber(value, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallback;
  }
  return parsed;
}

function resolveTransportPayload(source) {
  if (
    source &&
    typeof source === "object" &&
    "data" in source &&
    "status" in source &&
    "headers" in source
  ) {
    return source.data;
  }
  return source;
}

function buildInviteTokenPath(token) {
  return encodeURIComponent(trimText(token));
}

export function createDefaultInviteLinkForm(overrides = {}) {
  return {
    expires_hours: 72,
    max_uses: 1,
    ...overrides,
  };
}

export function createEmptyInviteLinkResult(overrides = {}) {
  return {
    invite_url: "",
    expires_at: "",
    max_uses: 1,
    used_count: 0,
    remaining_uses: 1,
    ...overrides,
  };
}

export function normalizeInviteLinkResult(payload, fallback = {}) {
  const source = extractEnvelopeData(resolveTransportPayload(payload)) || {};
  const fallbackMaxUses = normalizePositiveNumber(
    fallback.max_uses ?? fallback.maxUses,
    1,
  );
  const maxUses = normalizePositiveNumber(
    source.max_uses ?? source.maxUses,
    fallbackMaxUses,
  );
  const usedCount = normalizeNonNegativeNumber(
    source.used_count ?? source.usedCount,
    0,
  );
  const remainingUses = normalizeNonNegativeNumber(
    source.remaining_uses ?? source.remainingUses,
    Math.max(0, maxUses - usedCount),
  );

  return createEmptyInviteLinkResult({
    invite_url: trimText(source.invite_url ?? source.inviteUrl),
    expires_at: trimText(source.expires_at ?? source.expiresAt),
    max_uses: maxUses,
    used_count: usedCount,
    remaining_uses: remainingUses,
  });
}

export function extractInviteDetail(payload) {
  const source = resolveTransportPayload(payload);
  const envelopeData = extractEnvelopeData(source);
  const invite = envelopeData?.invite ?? source?.invite;
  if (!invite || typeof invite !== "object") {
    return null;
  }
  return invite;
}

export function extractInviteSubmissionResult(payload) {
  const source = extractEnvelopeData(resolveTransportPayload(payload)) || {};
  return {
    submission_id: trimText(source.submission_id ?? source.submissionId),
    invite_type: trimText(source.invite_type ?? source.inviteType),
    entity_type: trimText(source.entity_type ?? source.entityType),
    entity_id: String(source.entity_id ?? source.entityId ?? "").trim(),
  };
}

export function getInviteRemainingUses(invite = {}) {
  const normalized = normalizeInviteLinkResult(invite, invite);
  return normalized.remaining_uses;
}

export function createOnboardingInviteApi({ get, post }) {
  return {
    async createAdminInvite(payload = {}, config) {
      const response = await post("/api/admin/onboarding/invites", payload, config);
      return normalizeInviteLinkResult(response, payload);
    },

    async fetchInvite(token, config) {
      const response = await get(
        `/api/onboarding/invites/${buildInviteTokenPath(token)}`,
        config,
      );
      return extractInviteDetail(response);
    },

    async submitInvite(token, payload = {}, config) {
      const response = await post(
        `/api/onboarding/invites/${buildInviteTokenPath(token)}/submit`,
        payload,
        config,
      );
      return extractInviteSubmissionResult(response);
    },

    async uploadInviteAsset(token, payload, config) {
      const response = await post(
        `/api/onboarding/invites/${buildInviteTokenPath(token)}/upload`,
        payload,
        config,
      );
      return extractUploadAsset(resolveTransportPayload(response));
    },
  };
}
