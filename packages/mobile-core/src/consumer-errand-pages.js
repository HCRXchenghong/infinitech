function pickErrandPageText(...values) {
  for (const value of values) {
    if (value === null || value === undefined) {
      continue;
    }

    const text = String(value).trim();
    if (text) {
      return text;
    }
  }

  return "";
}

function resolveConsumerErrandUniApp(uniApp) {
  return uniApp || globalThis.uni || {};
}

function resolveConsumerErrandPageComponents(options = {}) {
  return options.components && typeof options.components === "object"
    ? options.components
    : undefined;
}

function buildConsumerErrandTipOptions() {
  return [
    { value: 0, label: "不打赏" },
    { value: 2, label: "¥2" },
    { value: 5, label: "¥5" },
  ].map((option) => ({ ...option }));
}

function getConsumerErrandErrorMessage(error, fallback) {
  return (
    error?.data?.error ||
    error?.error ||
    error?.message ||
    fallback
  );
}

function resolveConsumerErrandOrderId(result) {
  return pickErrandPageText(result?.id, result?.data?.id);
}

function toConsumerErrandAmount(value) {
  const amount = Number(value);
  return Number.isFinite(amount) ? Math.max(0, amount) : 0;
}

function redirectToConsumerErrandDetail(uniApp, orderId) {
  uniApp.navigateTo?.({
    url: `/pages/errand/detail/index?id=${encodeURIComponent(orderId)}`,
  });
}

async function submitConsumerErrandOrder(instance, options = {}) {
  const {
    canSubmit,
    buildOrderConfig,
    createOrder,
    buildErrandOrderPayload,
    requireCurrentUserIdentity,
    uniApp,
    submitLoadingTitle = "提交中...",
  } = options;

  if (!canSubmit || instance.submitting) {
    return;
  }

  const identity = requireCurrentUserIdentity();
  if (!identity) {
    return;
  }

  instance.submitting = true;
  uniApp.showLoading?.({ title: submitLoadingTitle });

  try {
    const payload = buildErrandOrderPayload(buildOrderConfig(instance), identity);
    const result = await createOrder(payload);
    const orderId = resolveConsumerErrandOrderId(result);
    if (!orderId) {
      throw new Error("订单创建失败");
    }

    redirectToConsumerErrandDetail(uniApp, orderId);
  } catch (error) {
    uniApp.showToast?.({
      title: getConsumerErrandErrorMessage(error, "下单失败"),
      icon: "none",
    });
  } finally {
    uniApp.hideLoading?.();
    instance.submitting = false;
  }
}

export function createErrandLegacyPage(options = {}) {
  const uniApp = resolveConsumerErrandUniApp(options.uniApp);

  return {
    onLoad() {
      uniApp.redirectTo?.({ url: "/pages/errand/home/index" });
    },
  };
}

export function createErrandBuyPage(options = {}) {
  const createOrder =
    typeof options.createOrder === "function" ? options.createOrder : async () => ({});
  const buildErrandOrderPayload =
    typeof options.buildErrandOrderPayload === "function"
      ? options.buildErrandOrderPayload
      : (payload) => payload;
  const requireCurrentUserIdentity =
    typeof options.requireCurrentUserIdentity === "function"
      ? options.requireCurrentUserIdentity
      : () => null;
  const ensureErrandServiceOpen =
    typeof options.ensureErrandServiceOpen === "function"
      ? options.ensureErrandServiceOpen
      : async () => true;
  const uniApp = resolveConsumerErrandUniApp(options.uniApp);
  const components = resolveConsumerErrandPageComponents(options);

  return {
    components,
    data() {
      return {
        form: {
          buyAddress: "",
          targetAddress: "",
          desc: "",
          itemPrice: "",
          tipAmount: 0,
        },
        tipOptions: buildConsumerErrandTipOptions(),
        deliveryFee: 8,
        submitting: false,
      };
    },
    computed: {
      amountNumber() {
        return toConsumerErrandAmount(this.form.itemPrice);
      },
      amountText() {
        return this.amountNumber.toFixed(2);
      },
      totalPrice() {
        return (
          this.deliveryFee +
          this.amountNumber +
          toConsumerErrandAmount(this.form.tipAmount)
        ).toFixed(2);
      },
      canSubmit() {
        return Boolean(
          this.form.buyAddress &&
            this.form.targetAddress &&
            this.form.desc &&
            this.form.itemPrice,
        );
      },
    },
    onLoad() {
      return this.ensureOpen();
    },
    methods: {
      async ensureOpen() {
        await ensureErrandServiceOpen("buy");
      },
      async submitOrder() {
        await submitConsumerErrandOrder(this, {
          canSubmit: this.canSubmit,
          createOrder,
          buildErrandOrderPayload,
          requireCurrentUserIdentity,
          uniApp,
          buildOrderConfig: (instance) => ({
            serviceType: "errand_buy",
            pickup: instance.form.buyAddress,
            dropoff: instance.form.targetAddress,
            itemDescription: instance.form.desc,
            estimatedAmount: instance.amountNumber,
            deliveryFee: instance.deliveryFee,
            tipAmount: toConsumerErrandAmount(instance.form.tipAmount),
            totalPrice: toConsumerErrandAmount(instance.totalPrice),
            requestExtra: {
              buyAddress: instance.form.buyAddress,
              targetAddress: instance.form.targetAddress,
            },
          }),
        });
      },
    },
  };
}

