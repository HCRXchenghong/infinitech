function trimOrderSupportText(value) {
  return String(value || "");
}

export const DEFAULT_CONSUMER_ORDER_REMARK_MAX_LENGTH = 200;
export const DEFAULT_CONSUMER_ORDER_TABLEWARE_OPTIONS = [
  { value: 0, label: "不需要餐具" },
  { value: 1, label: "1 套" },
  { value: 2, label: "2 套" },
  { value: 3, label: "3 套以上" },
];

export const CONSUMER_ORDER_LIST_TAB_URL = "/pages/order/list/index";
export const CONSUMER_HOME_TAB_URL = "/pages/index/index";

export function normalizeConsumerOrderRemark(
  value,
  maxLength = DEFAULT_CONSUMER_ORDER_REMARK_MAX_LENGTH,
) {
  return trimOrderSupportText(value).slice(0, maxLength);
}

export function createDefaultConsumerOrderTablewareOptions() {
  return DEFAULT_CONSUMER_ORDER_TABLEWARE_OPTIONS.map((item) => ({ ...item }));
}

export function normalizeConsumerOrderTableware(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return 0;
  }
  return DEFAULT_CONSUMER_ORDER_TABLEWARE_OPTIONS.some(
    (item) => item.value === parsed,
  )
    ? parsed
    : 0;
}

export function createOrderRemarkPage({ useUserOrderStore } = {}) {
  return {
    data() {
      return {
        remark: normalizeConsumerOrderRemark(useUserOrderStore().state.remark),
      };
    },
    onShow() {
      this.remark = normalizeConsumerOrderRemark(useUserOrderStore().state.remark);
    },
    methods: {
      saveRemark() {
        useUserOrderStore().setRemark(
          normalizeConsumerOrderRemark(this.remark),
        );
        uni.navigateBack();
      },
    },
  };
}

export function createOrderTablewarePage({ useUserOrderStore } = {}) {
  return {
    data() {
      return {
        value: normalizeConsumerOrderTableware(useUserOrderStore().state.tableware),
        options: createDefaultConsumerOrderTablewareOptions(),
      };
    },
    onShow() {
      this.value = normalizeConsumerOrderTableware(
        useUserOrderStore().state.tableware,
      );
    },
    methods: {
      select(value) {
        const nextValue = normalizeConsumerOrderTableware(value);
        this.value = nextValue;
        useUserOrderStore().setTableware(nextValue);
        uni.navigateBack();
      },
    },
  };
}

export function createOrderPaySuccessPage() {
  return {
    methods: {
      goOrders() {
        uni.switchTab({ url: CONSUMER_ORDER_LIST_TAB_URL });
      },
      goHome() {
        uni.switchTab({ url: CONSUMER_HOME_TAB_URL });
      },
    },
  };
}
