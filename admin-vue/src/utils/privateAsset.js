import request from "./request";

export async function loadAuthorizedBlobUrl(url) {
  const target = String(url || "").trim();
  if (!target) {
    return "";
  }

  const { data } = await request.get(target, {
    responseType: "blob",
  });

  if (!(data instanceof Blob)) {
    throw new Error("私有资源响应格式无效");
  }

  return URL.createObjectURL(data);
}

export function revokeBlobUrl(url) {
  const value = String(url || "").trim();
  if (!value.startsWith("blob:")) {
    return;
  }
  URL.revokeObjectURL(value);
}
