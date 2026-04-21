import {
  extractConsumerAvailableOrderCoupons,
  resolveConsumerOrderCouponUserId,
} from "./order-coupon.js";
import {
  hasConsumerStoredAuthMode,
  readConsumerStoredProfile,
} from "./consumer-profile-storage.js";
import { getMobileRuntimePlatform } from "./mobile-client-context.js";
import {
  fallbackOrderPayMethods,
  normalizeOrderPayMethods,
} from "./order-payment-options.js";

function normalizeBizType(raw) {
  const value = String(raw || "").trim().toLowerCase();
  if (!value) return "takeout";
  if (value === "groupbuy" || value.includes("团购")) return "groupbuy";
  return "takeout";
}

function normalizeAddress(addr) {
  if (!addr || typeof addr !== "object") return null;
  const id = String(addr.id || "").trim();
  const detail = String(addr.fullAddress || addr.detail || "").trim();
  const name = String(addr.name || "").trim();
  const phone = String(addr.phone || "").trim();
  const tag = String(addr.tag || "").trim();
  if (!id || !detail || !name) return null;
  return {
    id,
    detail,
    fullAddress: detail,
    name,
    phone,
    tag,
    isDefault: Boolean(addr.isDefault),
  };
}

function normalizeAddresses(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => normalizeAddress(item)).filter(Boolean);
}

