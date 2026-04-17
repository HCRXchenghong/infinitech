import {
  buildWalletQuery,
  fenToWalletYuan,
  getWalletStatusBarHeight,
  normalizeWalletText,
  navigateWalletTo,
  readConsumerWalletAuth,
  resolveWalletField,
  resolveWalletUniRuntime,
  showWalletToast,
} from "./wallet-shared.js";

export function createWalletOverviewPageLogic(options = {}) {
  const {
    request,
    buildAuthorizationHeader,
    getAuth,
    uniApp,
  } = options;
  const runtimeUni = resolveWalletUniRuntime(uniApp);
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

  return {
    data() {
      return {
        statusBarHeight: 44,
        loading: false,
        balance: 0,
        frozenBalance: 0,
      };
    },
    computed: {
      topPadding() {
        return Number(this.statusBarHeight || 44) + 12;
      },
    },
    onLoad() {
      this.statusBarHeight = getWalletStatusBarHeight(runtimeUni);
    },
    onShow() {
      void this.loadBalance();
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
      fen2yuan(fen) {
        return fenToWalletYuan(fen);
      },
      async loadBalance() {
        this.loading = true;
        const { userId, token } = this.getAuth();
        if (!userId || typeof request !== "function") {
          this.loading = false;
          return;
        }

        try {
          const result = await request({
            url: this.withQuery("/api/wallet/balance", {
              userId,
              userType: "customer",
              user_id: userId,
              user_type: "customer",
            }),
            method: "GET",
            header: this.getAuthHeader(token),
          });

          this.balance = Number(this.resolveField(result, "balance", 0));
          this.frozenBalance = Number(
            this.resolveField(
              result,
              "frozenBalance",
              this.resolveField(result, "frozen_balance", 0),
            ),
          );
        } catch (_error) {
          showWalletToast(runtimeUni, { title: "资产加载失败", icon: "none" });
        } finally {
          this.loading = false;
        }
      },
      goBills() {
        navigateWalletTo(runtimeUni, {
          url: "/pages/profile/wallet/bills/index",
        });
      },
      goRecharge() {
        navigateWalletTo(runtimeUni, {
          url: "/pages/profile/wallet/recharge/index",
        });
      },
      goWithdraw() {
        navigateWalletTo(runtimeUni, {
          url: "/pages/profile/wallet/withdraw/index",
        });
      },
    },
  };
}
