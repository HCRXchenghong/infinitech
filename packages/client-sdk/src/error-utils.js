import { pickFirstDefined, readValue } from "./safe-access.js";

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

export function normalizeErrorMessage(error, fallback = "操作失败，请稍后重试") {
  const message = pickFirstDefined(
    readValue(error, ["data", "error"], ""),
    readValue(error, ["data", "message"], ""),
    readValue(error, ["error"], ""),
    readValue(error, ["message"], ""),
    readValue(error, ["errMsg"], ""),
  );

  if (normalizeText(message)) {
    return normalizeText(message);
  }

  const candidates = [
    readValue(error, ["data", "error"], ""),
    readValue(error, ["data", "message"], ""),
    readValue(error, ["error"], ""),
    readValue(error, ["message"], ""),
    readValue(error, ["errMsg"], ""),
  ];

  for (let index = 0; index < candidates.length; index += 1) {
    const text = normalizeText(candidates[index]);
    if (text) {
      return text;
    }
  }

  return fallback;
}

export function isHtmlDocumentPayload(payload) {
  return typeof payload === "string" && payload.includes("<!DOCTYPE html>");
}
