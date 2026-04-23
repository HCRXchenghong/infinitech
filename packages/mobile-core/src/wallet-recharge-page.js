import { getWalletRechargeRuntimeProfile } from "./mobile-client-context.js";
import {
  buildWalletQuery,
  createWalletIdempotencyKey,
  fenToWalletYuan,
  getWalletStatusBarHeight,
  isWalletFailureStatus,
  isWalletRechargeSuccessStatus,
  normalizeWalletFlowStatus,
  normalizeWalletOptions,
  normalizeWalletText,
  navigateWalletBack,
  readConsumerWalletAuth,
  resolveWalletField,
  resolveWalletUniRuntime,
  showWalletLoading,
  showWalletToast,
  hideWalletLoading,
} from "./wallet-shared.js";

export function createWalletRechargePageLogic(options = {}) {
  const {
    request,
    buildAuthorizationHeader,
    getClientPaymentErrorMessage,
    invokeClientPayment,
    isClientPaymentCancelled,
    shouldLaunchClientPayment,
    getAuth,
    userType = "customer",
    platform,
    clientPaymentPlatform,
    idempotencyKeyPrefix,
    rechargeDescription,
    presets = [20, 50, 100, 200, 500, 1000],
    uniApp,
    setTimeoutFn,
    sleepFn,
    nowFn,
    randomFn,
  } = options;
  const runtimeUni = resolveWalletUniRuntime(uniApp);
  const runtimeProfile = getWalletRechargeRuntimeProfile({
    userType,
    rawPlatform: platform || clientPaymentPlatform,
  });
  const resolvedPlatform = platform || runtimeProfile.platform;
  const resolvedClientPaymentPlatform =
    clientPaymentPlatform || runtimeProfile.clientPaymentPlatform;
  const resolvedIdempotencyKeyPrefix =
    idempotencyKeyPrefix || runtimeProfile.idempotencyKeyPrefix;
  const resolvedRechargeDescription =
    rechargeDescription || runtimeProfile.rechargeDescription;
  const resolveAuthHeader =
    typeof buildAuthorizationHeader === "function"
      ? buildAuthorizationHeader
      : () => ({});
  const resolveAuth =
    typeof getAuth === "function"
      ? getAuth
      : () => {
          const auth = readConsumerWalletAuth(runtimeUni);
          return {
            userId: normalizeWalletText(auth.userId),
            token: normalizeWalletText(auth.token),
          };
        };
  const resolvePaymentErrorMessage =
    typeof getClientPaymentErrorMessage === "function"
      ? getClientPaymentErrorMessage
      : (_error, fallback = "充值失败") => fallback;
  const canLaunchClientPayment =
    typeof shouldLaunchClientPayment === "function"
      ? shouldLaunchClientPayment
      : () => false;
  const launchClientPayment =
    typeof invokeClientPayment === "function"
      ? invokeClientPayment
      : async () => {};
  const isPaymentCancelled =
    typeof isClientPaymentCancelled === "function"
      ? isClientPaymentCancelled
      : () => false;
  const scheduleTimeout =
    typeof setTimeoutFn === "function"
      ? setTimeoutFn
      : typeof globalThis.setTimeout === "function"
        ? globalThis.setTimeout.bind(globalThis)
        : (callback) => {
            callback();
            return 0;
          };
  const waitFor =
    typeof sleepFn === "function"
      ? sleepFn
      : (ms) =>
          new Promise((resolve) => {
            scheduleTimeout(resolve, ms);
          });

  return {
    data() {
      return {
        statusBarHeight: 44,
        loadingBalance: false,
        loadingOptions: false,
        submitting: false,
        balance: 0,
        amountCustom: "",
        selectedAmount: 100,
        selectedMethod: "",
        paymentOptions: [],
        presets:
          Array.isArray(presets) && presets.length > 0
            ? presets.slice()
            : [20, 50, 100, 200, 500, 1000],
      };
    },
    computed: {
      topPadding() {
        return Number(this.statusBarHeight || 44) + 8;
      },
      amountYuan() {
        const custom = parseFloat(this.amountCustom);
        if (!Number.isNaN(custom) && custom > 0) {
          return custom;
        }
        return Number(this.selectedAmount || 0);
      },
      canSubmit() {
        return this.amountYuan > 0 && !!this.selectedMethod && !this.submitting;
      },
    },
    onLoad() {
      this.statusBarHeight = getWalletStatusBarHeight(runtimeUni);
    },
    onShow() {
      void this.loadPageData();
    },
    methods: {
      normalizeText(value) {
        return normalizeWalletText(value);
      },
      getAuth() {
        return resolveAuth.call(this);
      },
      getAuthHeader(token) {
        return resolveAuthHeader(token);
      },
      withQuery(path, params) {
        return buildWalletQuery(path, params);
      },
      resolveField(data, key, fallback = 0) {
        return resolveWalletField(data, key, fallback);
      },
      normalizeOptions(payload) {
        return normalizeWalletOptions(payload);
      },
      fen2yuan(fen) {
        return fenToWalletYuan(fen);
      },
      createIdempotencyKey(prefix, userId) {
        return createWalletIdempotencyKey(prefix, userId, {
          nowFn,
          randomFn,
        });
      },
      goBack() {
        navigateWalletBack(runtimeUni);
      },
      selectPreset(amount) {
        this.selectedAmount = amount;
        this.amountCustom = "";
      },
      async loadPageData() {
        const { userId, token } = this.getAuth();
        if (!userId || typeof request !== "function") {
          return;
        }

        const header = this.getAuthHeader(token);
        this.loadingBalance = true;
        this.loadingOptions = true;
        try {
          const [balanceRes, optionsRes] = await Promise.all([
            request({
              url: this.withQuery("/api/wallet/balance", {
                userId,
                userType,
                user_id: userId,
                user_type: userType,
              }),
              method: "GET",
              header,
            }),
            request({
              url: this.withQuery("/api/wallet/recharge/options", {
                userType,
                platform: resolvedPlatform,
                scene: "wallet_recharge",
              }),
              method: "GET",
              header,
            }),
          ]);

          this.balance = Number(this.resolveField(balanceRes, "balance", 0));
          this.paymentOptions = this.normalizeOptions(optionsRes);
          if (!this.selectedMethod && this.paymentOptions.length > 0) {
            this.selectedMethod = this.paymentOptions[0].channel;
          }
        } catch (error) {
          showWalletToast(runtimeUni, {
            title: error.error || "充值页面加载失败",
            icon: "none",
          });
        } finally {
          this.loadingBalance = false;
          this.loadingOptions = false;
        }
      },
      sleep(ms) {
        return waitFor(ms);
      },
      normalizeFlowStatus(payload, nestedKey) {
        return normalizeWalletFlowStatus(payload, nestedKey);
      },
      isRechargeSuccessStatus(status) {
        return isWalletRechargeSuccessStatus(status);
      },
      isRechargeFailureStatus(status) {
        return isWalletFailureStatus(status);
      },
      async pollRechargeStatus(rechargeOrderId, transactionId, token) {
        const { userId } = this.getAuth();
        let latest = null;
        for (let attempt = 0; attempt < 8; attempt += 1) {
          latest = await request({
            url: this.withQuery("/api/wallet/recharge/status", {
              userId,
              userType,
              rechargeOrderId,
              transactionId,
            }),
            method: "GET",
            header: this.getAuthHeader(token),
          });
          const status = this.normalizeFlowStatus(latest, "recharge");
          if (
            this.isRechargeSuccessStatus(status) ||
            this.isRechargeFailureStatus(status)
          ) {
            return latest;
          }
          await this.sleep(1500);
        }
        return latest;
      },
      async submitRecharge() {
        const { userId, token } = this.getAuth();
        if (!userId) {
          showWalletToast(runtimeUni, { title: "请先登录", icon: "none" });
          return;
        }
        if (!this.canSubmit) {
          showWalletToast(runtimeUni, {
            title: "请输入有效金额并选择充值渠道",
            icon: "none",
          });
          return;
        }
        if (typeof request !== "function") {
          return;
        }

        this.submitting = true;
        try {
          const idempotencyKey = this.createIdempotencyKey(
            resolvedIdempotencyKeyPrefix,
            userId,
          );
          const result = await request({
            url: "/api/wallet/recharge/intent",
            method: "POST",
            data: {
              userId,
              userType,
              amount: Math.round(this.amountYuan * 100),
              platform: resolvedPlatform,
              paymentMethod: this.selectedMethod,
              paymentChannel: this.selectedMethod,
              description: resolvedRechargeDescription,
              idempotencyKey,
            },
            header: {
              ...this.getAuthHeader(token),
              "Idempotency-Key": idempotencyKey,
            },
          });

          if (canLaunchClientPayment(result)) {
            showWalletLoading(runtimeUni, { title: "正在拉起支付", mask: true });
            try {
              await launchClientPayment(result, resolvedClientPaymentPlatform);
            } finally {
              hideWalletLoading(runtimeUni);
            }
          }

          let latest = result;
          let status = this.normalizeFlowStatus(latest, "recharge");
          if (
            !this.isRechargeSuccessStatus(status) &&
            !this.isRechargeFailureStatus(status) &&
            ((result && result.rechargeOrderId) ||
              (result && result.transactionId))
          ) {
            showWalletLoading(runtimeUni, {
              title: "正在确认充值状态",
              mask: true,
            });
            try {
              latest = await this.pollRechargeStatus(
                result && result.rechargeOrderId,
                result && result.transactionId,
                token,
              );
            } finally {
              hideWalletLoading(runtimeUni);
            }
            status = this.normalizeFlowStatus(latest, "recharge");
          }

          if (this.isRechargeSuccessStatus(status)) {
            showWalletToast(runtimeUni, { title: "充值成功", icon: "success" });
          } else if (this.isRechargeFailureStatus(status)) {
            showWalletToast(runtimeUni, {
              title: "充值失败，请稍后重试",
              icon: "none",
            });
          } else {
            showWalletToast(runtimeUni, {
              title: "充值请求已提交，可在钱包明细查看状态",
              icon: "none",
            });
          }

          scheduleTimeout(() => {
            navigateWalletBack(runtimeUni);
          }, 360);
        } catch (error) {
          showWalletToast(runtimeUni, {
            title: isPaymentCancelled(error)
              ? "已取消支付"
              : error.error || resolvePaymentErrorMessage(error, "充值失败"),
            icon: "none",
          });
        } finally {
          this.submitting = false;
        }
      },
    },
  };
}
