import { getWalletWithdrawRuntimeProfile } from "./mobile-client-context.js";
import {
  buildWalletQuery,
  createWalletIdempotencyKey,
  fenToWalletYuan,
  getWalletStatusBarHeight,
  isWalletFailureStatus,
  isWalletWithdrawSuccessStatus,
  normalizeWalletArrivalText,
  normalizeWalletFlowStatus,
  normalizeWalletOptions,
  normalizeWalletText,
  normalizeWalletWithdrawFailureReason,
  navigateWalletBack,
  readConsumerWalletAuth,
  resolveWalletField,
  resolveWalletUniRuntime,
  showWalletLoading,
  showWalletModal,
  showWalletToast,
  hideWalletLoading,
  walletFlowStatusLabel,
} from "./wallet-shared.js";

export function createWalletWithdrawPageLogic(options = {}) {
  const {
    request,
    buildAuthorizationHeader,
    getAuth,
    getWithdrawName,
    userType = "customer",
    platform,
    idempotencyKeyPrefix,
    presets = [20, 50, 100, 200, 500],
    rejectedReasonFallback = "可重新申请或联系客服处理",
    uniApp,
    setTimeoutFn,
    sleepFn,
    nowFn,
    randomFn,
  } = options;
  const runtimeUni = resolveWalletUniRuntime(uniApp);
  const runtimeProfile = getWalletWithdrawRuntimeProfile({
    userType,
    rawPlatform: platform,
  });
  const resolvedPlatform = platform || runtimeProfile.platform;
  const resolvedIdempotencyKeyPrefix =
    idempotencyKeyPrefix || runtimeProfile.idempotencyKeyPrefix;
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
            userName: normalizeWalletText(auth.userName),
            token: normalizeWalletText(auth.token),
          };
        };
  const resolveWithdrawName =
    typeof getWithdrawName === "function"
      ? getWithdrawName
      : (auth) => auth.userName || "用户";
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
        withdrawAmount: "",
        withdrawAccount: "",
        withdrawName: "",
        bankName: "",
        bankBranch: "",
        selectedMethod: "",
        withdrawOptions: [],
        presets:
          Array.isArray(presets) && presets.length > 0
            ? presets.slice()
            : [20, 50, 100, 200, 500],
      };
    },
    computed: {
      topPadding() {
        return Number(this.statusBarHeight || 44) + 8;
      },
      amountYuan() {
        const value = parseFloat(this.withdrawAmount);
        return Number.isNaN(value) ? 0 : value;
      },
      balanceYuan() {
        return Number(this.balance || 0) / 100;
      },
      selectedOption() {
        return (
          this.withdrawOptions.find(
            (item) => item.channel === this.selectedMethod,
          ) || null
        );
      },
      requiresName() {
        return !!(this.selectedOption && this.selectedOption.requiresName);
      },
      requiresBankName() {
        return !!(this.selectedOption && this.selectedOption.requiresBankName);
      },
      requiresBankBranch() {
        return !!(this.selectedOption && this.selectedOption.requiresBankBranch);
      },
      accountPlaceholder() {
        return (
          (this.selectedOption && this.selectedOption.accountPlaceholder) ||
          "请输入收款账号"
        );
      },
      namePlaceholder() {
        return (
          (this.selectedOption && this.selectedOption.namePlaceholder) ||
          "请输入收款人姓名（选填）"
        );
      },
      bankNamePlaceholder() {
        return (
          (this.selectedOption && this.selectedOption.bankNamePlaceholder) ||
          "请输入开户银行"
        );
      },
      bankBranchPlaceholder() {
        return (
          (this.selectedOption && this.selectedOption.bankBranchPlaceholder) ||
          "请输入开户支行"
        );
      },
      canSubmit() {
        if (
          !this.selectedMethod ||
          this.amountYuan <= 0 ||
          this.amountYuan > this.balanceYuan ||
          this.submitting
        ) {
          return false;
        }
        if (!String(this.withdrawAccount || "").trim()) {
          return false;
        }
        if (this.requiresName && !String(this.withdrawName || "").trim()) {
          return false;
        }
        if (this.requiresBankName && !String(this.bankName || "").trim()) {
          return false;
        }
        if (this.requiresBankBranch && !String(this.bankBranch || "").trim()) {
          return false;
        }
        return true;
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
        this.withdrawAmount = String(amount);
      },
      withdrawAll() {
        this.withdrawAmount =
          this.balanceYuan > 0 ? this.balanceYuan.toFixed(2) : "";
      },
      selectMethod(channel) {
        this.selectedMethod = channel;
        if (channel !== "bank_card") {
          this.bankName = "";
          this.bankBranch = "";
        }
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
              url: this.withQuery("/api/wallet/withdraw/options", {
                userType,
                platform: resolvedPlatform,
              }),
              method: "GET",
              header,
            }),
          ]);

          this.balance = Number(this.resolveField(balanceRes, "balance", 0));
          this.withdrawOptions = this.normalizeOptions(optionsRes);
          if (!this.selectedMethod && this.withdrawOptions.length > 0) {
            this.selectedMethod = this.withdrawOptions[0].channel;
          }
        } catch (error) {
          showWalletToast(runtimeUni, {
            title: error.error || "提现页面加载失败",
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
      normalizeArrivalText(payload, nestedKey) {
        return normalizeWalletArrivalText(payload, nestedKey);
      },
      normalizeWithdrawFailureReason(payload, nestedKey) {
        return normalizeWalletWithdrawFailureReason(payload, nestedKey);
      },
      isWithdrawSuccessStatus(status) {
        return isWalletWithdrawSuccessStatus(status);
      },
      isWithdrawFailureStatus(status) {
        return isWalletFailureStatus(status);
      },
      flowStatusLabel(status) {
        return walletFlowStatusLabel(status);
      },
      async pollWithdrawStatus(requestId, transactionId, token) {
        const { userId } = this.getAuth();
        let latest = null;
        for (let attempt = 0; attempt < 5; attempt += 1) {
          const statusUrl = requestId
            ? this.withQuery(
                `/api/wallet/withdraw/status/${encodeURIComponent(
                  String(requestId),
                )}`,
                {
                  userId,
                  userType,
                  transactionId,
                },
              )
            : this.withQuery("/api/wallet/withdraw/status", {
                userId,
                userType,
                transactionId,
              });
          latest = await request({
            url: statusUrl,
            method: "GET",
            header: this.getAuthHeader(token),
          });
          const status = this.normalizeFlowStatus(latest, "withdraw");
          if (
            this.isWithdrawSuccessStatus(status) ||
            this.isWithdrawFailureStatus(status)
          ) {
            return latest;
          }
          await this.sleep(1500);
        }
        return latest;
      },
      async submitWithdraw() {
        const auth = this.getAuth();
        const { userId, token } = auth;
        if (!userId) {
          showWalletToast(runtimeUni, { title: "请先登录", icon: "none" });
          return;
        }
        if (!this.canSubmit) {
          showWalletToast(runtimeUni, {
            title: "请完整填写提现信息",
            icon: "none",
          });
          return;
        }
        if (typeof request !== "function") {
          return;
        }

        this.submitting = true;
        try {
          const preview = await request({
            url: "/api/wallet/withdraw/fee-preview",
            method: "POST",
            data: {
              userId,
              userType,
              amount: Math.round(this.amountYuan * 100),
              withdrawMethod: this.selectedMethod,
              platform: resolvedPlatform,
            },
            header: this.getAuthHeader(token),
          });

          const fee = this.resolveField(preview, "fee", 0);
          const actualAmount = this.resolveField(preview, "actualAmount", 0);
          const arrivalText =
            this.normalizeArrivalText(preview, "withdraw") || "以通道处理为准";
          const confirmed = await showWalletModal(runtimeUni, {
            title: "确认提现",
            content: `手续费 ¥${this.fen2yuan(fee)}，预计到账 ¥${this.fen2yuan(actualAmount)}，到账时效：${arrivalText}`,
          });
          if (!confirmed.confirm) {
            return;
          }

          const idempotencyKey = this.createIdempotencyKey(
            resolvedIdempotencyKeyPrefix,
            userId,
          );
          const result = await request({
            url: "/api/wallet/withdraw/apply",
            method: "POST",
            data: {
              userId,
              userType,
              amount: Math.round(this.amountYuan * 100),
              platform: resolvedPlatform,
              withdrawMethod: this.selectedMethod,
              withdrawAccount: this.withdrawAccount,
              withdrawName: this.withdrawName || resolveWithdrawName(auth),
              bankName: this.bankName,
              bankBranch: this.bankBranch,
              idempotencyKey,
            },
            header: {
              ...this.getAuthHeader(token),
              "Idempotency-Key": idempotencyKey,
            },
          });

          let latest = result;
          let status = this.normalizeFlowStatus(latest, "withdraw");
          if (
            !this.isWithdrawSuccessStatus(status) &&
            !this.isWithdrawFailureStatus(status) &&
            ((result && result.withdrawRequestId) ||
              (result && result.transactionId))
          ) {
            showWalletLoading(runtimeUni, {
              title: "正在确认提现状态",
              mask: true,
            });
            try {
              latest = await this.pollWithdrawStatus(
                result && result.withdrawRequestId,
                result && result.transactionId,
                token,
              );
            } finally {
              hideWalletLoading(runtimeUni);
            }
            status = this.normalizeFlowStatus(latest, "withdraw");
          }

          if (this.isWithdrawSuccessStatus(status)) {
            showWalletToast(runtimeUni, { title: "提现成功", icon: "success" });
          } else if (this.isWithdrawFailureStatus(status)) {
            const reason = this.normalizeWithdrawFailureReason(latest, "withdraw");
            if (status === "rejected") {
              await showWalletModal(runtimeUni, {
                title: "提现已驳回",
                content: reason || rejectedReasonFallback,
                showCancel: false,
              });
            } else {
              showWalletToast(runtimeUni, {
                title: reason ? `提现失败：${reason}` : "提现失败，请稍后重试",
                icon: "none",
              });
            }
          } else {
            const currentArrivalText = this.normalizeArrivalText(latest, "withdraw");
            showWalletToast(runtimeUni, {
              title: currentArrivalText
                ? `提现处理中，${currentArrivalText}`
                : `提现已提交，当前状态：${this.flowStatusLabel(status)}`,
              icon: "none",
            });
          }

          scheduleTimeout(() => {
            navigateWalletBack(runtimeUni);
          }, 360);
        } catch (error) {
          showWalletToast(runtimeUni, {
            title: error.error || "提现失败",
            icon: "none",
          });
        } finally {
          this.submitting = false;
        }
      },
    },
  };
}