export function createErrandDeliverPage(options = {}) {
  const createOrder =
    typeof options.createOrder === "function" ? options.createOrder : async () => ({});
  const buildErrandOrderPayload =
    typeof options.buildErrandOrderPayload === "function"
      ? options.buildErrandOrderPayload
      : (payload) => payload;
  const requireCurrentUserIdentity =
    typeof options.requireCurrentUserIdentity === "function"
      ? options.requireCurrentUserIdentity
      : () => null;
  const ensureErrandServiceOpen =
    typeof options.ensureErrandServiceOpen === "function"
      ? options.ensureErrandServiceOpen
      : async () => true;
  const uniApp = resolveConsumerErrandUniApp(options.uniApp);
  const components = resolveConsumerErrandPageComponents(options);

  return {
    components,
    data() {
      return {
        form: {
          pickup: "",
          dropoff: "",
          item: "",
          tipAmount: 0,
        },
        tipOptions: buildConsumerErrandTipOptions(),
        baseFee: 6,
        distanceFee: 4,
        submitting: false,
      };
    },
    computed: {
      serviceFee() {
        return this.baseFee + this.distanceFee;
      },
      totalPrice() {
        return (
          this.serviceFee + toConsumerErrandAmount(this.form.tipAmount)
        ).toFixed(2);
      },
      canSubmit() {
        return Boolean(this.form.pickup && this.form.dropoff && this.form.item);
      },
    },
    onLoad() {
      return this.ensureOpen();
    },
    methods: {
      async ensureOpen() {
        await ensureErrandServiceOpen("deliver");
      },
      async submitOrder() {
        await submitConsumerErrandOrder(this, {
          canSubmit: this.canSubmit,
          createOrder,
          buildErrandOrderPayload,
          requireCurrentUserIdentity,
          uniApp,
          buildOrderConfig: (instance) => ({
            serviceType: "errand_deliver",
            pickup: instance.form.pickup,
            dropoff: instance.form.dropoff,
            itemDescription: instance.form.item,
            deliveryFee: instance.serviceFee,
            tipAmount: toConsumerErrandAmount(instance.form.tipAmount),
            totalPrice: toConsumerErrandAmount(instance.totalPrice),
            requestExtra: {
              packageDescription: instance.form.item,
            },
          }),
        });
      },
    },
  };
}

export function createErrandDoPage(options = {}) {
  const createOrder =
    typeof options.createOrder === "function" ? options.createOrder : async () => ({});
  const buildErrandOrderPayload =
    typeof options.buildErrandOrderPayload === "function"
      ? options.buildErrandOrderPayload
      : (payload) => payload;
  const requireCurrentUserIdentity =
    typeof options.requireCurrentUserIdentity === "function"
      ? options.requireCurrentUserIdentity
      : () => null;
  const ensureErrandServiceOpen =
    typeof options.ensureErrandServiceOpen === "function"
      ? options.ensureErrandServiceOpen
      : async () => true;
  const uniApp = resolveConsumerErrandUniApp(options.uniApp);
  const components = resolveConsumerErrandPageComponents(options);

  return {
    components,
    data() {
      return {
        form: {
          address: "",
          desc: "",
          tipAmount: 0,
        },
        tipOptions: buildConsumerErrandTipOptions(),
        serviceFee: 2,
        submitting: false,
      };
    },
    computed: {
      totalPrice() {
        return (
          this.serviceFee + toConsumerErrandAmount(this.form.tipAmount)
        ).toFixed(2);
      },
      canSubmit() {
        return Boolean(this.form.address && this.form.desc);
      },
    },
    onLoad() {
      return this.ensureOpen();
    },
    methods: {
      async ensureOpen() {
        await ensureErrandServiceOpen("do");
      },
      async submitOrder() {
        await submitConsumerErrandOrder(this, {
          canSubmit: this.canSubmit,
          createOrder,
          buildErrandOrderPayload,
          requireCurrentUserIdentity,
          uniApp,
          buildOrderConfig: (instance) => ({
            serviceType: "errand_do",
            pickup: instance.form.address,
            dropoff: "",
            itemDescription: instance.form.desc,
            deliveryFee: instance.serviceFee,
            tipAmount: toConsumerErrandAmount(instance.form.tipAmount),
            totalPrice: toConsumerErrandAmount(instance.totalPrice),
            requestExtra: {
              taskDescription: instance.form.desc,
            },
          }),
        });
      },
    },
  };
}

