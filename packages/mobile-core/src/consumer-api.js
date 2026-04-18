import { buildAuthorizationHeaders } from "../../client-sdk/src/auth.js";
import { createMobilePushApi } from "../../client-sdk/src/mobile-capabilities.js";
import {
  buildUniNetworkErrorMessage,
  createUniRequestClient,
  isRetryableUniNetworkError,
} from "../../client-sdk/src/uni-request.js";
import {
  extractEnvelopeData,
  extractPaginatedItems,
  extractSMSResult,
} from "../../contracts/src/http.js";
import { UPLOAD_DOMAINS } from "../../contracts/src/upload.js";
import { readStoredBearerToken, uploadAuthenticatedAsset } from "./upload.js";

function resolveLogger(logger) {
  if (
    logger &&
    typeof logger === "object" &&
    typeof logger.error === "function"
  ) {
    return logger;
  }
  return console;
}

function createSyncServiceResolver(options = {}) {
  let initialized = false;
  let syncService = null;

  return function resolveSyncService() {
    if (!initialized) {
      initialized = true;
      syncService =
        typeof options.getSyncService === "function"
          ? options.getSyncService()
          : options.syncService || null;
    }

    return syncService;
  };
}

function normalizeProductList(response) {
  if (Array.isArray(response)) {
    return response;
  }
  if (response && Array.isArray(response.products)) {
    return response.products;
  }
  if (response && response.data && Array.isArray(response.data.products)) {
    return response.data.products;
  }
  if (response && response.data && Array.isArray(response.data)) {
    return response.data;
  }
  return [];
}

function normalizeShopList(response) {
  if (Array.isArray(response)) {
    return response;
  }
  const data = extractEnvelopeData(response) || response;
  if (data && Array.isArray(data.shops)) {
    return data.shops;
  }
  if (data && Array.isArray(data.items)) {
    return data.items;
  }
  return [];
}

function normalizeShopDetail(response) {
  const data = extractEnvelopeData(response) || response;
  if (Array.isArray(data) && data.length > 0) {
    return data[0];
  }
  if (data && typeof data === "object") {
    return data;
  }
  return null;
}

function sortProductsByDisplayOrder(products = []) {
  return [...products].sort((left, right) => {
    const leftCategory = Number(left.categoryId || left.category_id || 0);
    const rightCategory = Number(right.categoryId || right.category_id || 0);
    if (leftCategory !== rightCategory) {
      return leftCategory - rightCategory;
    }

    const leftOrder = Number(left.sortOrder || left.sort_order || 0);
    const rightOrder = Number(right.sortOrder || right.sort_order || 0);
    if (leftOrder !== rightOrder) {
      return leftOrder - rightOrder;
    }

    return String(right.id || "").localeCompare(String(left.id || ""));
  });
}

function buildWeatherTips(weatherData = {}) {
  const indices = weatherData?.life_indices || {};
  const umbrellaAdvice = indices?.umbrella?.advice;
  const uvAdvice = indices?.uv?.advice;
  const travelAdvice = indices?.travel?.advice;
  if (umbrellaAdvice) return umbrellaAdvice;
  if (uvAdvice) return uvAdvice;
  if (travelAdvice) return travelAdvice;

  const condition = String(
    weatherData?.weather || weatherData?.weather_main || "",
  );
  if (condition.includes("雨")) return "外出建议带伞，注意路面湿滑";
  if (condition.includes("雪")) return "天气寒冷，注意防滑保暖";
  if (condition.includes("霾") || condition.includes("雾")) {
    return "空气一般，建议佩戴口罩出行";
  }
  return "天气平稳，出门前记得补充水分";
}

function getAirQualityText(weatherData = {}) {
  if (weatherData?.aqi_category) return weatherData.aqi_category;
  if (weatherData?.air_quality) return weatherData.air_quality;

  const aqi = Number(weatherData?.aqi);
  if (!Number.isFinite(aqi)) return "良好";
  if (aqi <= 50) return "优";
  if (aqi <= 100) return "良";
  if (aqi <= 150) return "轻度污染";
  if (aqi <= 200) return "中度污染";
  return "重度污染";
}

function unwrapDataResponse(response) {
  return response && response.data ? response.data : response;
}

