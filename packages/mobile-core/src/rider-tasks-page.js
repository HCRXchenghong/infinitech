function resolveRiderTasksUniRuntime(uniApp) {
  return uniApp || globalThis.uni || null;
}

function resolveRiderTasksTimeout(setTimeoutFn, callback, delay) {
  if (typeof setTimeoutFn === "function") {
    return setTimeoutFn(callback, delay);
  }

  if (typeof globalThis.setTimeout === "function") {
    return globalThis.setTimeout(callback, delay);
  }

  callback();
  return null;
}

function showRiderTasksToast(uniApp, payload) {
  if (uniApp && typeof uniApp.showToast === "function") {
    uniApp.showToast(payload);
  }
}

function showRiderTasksLoading(uniApp, payload) {
  if (uniApp && typeof uniApp.showLoading === "function") {
    uniApp.showLoading(payload);
  }
}

function hideRiderTasksLoading(uniApp) {
  if (uniApp && typeof uniApp.hideLoading === "function") {
    uniApp.hideLoading();
  }
}

function resolveRiderTasksErrorMessage(error, fallback) {
  const message = error && (error.error || error.message);
  return String(message || fallback);
}

function normalizeRiderTasksOrders(orders = []) {
  return Array.isArray(orders) ? orders : [];
}

export const DEFAULT_RIDER_TASKS_REPORT_REASONS = Object.freeze([
  "商家出餐慢",
  "联系不上顾客",
  "顾客位置错误",
  "车辆故障",
  "恶劣天气",
  "道路拥堵",
  "订单信息错误",
  "其他原因",
]);

export function buildRiderTaskTabs(orders = []) {
  const list = normalizeRiderTasksOrders(orders);
  return [
    {
      label: "待取货",
      count: list.filter((item) => item?.status === "pending").length,
    },
    {
      label: "配送中",
      count: list.filter((item) => item?.status === "delivering").length,
    },
  ];
}

export function buildRiderFilteredTasks(orders = [], currentTab = 0) {
  const status = Number(currentTab) === 0 ? "pending" : "delivering";
  return normalizeRiderTasksOrders(orders).filter((item) => item?.status === status);
}

