import { extractEnvelopeData } from "../../contracts/src/http.js";

function trimValue(value) {
  return String(value || "").trim();
}

export function buildSocketTokenAccountKey(userId, role) {
  const normalizedUserId = trimValue(userId);
  const normalizedRole = trimValue(role).toLowerCase();
  if (!normalizedUserId || !normalizedRole) {
    return "";
  }
  return `${normalizedRole}:${normalizedUserId}`;
}

export function extractSocketTokenResult(payload = {}) {
  const source = payload && typeof payload === "object" ? payload : {};
  const data = extractEnvelopeData(source);
  const normalizedData = data && typeof data === "object" ? data : {};

  return {
    token: trimValue(
      normalizedData.token ||
        normalizedData.socketToken ||
        source.token ||
        source.socketToken,
    ),
    userId: trimValue(
      normalizedData.userId ||
        normalizedData.user_id ||
        source.userId ||
        source.user_id,
    ),
    role: trimValue(normalizedData.role || source.role).toLowerCase(),
  };
}
