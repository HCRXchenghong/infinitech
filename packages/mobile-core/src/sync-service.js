const DEFAULT_DATASETS = ["shops", "products", "orders"];

function normalizeLogger(logger) {
  const fallbackLogger = {
    warn: (...args) => console.warn(...args),
    error: (...args) => console.error(...args),
  };

  if (logger && typeof logger === "object") {
    return {
      warn:
        typeof logger.warn === "function"
          ? (...args) => logger.warn(...args)
          : fallbackLogger.warn,
      error:
        typeof logger.error === "function"
          ? (...args) => logger.error(...args)
          : fallbackLogger.error,
    };
  }

  return fallbackLogger;
}

function normalizeObject(value) {
  return value && typeof value === "object" ? value : {};
}

function toSyncError(error, fallbackMessage = "Sync request failed") {
  if (error instanceof Error) {
    const nextMessage =
      String(error.message || fallbackMessage).trim() || fallbackMessage;
    error.message = nextMessage;
    return error;
  }

  const safeError = normalizeObject(error);
  const message =
    String(
      safeError.message ||
        safeError.error ||
        safeError.errMsg ||
        fallbackMessage,
    ).trim() || fallbackMessage;
  const nextError = new Error(message);
  if (safeError.error !== undefined) {
    nextError.error = safeError.error;
  }
  if (safeError.statusCode !== undefined) {
    nextError.statusCode = safeError.statusCode;
  }
  if (safeError.errMsg !== undefined) {
    nextError.errMsg = safeError.errMsg;
  }
  return nextError;
}

function resolveRequestErrorMessage(payload, statusCode) {
  const source = normalizeObject(payload);
  return String(
    source.error || source.message || `Request failed: ${statusCode}`,
  ).trim();
}

export function createUniSyncRequest(options = {}) {
  const baseUrl = String(options.baseUrl || "").trim();
  const timeout = Number(options.timeout || 8000);
  const defaultHeader = {
    "Content-Type": "application/json",
    ...normalizeObject(options.defaultHeader),
  };
  const uniApp = options.uniApp || globalThis.uni;

  return function request(requestOptions = {}) {
    return new Promise((resolve, reject) => {
      uniApp.request({
        url: `${baseUrl}${String(requestOptions.url || "")}`,
        method: requestOptions.method || "GET",
        data: requestOptions.data || {},
        header: {
          ...defaultHeader,
          ...normalizeObject(requestOptions.header),
        },
        timeout,
        success(res) {
          const statusCode = Number(res?.statusCode || 0);
          if (statusCode >= 200 && statusCode < 300) {
            resolve(res.data);
            return;
          }

          const requestErrorMessage = resolveRequestErrorMessage(
            res?.data,
            statusCode,
          );
          reject(
            toSyncError({
              error: requestErrorMessage,
              message: requestErrorMessage,
              statusCode,
            }),
          );
        },
        fail(err) {
          const message = String(
            err?.errMsg || "Network request failed",
          ).trim();
          reject(
            toSyncError({
              error: message,
              message,
              errMsg: message,
            }),
          );
        },
      });
    });
  };
}

export function isSyncNetworkError(error) {
  const safeError = normalizeObject(error);
  const errorText = String(safeError.error || "")
    .trim()
    .toLowerCase();
  const messageText = String(safeError.message || "")
    .trim()
    .toLowerCase();
  const errMsgText = String(safeError.errMsg || "")
    .trim()
    .toLowerCase();
  const combinedText = `${errorText} ${messageText} ${errMsgText}`;

  return (
    combinedText.includes("network request failed") ||
    combinedText.includes("request:fail") ||
    combinedText.includes("connect") ||
    combinedText.includes("connection") ||
    combinedText.includes("timeout") ||
    combinedText.includes("offline")
  );
}

export function buildSyncApiUrl(dataset, conditions = {}, options = {}) {
  const safeConditions = normalizeObject(conditions);
  const productShopMode = String(options.productShopMode || "products-query")
    .trim()
    .toLowerCase();
  const supportsShopCategory = options.supportsShopCategory === true;
  const encodedCategory = safeConditions.category
    ? encodeURIComponent(String(safeConditions.category))
    : "";

  const shopPath = safeConditions.id
    ? `/api/shops/${safeConditions.id}`
    : supportsShopCategory && encodedCategory
      ? `/api/shops?category=${encodedCategory}`
      : "/api/shops";

  const productPath = safeConditions.featured
    ? "/api/products/featured"
    : safeConditions.shop_id
      ? productShopMode === "shop-menu"
        ? `/api/shops/${safeConditions.shop_id}/menu`
        : `/api/products?shopId=${safeConditions.shop_id}`
      : safeConditions.id
        ? `/api/products/${safeConditions.id}`
        : "/api/products";

  const orderPath = safeConditions.id
    ? `/api/orders/${safeConditions.id}`
    : safeConditions.user_id
      ? `/api/orders/user/${safeConditions.user_id}`
      : "/api/orders";

  const mapping = {
    shops: shopPath,
    products: productPath,
    orders: orderPath,
  };

  return mapping[dataset] || `/api/${dataset}`;
}

