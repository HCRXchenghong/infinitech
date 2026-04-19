function createTrustedApiError(statusCode, message) {
  const error = new Error(String(message || "trusted socket api error"));
  error.statusCode = Number(statusCode || 500);
  return error;
}

export function normalizeSocketRuntimeEnv(raw) {
  return String(raw || "").trim().toLowerCase();
}

export function isProductionLikeSocketEnv(raw) {
  return ["production", "prod", "staging"].includes(normalizeSocketRuntimeEnv(raw));
}

export function resolveTrustedSocketApiSecret(env = process.env) {
  const primary = String(env?.SOCKET_SERVER_API_SECRET || "").trim();
  if (primary) {
    return {
      secret: primary,
      source: "SOCKET_SERVER_API_SECRET",
    };
  }

  const legacy = String(env?.TOKEN_API_SECRET || "").trim();
  if (legacy) {
    return {
      secret: legacy,
      source: "TOKEN_API_SECRET",
    };
  }

  return {
    secret: "",
    source: "",
  };
}

export function validateTrustedSocketApiConfig(env = process.env) {
  const normalizedEnv =
    normalizeSocketRuntimeEnv(env?.ENV || env?.NODE_ENV || "development") || "development";
  const productionLike = isProductionLikeSocketEnv(normalizedEnv);
  const { secret, source } = resolveTrustedSocketApiSecret(env);

  if (productionLike && !secret) {
    throw createTrustedApiError(
      500,
      "SOCKET_SERVER_API_SECRET is required for socket-server in production-like environments",
    );
  }

  return {
    env: normalizedEnv,
    productionLike,
    trustedSocketApiSecret: secret,
    trustedSocketApiSecretSource: source,
  };
}

export function isTrustedSocketApiRequest(req, secret) {
  const normalizedSecret = String(secret || "").trim();
  if (!normalizedSecret) return false;

  const headers = req?.headers || {};
  const candidateValues = [
    headers["x-socket-server-secret"],
    headers["x-token-api-secret"],
    headers["x-api-secret"],
    headers.authorization,
  ];

  return candidateValues.some((value) => {
    const normalized = String(value || "").trim();
    return normalized === normalizedSecret || normalized === `Bearer ${normalizedSecret}`;
  });
}

const TRUSTED_SOCKET_TOKEN_ROLES = new Set(["site_visitor"]);

export function validateTrustedSocketTokenRequest(body) {
  const userId = String(body?.userId || "").trim();
  const role = String(body?.role || "").trim().toLowerCase();

  if (!userId || !role) {
    throw createTrustedApiError(
      400,
      "userId and role are required for trusted socket token issuance",
    );
  }

  if (!TRUSTED_SOCKET_TOKEN_ROLES.has(role)) {
    throw createTrustedApiError(
      403,
      `trusted socket token role is not allowed: ${role}`,
    );
  }

  return {
    userId,
    role,
  };
}

export function validateTrustedSocketStatsRequest(req, secret) {
  if (!isTrustedSocketApiRequest(req, secret)) {
    throw createTrustedApiError(
      403,
      "Socket server stats endpoint requires trusted service credentials",
    );
  }

  return {
    verifiedBy: "socket-service-secret",
  };
}
