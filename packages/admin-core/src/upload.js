import { buildAuthorizationHeaders } from "../../client-sdk/src/auth.js";
import { normalizeUploadDomain } from "../../contracts/src/upload.js";

export function buildAdminUploadHeaders(token) {
  return buildAuthorizationHeaders(token);
}

export function buildAdminUploadData(uploadDomain) {
  return {
    upload_domain: normalizeUploadDomain(uploadDomain),
  };
}

export function appendAdminUploadDomain(formData, uploadDomain) {
  if (!formData || typeof formData.append !== "function") {
    return formData;
  }
  formData.append("upload_domain", normalizeUploadDomain(uploadDomain));
  return formData;
}
