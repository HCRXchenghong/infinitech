import { buildAuthorizationHeaders } from "../../client-sdk/src/auth.js";

export function buildAdminUploadHeaders(token) {
  return buildAuthorizationHeaders(token);
}