export function createRiderTasksPageLogic(options = {}) {
  const {
    riderOrderStore,
    advanceTask,
    loadRiderData,
    loadTaskReportReasons,
    callTaskPhone,
    navigateTask,
    openCustomerTaskChat,
    openMerchantTaskChat,
    submitTaskException,
    uniApp,
    setTimeoutFn,
    hallRoute = "/pages/hall/index",
    detailRouteBuilder = (task) => `/pages/tasks/detail?id=${task?.id || ""}`,
  } = options;
  const runtimeUni = resolveRiderTasksUniRuntime(uniApp);
  const orderStore =
    riderOrderStore && typeof riderOrderStore === "object" ? riderOrderStore : {};

  return {
    data() {
      return {
        statusBarHeight: 44,
        navbarHeight: 0,
        tabsHeight: 0,
        layoutReady: false,
        currentTab: 0,
        showReport: false,
        showContact: false,
        currentTask: null,
        reportReasons: [...DEFAULT_RIDER_TASKS_REPORT_REASONS],
        isNavigating: false,
      };
    },
    computed: {
      tabs() {
        return buildRiderTaskTabs(orderStore.myOrders);
      },
      filteredTasks() {
        return buildRiderFilteredTasks(orderStore.myOrders, this.currentTab);
      },
      tabsStyle() {
        if (!this.layoutReady) {
          return {};
        }
        return {
          top: `${this.navbarHeight}px`,
        };
      },
      taskListStyle() {
        if (!this.layoutReady) {
          return {};
        }
        const topOffset = this.navbarHeight + this.tabsHeight;
        return {
          marginTop: `${topOffset}px`,
          height: `calc(100vh - ${topOffset}px)`,
        };
      },
    },
    onLoad() {
      this.applySystemInfo();
      void this.loadReportReasons();
    },
    onReady() {
      this.measureLayout();
    },
    async onShow() {
      if (typeof loadRiderData === "function") {
        await loadRiderData();
      }
    },
    methods: {
      applySystemInfo() {
        if (!runtimeUni || typeof runtimeUni.getSystemInfoSync !== "function") {
          return;
        }

        const systemInfo = runtimeUni.getSystemInfoSync();
        this.statusBarHeight = Number(systemInfo?.statusBarHeight || 44);
      },

      async loadReportReasons() {
        try {
          const reasons =
            typeof loadTaskReportReasons === "function"
              ? await loadTaskReportReasons()
              : DEFAULT_RIDER_TASKS_REPORT_REASONS;
          this.reportReasons =
            Array.isArray(reasons) && reasons.length
              ? reasons.slice()
              : [...DEFAULT_RIDER_TASKS_REPORT_REASONS];
        } catch (_error) {
          this.reportReasons = [...DEFAULT_RIDER_TASKS_REPORT_REASONS];
        }
      },

      measureLayout() {
        if (!this.$nextTick || !runtimeUni || typeof runtimeUni.createSelectorQuery !== "function") {
          return;
        }

        this.$nextTick(() => {
          const query = runtimeUni.createSelectorQuery().in(this);
          query.select(".custom-navbar").boundingClientRect();
          query.select(".tabs-wrapper").boundingClientRect();
          query.exec((res) => {
            const navbarRect = res && res[0] ? res[0] : null;
            const tabsRect = res && res[1] ? res[1] : null;
            const navbarHeight = navbarRect?.height ? Number(navbarRect.height) : 0;
            const tabsHeight = tabsRect?.height ? Number(tabsRect.height) : 0;
            if (navbarHeight) {
              this.navbarHeight = navbarHeight;
            }
            if (tabsHeight) {
              this.tabsHeight = tabsHeight;
            }
            this.layoutReady = navbarHeight > 0 && tabsHeight > 0;
          });
        });
      },

      withNavigateLock(callback) {
        if (this.isNavigating || typeof callback !== "function") {
          return;
        }

        this.isNavigating = true;
        callback();
        resolveRiderTasksTimeout(setTimeoutFn, () => {
          this.isNavigating = false;
        }, 300);
      },

      goToHall() {
        this.withNavigateLock(() => {
          if (runtimeUni && typeof runtimeUni.switchTab === "function") {
            runtimeUni.switchTab({ url: hallRoute });
          }
        });
      },

      goToDetail(task) {
        this.withNavigateLock(() => {
          if (runtimeUni && typeof runtimeUni.navigateTo === "function") {
            runtimeUni.navigateTo({ url: detailRouteBuilder(task) });
          }
        });
      },

      handleAdvanceTask(task) {
        if (!runtimeUni || typeof runtimeUni.showModal !== "function") {
          return;
        }

        const actionText = task?.status === "pending" ? "已到店" : "送达";
        runtimeUni.showModal({
          title: "确认操作",
          content: `确认${actionText}吗？`,
          success: async (res) => {
            if (!res?.confirm) {
              return;
            }

            try {
              const previousStatus = task?.status;
              if (typeof advanceTask === "function") {
                await advanceTask(task?.id);
              }

              if (previousStatus === "delivering") {
                showRiderTasksToast(runtimeUni, {
                  title: "订单已完成！",
                  icon: "success",
                });
              } else {
                showRiderTasksToast(runtimeUni, {
                  title: "开始配送！",
                  icon: "success",
                });
                this.currentTab = 1;
              }
            } catch (_error) {
              showRiderTasksToast(runtimeUni, {
                title: "操作失败",
                icon: "error",
              });
            }
          },
        });
      },

      callCustomer(task) {
        this.currentTask = task;
        this.showContact = true;
      },

      openCustomerChat(task) {
        this.showContact = false;
        if (typeof openCustomerTaskChat === "function") {
          openCustomerTaskChat(task);
        }
      },

      openMerchantChat(task) {
        this.showContact = false;
        if (typeof openMerchantTaskChat === "function") {
          openMerchantTaskChat(task);
        }
      },

      callCustomerPhone(task) {
        this.showContact = false;
        if (typeof callTaskPhone === "function") {
          callTaskPhone(task);
        }
      },

      navigate(task) {
        if (typeof navigateTask === "function") {
          navigateTask(task);
        }
      },

      showReportModal(task) {
        this.currentTask = task;
        this.showReport = true;
      },

      async handleReport(reason) {
        if (!this.currentTask) {
          showRiderTasksToast(runtimeUni, {
            title: "订单信息异常",
            icon: "none",
          });
          return;
        }

        showRiderTasksLoading(runtimeUni, { title: "提交中..." });
        try {
          if (typeof submitTaskException === "function") {
            await submitTaskException(this.currentTask, reason);
          }
          this.showReport = false;
          showRiderTasksToast(runtimeUni, {
            title: "上报成功",
            icon: "success",
          });
        } catch (error) {
          showRiderTasksToast(runtimeUni, {
            title: resolveRiderTasksErrorMessage(error, "上报失败"),
            icon: "none",
          });
        } finally {
          hideRiderTasksLoading(runtimeUni);
        }
      },
    },
  };
}
