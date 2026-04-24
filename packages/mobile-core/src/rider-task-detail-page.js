import { DEFAULT_RIDER_TASKS_REPORT_REASONS } from "./rider-tasks-page.js";

function resolveRiderTaskDetailUniRuntime(uniApp) {
  return uniApp || globalThis.uni || null;
}

function resolveRiderTaskDetailTimeout(setTimeoutFn, callback, delay) {
  if (typeof setTimeoutFn === "function") {
    return setTimeoutFn(callback, delay);
  }

  if (typeof globalThis.setTimeout === "function") {
    return globalThis.setTimeout(callback, delay);
  }

  callback();
  return null;
}

function showRiderTaskDetailToast(uniApp, payload) {
  if (uniApp && typeof uniApp.showToast === "function") {
    uniApp.showToast(payload);
  }
}

function showRiderTaskDetailLoading(uniApp, payload) {
  if (uniApp && typeof uniApp.showLoading === "function") {
    uniApp.showLoading(payload);
  }
}

function hideRiderTaskDetailLoading(uniApp) {
  if (uniApp && typeof uniApp.hideLoading === "function") {
    uniApp.hideLoading();
  }
}

function normalizeRiderTaskDetailOrders(orders = []) {
  return Array.isArray(orders) ? orders : [];
}

function resolveRiderTaskDetailErrorMessage(error, fallback) {
  const message = error && (error.error || error.message);
  return String(message || fallback);
}

export function normalizeRiderTaskDetailId(options = {}) {
  return String((options && options.id) || "").trim();
}

export function formatRiderTaskDetailDistance(task = {}) {
  if (!task) {
    return "--";
  }

  if (task.status === "pending") {
    const distance = task.shopDistance;
    if (
      distance === ""
      || distance === "--"
      || distance === null
      || distance === undefined
    ) {
      return "--";
    }
    return `${distance}m`;
  }

  const distance = task.customerDistance;
  if (
    distance === ""
    || distance === "--"
    || distance === null
    || distance === undefined
  ) {
    return "--";
  }
  return `${distance}km`;
}

export function createRiderTaskDetailPageLogic(options = {}) {
  const {
    riderOrderStore,
    advanceTask,
    loadTaskReportReasons,
    callTaskPhone,
    navigateTask,
    openTaskChat,
    submitTaskException,
    uniApp,
    setTimeoutFn,
  } = options;
  const runtimeUni = resolveRiderTaskDetailUniRuntime(uniApp);
  const orderStore =
    riderOrderStore && typeof riderOrderStore === "object" ? riderOrderStore : {};

  return {
    data() {
      return {
        taskId: "",
        showReport: false,
        reportReasons: [...DEFAULT_RIDER_TASKS_REPORT_REASONS],
      };
    },
    computed: {
      task() {
        return normalizeRiderTaskDetailOrders(orderStore.myOrders).find(
          (item) => item?.id === this.taskId,
        );
      },
    },
    onLoad(options = {}) {
      this.taskId = normalizeRiderTaskDetailId(options);
      void this.loadReportReasons();
    },
    methods: {
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

      formatTaskDistance(task) {
        return formatRiderTaskDetailDistance(task);
      },

      callPhone() {
        if (!this.task) {
          showRiderTaskDetailToast(runtimeUni, {
            title: "订单信息异常",
            icon: "none",
          });
          return;
        }

        if (typeof callTaskPhone === "function") {
          callTaskPhone(this.task);
        }
      },

      sendMessage() {
        if (!this.task) {
          showRiderTaskDetailToast(runtimeUni, {
            title: "订单信息异常",
            icon: "none",
          });
          return;
        }

        if (typeof openTaskChat === "function") {
          openTaskChat(this.task);
        }
      },

      navigate(task) {
        if (!task) {
          showRiderTaskDetailToast(runtimeUni, {
            title: "订单信息异常",
            icon: "none",
          });
          return;
        }

        if (typeof navigateTask === "function") {
          navigateTask(task);
        }
      },

      completeTask() {
        if (!this.task || !runtimeUni || typeof runtimeUni.showModal !== "function") {
          return;
        }

        const previousStatus = this.task.status;
        const actionText = previousStatus === "pending" ? "已到店" : "送达";
        runtimeUni.showModal({
          title: "确认操作",
          content: `确认${actionText}吗？`,
          success: async (res) => {
            if (!res?.confirm) {
              return;
            }

            try {
              if (typeof advanceTask === "function") {
                await advanceTask(this.taskId);
              }

              if (previousStatus === "delivering") {
                showRiderTaskDetailToast(runtimeUni, {
                  title: "订单已完成！",
                  icon: "success",
                });
                resolveRiderTaskDetailTimeout(setTimeoutFn, () => {
                  if (runtimeUni && typeof runtimeUni.navigateBack === "function") {
                    runtimeUni.navigateBack();
                  }
                }, 1500);
              } else {
                showRiderTaskDetailToast(runtimeUni, {
                  title: "开始配送！",
                  icon: "success",
                });
              }
            } catch (_error) {
              showRiderTaskDetailToast(runtimeUni, {
                title: "操作失败",
                icon: "none",
              });
            }
          },
        });
      },

      async handleReport(reason) {
        if (!this.task) {
          showRiderTaskDetailToast(runtimeUni, {
            title: "订单信息异常",
            icon: "none",
          });
          return;
        }

        showRiderTaskDetailLoading(runtimeUni, { title: "提交中..." });
        try {
          if (typeof submitTaskException === "function") {
            await submitTaskException(this.task, reason);
          }
          this.showReport = false;
          showRiderTaskDetailToast(runtimeUni, {
            title: "上报成功",
            icon: "success",
          });
        } catch (error) {
          showRiderTaskDetailToast(runtimeUni, {
            title: resolveRiderTaskDetailErrorMessage(error, "上报失败"),
            icon: "none",
          });
        } finally {
          hideRiderTaskDetailLoading(runtimeUni);
        }
      },
    },
  };
}
