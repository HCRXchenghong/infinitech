function trimRiderHistoryText(value) {
  return String(value == null ? "" : value).trim();
}

function normalizeRiderHistoryNumber(value, fallback = 0) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
}

function padRiderHistoryValue(value) {
  return String(value).padStart(2, "0");
}

function showRiderHistoryToast(uniApp, payload) {
  if (uniApp && typeof uniApp.showToast === "function") {
    uniApp.showToast(payload);
  }
}

function stopRiderHistoryPullDown(uniApp) {
  if (uniApp && typeof uniApp.stopPullDownRefresh === "function") {
    uniApp.stopPullDownRefresh();
  }
}

export const RIDER_HISTORY_STATUS_MAP = {
  completed: "已完成",
  cancelled: "已取消",
};

export function extractRiderHistoryOrderList(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }
  if (Array.isArray(payload?.orders)) {
    return payload.orders;
  }
  if (Array.isArray(payload?.data)) {
    return payload.data;
  }
  if (Array.isArray(payload?.data?.orders)) {
    return payload.data.orders;
  }
  return [];
}

export function formatRiderHistoryTime(value) {
  if (!value) {
    return "--";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "--";
  }
  return `${padRiderHistoryValue(date.getMonth() + 1)}-${padRiderHistoryValue(
    date.getDate(),
  )} ${padRiderHistoryValue(date.getHours())}:${padRiderHistoryValue(
    date.getMinutes(),
  )}`;
}

export function formatRiderHistoryPrice(order = {}) {
  const source = order && typeof order === "object" ? order : {};
  const riderIncome = normalizeRiderHistoryNumber(source.rider_income, 0);
  const rawValue =
    riderIncome > 0
      ? riderIncome / 100
      : source.delivery_fee
        ?? source.deliveryFee
        ?? source.rider_quoted_price
        ?? source.riderQuotedPrice
        ?? source.total_price
        ?? source.totalPrice
        ?? source.price;
  return normalizeRiderHistoryNumber(rawValue, 0).toFixed(2);
}

export function getRiderHistoryStatusText(status) {
  const normalizedStatus = trimRiderHistoryText(status).toLowerCase();
  return RIDER_HISTORY_STATUS_MAP[normalizedStatus] || normalizedStatus || "订单";
}

export function normalizeRiderHistoryOrder(order = {}) {
  const source = order && typeof order === "object" ? order : {};
  const status = trimRiderHistoryText(source.status).toLowerCase() || "completed";
  const sourceTime =
    source.completed_at
    || source.completedAt
    || source.updated_at
    || source.updatedAt
    || source.created_at
    || source.createdAt;
  const customerPhone = trimRiderHistoryText(
    source.customer_phone
      || source.customerPhone
      || source.delivery_phone
      || source.deliveryPhone,
  );
  const address =
    source.address
    || source.customer_address
    || source.customerAddress
    || source.delivery_request
    || source.deliveryRequest
    || "配送地址缺失";
  const orderNo = trimRiderHistoryText(
    source.daily_order_id
      || source.dailyOrderId
      || source.order_num
      || source.orderNum
      || source.id
      || "--",
  );
  const sortAt = Number(new Date(sourceTime || 0).getTime()) || 0;
  const price = formatRiderHistoryPrice(source);

  return {
    id: trimRiderHistoryText(source.id || `${status}-${sourceTime || Date.now()}`),
    orderNo,
    orderNum: orderNo,
    status,
    shopName:
      source.shop_name
      || source.shopName
      || source.food_shop
      || source.merchant_name
      || source.merchantName
      || "商家信息缺失",
    customerAddress: address,
    createTime: formatRiderHistoryTime(sourceTime),
    createdAt: formatRiderHistoryTime(sourceTime),
    sortAt,
    customerName: source.customer_name || source.customerName || "",
    customerPhone,
    customer_phone: customerPhone,
    address,
    statusText: getRiderHistoryStatusText(status),
    amount: price,
    price,
  };
}

export function mergeRiderHistoryOrders(orderList = []) {
  const uniqueMap = {};
  (Array.isArray(orderList) ? orderList : []).forEach((item) => {
    if (!item || !item.id) {
      return;
    }
    uniqueMap[String(item.id)] = item;
  });
  return Object.values(uniqueMap).sort((a, b) => Number(b.sortAt) - Number(a.sortAt));
}

export function createRiderHistoryOrdersPageLogic(options = {}) {
  const {
    fetchRiderOrders,
    readRiderAuthIdentity,
    uniApp,
  } = options;
  const runtimeUni = uniApp || globalThis.uni || null;

  return {
    data() {
      return {
        orders: [],
        loading: false,
        showOrderDetailPopup: false,
        currentOrderDetail: null,
      };
    },
    onShow() {
      void this.loadHistoryOrders();
    },
    onPullDownRefresh() {
      void this.loadHistoryOrders(true);
    },
    methods: {
      getStatusText(status) {
        return getRiderHistoryStatusText(status);
      },
      openOrderDetail(order) {
        if (!order) {
          return;
        }
        this.currentOrderDetail = { ...order };
        this.showOrderDetailPopup = true;
      },
      async loadHistoryOrders(fromPullDown = false) {
        const authIdentity =
          typeof readRiderAuthIdentity === "function"
            ? readRiderAuthIdentity({ uniApp: runtimeUni }) || {}
            : {};
        const riderId = trimRiderHistoryText(authIdentity.riderId);

        if (!riderId) {
          this.orders = [];
          if (fromPullDown) {
            stopRiderHistoryPullDown(runtimeUni);
          }
          return;
        }

        this.loading = true;
        try {
          const completedResult = typeof fetchRiderOrders === "function"
            ? fetchRiderOrders("completed")
            : Promise.resolve([]);
          const cancelledResult = typeof fetchRiderOrders === "function"
            ? fetchRiderOrders("cancelled")
            : Promise.resolve([]);
          const [completedRes, cancelledRes] = await Promise.all([
            completedResult,
            cancelledResult,
          ]);

          const normalizedOrders = [
            ...extractRiderHistoryOrderList(completedRes),
            ...extractRiderHistoryOrderList(cancelledRes),
          ]
            .map((item) => normalizeRiderHistoryOrder(item))
            .filter(
              (item) =>
                item
                && (item.status === "completed" || item.status === "cancelled"),
            );

          this.orders = mergeRiderHistoryOrders(normalizedOrders);
        } catch (error) {
          if (typeof console !== "undefined" && console.error) {
            console.error("加载历史订单失败:", error);
          }
          this.orders = [];
          showRiderHistoryToast(runtimeUni, {
            title: "历史订单加载失败",
            icon: "none",
          });
        } finally {
          this.loading = false;
          if (fromPullDown) {
            stopRiderHistoryPullDown(runtimeUni);
          }
        }
      },
    },
  };
}
