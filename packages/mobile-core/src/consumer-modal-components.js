const CONSUMER_ORDER_STATUS_LABELS = {
  pending: "待接单",
  accepted: "已接单",
  delivering: "配送中",
  priced: "待付款",
  completed: "已完成",
  cancelled: "已取消",
};

function resolveUniApp(uniApp) {
  return uniApp || globalThis.uni || {};
}

function resolveFirstDefined(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== "") {
      return value;
    }
  }
  return undefined;
}

export function formatConsumerCartPrice(value) {
  const price = Number(value || 0);
  return Number.isFinite(price)
    ? price.toFixed(2).replace(/\.00$/, "")
    : "0";
}

export function resolveConsumerOrderDetailOrderNo(order = {}) {
  return String(
    resolveFirstDefined(
      order.orderNo,
      order.order_no,
      order.daily_order_id,
      order.id,
      "--",
    ),
  );
}

export function resolveConsumerOrderDetailStatusText(order = {}) {
  if (order.statusText) {
    return order.statusText;
  }

  const status = String(order.status || "").trim();
  return CONSUMER_ORDER_STATUS_LABELS[status] || status || "订单";
}

export function resolveConsumerOrderDetailShopName(order = {}) {
  return String(
    resolveFirstDefined(
      order.shopName,
      order.shop_name,
      order.food_shop,
      "未命名商家",
    ),
  );
}

export function resolveConsumerOrderDetailAmountText(order = {}) {
  const amount = Number(
    resolveFirstDefined(
      order.amount,
      order.price,
      order.totalPrice,
      order.total_price,
      order.delivery_fee,
      0,
    ),
  );
  return Number.isFinite(amount) ? amount.toFixed(2) : "0.00";
}

export function buildConsumerOrderDetailRows(order = {}) {
  return [
    {
      label: "订单号",
      value: resolveConsumerOrderDetailOrderNo(order),
    },
    {
      label: "下单时间",
      value: String(
        resolveFirstDefined(order.createdAt, order.created_at, order.time, "-"),
      ),
    },
    {
      label: "联系人",
      value: String(
        resolveFirstDefined(order.customer_name, order.customerName, "-"),
      ),
    },
    {
      label: "联系电话",
      value: String(
        resolveFirstDefined(order.customer_phone, order.customerPhone, "-"),
      ),
    },
    {
      label: "收货地址",
      value: String(
        resolveFirstDefined(order.address, order.customerAddress, "-"),
      ),
    },
  ];
}

export function createContactModalComponent(options = {}) {
  return {
    name: String(options.name || "ConsumerContactModal"),
    props: {
      show: {
        type: Boolean,
        default: false,
      },
      title: {
        type: String,
        default: "选择联系方式",
      },
      showRtc: {
        type: Boolean,
        default: false,
      },
      rtcLabel: {
        type: String,
        default: "站内语音",
      },
      rtcDescription: {
        type: String,
        default: "App / H5 可发起站内语音通话",
      },
    },
    methods: {
      handleClose() {
        this.$emit("close");
      },
      handleRTCContact() {
        this.$emit("rtc");
        this.handleClose();
      },
      handleOnlineContact() {
        this.$emit("online");
        this.handleClose();
      },
      handlePhoneContact() {
        this.$emit("phone");
        this.handleClose();
      },
    },
  };
}

export function createPhoneWarningModalComponent(options = {}) {
  const getCachedSupportRuntimeSettings =
    typeof options.getCachedSupportRuntimeSettings === "function"
      ? options.getCachedSupportRuntimeSettings
      : () => ({ title: "平台客服" });
  const loadSupportRuntimeSettings =
    typeof options.loadSupportRuntimeSettings === "function"
      ? options.loadSupportRuntimeSettings
      : async () => getCachedSupportRuntimeSettings();

  return {
    name: String(options.name || "ConsumerPhoneWarningModal"),
    props: {
      show: {
        type: Boolean,
        default: false,
      },
    },
    data() {
      return {
        supportTitle: String(
          getCachedSupportRuntimeSettings()?.title || "平台客服",
        ),
      };
    },
    mounted() {
      void this.loadSupportRuntimeConfig();
    },
    methods: {
      async loadSupportRuntimeConfig() {
        try {
          const supportRuntime = await loadSupportRuntimeSettings();
          this.supportTitle = String(
            supportRuntime?.title ||
              getCachedSupportRuntimeSettings()?.title ||
              "平台客服",
          );
        } catch (_error) {
          this.supportTitle = String(
            getCachedSupportRuntimeSettings()?.title || this.supportTitle,
          );
        }
      },
      handleClose() {
        this.$emit("close");
      },
      handleConfirm() {
        this.$emit("confirm");
        this.handleClose();
      },
    },
  };
}

export function createCartModalComponent(options = {}) {
  const uniApp = resolveUniApp(options.uniApp);

  return {
    name: String(options.name || "ConsumerCartModal"),
    props: {
      show: {
        type: Boolean,
        default: false,
      },
      cartItems: {
        type: Array,
        default: () => [],
      },
      totalPrice: {
        type: Number,
        default: 0,
      },
    },
    methods: {
      handleClose() {
        this.$emit("close");
      },
      handlePlus(item) {
        this.$emit("plus", item);
      },
      handleMinus(item) {
        this.$emit("minus", item);
      },
      handleClear() {
        if (typeof uniApp.showModal !== "function") {
          this.$emit("clear");
          return;
        }

        uniApp.showModal({
          title: "确认清空",
          content: "确定要清空购物车吗？",
          success: (result) => {
            if (result?.confirm) {
              this.$emit("clear");
            }
          },
        });
      },
      handleCheckout() {
        this.$emit("checkout");
        this.handleClose();
      },
      formatPrice(value) {
        return formatConsumerCartPrice(value);
      },
    },
  };
}

export function createOrderDetailPopupComponent(options = {}) {
  return {
    name: String(options.name || "ConsumerOrderDetailPopup"),
    props: {
      show: {
        type: Boolean,
        default: false,
      },
      order: {
        type: Object,
        default: () => ({}),
      },
    },
    computed: {
      safeOrder() {
        return this.order || {};
      },
      orderNo() {
        return resolveConsumerOrderDetailOrderNo(this.safeOrder);
      },
      statusText() {
        return resolveConsumerOrderDetailStatusText(this.safeOrder);
      },
      shopName() {
        return resolveConsumerOrderDetailShopName(this.safeOrder);
      },
      amountText() {
        return resolveConsumerOrderDetailAmountText(this.safeOrder);
      },
      detailRows() {
        return buildConsumerOrderDetailRows(this.safeOrder);
      },
    },
    methods: {
      handleClose() {
        this.$emit("close");
      },
    },
  };
}