export function createOrderConfirmPage(options = {}) {
  const {
    platform = getMobileRuntimePlatform(),
    buildAuthorizationHeader,
    createOrder,
    earnPoints,
    fetchProductDetail,
    fetchShopDetail,
    fetchUserAddresses,
    request,
    getClientPaymentErrorMessage,
    invokeClientPayment,
    isClientPaymentCancelled,
    shouldLaunchClientPayment,
    isHtmlDocumentPayload,
    normalizeErrorMessage,
    useUserOrderStore,
  } = options;
  const buildAuthHeader =
    typeof buildAuthorizationHeader === "function"
      ? buildAuthorizationHeader
      : () => ({});
  const resolvePaymentErrorMessage =
    typeof getClientPaymentErrorMessage === "function"
      ? getClientPaymentErrorMessage
      : (error) => String((error && error.error) || "支付失败");
  const launchClientPayment =
    typeof invokeClientPayment === "function"
      ? invokeClientPayment
      : async () => ({});
  const isPaymentCancelled =
    typeof isClientPaymentCancelled === "function"
      ? isClientPaymentCancelled
      : () => false;
  const canLaunchClientPayment =
    typeof shouldLaunchClientPayment === "function"
      ? shouldLaunchClientPayment
      : () => false;
  const isHtmlErrorPayload =
    typeof isHtmlDocumentPayload === "function"
      ? isHtmlDocumentPayload
      : () => false;
  const resolveErrorMessage =
    typeof normalizeErrorMessage === "function"
      ? normalizeErrorMessage
      : (error, fallback = "") => String((error && error.error) || fallback);
  const getOrderStore =
    typeof useUserOrderStore === "function"
      ? useUserOrderStore
      : () => ({ state: { remark: "", tableware: 0 } });

  return {
    data() {
      return {
        shop: null,
        items: [],
        orderState: getOrderStore().state,
        submitting: false,
        loading: true,
        paymentOptionsLoading: false,
        deliveryAddress: null,
        savedAddressCount: 0,
        selectedPayMethod: "",
        selectedCoupon: null,
        selectedUserCouponId: null,
        availableCoupons: [],
        payMethods: [],
      };
    },
    computed: {
      rawTotal() {
        return this.items.reduce(
          (sum, item) =>
            sum + (Number(item.price) || 0) * (Number(item.qty) || 0),
          0,
        );
      },
      bizType() {
        const shop = this.shop && typeof this.shop === "object" ? this.shop : {};
        return normalizeBizType(
          shop.merchantType || shop.merchant_type || shop.orderType,
        );
      },
      packagingFee() {
        return 1;
      },
      deliveryPrice() {
        if (!this.shop) return 0;
        const value = Number(this.shop.deliveryPrice);
        return Number.isFinite(value) ? value : 0;
      },
      discountAmount() {
        if (!this.selectedCoupon) return 0;
        const coupon = this.selectedCoupon;
        if (this.rawTotal < Number(coupon.minAmount || 0)) return 0;
        if (coupon.type === "fixed") {
          return Math.min(Number(coupon.amount || 0), this.rawTotal);
        }
        if (coupon.type === "percent") {
          const discount = this.rawTotal * (Number(coupon.amount || 0) / 100);
          const maxDiscount = Number(coupon.maxDiscount || 0);
          return maxDiscount > 0 ? Math.min(discount, maxDiscount) : discount;
        }
        return 0;
      },
      finalTotal() {
        return Math.max(
          0,
          this.rawTotal + this.packagingFee + this.deliveryPrice - this.discountAmount,
        );
      },
      finalTotalDisplay() {
        return (Number(this.finalTotal) || 0).toFixed(2);
      },
      deliveryAddressTitle() {
        if (!this.deliveryAddress) return "请选择收货地址";
        return this.detailParts(this.deliveryAddress.detail).place;
      },
      deliveryAddressSubtitle() {
        if (!this.deliveryAddress) {
          return this.savedAddressCount > 0
            ? "请选择一个收货地址后再提交订单"
            : "暂无收货地址，点击前往新增";
        }
        const parts = this.detailParts(this.deliveryAddress.detail);
        const contact = [this.deliveryAddress.name, this.deliveryAddress.phone]
          .filter(Boolean)
          .join(" ");
        return [parts.area, contact].filter(Boolean).join(" · ");
      },
      deliveryAddressPayload() {
        if (!this.deliveryAddress) return "";
        return [
          this.deliveryAddress.detail,
          this.deliveryAddress.name,
          this.deliveryAddress.phone,
        ]
          .filter(Boolean)
          .join(" ");
      },
      deliveryScheduleTitle() {
        return this.bizType === "groupbuy" ? "到店核销" : "立即送出";
      },
      deliveryScheduleSubtitle() {
        return this.bizType === "groupbuy"
          ? "下单后自动发券，可到店使用"
          : "预计 30 分钟内送达";
      },
      remarkText() {
        return String(this.orderState.remark || "").trim();
      },
      tablewareText() {
        switch (this.orderState.tableware) {
          case 0:
            return "不需要餐具";
          case 1:
            return "1 套";
          case 2:
            return "2 套";
          case 3:
            return "3 套以上";
          default:
            return "";
        }
      },
      couponSummaryText() {
        if (this.selectedCoupon) {
          return `已选 ${this.selectedCoupon.name || "优惠券"} -￥${this.discountAmount.toFixed(2)}`;
        }
        if (this.availableCoupons.length > 0) {
          return `${this.availableCoupons.length} 张可用`;
        }
        return "暂无可用";
      },
    },
    async onLoad(query) {
      if (!hasConsumerStoredAuthMode({ uniApp: uni })) {
        uni.redirectTo({ url: "/pages/auth/login/index" });
        return;
      }

      await this.syncDeliveryAddress();

      const safeQuery = query && typeof query === "object" ? query : {};
      const shopId = String(safeQuery.shopId || "").trim();
      const cartStr = safeQuery.cart;
      if (!shopId || !cartStr) {
        uni.showToast({ title: "参数错误", icon: "none" });
        setTimeout(() => uni.navigateBack(), 1500);
        return;
      }

      try {
        uni.showLoading({ title: "加载中..." });
        const shopData =
          typeof fetchShopDetail === "function" ? await fetchShopDetail(shopId) : null;
        if (shopData) {
          this.shop = shopData;
        }

        const cartObj = JSON.parse(decodeURIComponent(cartStr));
        const productIds = [...new Set(Object.keys(cartObj).map((id) => String(id)))];
        const products = await Promise.all(
          productIds.map((id) =>
            typeof fetchProductDetail === "function"
              ? fetchProductDetail(id).catch((error) => {
                  console.error(`加载商品 ${id} 失败:`, error);
                  return null;
                })
              : Promise.resolve(null),
          ),
        );

        this.items = products
          .filter(Boolean)
          .map((product) => {
            const qty = Number(cartObj[product.id] || cartObj[String(product.id)] || 0);
            if (qty <= 0) return null;
            return {
              id: String(product.id),
              name: product.name,
              qty,
              price: Number(product.price) || 0,
              image: product.image || "",
            };
          })
          .filter(Boolean);

        await this.loadAvailableCoupons(shopId);
        await this.loadPaymentOptions();
      } catch (error) {
        console.error("加载订单信息失败:", error);
        uni.showToast({ title: "加载失败", icon: "none" });
      } finally {
        uni.hideLoading();
        this.loading = false;
      }
    },
    onShow() {
      void this.syncDeliveryAddress();
    },
    methods: {
      itemTotal(item) {
        return (
          ((Number(item.price) || 0) * (Number(item.qty) || 0)) ||
          0
        )
          .toFixed(2);
      },
      async loadPaymentOptions() {
        this.paymentOptionsLoading = true;
        try {
          const response = await request({
            url: "/api/payment/options",
            method: "GET",
            data: {
              userType: "customer",
              platform,
              scene: "order_payment",
            },
          });
          this.payMethods = normalizeOrderPayMethods(response, { platform });
        } catch (error) {
          console.error("加载订单支付方式失败:", error);
          this.payMethods = fallbackOrderPayMethods({ platform });
        } finally {
          const availableValues = this.payMethods.map((item) => item.value);
          if (!availableValues.includes(this.selectedPayMethod)) {
            this.selectedPayMethod = availableValues[0] || "";
          }
          this.paymentOptionsLoading = false;
        }
      },
      payMethodLabel(value) {
        const matched = this.payMethods.find((item) => item.value === value);
        return (matched && matched.label) || "未选择";
      },
      detailParts(detail) {
        const text = String(detail || "").trim();
        if (!text) return { area: "收货地址", place: "请完善收货地址" };
        const firstGap = text.indexOf(" ");
        if (firstGap === -1) return { area: "收货地址", place: text };
        const area = text.slice(0, firstGap).trim();
        const place = text.slice(firstGap + 1).trim() || area;
        return { area, place };
      },
      async syncDeliveryAddress() {
        const cachedAddresses = normalizeAddresses(uni.getStorageSync("addresses"));
        let addresses = cachedAddresses;
        const profile = readConsumerStoredProfile({ uniApp: uni });
        const userId = String(
          profile.id || profile.userId || profile.phone || "",
        ).trim();

        if (userId && typeof fetchUserAddresses === "function") {
          try {
            const serverAddresses = normalizeAddresses(
              await fetchUserAddresses(userId),
            );
            if (serverAddresses.length > 0 || cachedAddresses.length === 0) {
              addresses = serverAddresses;
            }
            if (serverAddresses.length > 0) {
              uni.setStorageSync("addresses", serverAddresses);
            }
          } catch (error) {
            console.error("同步收货地址失败:", error);
          }
        }

        const selectedAddressId = String(
          uni.getStorageSync("selectedAddressId") || "",
        ).trim();
        const selectedAddress = String(
          uni.getStorageSync("selectedAddress") || "",
        ).trim();
        this.savedAddressCount = addresses.length;

        let matched = null;
        if (selectedAddressId) {
          matched = addresses.find((addr) => addr.id === selectedAddressId) || null;
        }
        if (!matched && selectedAddress) {
          matched = addresses.find((addr) => addr.detail === selectedAddress) || null;
        }
        if (!matched) {
          matched = addresses.find((addr) => addr.isDefault) || null;
        }
        if (!matched && addresses.length === 1) {
          matched = addresses[0];
        }

        if (matched) {
          uni.setStorageSync("selectedAddressId", matched.id);
          uni.setStorageSync("selectedAddress", matched.detail);
        } else {
          uni.removeStorageSync("selectedAddressId");
          uni.removeStorageSync("selectedAddress");
        }

        this.deliveryAddress = matched;
      },
      goAddressList() {
        uni.navigateTo({ url: "/pages/profile/address-list/index?select=1" });
      },
      isHtmlErrorPayload(payload) {
        return isHtmlErrorPayload(payload);
      },
      extractErrorMessage(error) {
        const rawMessage = resolveErrorMessage(error, "");
        return typeof rawMessage === "string" ? rawMessage.trim() : "";
      },
      sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
      },
      normalizePaymentStatus(payload) {
        return String((payload && payload.status) || "").trim().toLowerCase();
      },
      isPaymentSuccessStatus(status) {
        return ["success", "completed", "paid"].includes(
          String(status || "").trim().toLowerCase(),
        );
      },
      isPaymentFailureStatus(status) {
        return ["failed", "rejected", "cancelled", "closed"].includes(
          String(status || "").trim().toLowerCase(),
        );
      },
      orderDetailUrl(orderId) {
        return `/pages/order/detail/index?id=${encodeURIComponent(
          String(orderId || ""),
        )}`;
      },
      async pollOrderPaymentStatus(transactionId, userId, token) {
        let latest = null;
        for (let attempt = 0; attempt < 8; attempt += 1) {
          latest = await request({
            url: `/api/wallet/transactions/${encodeURIComponent(
              String(transactionId || ""),
            )}`,
            method: "GET",
            data: {
              userId,
              userType: "customer",
            },
            header: buildAuthHeader(token),
          });
          const status = this.normalizePaymentStatus(latest);
          if (
            this.isPaymentSuccessStatus(status) ||
            this.isPaymentFailureStatus(status)
          ) {
            return latest;
          }
          await this.sleep(1500);
        }
        return latest;
      },
      async loadAvailableCoupons(shopId) {
        try {
          const profile = readConsumerStoredProfile({ uniApp: uni });
          const userId = resolveConsumerOrderCouponUserId(profile);
          if (!userId) return;

          const response = await request({
            url: "/api/coupons/available",
            method: "GET",
            data: {
              userId: String(userId),
              shopId,
              orderAmount: this.rawTotal,
            },
          });

          this.availableCoupons = extractConsumerAvailableOrderCoupons(response);
        } catch (error) {
          const htmlPayload =
            (error && error.data && error.data.data) || (error && error.data);
          if (!this.isHtmlErrorPayload(htmlPayload)) {
            console.error("加载优惠券失败:", error);
          }
        }
      },
      createIdempotencyKey(prefix, userId) {
        const seed = `${Date.now()}${Math.floor(Math.random() * 1000000)}`;
        return `${prefix}_${String(userId || "guest")}_${seed}`;
      },
      payChannelByMethod(method) {
        if (method === "wechat") return "wxpay";
        if (method === "alipay") return "alipay";
        return "ifpay";
      },
      async payOrder(orderId, userId, token) {
        const idempotencyKey = this.createIdempotencyKey("orderpay", userId);
        return request({
          url: "/api/payment/intent",
          method: "POST",
          data: {
            userId,
            userType: "customer",
            platform,
            orderId: String(orderId),
            amount: Math.round((Number(this.finalTotal) || 0) * 100),
            paymentMethod: this.selectedPayMethod,
            paymentChannel: this.payChannelByMethod(this.selectedPayMethod),
            idempotencyKey,
          },
          header: {
            ...buildAuthHeader(token),
            "Idempotency-Key": idempotencyKey,
          },
        });
      },
      async submitOrder() {
        if (this.submitting) return;
        if (!this.deliveryAddress) {
          uni.showToast({
            title:
              this.savedAddressCount > 0
                ? "请先选择收货地址"
                : "请先新增收货地址",
            icon: "none",
          });
          setTimeout(() => this.goAddressList(), 300);
          return;
        }

        const profile = readConsumerStoredProfile({ uniApp: uni });
        const userId = resolveConsumerOrderCouponUserId(profile);
        const token = uni.getStorageSync("token") || "";
        if (!this.selectedPayMethod) {
          uni.showToast({ title: "当前没有可用支付方式", icon: "none" });
          return;
        }
        const payload = {
          shopId: this.shop ? String(this.shop.id || "").trim() : "",
          shopName: this.shop ? this.shop.name : "Unknown Shop",
          bizType: this.bizType,
          items: this.items.map((item) => `${item.name} x${item.qty}`).join(", "),
          price: Number(this.finalTotal) || 0,
          originalPrice: Number(this.rawTotal) || 0,
          discountAmount: Number(this.discountAmount) || 0,
          userCouponId: this.selectedUserCouponId || null,
          remark: this.remarkText,
          tableware: this.tablewareText,
          addressId: this.deliveryAddress.id,
          address: this.deliveryAddressPayload,
          name: this.deliveryAddress.name,
          userId: String(userId),
          phone: this.deliveryAddress.phone || profile.phone || "",
        };

        this.submitting = true;
        uni.showLoading({ title: "提交中..." });
        let createdOrderId = "";
        try {
          const result = await createOrder(payload);
          if (!result || !result.id) {
            throw new Error("订单创建失败");
          }
          createdOrderId = String(result.id);

          let paymentResult = await this.payOrder(result.id, userId, token);
          if (canLaunchClientPayment(paymentResult)) {
            uni.showLoading({ title: "正在拉起支付", mask: true });
            try {
              await launchClientPayment(paymentResult, platform);
            } finally {
              uni.hideLoading();
            }
          }

          let paymentStatus = this.normalizePaymentStatus(paymentResult);
          if (
            !this.isPaymentSuccessStatus(paymentStatus) &&
            !this.isPaymentFailureStatus(paymentStatus) &&
            paymentResult &&
            paymentResult.transactionId
          ) {
            uni.showLoading({ title: "正在确认支付状态", mask: true });
            try {
              paymentResult = await this.pollOrderPaymentStatus(
                paymentResult.transactionId,
                userId,
                token,
              );
            } finally {
              uni.hideLoading();
            }
            paymentStatus = this.normalizePaymentStatus(paymentResult);
          }

          if (!this.isPaymentSuccessStatus(paymentStatus)) {
            uni.showToast({
              title: this.isPaymentFailureStatus(paymentStatus)
                ? "支付失败，请稍后重试"
                : "订单已创建，可在订单详情继续支付",
              icon: "none",
            });
            setTimeout(() => {
              uni.navigateTo({ url: this.orderDetailUrl(createdOrderId) });
            }, 220);
            return;
          }

          const multiplier = Number(uni.getStorageSync("vipPointsMultiplier")) || 1;
          const orderTotal = Number(this.finalTotal) || 0;
          if (userId && result.id && typeof earnPoints === "function") {
            earnPoints({
              userId,
              orderId: String(result.id),
              amount: orderTotal,
              multiplier,
            })
              .then((pointsRes) => {
                if (pointsRes && typeof pointsRes.balance === "number") {
                  uni.setStorageSync("pointsBalance", pointsRes.balance);
                }
              })
              .catch(() => {});
          }

          uni.navigateTo({
            url: `/pages/pay/success/index?orderId=${encodeURIComponent(createdOrderId)}`,
          });
        } catch (error) {
          if (createdOrderId && isPaymentCancelled(error)) {
            uni.showToast({
              title: "已取消支付，可在订单详情继续支付",
              icon: "none",
            });
            setTimeout(() => {
              uni.navigateTo({ url: this.orderDetailUrl(createdOrderId) });
            }, 220);
            return;
          }
          const message = this.extractErrorMessage(error);
          const isInsufficientBalance = /insufficient balance|available balance is not enough|余额不足/i.test(
            message,
          );
          if (isInsufficientBalance && this.selectedPayMethod === "ifpay") {
            uni.showToast({
              title: "余额不足，请先充值或改用其他支付方式",
              icon: "none",
            });
            if (createdOrderId) {
              setTimeout(() => {
                uni.navigateTo({ url: this.orderDetailUrl(createdOrderId) });
              }, 220);
            }
            return;
          }
          console.error("支付失败:", error);
          uni.showToast({
            title: message || resolvePaymentErrorMessage(error),
            icon: "none",
          });
          if (createdOrderId) {
            setTimeout(() => {
              uni.navigateTo({ url: this.orderDetailUrl(createdOrderId) });
            }, 220);
          }
        } finally {
          uni.hideLoading();
          this.submitting = false;
        }
      },
      goRemark() {
        uni.navigateTo({ url: "/pages/order/remark/index" });
      },
      goTableware() {
        uni.navigateTo({ url: "/pages/order/tableware/index" });
      },
      goCoupon() {
        if (this.availableCoupons.length === 0) {
          uni.showToast({ title: "暂无可用优惠券", icon: "none" });
          return;
        }
        uni.navigateTo({
          url: `/pages/order/coupon/index?shopId=${this.shop.id}&amount=${this.rawTotal}`,
        });
      },
    },
  };
}
