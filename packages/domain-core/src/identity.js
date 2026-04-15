import { normalizePrincipalType } from "../../contracts/src/identity.js";

export function createSessionDescriptor(claims = {}) {
  const principalType = normalizePrincipalType(
    claims.principal_type || claims.principalType || claims.type,
  );
  return {
    subject: String(claims.sub || "").trim(),
    principalType,
    principalId: String(claims.principal_id || claims.principalId || "").trim(),
    role: String(claims.role || "").trim(),
    sessionId: String(claims.session_id || claims.sessionId || "").trim(),
    scope: Array.isArray(claims.scope)
      ? claims.scope.map((item) => String(item || "").trim()).filter(Boolean)
      : String(claims.scope || "")
          .split(/[,\s]+/)
          .map((item) => item.trim())
          .filter(Boolean),
  };
}

export function hasEnterpriseSessionShape(claims = {}) {
  const descriptor = createSessionDescriptor(claims);
  return Boolean(
    descriptor.subject && descriptor.principalType && descriptor.principalId,
  );
}
