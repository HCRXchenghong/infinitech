import {
  buildWalletQuery,
  createWalletIdempotencyKey,
  fenToWalletYuan,
  formatWalletDateTime,
  getWalletStatusBarHeight,
  hideWalletLoading,
  isWalletFailureStatus,
  isWalletRechargeSuccessStatus,
  navigateWalletTo,
  normalizeWalletArrivalText,
  normalizeWalletFlowStatus,
  normalizeWalletOptions,
  normalizeWalletText,
  resolveWalletField,
  resolveWalletUniRuntime,
  showWalletActionSheet,
  showWalletLoading,
  showWalletModal,
  showWalletToast,
} from "./wallet-shared.js";

function resolveRiderDepositStatus(payload) {
  const candidates = [
    payload,
    payload && payload.data,
    payload && payload.data && payload.data.data,
  ].filter(
    (item) => item && typeof item === "object" && !Array.isArray(item),
  );

  return (
    candidates.find((item) =>
      [
        "status",
        "amount",
        "unlockDays",
        "canAcceptOrders",
        "lastAcceptedAt",
        "withdrawableAt",
      ].some((key) => item[key] !== undefined && item[key] !== null),
    ) || null
  );
}

function resolveRiderDepositStatusText(statusValue) {
  return (
    {
      unpaid: "待缴纳",
      paid_locked: "已锁定",
      withdrawable: "可提现",
      withdrawing: "提现中",
      refunded: "已退回",
    }[normalizeWalletText(statusValue).toLowerCase()] || "处理中"
  );
}

function resolveRiderDepositTip(statusValue) {
  switch (normalizeWalletText(statusValue).toLowerCase()) {
    case "withdrawable":
      return "当前满足 7 天未接单且无进行中订单，可发起保证金提现。";
    case "withdrawing":
      return "保证金提现正在处理中，到账后将失去接单资格。";
    case "paid_locked":
      return "保证金已生效，可正常接单。最近 7 天内有接单或仍有进行中订单时，暂不可提现。";
    case "refunded":
      return "保证金已退回，如需继续接单，请重新缴纳 50 元保证金。";
    default:
      return "缴纳 50 元保证金后才可接单。";
  }
}

