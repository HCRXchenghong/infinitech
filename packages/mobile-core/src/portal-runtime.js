function trimValue(value) {
  return String(value || "").trim();
}

function normalizeFieldMap(fieldMap = {}) {
  const normalizedMap = {};
  Object.entries(fieldMap || {}).forEach(([key, aliases]) => {
    const aliasList = (Array.isArray(aliases) ? aliases : [aliases])
      .map((item) => trimValue(item))
      .filter(Boolean);
    if (aliasList.length) {
      normalizedMap[key] = aliasList;
    }
  });
  return normalizedMap;
}

export function normalizePortalRuntimeSettings(payload = {}, options = {}) {
  const defaultSettings = options.defaultSettings && typeof options.defaultSettings === "object"
    ? { ...options.defaultSettings }
    : {};
  const fieldMap = normalizeFieldMap(options.fieldMap || {});
  const keys = Array.from(new Set([
    ...Object.keys(defaultSettings),
    ...Object.keys(fieldMap),
  ]));

  return keys.reduce((result, key) => {
    const aliases = fieldMap[key] || [key];
    const resolvedValue = aliases
      .map((field) => trimValue(payload?.[field]))
      .find(Boolean);
    result[key] = resolvedValue || trimValue(defaultSettings[key]);
    return result;
  }, {});
}

export function createPortalRuntimeStore(options = {}) {
  const defaultSettings = normalizePortalRuntimeSettings({}, {
    defaultSettings: options.defaultSettings || {},
    fieldMap: options.fieldMap || {},
  });
  let cachedSettings = { ...defaultSettings };
  let hasLoaded = false;
  let loadingPromise = null;

  function getCachedPortalRuntimeSettings() {
    return { ...cachedSettings };
  }

  function resetPortalRuntimeSettings() {
    cachedSettings = { ...defaultSettings };
    hasLoaded = false;
    loadingPromise = null;
  }

  async function loadPortalRuntimeSettings(force = false) {
    if (hasLoaded && !force) {
      return getCachedPortalRuntimeSettings();
    }
    if (loadingPromise && !force) {
      return loadingPromise;
    }

    loadingPromise = Promise.resolve()
      .then(() => {
        if (typeof options.fetchRuntimeSettings === "function") {
          return options.fetchRuntimeSettings();
        }
        return {};
      })
      .then((payload) => {
        cachedSettings = normalizePortalRuntimeSettings(payload || {}, {
          defaultSettings,
          fieldMap: options.fieldMap || {},
        });
        hasLoaded = true;
        return getCachedPortalRuntimeSettings();
      })
      .catch(() => getCachedPortalRuntimeSettings())
      .finally(() => {
        loadingPromise = null;
      });

    return loadingPromise;
  }

  return {
    defaultSettings,
    getCachedPortalRuntimeSettings,
    loadPortalRuntimeSettings,
    resetPortalRuntimeSettings,
  };
}
