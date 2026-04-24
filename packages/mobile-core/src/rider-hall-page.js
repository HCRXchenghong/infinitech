function resolveRiderHallUniRuntime(uniApp) {
  return uniApp || globalThis.uni || null;
}

function resolveRiderHallTimeout(setTimeoutFn, callback, delay) {
  if (typeof setTimeoutFn === "function") {
    return setTimeoutFn(callback, delay);
  }

  if (typeof globalThis.setTimeout === "function") {
    return globalThis.setTimeout(callback, delay);
  }

  callback();
  return null;
}

function resolveRiderHallInterval(setIntervalFn, callback, delay) {
  if (typeof setIntervalFn === "function") {
    return setIntervalFn(callback, delay);
  }

  if (typeof globalThis.setInterval === "function") {
    return globalThis.setInterval(callback, delay);
  }

  callback();
  return null;
}

function clearRiderHallInterval(clearIntervalFn, timerId) {
  if (timerId == null) {
    return;
  }

  if (typeof clearIntervalFn === "function") {
    clearIntervalFn(timerId);
    return;
  }

  if (typeof globalThis.clearInterval === "function") {
    globalThis.clearInterval(timerId);
  }
}

function normalizeRiderHallOrders(orders = []) {
  return Array.isArray(orders) ? orders : [];
}

function normalizeRiderHallComponents(components) {
  return components && typeof components === "object" && !Array.isArray(components)
    ? components
    : {};
}

function normalizeRiderHallLocationCache(cache = {}) {
  const value = cache && typeof cache === "object" ? cache : {};
  return {
    lat: Number(value.lat),
    lng: Number(value.lng),
    address: String(value.address || "").trim(),
    city: String(value.city || "").trim(),
    district: String(value.district || "").trim(),
    province: String(value.province || "").trim(),
    updatedAt: Number(value.updatedAt || 0),
  };
}

