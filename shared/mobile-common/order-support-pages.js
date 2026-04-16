import {
  CONSUMER_HOME_TAB_URL,
  CONSUMER_ORDER_LIST_TAB_URL,
  createDefaultConsumerOrderTablewareOptions,
  normalizeConsumerOrderRemark,
  normalizeConsumerOrderTableware,
} from "../../packages/mobile-core/src/order-support-pages.js";

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
      select(v) {
        const nextValue = normalizeConsumerOrderTableware(v);
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
