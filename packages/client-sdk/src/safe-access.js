export function hasOwn(source, key) {
  if (!source || (typeof source !== "object" && typeof source !== "function")) {
    return false;
  }
  return Object.prototype.hasOwnProperty.call(source, key);
}

export function pickFirstDefined(...values) {
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (value !== undefined && value !== null) {
      return value;
    }
  }
  return undefined;
}

export function readValue(source, path, fallback) {
  const steps = Array.isArray(path) ? path : [path];
  let current = source;

  for (let index = 0; index < steps.length; index += 1) {
    const step = steps[index];
    if (!current || (typeof current !== "object" && typeof current !== "function")) {
      return fallback;
    }
    if (!hasOwn(current, step)) {
      return fallback;
    }
    current = current[step];
  }

  if (current === undefined || current === null) {
    return fallback;
  }
  return current;
}

export function readStringValue(source, path, fallback = "") {
  const text = String(readValue(source, path, "") || "").trim();
  return text || fallback;
}

export function resolveEventValue(event, fallback) {
  const detail = readValue(event, ["detail"], null);
  if (detail && hasOwn(detail, "value")) {
    return detail.value;
  }
  return fallback;
}