export function createRiderDepositWalletPageLogic(options = {}) {
  const {
    request,
    buildAuthorizationHeader,
    getAuth,
    getClientPaymentErrorMessage,
    invokeClientPayment,
    isClientPaymentCancelled,
    shouldLaunchClientPayment,
    balanceUserType = "rider",
    platform = "app",
    clientPaymentPlatform = "app",
    depositAmountFallback = 5000,
    unlockDaysFallback = 7,
    depositStatusEndpoint = "/api/rider/deposit/status",
    depositPayIntentEndpoint = "/api/rider/deposit/pay-intent",
    depositWithdrawEndpoint = "/api/rider/deposit/withdraw",
    rechargeStatusEndpoint = "/api/wallet/recharge/status",
    depositPayOptionsEndpoint = "/api/payment/options",
    withdrawOptionsEndpoint = "/api/wallet/withdraw/options",
    withdrawFeePreviewEndpoint = "/api/wallet/withdraw/fee-preview",
    depositPayScene = "rider_deposit",
    depositPaymentDescription = "骑手保证金缴纳",
    depositPaymentIdempotencyKeyPrefix = "rider_deposit",
    depositWithdrawIdempotencyKeyPrefix = "rider_deposit_withdraw",
    routes = {},
    uniApp,
    setTimeoutFn,
    sleepFn,
    nowFn,
    randomFn,
  } = options;
  const runtimeUni = resolveWalletUniRuntime(uniApp);
  const resolveAuthHeader =
    typeof buildAuthorizationHeader === "function"
      ? buildAuthorizationHeader
      : () => ({});
  const resolveAuth =
    typeof getAuth === "function"
      ? getAuth
      : () => ({
          riderId: "",
          riderName: "骑手",
          token: "",
        });
  const resolvePaymentErrorMessage =
    typeof getClientPaymentErrorMessage === "function"
      ? getClientPaymentErrorMessage
      : (_error, fallback = "保证金缴纳失败") => fallback;
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
  const walletRoutes = {
    bills: "/pages/profile/wallet-bills/index",
    recharge: "/pages/profile/wallet-recharge/index",
    withdraw: "/pages/profile/wallet-withdraw/index",
    ...routes,
  };

  return {
    data() {
      return {
        statusBarHeight: 44,
        loading: false,
        balance: 0,
        frozenBalance: 0,
        depositStatus: null,
        depositPayOptions: [],
        withdrawOptions: [],
      };
    },
    computed: {
      topPadding() {
        return Number(this.statusBarHeight || 44) + 12;
      },
      depositAmount() {
        return Number(
          (this.depositStatus && this.depositStatus.amount) ||
            depositAmountFallback,
        );
      },
      unlockDays() {
        return Number(
          (this.depositStatus && this.depositStatus.unlockDays) ||
            unlockDaysFallback,
        );
      },
      canAcceptOrders() {
        return !!(this.depositStatus && this.depositStatus.canAcceptOrders);
      },
      statusValue() {
        return String((this.depositStatus && this.depositStatus.status) || "unpaid");
      },
      statusClass() {
        return `status-${this.statusValue}`;
      },
      depositStatusText() {
        return resolveRiderDepositStatusText(this.statusValue);
      },
      depositTip() {
        return resolveRiderDepositTip(this.statusValue);
      },
      canPayDeposit() {
        return this.statusValue === "unpaid" || this.statusValue === "refunded";
      },
      canWithdrawDeposit() {
        return this.statusValue === "withdrawable";
      },
    },
    onLoad() {
      this.statusBarHeight = getWalletStatusBarHeight(runtimeUni);
    },
    onShow() {
      void this.loadAll();
    },
    methods: {
      normalizeText(value) {
        return normalizeWalletText(value);
      },
      getAuth() {
        const auth = resolveAuth.call(this) || {};
        const riderId = normalizeWalletText(auth.riderId || auth.userId);
        const riderName = normalizeWalletText(
          auth.riderName || auth.userName || "骑手",
        );
        const token = normalizeWalletText(auth.token);
        return {
          riderId,
          riderName,
          token,
        };
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
      formatTime(value) {
        return formatWalletDateTime(value);
      },
      createIdempotencyKey(prefix, riderId) {
        return createWalletIdempotencyKey(prefix, riderId, {
          nowFn,
          randomFn,
        });
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
      async pollDepositPaymentStatus(rechargeOrderId, transactionId, token) {
        const { riderId } = this.getAuth();
        let latest = null;
        for (let attempt = 0; attempt < 8; attempt += 1) {
          latest = await request({
            url: this.withQuery(rechargeStatusEndpoint, {
              userId: riderId,
              userType: balanceUserType,
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
      async loadAll() {
        const { riderId, token } = this.getAuth();
        if (!riderId || typeof request !== "function") {
          this.depositStatus = null;
          this.depositPayOptions = [];
          this.withdrawOptions = [];
          this.balance = 0;
          this.frozenBalance = 0;
          this.loading = false;
          return;
        }

        this.loading = true;
        try {
          const header = this.getAuthHeader(token);
          const [
            balanceRes,
            depositRes,
            payOptionsRes,
            withdrawOptionsRes,
          ] = await Promise.all([
            request({
              url: this.withQuery("/api/wallet/balance", {
                userId: riderId,
                userType: balanceUserType,
                user_id: riderId,
                user_type: balanceUserType,
              }),
              method: "GET",
              header,
            }),
            request({
              url: this.withQuery(depositStatusEndpoint, { riderId }),
              method: "GET",
              header,
            }),
            request({
              url: this.withQuery(depositPayOptionsEndpoint, {
                userType: balanceUserType,
                platform,
                scene: depositPayScene,
              }),
              method: "GET",
              header,
            }),
            request({
              url: this.withQuery(withdrawOptionsEndpoint, {
                userType: balanceUserType,
                platform,
              }),
              method: "GET",
              header,
            }),
          ]);

          this.balance = Number(this.resolveField(balanceRes, "balance", 0));
          this.frozenBalance = Number(
            this.resolveField(
              balanceRes,
              "frozenBalance",
              this.resolveField(balanceRes, "frozen_balance", 0),
            ),
          );
          this.depositStatus = resolveRiderDepositStatus(depositRes);
          this.depositPayOptions = this.normalizeOptions(payOptionsRes);
          this.withdrawOptions = this.normalizeOptions(withdrawOptionsRes);
        } catch (error) {
          showWalletToast(runtimeUni, {
            title: error.error || "钱包信息加载失败",
            icon: "none",
          });
        } finally {
          this.loading = false;
        }
      },
      goBills() {
        navigateWalletTo(runtimeUni, { url: walletRoutes.bills });
      },
      goRecharge() {
        navigateWalletTo(runtimeUni, { url: walletRoutes.recharge });
      },
      goWithdraw() {
        navigateWalletTo(runtimeUni, { url: walletRoutes.withdraw });
      },
      async pickOption(options, emptyMessage) {
        if (!Array.isArray(options) || options.length === 0) {
          showWalletToast(runtimeUni, { title: emptyMessage, icon: "none" });
          return null;
        }

        const result = await showWalletActionSheet(runtimeUni, {
          itemList: options.map(
            (item) => item.label || item.channel || "未命名渠道",
          ),
        });
        return options[result.tapIndex] || null;
      },
      async promptText(title, placeholderText) {
        const result = await showWalletModal(runtimeUni, {
          title,
          editable: true,
          placeholderText,
        });
        if (!result.confirm) {
          return null;
        }
        return this.normalizeText(result.content);
      },
      async payDeposit() {
        const { riderId, token } = this.getAuth();
        if (!riderId) {
          showWalletToast(runtimeUni, { title: "请先登录", icon: "none" });
          return;
        }

        const selected = await this.pickOption(
          this.depositPayOptions,
          "暂未开启保证金缴纳渠道",
        );
        if (!selected) {
          return;
        }

        try {
          const idempotencyKey = this.createIdempotencyKey(
            depositPaymentIdempotencyKeyPrefix,
            riderId,
          );
          const response = await request({
            url: depositPayIntentEndpoint,
            method: "POST",
            data: {
              riderId,
              paymentMethod: selected.channel,
              paymentChannel: selected.channel,
              description: depositPaymentDescription,
              idempotencyKey,
            },
            header: {
              ...this.getAuthHeader(token),
              "Idempotency-Key": idempotencyKey,
            },
          });

          let latest = response;
          let status = this.normalizeFlowStatus(latest, "recharge");
          if (canLaunchClientPayment(response)) {
            showWalletLoading(runtimeUni, { title: "正在拉起支付", mask: true });
            try {
              await launchClientPayment(response, clientPaymentPlatform);
            } finally {
              hideWalletLoading(runtimeUni);
            }
          }

          if (
            !this.isRechargeSuccessStatus(status) &&
            !this.isRechargeFailureStatus(status) &&
            ((response && response.rechargeOrderId) ||
              (response && response.transactionId))
          ) {
            showWalletLoading(runtimeUni, {
              title: "正在确认保证金状态",
              mask: true,
            });
            try {
              latest = await this.pollDepositPaymentStatus(
                response && response.rechargeOrderId,
                response && response.transactionId,
                token,
              );
            } finally {
              hideWalletLoading(runtimeUni);
            }
            status = this.normalizeFlowStatus(latest, "recharge");
          }

          if (response && response.duplicated) {
            showWalletToast(runtimeUni, {
              title: "当前已有有效保证金",
              icon: "none",
            });
          } else if (this.isRechargeSuccessStatus(status)) {
            showWalletToast(runtimeUni, {
              title: "保证金已缴纳",
              icon: "success",
            });
          } else if (this.isRechargeFailureStatus(status)) {
            showWalletToast(runtimeUni, {
              title: "保证金缴纳失败，请稍后重试",
              icon: "none",
            });
          } else {
            showWalletToast(runtimeUni, {
              title: "保证金缴纳请求已提交，可在钱包页继续查看状态",
              icon: "none",
            });
          }
          await this.loadAll();
        } catch (error) {
          showWalletToast(runtimeUni, {
            title: isPaymentCancelled(error)
              ? "已取消支付"
              : error.error ||
                resolvePaymentErrorMessage(error, "保证金缴纳失败"),
            icon: "none",
          });
        }
      },
      async withdrawDeposit() {
        const { riderId, riderName, token } = this.getAuth();
        if (!riderId || !this.canWithdrawDeposit) {
          showWalletToast(runtimeUni, {
            title: "当前保证金暂不可提现",
            icon: "none",
          });
          return;
        }

        const selected = await this.pickOption(
          this.withdrawOptions,
          "暂未开启保证金提现渠道",
        );
        if (!selected) {
          return;
        }

        const accountTitle =
          selected.channel === "bank_card" ? "输入银行卡号" : "输入收款账号";
        const accountPlaceholder =
          selected.accountPlaceholder ||
          (selected.channel === "bank_card"
            ? "请输入银行卡号"
            : "请输入提现收款账号");
        const withdrawAccount = await this.promptText(
          accountTitle,
          accountPlaceholder,
        );
        if (!withdrawAccount) {
          return;
        }

        let withdrawName = riderName || "骑手";
        if (selected.requiresName && !riderName) {
          withdrawName = await this.promptText(
            "输入收款人姓名",
            selected.namePlaceholder || "请输入收款人姓名",
          );
          if (!withdrawName) {
            return;
          }
        }

        let bankName = "";
        if (selected.requiresBankName || selected.channel === "bank_card") {
          const value = await this.promptText(
            "输入开户银行",
            selected.bankNamePlaceholder || "请输入开户银行名称",
          );
          if (selected.requiresBankName && !value) {
            return;
          }
          bankName = value || "";
        }

        let bankBranch = "";
        if (selected.requiresBankBranch) {
          const value = await this.promptText(
            "输入开户支行",
            selected.bankBranchPlaceholder || "请输入开户支行",
          );
          if (!value) {
            return;
          }
          bankBranch = value;
        }

        try {
          const preview = await request({
            url: withdrawFeePreviewEndpoint,
            method: "POST",
            data: {
              userId: riderId,
              userType: balanceUserType,
              amount: this.depositAmount,
              withdrawMethod: selected.channel,
              platform,
            },
            header: this.getAuthHeader(token),
          });

          const confirmed = await showWalletModal(runtimeUni, {
            title: "确认提取保证金吗",
            content: `手续费 ¥${this.fen2yuan(this.resolveField(preview, "fee", 0))}，预计到账 ¥${this.fen2yuan(this.resolveField(preview, "actualAmount", 0))}，到账时效：${normalizeWalletArrivalText(preview) || "以通道处理为准"}`,
          });
          if (!confirmed.confirm) {
            return;
          }

          const idempotencyKey = this.createIdempotencyKey(
            depositWithdrawIdempotencyKeyPrefix,
            riderId,
          );
          await request({
            url: depositWithdrawEndpoint,
            method: "POST",
            data: {
              riderId,
              withdrawMethod: selected.channel,
              withdrawAccount,
              withdrawName: withdrawName || "骑手",
              bankName,
              bankBranch,
              idempotencyKey,
            },
            header: {
              ...this.getAuthHeader(token),
              "Idempotency-Key": idempotencyKey,
            },
          });

          showWalletToast(runtimeUni, {
            title: "保证金提现申请已提交",
            icon: "success",
          });
          await this.loadAll();
        } catch (error) {
          showWalletToast(runtimeUni, {
            title: error.error || "保证金提现失败",
            icon: "none",
          });
        }
      },
    },
  };
}