function buildRiderHallLocationText({
  latitude,
  longitude,
  address,
  city,
  district,
  province,
} = {}) {
  const locationText = String(address || "").trim();
  const fallbackText = [province, city, district].filter(Boolean).join("");
  if (locationText) {
    return locationText;
  }
  if (fallbackText) {
    return fallbackText;
  }

  const lat = Number(latitude);
  const lng = Number(longitude);
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    return `当前位置 ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }

  return "";
}

export const DEFAULT_RIDER_HALL_FILTERS = Object.freeze([
  "全部",
  "顺路单",
  "近距离",
  "高价单",
]);
export const DEFAULT_RIDER_HALL_LOCATION_TEXT = "定位中...";
export const DEFAULT_RIDER_HALL_TASKS_TAB_ROUTE = "/pages/tasks/index";
export const DEFAULT_RIDER_HALL_SERVICE_ROUTE = "/pages/service/index";

export function buildRiderHallDisplayOrders(orders = [], filterIndex = 0) {
  const list = normalizeRiderHallOrders(orders);
  if (filterIndex === 1) {
    return list.filter((item) => !!item?.isRouteFriendly);
  }
  if (filterIndex === 2) {
    return list.filter((item) => !!item?.isNearDistance);
  }
  if (filterIndex === 3) {
    return list.filter((item) => !!item?.isHighPrice);
  }
  return list;
}

export function createRiderHallPageLogic(options = {}) {
  const {
    riderOrderStore,
    toggleOnlineStatus,
    grabOrder,
    loadAvailableOrders,
    loadRiderData,
    getCurrentLocation,
    uniApp,
    components,
    setTimeoutFn,
    setIntervalFn,
    clearIntervalFn,
    tasksTabRoute = DEFAULT_RIDER_HALL_TASKS_TAB_ROUTE,
    serviceRoute = DEFAULT_RIDER_HALL_SERVICE_ROUTE,
  } = options;
  const runtimeUni = resolveRiderHallUniRuntime(uniApp);
  const orderStore =
    riderOrderStore && typeof riderOrderStore === "object" ? riderOrderStore : {};

  return {
    components: normalizeRiderHallComponents(components),
    data() {
      return {
        statusBarHeight: 44,
        headerHeight: 0,
        filterBarHeight: 0,
        layoutReady: false,
        showStationPicker: false,
        currentFilter: 0,
        filters: DEFAULT_RIDER_HALL_FILTERS.slice(),
        refreshing: false,
        isNavigating: false,
        currentLocation: DEFAULT_RIDER_HALL_LOCATION_TEXT,
        showStartWorkModal: false,
        showStopWorkModal: false,
        showThanksModal: false,
        agreeTerms: false,
        countdownTimerId: null,
      };
    },
    computed: {
      isOnline() {
        return !!orderStore.isOnline;
      },
      todayEarnings() {
        return String(orderStore.todayEarnings || "0");
      },
      newOrders() {
        return normalizeRiderHallOrders(orderStore.newOrders);
      },
      displayOrders() {
        return buildRiderHallDisplayOrders(this.newOrders, this.currentFilter);
      },
      hasUnfinishedOrders() {
        return normalizeRiderHallOrders(orderStore.myOrders).length > 0;
      },
      filterBarStyle() {
        if (!this.layoutReady) {
          return {};
        }
        return {
          top: `${this.headerHeight}px`,
        };
      },
      orderListStyle() {
        const topOffset = this.layoutReady
          ? this.headerHeight + this.filterBarHeight
          : 280;
        return {
          marginTop: `${topOffset}px`,
          height: `calc(100vh - ${topOffset}px)`,
        };
      },
    },
    onLoad() {
      this.applySystemInfo();
      this.startOrderCountdown();
      void this.getLocation();
    },
    onReady() {
      this.measureLayout();
    },
    async onShow() {
      this.bindRealtimeOrdersRefresh();
      void this.getLocation();
      if (typeof loadRiderData === "function") {
        await loadRiderData();
      }
      if (this.isOnline && typeof loadAvailableOrders === "function") {
        await loadAvailableOrders();
      }
    },
    async onPullDownRefresh() {
      await this.refreshOrders("page");
    },
    onUnload() {
      this.unbindRealtimeOrdersRefresh();
      this.stopOrderCountdown();
    },
    methods: {
      applySystemInfo() {
        if (!runtimeUni || typeof runtimeUni.getSystemInfoSync !== "function") {
          return;
        }

        const systemInfo = runtimeUni.getSystemInfoSync();
        this.statusBarHeight = Number(systemInfo?.statusBarHeight || 44);
      },

      bindRealtimeOrdersRefresh() {
        if (!runtimeUni || typeof runtimeUni.$off !== "function" || typeof runtimeUni.$on !== "function") {
          return;
        }
        runtimeUni.$off("realtime:refresh:orders", this.onRealtimeOrdersRefresh);
        runtimeUni.$on("realtime:refresh:orders", this.onRealtimeOrdersRefresh);
      },

      unbindRealtimeOrdersRefresh() {
        if (!runtimeUni || typeof runtimeUni.$off !== "function") {
          return;
        }
        runtimeUni.$off("realtime:refresh:orders", this.onRealtimeOrdersRefresh);
      },

      onRealtimeOrdersRefresh() {
        void this.refreshOrders("scroll");
      },

      measureLayout() {
        if (!this.$nextTick || !runtimeUni || typeof runtimeUni.createSelectorQuery !== "function") {
          return;
        }

        this.$nextTick(() => {
          const query = runtimeUni.createSelectorQuery().in(this);
          query.select(".header-wrapper").boundingClientRect();
          query.select(".filter-bar").boundingClientRect();
          query.exec((res) => {
            const headerRect = res && res[0] ? res[0] : null;
            const filterRect = res && res[1] ? res[1] : null;
            const headerHeight = headerRect?.height ? Number(headerRect.height) : 0;
            const filterHeight = filterRect?.height ? Number(filterRect.height) : 0;
            if (headerHeight) {
              this.headerHeight = headerHeight;
            }
            if (filterHeight) {
              this.filterBarHeight = filterHeight;
            }
            this.layoutReady = headerHeight > 0;
          });
        });
      },

      withNavigateLock(callback) {
        if (this.isNavigating || typeof callback !== "function") {
          return;
        }

        this.isNavigating = true;
        callback();
        resolveRiderHallTimeout(setTimeoutFn, () => {
          this.isNavigating = false;
        }, 300);
      },

      handleToggleWork() {
        if (!this.isOnline) {
          this.showStartWorkModal = true;
          return;
        }
        this.showStopWorkModal = true;
      },

      goService() {
        this.withNavigateLock(() => {
          if (runtimeUni && typeof runtimeUni.navigateTo === "function") {
            runtimeUni.navigateTo({ url: serviceRoute });
          }
        });
      },

      async confirmStartWork() {
        if (!this.agreeTerms) {
          return;
        }

        this.showStartWorkModal = false;
        this.agreeTerms = false;
        if (typeof toggleOnlineStatus === "function") {
          await toggleOnlineStatus();
        }
      },

      async confirmStopWork() {
        this.showStopWorkModal = false;
        if (typeof toggleOnlineStatus === "function") {
          await toggleOnlineStatus();
        }
        this.showThanksModal = true;
      },

      async handleGrabOrder(order) {
        if (this.isNavigating) {
          return;
        }

        if (runtimeUni && typeof runtimeUni.showLoading === "function") {
          runtimeUni.showLoading({ title: "抢单中..." });
        }

        try {
          if (typeof grabOrder === "function") {
            await grabOrder(order?.id);
          }
          if (runtimeUni && typeof runtimeUni.hideLoading === "function") {
            runtimeUni.hideLoading();
          }
          if (runtimeUni && typeof runtimeUni.showToast === "function") {
            runtimeUni.showToast({ title: "抢单成功！", icon: "success" });
          }

          this.isNavigating = true;
          resolveRiderHallTimeout(setTimeoutFn, () => {
            if (runtimeUni && typeof runtimeUni.switchTab === "function") {
              runtimeUni.switchTab({ url: tasksTabRoute });
            }
            resolveRiderHallTimeout(setTimeoutFn, () => {
              this.isNavigating = false;
            }, 300);
          }, 500);
        } catch (_error) {
          if (runtimeUni && typeof runtimeUni.hideLoading === "function") {
            runtimeUni.hideLoading();
          }
          if (runtimeUni && typeof runtimeUni.showToast === "function") {
            runtimeUni.showToast({ title: "抢单失败", icon: "error" });
          }
        }
      },

      async refreshOrders(source = "scroll") {
        if (this.refreshing) {
          if (source === "page" && runtimeUni && typeof runtimeUni.stopPullDownRefresh === "function") {
            runtimeUni.stopPullDownRefresh();
          }
          return;
        }

        this.refreshing = true;
        try {
          if (this.isOnline && typeof loadAvailableOrders === "function") {
            await loadAvailableOrders();
          }
        } catch (error) {
          if (typeof console !== "undefined" && console.error) {
            console.error("刷新失败:", error);
          }
        } finally {
          this.refreshing = false;
          if (source === "page" && runtimeUni && typeof runtimeUni.stopPullDownRefresh === "function") {
            runtimeUni.stopPullDownRefresh();
          }
        }
      },

      async onRefresh() {
        await this.refreshOrders("scroll");
      },

      startOrderCountdown() {
        if (this.countdownTimerId != null) {
          return;
        }

        this.countdownTimerId = resolveRiderHallInterval(setIntervalFn, () => {
          this.newOrders.forEach((order) => {
            if (Number(order?.countdown) > 0) {
              order.countdown -= 1;
            }
          });
        }, 1000);
      },

      stopOrderCountdown() {
        clearRiderHallInterval(clearIntervalFn, this.countdownTimerId);
        this.countdownTimerId = null;
      },

      async getLocation() {
        this.currentLocation = DEFAULT_RIDER_HALL_LOCATION_TEXT;
        try {
          const payload =
            typeof getCurrentLocation === "function" ? await getCurrentLocation() : {};
          const locationText = buildRiderHallLocationText(payload);
          this.currentLocation = locationText || "定位失败";

          if (runtimeUni && typeof runtimeUni.setStorageSync === "function") {
            runtimeUni.setStorageSync("riderCurrentLocation", {
              lat: Number(payload?.latitude),
              lng: Number(payload?.longitude),
              address: String(payload?.address || "").trim(),
              city: String(payload?.city || "").trim(),
              district: String(payload?.district || "").trim(),
              province: String(payload?.province || "").trim(),
              updatedAt: Date.now(),
            });
          }
        } catch (_error) {
          const cached =
            runtimeUni && typeof runtimeUni.getStorageSync === "function"
              ? runtimeUni.getStorageSync("riderCurrentLocation")
              : {};
          const cachedLocation = normalizeRiderHallLocationCache(cached);
          const cachedText = buildRiderHallLocationText({
            latitude: cachedLocation.lat,
            longitude: cachedLocation.lng,
            address: cachedLocation.address,
            city: cachedLocation.city,
            district: cachedLocation.district,
            province: cachedLocation.province,
          });
          this.currentLocation = cachedText || "定位失败";
        }
      },
    },
  };
}