export function normalizeSyncRecords(serverData, options = {}) {
  if (!serverData) return [];
  if (Array.isArray(serverData)) return serverData;
  if (typeof serverData !== "object") return [];
  if (Object.prototype.hasOwnProperty.call(serverData, "error")) return [];

  const sources = [serverData, serverData.data].filter(
    (value) => value && typeof value === "object",
  );

  for (const source of sources) {
    if (Array.isArray(source.products)) return source.products;
    if (Array.isArray(source.shops)) return source.shops;
    if (Array.isArray(source.items)) return source.items;
    if (Array.isArray(source.list)) return source.list;
    if (Array.isArray(source.data)) return source.data;
    if (source.id !== undefined && source.id !== null) return [source];
  }

  if (options.isDev && typeof options.warn === "function") {
    options.warn("Skip unsupported sync payload shape", {
      keys: Object.keys(serverData),
    });
  }

  return [];
}

export function createMobileSyncServiceGetter(options = {}) {
  const uniApp = options.uniApp || globalThis.uni;
  const request =
    typeof options.request === "function"
      ? options.request
      : createUniSyncRequest({
          baseUrl: options.baseUrl,
          timeout: options.timeout,
          defaultHeader: options.defaultHeader,
          uniApp,
        });
  const buildApiUrl = (dataset, conditions = {}) =>
    buildSyncApiUrl(dataset, conditions, {
      productShopMode: options.productShopMode,
      supportsShopCategory: options.supportsShopCategory === true,
    });
  const syncEventName =
    String(options.syncEventName || "data-synced").trim() || "data-synced";
  const emitDataSynced =
    typeof options.emitDataSynced === "function"
      ? options.emitDataSynced
      : (payload) => {
          if (uniApp && typeof uniApp.$emit === "function") {
            uniApp.$emit(syncEventName, payload);
          }
        };

  let instance = null;

  return function getSyncService() {
    if (!instance) {
      instance = createSyncService({
        getLocalDB: options.getLocalDB,
        request,
        buildApiUrl,
        isDev: options.isDev === true,
        emitDataSynced,
        logger: options.logger,
        datasets: options.datasets,
      });
    }
    return instance;
  };
}

export function createSyncService(options = {}) {
  const logger = normalizeLogger(options.logger);
  const request = options.request;
  const getLocalDB = options.getLocalDB;
  const emitDataSynced = options.emitDataSynced;
  const buildApiUrl = options.buildApiUrl || buildSyncApiUrl;
  const isDev = options.isDev === true;
  const datasets =
    Array.isArray(options.datasets) && options.datasets.length > 0
      ? options.datasets
      : DEFAULT_DATASETS;
  const localDB = getLocalDB();

  let syncing = false;

  function normalizeRecords(serverData) {
    return normalizeSyncRecords(serverData, {
      isDev,
      warn: (...args) => logger.warn(...args),
    });
  }

  return {
    async init() {
      try {
        await localDB.init();
        void this.syncInBackground();
      } catch (error) {
        logger.error("Sync initialization failed:", error);
      }
    },

    async syncInBackground() {
      if (syncing) return;

      syncing = true;
      try {
        const localState = await localDB.getLocalSyncState();
        const serverState = await request({
          url: "/api/sync/state",
          method: "GET",
        });

        for (const dataset of datasets) {
          const localVersion = Number(localState?.[dataset] || 0);
          const serverVersion = Number(serverState?.[dataset] || 0);
          let sinceVersion = localVersion;

          if (localVersion > serverVersion) {
            await localDB.saveSyncData(dataset, {
              changed: [],
              deleted: [],
              newVersion: serverVersion,
            });
            sinceVersion = serverVersion;
          }

          if (serverVersion > sinceVersion) {
            await this.syncDataset(dataset, sinceVersion);
          }
        }
      } catch (error) {
        if (!isSyncNetworkError(error)) {
          logger.error("Background sync failed:", error);
        }
      } finally {
        syncing = false;
      }
    },

    async syncDataset(dataset, sinceVersion) {
      try {
        const response = await request({
          url: `/api/sync/${dataset}?since=${sinceVersion}`,
          method: "GET",
        });

        await localDB.saveSyncData(dataset, response);
        if (typeof emitDataSynced === "function") {
          emitDataSynced({
            dataset,
            version: response?.newVersion,
          });
        }
      } catch (error) {
        if (!isSyncNetworkError(error)) {
          logger.error(`Failed to sync ${dataset}:`, error);
        }
        throw toSyncError(error);
      }
    },

    async getData(dataset, conditions = {}, readOptions = {}) {
      const localData = await localDB.getLocalData(dataset, conditions);

      try {
        const serverData = await request({
          url: this.getApiUrl(dataset, conditions),
          method: "GET",
        });

        const recordsToCache = normalizeRecords(serverData);
        if (recordsToCache.length > 0) {
          await localDB.saveSyncData(dataset, {
            changed: recordsToCache,
            deleted: [],
            newVersion: Date.now(),
          });
        }

        return serverData;
      } catch (error) {
        if (!isSyncNetworkError(error)) {
          logger.error(`Failed to get ${dataset}:`, error);
        }
        if (readOptions?.preferFresh) {
          throw toSyncError(error);
        }
        return localData;
      }
    },

    getApiUrl(dataset, conditions = {}) {
      return buildApiUrl(dataset, conditions);
    },

    normalizeRecords,

    async forceSync() {
      syncing = false;
      await this.syncInBackground();
    },
  };
}
