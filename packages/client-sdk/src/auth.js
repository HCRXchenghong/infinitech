export function normalizeBearerToken(rawToken) {
  const token = String(rawToken || "").trim();
  if (!token) {
    return "";
  }
  return /^bearer\s+/i.test(token) ? token : `Bearer ${token}`;
}

export function buildAuthorizationHeaders(
  rawToken,
  headerName = "Authorization",
) {
  const token = normalizeBearerToken(rawToken);
  if (!token) {
    return {};
  }
  return {
    [headerName]: token,
  };
}
