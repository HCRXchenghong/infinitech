function normalizeRiderAppealText(value, fallback = "") {
  const normalized = String(value == null ? "" : value).trim();
  return normalized || fallback;
}

function cloneRiderAppealList() {
  return [
    {
      id: 1,
      title: "配送超时处罚申诉",
      type: "超时处罚",
      time: "2024-01-18 14:30",
      status: "pending",
    },
    {
      id: 2,
      title: "客户投诉申诉",
      type: "服务投诉",
      time: "2024-01-15 10:20",
      status: "approved",
    },
  ];
}

function resolveRiderAppealUniRuntime(uniApp) {
  return uniApp || globalThis.uni || null;
}

function showRiderAppealToast(uniApp, payload) {
  if (uniApp && typeof uniApp.showToast === "function") {
    uniApp.showToast(payload);
  }
}

export const DEFAULT_RIDER_APPEAL_LIST = Object.freeze(cloneRiderAppealList());

export function getRiderAppealStatusText(status) {
  const normalized = normalizeRiderAppealText(status, "unknown").toLowerCase();
  const mapping = {
    pending: "审核中",
    approved: "已通过",
    rejected: "已拒绝",
  };
  return mapping[normalized] || "未知";
}

export function createRiderAppealPageLogic(options = {}) {
  const { uniApp, onViewAppeal, onCreateAppeal } = options;
  const runtimeUni = resolveRiderAppealUniRuntime(uniApp);

  return {
    data() {
      return {
        appealList: cloneRiderAppealList(),
      };
    },
    methods: {
      getStatusText(status) {
        return getRiderAppealStatusText(status);
      },

      viewAppeal(appeal) {
        if (typeof onViewAppeal === "function") {
          onViewAppeal(appeal);
          return;
        }

        showRiderAppealToast(runtimeUni, {
          title: "查看申诉详情",
          icon: "none",
        });
      },

      createAppeal() {
        if (typeof onCreateAppeal === "function") {
          onCreateAppeal();
          return;
        }

        showRiderAppealToast(runtimeUni, {
          title: "发起新申诉",
          icon: "none",
        });
      },
    },
  };
}