export function createConsumerApi(options = {}) {
  const uniApp = options.uniApp || globalThis.uni;
  const logger = resolveLogger(options.logger);
  const config =
    options.config && typeof options.config === "object" ? options.config : {};
  const getBaseUrl =
    typeof options.getBaseUrl === "function"
      ? options.getBaseUrl
      : () => config.API_BASE_URL;
  const getTimeout =
    typeof options.getTimeout === "function"
      ? options.getTimeout
      : () => config.TIMEOUT;
  const isDev =
    typeof options.isDev === "function"
      ? Boolean(options.isDev())
      : Boolean(options.isDev ?? config.isDev);
  const createUniRequestClientImpl =
    options.createUniRequestClientImpl || createUniRequestClient;
  const createMobilePushApiImpl =
    options.createMobilePushApiImpl || createMobilePushApi;
  const readStoredBearerTokenImpl =
    options.readStoredBearerTokenImpl || readStoredBearerToken;
  const uploadAuthenticatedAssetImpl =
    options.uploadAuthenticatedAssetImpl || uploadAuthenticatedAsset;
  const resolveSyncService = createSyncServiceResolver(options);

  function readAuthToken() {
    return readStoredBearerTokenImpl(uniApp, ["token", "access_token"]);
  }

  async function getSyncData(dataset, conditions, requestOptions = undefined) {
    const syncService = resolveSyncService();
    if (!syncService || typeof syncService.getData !== "function") {
      return null;
    }
    return syncService.getData(dataset, conditions, requestOptions);
  }

  const requestClient = createUniRequestClientImpl({
    uniApp,
    getBaseUrl,
    getTimeout,
    createHttpError(payload, statusCode) {
      return {
        data: payload,
        error: payload?.error || `请求失败: ${statusCode}`,
        statusCode,
      };
    },
    createNetworkError(error, { baseUrl }) {
      const message = buildUniNetworkErrorMessage(
        error,
        { baseUrl },
        {
          defaultMessage: "网络请求失败，请检查网络连接",
          timeoutMessage: "请求超时，请检查后端服务是否运行（端口25500）",
          unreachableMessage: () =>
            `无法连接到服务器，请确认后端服务已启动（${baseUrl}）`,
        },
      );
      return {
        error: message,
        message,
      };
    },
    shouldLogNetworkError(error) {
      return !isRetryableUniNetworkError(error) || isDev;
    },
    logger,
  });

  function request(requestOptions) {
    return requestClient(requestOptions);
  }

  const fetchShopCategories = async () => {
    const payload = await request({ url: "/api/shops/categories" });
    return extractPaginatedItems(payload, {
      listKeys: ["categories", "items", "records", "list"],
    }).items;
  };

  const fetchShops = async (params) => {
    const payload = await getSyncData("shops", params, { preferFresh: true });
    return normalizeShopList(payload);
  };

  const fetchShopDetail = async (shopId) => {
    const data = await getSyncData(
      "shops",
      { id: shopId },
      { preferFresh: true },
    );
    const normalized = normalizeShopDetail(data);
    if (normalized) {
      return normalized;
    }

    const payload = await request({
      url: `/api/shops/${shopId}`,
    });
    return normalizeShopDetail(payload);
  };

  const fetchShopMenu = async (shopId) => fetchProducts(shopId);

  const fetchOrders = async (userId) => {
    const payload = await request({
      url: `/api/orders/user/${userId}`,
    });
    return extractPaginatedItems(payload, {
      listKeys: ["orders", "items", "records", "list"],
    }).items;
  };

  const fetchOrderDetail = async (orderId) => {
    try {
      const payload = await request({
        url: `/api/orders/${orderId}`,
      });
      return extractEnvelopeData(payload) || payload || null;
    } catch (error) {
      const localData = await getSyncData("orders", { id: orderId });
      if (localData && localData.length > 0) {
        return localData[0];
      }
      throw error;
    }
  };

  const createOrder = (payload) =>
    request({
      url: "/api/orders",
      method: "POST",
      data: payload,
    }).then((response) => extractEnvelopeData(response) || response || {});

  const consultMedicineAssistant = (payload) =>
    request({
      url: "/api/medicine/consult",
      method: "POST",
      data: payload,
    });

  const listDiningBuddyParties = (params = {}) =>
    request({
      url: "/api/dining-buddy/parties",
      method: "GET",
      data: params,
    }).then(
      (payload) =>
        extractPaginatedItems(payload, {
          listKeys: ["parties", "items", "records", "list"],
        }).items,
    );

  const createDiningBuddyParty = (payload) =>
    request({
      url: "/api/dining-buddy/parties",
      method: "POST",
      data: payload,
    }).then((response) => extractEnvelopeData(response) || response || {});

  const joinDiningBuddyParty = (partyId) =>
    request({
      url: `/api/dining-buddy/parties/${encodeURIComponent(partyId)}/join`,
      method: "POST",
    }).then((response) => extractEnvelopeData(response) || response || {});

  const fetchDiningBuddyMessages = (partyId) =>
    request({
      url: `/api/dining-buddy/parties/${encodeURIComponent(partyId)}/messages`,
      method: "GET",
    }).then(
      (payload) =>
        extractPaginatedItems(payload, {
          listKeys: ["messages", "items", "records", "list"],
        }).items,
    );

  const sendDiningBuddyMessage = (partyId, payload) =>
    request({
      url: `/api/dining-buddy/parties/${encodeURIComponent(partyId)}/messages`,
      method: "POST",
      data: payload,
    }).then((response) => extractEnvelopeData(response) || response || {});

  const createDiningBuddyReport = (payload) =>
    request({
      url: "/api/dining-buddy/reports",
      method: "POST",
      data: payload,
    }).then((response) => extractEnvelopeData(response) || response || {});

  const createAfterSales = (payload) =>
    request({
      url: "/api/after-sales",
      method: "POST",
      data: payload,
    });

  const fetchAfterSalesList = (userId) =>
    request({
      url: `/api/after-sales/user/${encodeURIComponent(userId)}`,
    });

  const fetchGroupbuyVouchers = (params = {}) =>
    request({
      url: "/api/groupbuy/vouchers",
      method: "GET",
      data: params,
    });

  const fetchVoucherQRCode = (voucherId) =>
    request({
      url: `/api/groupbuy/vouchers/${encodeURIComponent(voucherId)}/qrcode`,
      method: "GET",
    });

  const fetchUserCoupons = (params = {}) =>
    request({
      url: "/api/coupons/user",
      method: "GET",
      data: params,
    });

  const uploadAfterSalesEvidence = (filePath) =>
    uploadAuthenticatedAssetImpl({
      uniApp,
      baseUrl: getBaseUrl(),
      filePath,
      token: readAuthToken(),
      uploadDomain: UPLOAD_DOMAINS.AFTER_SALES_EVIDENCE,
    });

  const uploadCommonAsset = (filePath, uploadOptions = {}) =>
    uploadAuthenticatedAssetImpl({
      uniApp,
      baseUrl: getBaseUrl(),
      filePath,
      token: readAuthToken(),
      uploadDomain:
        uploadOptions.uploadDomain || UPLOAD_DOMAINS.CHAT_ATTACHMENT,
    });

  const uploadCommonImage = (filePath, uploadOptions = {}) =>
    uploadCommonAsset(filePath, {
      uploadDomain: uploadOptions.uploadDomain || UPLOAD_DOMAINS.PROFILE_IMAGE,
    });

  const buildAuthorizationHeader = (token) => buildAuthorizationHeaders(token);

  const readAuthorizationHeader = () => {
    const token = readStoredBearerTokenImpl(uniApp, ["token", "access_token"]);
    return buildAuthorizationHeader(token);
  };

  const fetchUser = (userId) =>
    request({
      url: `/api/user/${userId}`,
    }).then((response) => extractEnvelopeData(response) || response || {});

  const fetchUserFavorites = (userId, params = {}) =>
    request({
      url: `/api/user/${userId}/favorites`,
      method: "GET",
      data: params,
    });

  const addUserFavorite = (userId, shopId) =>
    request({
      url: `/api/user/${userId}/favorites`,
      method: "POST",
      data: { shopId },
    });

  const deleteUserFavorite = (userId, shopId) =>
    request({
      url: `/api/user/${userId}/favorites/${shopId}`,
      method: "DELETE",
    });

  const fetchUserFavoriteStatus = (userId, shopId) =>
    request({
      url: `/api/user/${userId}/favorites/${shopId}/status`,
      method: "GET",
    });

  const fetchUserReviews = (userId, params = {}) =>
    request({
      url: `/api/user/${userId}/reviews`,
      method: "GET",
      data: params,
    });

  const login = (credentials) =>
    request({
      url: "/api/auth/login",
      method: "POST",
      data: credentials,
    });

  const register = (userData) =>
    request({
      url: "/api/auth/register",
      method: "POST",
      data: userData,
    });

  const consumeWechatSession = (token) =>
    request({
      url: "/api/auth/wechat/session",
      method: "GET",
      data: { token },
    });

  const wechatBindLogin = (payload) =>
    request({
      url: "/api/auth/wechat/bind-login",
      method: "POST",
      data: payload,
    });

  const requestSMSCode = (phone, scene, extra = {}) =>
    request({
      url: "/api/request-sms-code",
      method: "POST",
      data: {
        phone,
        scene,
        ...extra,
      },
    }).then((response) => extractSMSResult(response));

  const verifySMSCodeCheck = (phone, scene, code) =>
    request({
      url: "/api/verify-sms-code-check",
      method: "POST",
      data: {
        phone,
        scene,
        code,
      },
    }).then((response) => extractSMSResult(response));

  const changeUserPhone = (userId, payload) =>
    request({
      url: `/api/user/${encodeURIComponent(userId)}/change-phone`,
      method: "POST",
      data: payload,
    }).then((response) => extractEnvelopeData(response) || response || {});

  const updateUserProfile = (userId, payload) =>
    request({
      url: `/api/user/${encodeURIComponent(userId)}`,
      method: "PUT",
      data: payload,
    }).then((response) => extractEnvelopeData(response) || response || {});

  const fetchUserAddresses = async (userId) => {
    const payload = await request({
      url: `/api/user/${encodeURIComponent(userId)}/addresses`,
      method: "GET",
    });
    return extractPaginatedItems(payload, {
      listKeys: ["addresses", "items", "records", "list"],
    }).items;
  };

  const fetchDefaultUserAddress = async (userId) => {
    const payload = await request({
      url: `/api/user/${encodeURIComponent(userId)}/addresses/default`,
      method: "GET",
    });
    const data = extractEnvelopeData(payload) || {};
    return data.address || data || null;
  };

  const mobilePushApi = createMobilePushApiImpl({
    post(url, data) {
      return request({
        url,
        method: "POST",
        data,
      });
    },
  });

  const { registerPushDevice, unregisterPushDevice, ackPushMessage } =
    mobilePushApi;

  const recordPhoneContactClick = (payload) =>
    request({
      url: "/api/contact/phone-clicks",
      method: "POST",
      data: payload,
    });

  const createRTCCall = async (payload) => {
    const response = await request({
      url: "/api/rtc/calls",
      method: "POST",
      data: payload,
    });
    return unwrapDataResponse(response);
  };

  const getRTCCall = async (callId) => {
    const response = await request({
      url: `/api/rtc/calls/${encodeURIComponent(callId)}`,
      method: "GET",
    });
    return unwrapDataResponse(response);
  };

  const listRTCCallHistory = async (params = {}) => {
    const response = await request({
      url: "/api/rtc/calls/history",
      method: "GET",
      data: params,
    });
    return unwrapDataResponse(response);
  };

  const updateRTCCallStatus = async (callId, payload) => {
    const response = await request({
      url: `/api/rtc/calls/${encodeURIComponent(callId)}/status`,
      method: "POST",
      data: payload,
    });
    return unwrapDataResponse(response);
  };

  const createUserAddress = (userId, payload) =>
    request({
      url: `/api/user/${encodeURIComponent(userId)}/addresses`,
      method: "POST",
      data: payload,
    }).then((response) => extractEnvelopeData(response) || response || {});

  const updateUserAddress = (userId, addressId, payload) =>
    request({
      url: `/api/user/${encodeURIComponent(userId)}/addresses/${encodeURIComponent(addressId)}`,
      method: "PUT",
      data: payload,
    }).then((response) => extractEnvelopeData(response) || response || {});

  const deleteUserAddress = (userId, addressId) =>
    request({
      url: `/api/user/${encodeURIComponent(userId)}/addresses/${encodeURIComponent(addressId)}`,
      method: "DELETE",
    }).then((response) => extractEnvelopeData(response) || response || {});

  const setDefaultUserAddress = (userId, addressId) =>
    request({
      url: `/api/user/${encodeURIComponent(userId)}/addresses/${encodeURIComponent(addressId)}/default`,
      method: "POST",
    }).then((response) => extractEnvelopeData(response) || response || {});

  const fetchPointsBalance = (userId) =>
    request({
      url: "/api/points/balance",
      method: "GET",
      data: { userId },
    }).then((payload) => extractEnvelopeData(payload) || {});

  const fetchPointsGoods = (params = {}) =>
    request({
      url: "/api/points/goods",
      method: "GET",
      data: params,
    }).then((payload) => {
      const data = extractEnvelopeData(payload);
      return Array.isArray(data) ? data : [];
    });

  const redeemPoints = (payload) =>
    request({
      url: "/api/points/redeem",
      method: "POST",
      data: payload,
    }).then((response) => extractEnvelopeData(response) || {});

  const earnPoints = (payload) =>
    request({
      url: "/api/points/earn",
      method: "POST",
      data: payload,
    }).then((response) => extractEnvelopeData(response) || {});

  const refundPoints = (payload) =>
    request({
      url: "/api/points/refund",
      method: "POST",
      data: payload,
    }).then((response) => extractEnvelopeData(response) || {});

  const submitCooperation = (payload) =>
    request({
      url: "/api/cooperations",
      method: "POST",
      data: payload,
    }).then((response) => extractEnvelopeData(response) || {});

  const fetchInviteCode = (params) =>
    request({
      url: "/api/invite/code",
      method: "GET",
      data: params,
    }).then((response) => extractEnvelopeData(response) || {});

  const recordInviteShare = (payload) =>
    request({
      url: "/api/invite/share",
      method: "POST",
      data: payload,
    }).then((response) => extractEnvelopeData(response) || response || {});

  const fetchPublicRuntimeSettings = () =>
    request({
      url: "/api/public/runtime-settings",
      method: "GET",
    });

  const fetchPublicCharitySettings = () =>
    request({
      url: "/api/public/charity-settings",
      method: "GET",
    });

  const fetchPublicVIPSettings = () =>
    request({
      url: "/api/public/vip-settings",
      method: "GET",
    });

  const fetchCategories = (shopId) =>
    request({
      url: `/api/categories?shopId=${shopId}`,
    }).then(
      (payload) =>
        extractPaginatedItems(payload, {
          listKeys: ["categories", "items", "records", "list"],
        }).items,
    );

  const fetchProducts = async (shopId, categoryId) => {
    const response = await getSyncData(
      "products",
      { shop_id: shopId },
      { preferFresh: true },
    );

    const products = sortProductsByDisplayOrder(normalizeProductList(response));
    if (!categoryId) {
      return products;
    }

    const normalizedCategoryId = String(categoryId);
    return products.filter((item) => {
      const currentCategoryId = item.categoryId || item.category_id;
      return String(currentCategoryId) === normalizedCategoryId;
    });
  };

  const fetchMenuItems = async (shopId) => {
    const response = await fetchProducts(shopId);
    if (Array.isArray(response)) {
      return response;
    }
    if (response && Array.isArray(response.products)) {
      return response.products;
    }
    if (response && response.data && Array.isArray(response.data.products)) {
      return response.data.products;
    }
    return [];
  };

  const fetchBanners = (shopId) =>
    request({
      url: `/api/banners?shopId=${shopId}`,
    }).then(
      (payload) =>
        extractPaginatedItems(payload, {
          listKeys: ["banners", "items", "records", "list"],
        }).items,
    );

  const fetchProductDetail = async (productId) => {
    const localData = await getSyncData("products", { id: productId });
    if (localData && localData.length > 0) {
      return localData[0];
    }

    const payload = await request({
      url: `/api/products/${productId}`,
    });
    return extractEnvelopeData(payload) || payload || null;
  };

  const fetchHomeFeed = async (params = {}) => {
    const response = await request({
      url: "/api/home/feed",
      method: "GET",
      data: params,
    });

    if (response && typeof response === "object") {
      return {
        shops: Array.isArray(response.shops) ? response.shops : [],
        products: Array.isArray(response.products) ? response.products : [],
        campaigns: Number(response.campaigns || 0),
      };
    }

    return {
      shops: [],
      products: [],
      campaigns: 0,
    };
  };

  const fetchWeather = async (lat, lng, weatherOptions = {}) => {
    void lat;
    void lng;
    const fallback = {
      temp: 26,
      condition: "多云",
      icon: "cloud",
    };

    const params = {
      lang: String(weatherOptions.lang || "zh"),
      extended: true,
      forecast: true,
      hourly: true,
      minutely: true,
      indices: true,
    };

    try {
      const weatherData = await request({
        url: "/api/public/weather",
        method: "GET",
        data: params,
      });

      if (!weatherData || weatherData.available === false) {
        return fallback;
      }

      const parsedTemp = Number(weatherData.temperature);
      const parsedFeelsLike = Number(weatherData.feels_like);

      return {
        temp: Number.isFinite(parsedTemp)
          ? Math.round(parsedTemp)
          : fallback.temp,
        condition:
          weatherData.weather || weatherData.weather_main || fallback.condition,
        icon: weatherData.weather_icon || fallback.icon,
        feelsLike: Number.isFinite(parsedFeelsLike)
          ? Math.round(parsedFeelsLike)
          : Number.isFinite(parsedTemp)
            ? Math.round(parsedTemp)
            : fallback.temp,
        airQuality: getAirQualityText(weatherData),
        tips: buildWeatherTips(weatherData),
        city: weatherData.city_name || weatherData.city || "",
        province: weatherData.province || "",
        humidity: weatherData.humidity,
        windDirection: weatherData.wind_direction,
        windPower: weatherData.wind_power,
        reportTime: weatherData.report_time,
        refreshIntervalMinutes: weatherData.refresh_interval_minutes || 10,
        raw: weatherData,
      };
    } catch (error) {
      return fallback;
    }
  };

  const reverseGeocode = async (lat, lng) => {
    const parsedLat = Number(lat);
    const parsedLng = Number(lng);
    const fallbackAddress =
      Number.isFinite(parsedLat) && Number.isFinite(parsedLng)
        ? `${parsedLat.toFixed(6)},${parsedLng.toFixed(6)}`
        : "";

    if (!Number.isFinite(parsedLat) || !Number.isFinite(parsedLng)) {
      return {
        address: fallbackAddress,
        district: "",
        city: "",
      };
    }

    try {
      const response = await request({
        url: "/api/mobile/maps/reverse-geocode",
        method: "GET",
        data: {
          lat: parsedLat,
          lng: parsedLng,
        },
      });
      const address =
        response && typeof response.address === "object"
          ? response.address
          : {};
      return {
        address: response.displayName || fallbackAddress,
        district:
          address.city_district ||
          address.suburb ||
          address.town ||
          address.county ||
          "",
        city: address.city || address.county || address.state || "",
      };
    } catch (error) {
      return {
        address: fallbackAddress,
        district: "",
        city: "",
      };
    }
  };

  const fetchConversations = () =>
    request({
      url: "/api/messages/conversations",
    }).then(
      (response) =>
        extractPaginatedItems(response, {
          listKeys: ["conversations", "items", "records", "list"],
        }).items,
    );

  const upsertConversation = (payload) =>
    request({
      url: "/api/messages/conversations/upsert",
      method: "POST",
      data: payload,
    }).then((response) => extractEnvelopeData(response) || {});

  const markConversationRead = (chatId) =>
    request({
      url: `/api/messages/conversations/${encodeURIComponent(chatId)}/read`,
      method: "POST",
    });

  const markAllConversationsRead = () =>
    request({
      url: "/api/messages/conversations/read-all",
      method: "POST",
    });

  const fetchHistory = (roomId) =>
    request({
      url: `/api/messages/${roomId}`,
    }).then(
      (response) =>
        extractPaginatedItems(response, {
          listKeys: ["messages", "items", "records", "list"],
        }).items,
    );

  const fetchNotificationList = (params = {}, legacyPageSize) => {
    const normalized =
      typeof params === "number"
        ? { page: params, pageSize: legacyPageSize }
        : params && typeof params === "object"
          ? params
          : {};
    const { page = 1, pageSize = 20 } = normalized;
    return request({
      url: `/api/notifications?page=${page}&pageSize=${pageSize}`,
    }).then((response) => {
      const data = extractEnvelopeData(response) || {};
      const paginated = extractPaginatedItems(response, {
        listKeys: ["items", "records", "list"],
      });
      const unreadCount = Number(
        data.unreadCount ??
          data.unread_count ??
          response?.unreadCount ??
          response?.unread_count ??
          0,
      );
      const latestAt =
        data.latestAt ??
        data.latest_at ??
        response?.latestAt ??
        response?.latest_at ??
        "";
      const latestTitle =
        data.latestTitle ??
        data.latest_title ??
        response?.latestTitle ??
        response?.latest_title ??
        "";
      const latestSummary =
        data.latestSummary ??
        data.latest_summary ??
        response?.latestSummary ??
        response?.latest_summary ??
        "";

      return {
        ...response,
        success: response?.success !== false,
        data: paginated.items,
        items: paginated.items,
        total: paginated.total,
        page: paginated.page || page,
        pageSize: paginated.limit || pageSize,
        unreadCount,
        unread_count: unreadCount,
        latestAt,
        latest_at: latestAt,
        latestTitle,
        latest_title: latestTitle,
        latestSummary,
        latest_summary: latestSummary,
      };
    });
  };

  const fetchNotificationDetail = (id) =>
    request({
      url: `/api/notifications/${id}`,
    }).then((response) => ({
      ...response,
      success: response?.success !== false,
      data: extractEnvelopeData(response) || null,
    }));

  const markNotificationRead = (id) =>
    request({
      url: `/api/notifications/${id}/read`,
      method: "POST",
    });

  const markAllNotificationsRead = () =>
    request({
      url: "/api/notifications/read-all",
      method: "POST",
    });

  return {
    request,
    getBaseUrl,
    BASE_URL: getBaseUrl,
    fetchShopCategories,
    fetchShops,
    fetchShopDetail,
    fetchShopMenu,
    fetchOrders,
    fetchOrderDetail,
    createOrder,
    consultMedicineAssistant,
    listDiningBuddyParties,
    createDiningBuddyParty,
    joinDiningBuddyParty,
    fetchDiningBuddyMessages,
    sendDiningBuddyMessage,
    createDiningBuddyReport,
    createAfterSales,
    fetchAfterSalesList,
    fetchGroupbuyVouchers,
    fetchVoucherQRCode,
    fetchUserCoupons,
    uploadAfterSalesEvidence,
    uploadCommonAsset,
    uploadCommonImage,
    buildAuthorizationHeader,
    readAuthorizationHeader,
    fetchUser,
    fetchUserFavorites,
    addUserFavorite,
    deleteUserFavorite,
    fetchUserFavoriteStatus,
    fetchUserReviews,
    login,
    register,
    consumeWechatSession,
    wechatBindLogin,
    requestSMSCode,
    verifySMSCodeCheck,
    changeUserPhone,
    updateUserProfile,
    fetchUserAddresses,
    fetchDefaultUserAddress,
    recordPhoneContactClick,
    createRTCCall,
    getRTCCall,
    listRTCCallHistory,
    updateRTCCallStatus,
    createUserAddress,
    updateUserAddress,
    deleteUserAddress,
    setDefaultUserAddress,
    fetchPointsBalance,
    fetchPointsGoods,
    redeemPoints,
    earnPoints,
    refundPoints,
    submitCooperation,
    fetchInviteCode,
    recordInviteShare,
    fetchPublicRuntimeSettings,
    fetchPublicCharitySettings,
    fetchPublicVIPSettings,
    fetchCategories,
    fetchProducts,
    fetchMenuItems,
    fetchBanners,
    fetchProductDetail,
    fetchHomeFeed,
    fetchWeather,
    reverseGeocode,
    fetchConversations,
    upsertConversation,
    markConversationRead,
    markAllConversationsRead,
    fetchHistory,
    fetchNotificationList,
    fetchNotificationDetail,
    markNotificationRead,
    markAllNotificationsRead,
    registerPushDevice,
    unregisterPushDevice,
    ackPushMessage,
  };
}