export function createErrandPickupPage(options = {}) {
  const createOrder =
    typeof options.createOrder === "function" ? options.createOrder : async () => ({});
  const buildErrandOrderPayload =
    typeof options.buildErrandOrderPayload === "function"
      ? options.buildErrandOrderPayload
      : (payload) => payload;
  const requireCurrentUserIdentity =
    typeof options.requireCurrentUserIdentity === "function"
      ? options.requireCurrentUserIdentity
      : () => null;
  const ensureErrandServiceOpen =
    typeof options.ensureErrandServiceOpen === "function"
      ? options.ensureErrandServiceOpen
      : async () => true;
  const uniApp = resolveConsumerErrandUniApp(options.uniApp);
  const components = resolveConsumerErrandPageComponents(options);

  return {
    components,
    data() {
      return {
        form: {
          code: "",
          address: "",
          type: "now",
        },
        submitting: false,
      };
    },
    computed: {
      serviceFee() {
        return this.form.type === "today" ? 5 : 14;
      },
      totalPrice() {
        return this.serviceFee.toFixed(2);
      },
      preferredTime() {
        return this.form.type === "today" ? "今日20:00前" : "尽快送达";
      },
      canSubmit() {
        return Boolean(this.form.code && this.form.address);
      },
    },
    onLoad() {
      return this.ensureOpen();
    },
    methods: {
      async ensureOpen() {
        await ensureErrandServiceOpen("pickup");
      },
      async submitOrder() {
        await submitConsumerErrandOrder(this, {
          canSubmit: this.canSubmit,
          createOrder,
          buildErrandOrderPayload,
          requireCurrentUserIdentity,
          uniApp,
          buildOrderConfig: (instance) => ({
            serviceType: "errand_pickup",
            pickup: "快递站点",
            dropoff: instance.form.address,
            itemDescription: `快递（取件码：${instance.form.code}）`,
            deliveryFee: instance.serviceFee,
            totalPrice: instance.serviceFee,
            preferredTime: instance.preferredTime,
            requestExtra: {
              pickupCode: instance.form.code,
            },
            requirementsExtra: {
              deliveryMode: instance.form.type,
            },
          }),
        });
      },
    },
  };
}

export function createErrandDetailPage(options = {}) {
  const fetchOrderDetail =
    typeof options.fetchOrderDetail === "function"
      ? options.fetchOrderDetail
      : async () => ({});
  const mapErrandOrderDetail =
    typeof options.mapErrandOrderDetail === "function"
      ? options.mapErrandOrderDetail
      : (detail) => detail;
  const uniApp = resolveConsumerErrandUniApp(options.uniApp);
  const components = resolveConsumerErrandPageComponents(options);

  return {
    components,
    data() {
      return {
        order: {
          id: "",
          serviceType: "errand_generic",
          serviceName: "跑腿服务",
          statusText: "待接单",
          pickup: "",
          dropoff: "",
          item: "",
          amount: 0,
          deliveryFee: 0,
          totalPrice: 0,
          preferredTime: "",
          remark: "",
          createdAtText: "",
        },
      };
    },
    computed: {
      startLabel() {
        return {
          errand_buy: "购买地址",
          errand_deliver: "取件地址",
          errand_pickup: "取件地址",
          errand_do: "服务地点",
        }[this.order.serviceType] || "地址";
      },
      endLabel() {
        return {
          errand_buy: "送达地址",
          errand_deliver: "送达地址",
          errand_pickup: "送达地址",
          errand_do: "联系地址",
        }[this.order.serviceType] || "送达地址";
      },
      showDropoff() {
        return Boolean(this.order.dropoff && this.order.dropoff !== this.order.pickup);
      },
      amountText() {
        return toConsumerErrandAmount(this.order.amount).toFixed(2);
      },
      deliveryFeeText() {
        return toConsumerErrandAmount(this.order.deliveryFee).toFixed(2);
      },
      totalPriceText() {
        return toConsumerErrandAmount(this.order.totalPrice).toFixed(2);
      },
    },
    onLoad(query = {}) {
      const id = pickErrandPageText(query?.id);
      if (!id) {
        uniApp.showToast?.({ title: "订单ID不存在", icon: "none" });
        return;
      }

      return this.loadOrder(decodeURIComponent(id));
    },
    methods: {
      async loadOrder(id) {
        uniApp.showLoading?.({ title: "加载中..." });
        try {
          const data = await fetchOrderDetail(id);
          this.order = mapErrandOrderDetail(data || {});
        } catch (error) {
          uniApp.showToast?.({
            title: getConsumerErrandErrorMessage(error, "加载失败"),
            icon: "none",
          });
          this.order.id = id;
        } finally {
          uniApp.hideLoading?.();
        }
      },
      copyOrderId() {
        if (!this.order.id) {
          return;
        }

        uniApp.setClipboardData?.({
          data: this.order.id,
          success: () => {
            uniApp.showToast?.({ title: "已复制", icon: "none" });
          },
        });
      },
      backHome() {
        uniApp.switchTab?.({ url: "/pages/index/index" });
      },
    },
  };
}
