export function readAppVersion(options = {}) {
  const uniApp = options.uniApp || globalThis.uni;
  const plusRuntime = options.plusRuntime || globalThis.plus;

  try {
    if (uniApp && typeof uniApp.getAppBaseInfo === "function") {
      const info = uniApp.getAppBaseInfo();
      const version = String(info?.appVersion || info?.version || "").trim();
      if (version) return version;
    }
  } catch (error) {}

  try {
    if (plusRuntime?.runtime?.version) {
      const version = String(plusRuntime.runtime.version || "").trim();
      if (version) return version;
    }
  } catch (error) {}

  try {
    if (uniApp && typeof uniApp.getSystemInfoSync === "function") {
      const info = uniApp.getSystemInfoSync();
      const version = String(info?.appVersion || info?.version || "").trim();
      if (version) return version;
    }
  } catch (error) {}

  return "";
}

export function getAppVersionLabel(options = {}) {
  const version = readAppVersion(options);
  return version ? `v${version}` : "未识别";
}
