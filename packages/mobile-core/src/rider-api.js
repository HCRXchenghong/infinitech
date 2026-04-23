import { extractAuthSessionResult } from "../../contracts/src/http.js";

function trimRiderApiValue(value) {
  return String(value ?? "").trim();
}

function normalizeRiderApiObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function resolveRiderRequester(options = {}) {
  const requester = options.request;
  if (typeof requester !== "function") {
    throw new TypeError("rider api requires a request function");
  }
  return requester;
}

function resolveRiderPrincipalReader(options = {}) {
  return typeof options.readPrincipalId === "function"
    ? options.readPrincipalId
    : () => "";
}

function createDefaultRiderEarningsResult() {
  return {
    success: true,
    summary: {
      totalIncome: 0,
      settledIncome: 0,
      pendingIncome: 0,
      orderCount: 0,
    },
    items: [],
  };
}

function createDefaultRiderStatsResult() {
  return {
    todayEarnings: "0",
    completedCount: 0,
  };
}

export function createRiderBusinessApi(options = {}) {
  const request = resolveRiderRequester(options);
  const readPrincipalId = resolveRiderPrincipalReader(options);
  const extractAuthSessionResultImpl =
    options.extractAuthSessionResult || extractAuthSessionResult;

  function getRiderId() {
    return trimRiderApiValue(readPrincipalId());
  }

  function withRiderId(fallbackValue, execute) {
    const riderId = getRiderId();
    if (!riderId) {
      return Promise.resolve(
        typeof fallbackValue === "function" ? fallbackValue() : fallbackValue,
      );
    }
    return execute(riderId);
  }

  function buildRiderPayload(extra = {}) {
    const normalizedExtra = normalizeRiderApiObject(extra);
    const riderId = getRiderId();
    if (!riderId) {
      return normalizedExtra;
    }
    return {
      ...normalizedExtra,
      rider_id: riderId,
    };
  }

  function encodeRiderId(riderId) {
    return encodeURIComponent(trimRiderApiValue(riderId));
  }

  function encodeRouteValue(value) {
    return encodeURIComponent(trimRiderApiValue(value));
  }

  function fetchRiderInfo() {
    return withRiderId(null, (riderId) =>
      request({
        url: `/api/riders/${encodeRiderId(riderId)}`,
      }),
    );
  }

  function fetchRiderOrders(status) {
    return withRiderId([], (riderId) =>
      request({
        url:
          status === "available"
            ? "/api/riders/orders/available"
            : `/api/riders/${encodeRiderId(riderId)}/orders`,
        method: "GET",
        data: status && status !== "available" ? { status } : {},
      }),
    );
  }

  function acceptOrder(orderId) {
    return request({
      url: `/api/orders/${encodeRouteValue(orderId)}/accept`,
      method: "POST",
      data: buildRiderPayload(),
    });
  }

  function pickupOrder(orderId) {
    return request({
      url: `/api/orders/${encodeRouteValue(orderId)}/pickup`,
      method: "POST",
      data: buildRiderPayload(),
    });
  }

  function deliverOrder(orderId) {
    return request({
      url: `/api/orders/${encodeRouteValue(orderId)}/deliver`,
      method: "POST",
      data: buildRiderPayload(),
    });
  }

  function reportOrderException(orderId, data) {
    return request({
      url: `/api/orders/${encodeRouteValue(orderId)}/exception-report`,
      method: "POST",
      data,
    });
  }

  function fetchEarnings(params) {
    return withRiderId(createDefaultRiderEarningsResult, (riderId) =>
      request({
        url: `/api/riders/${encodeRiderId(riderId)}/earnings`,
        data: params,
      }),
    );
  }

  function fetchRiderStats() {
    return withRiderId(createDefaultRiderStatsResult, (riderId) =>
      request({
        url: `/api/riders/${encodeRiderId(riderId)}/stats`,
      }),
    );
  }

  function updateRiderStatus(isOnline) {
    return withRiderId(null, (riderId) =>
      request({
        url: `/api/riders/${encodeRiderId(riderId)}/online-status`,
        method: "PUT",
        data: { is_online: !!isOnline },
      }),
    );
  }

  function heartbeatRiderStatus() {
    return withRiderId(null, (riderId) =>
      request({
        url: `/api/riders/${encodeRiderId(riderId)}/heartbeat`,
        method: "POST",
      }),
    );
  }

  function updateAvatar(avatar) {
    return withRiderId(null, (riderId) =>
      request({
        url: `/api/riders/${encodeRiderId(riderId)}/avatar`,
        method: "PUT",
        data: { avatar },
      }),
    );
  }

  function getRiderProfile() {
    return withRiderId(null, (riderId) =>
      request({
        url: `/api/riders/${encodeRiderId(riderId)}/profile`,
      }),
    );
  }

  function updateRiderProfile(data) {
    return withRiderId(null, (riderId) =>
      request({
        url: `/api/riders/${encodeRiderId(riderId)}/profile`,
        method: "PUT",
        data,
      }),
    );
  }

  function changePhone(data) {
    return withRiderId(null, (riderId) =>
      request({
        url: `/api/riders/${encodeRiderId(riderId)}/change-phone`,
        method: "POST",
        data,
      }).then((response) => extractAuthSessionResultImpl(response)),
    );
  }

  function changePassword(data) {
    return withRiderId(null, (riderId) =>
      request({
        url: `/api/riders/${encodeRiderId(riderId)}/change-password`,
        method: "POST",
        data,
      }),
    );
  }

  function getRiderRank() {
    return withRiderId(null, (riderId) =>
      request({
        url: `/api/riders/${encodeRiderId(riderId)}/rank`,
        method: "GET",
      }),
    );
  }

  function getRiderRating() {
    return withRiderId(null, (riderId) =>
      request({
        url: `/api/riders/${encodeRiderId(riderId)}/rating`,
        method: "GET",
      }),
    );
  }

  function getRankList(type) {
    return request({
      url: `/api/riders/rank-list?type=${encodeRouteValue(type)}`,
      method: "GET",
    });
  }

  return {
    acceptOrder,
    changePassword,
    changePhone,
    deliverOrder,
    fetchEarnings,
    fetchRiderInfo,
    fetchRiderOrders,
    fetchRiderStats,
    getRankList,
    getRiderProfile,
    getRiderRank,
    getRiderRating,
    heartbeatRiderStatus,
    pickupOrder,
    reportOrderException,
    updateAvatar,
    updateRiderProfile,
    updateRiderStatus,
  };
}
