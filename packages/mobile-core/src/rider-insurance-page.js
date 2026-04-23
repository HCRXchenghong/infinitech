function normalizeRiderInsuranceText(value, fallback = "") {
  const normalized = String(value == null ? "" : value)
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trim();
  return normalized || fallback;
}

function normalizeRiderInsurancePayload(payload = {}) {
  const value =
    payload && payload.data && typeof payload.data === "object"
      ? payload.data
      : payload;
  return value && typeof value === "object" && !Array.isArray(value)
    ? { ...value }
    : {};
}

function normalizeRiderInsuranceSteps(items) {
  if (!Array.isArray(items)) {
    return [];
  }

  const seen = new Set();
  return items
    .map((item) => normalizeRiderInsuranceText(item, ""))
    .filter((item) => {
      if (!item || seen.has(item)) {
        return false;
      }
      seen.add(item);
      return true;
    })
    .slice(0, 10);
}

function normalizeRiderInsuranceCoverages(items) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .map((item) => ({
      icon: normalizeRiderInsuranceText(item?.icon, ""),
      name: normalizeRiderInsuranceText(item?.name, ""),
      amount: normalizeRiderInsuranceText(item?.amount, ""),
    }))
    .filter((item) => item.icon || item.name || item.amount)
    .slice(0, 10);
}

function resolveRiderInsuranceUni(uniApp) {
  return uniApp || globalThis.uni || null;
}

function resolveRiderInsuranceWindow(windowObject) {
  return windowObject || globalThis.window || null;
}

function resolveRiderInsurancePlusRuntime(plusRuntime) {
  if (plusRuntime) {
    return plusRuntime;
  }

  if (typeof globalThis.plus !== "undefined" && globalThis.plus?.runtime) {
    return globalThis.plus.runtime;
  }

  return null;
}

function showRiderInsuranceToast(uniApp, payload) {
  if (uniApp && typeof uniApp.showToast === "function") {
    uniApp.showToast(payload);
  }
}

export const DEFAULT_RIDER_INSURANCE_SETTINGS = {
  statusTitle: "骑手保障信息",
  statusDesc: "保障内容、承保信息和理赔入口以平台发布为准",
  policyNumber: "",
  provider: "",
  effectiveDate: "",
  expireDate: "",
  claimUrl: "",
  detailUrl: "",
  claimButtonText: "联系平台处理",
  detailButtonText: "查看保障说明",
  claimSteps: [
    "发生意外后第一时间联系客服或站点负责人",
    "准备相关证明材料（医疗票据、诊断证明、事故说明等）",
    "按平台指引提交理赔申请与补充材料",
    "等待保险审核与回款通知",
  ],
  coverages: [],
};

export function buildRiderInsuranceSettings(payload = {}) {
  const normalizedPayload = normalizeRiderInsurancePayload(payload);
  const claimSteps = normalizeRiderInsuranceSteps(
    normalizedPayload.rider_insurance_claim_steps,
  );

  return {
    statusTitle: normalizeRiderInsuranceText(
      normalizedPayload.rider_insurance_status_title,
      DEFAULT_RIDER_INSURANCE_SETTINGS.statusTitle,
    ),
    statusDesc: normalizeRiderInsuranceText(
      normalizedPayload.rider_insurance_status_desc,
      DEFAULT_RIDER_INSURANCE_SETTINGS.statusDesc,
    ),
    policyNumber: normalizeRiderInsuranceText(
      normalizedPayload.rider_insurance_policy_number,
      "",
    ),
    provider: normalizeRiderInsuranceText(
      normalizedPayload.rider_insurance_provider,
      "",
    ),
    effectiveDate: normalizeRiderInsuranceText(
      normalizedPayload.rider_insurance_effective_date,
      "",
    ),
    expireDate: normalizeRiderInsuranceText(
      normalizedPayload.rider_insurance_expire_date,
      "",
    ),
    claimUrl: normalizeRiderInsuranceText(
      normalizedPayload.rider_insurance_claim_url,
      "",
    ),
    detailUrl: normalizeRiderInsuranceText(
      normalizedPayload.rider_insurance_detail_url,
      "",
    ),
    claimButtonText: normalizeRiderInsuranceText(
      normalizedPayload.rider_insurance_claim_button_text,
      DEFAULT_RIDER_INSURANCE_SETTINGS.claimButtonText,
    ),
    detailButtonText: normalizeRiderInsuranceText(
      normalizedPayload.rider_insurance_detail_button_text,
      DEFAULT_RIDER_INSURANCE_SETTINGS.detailButtonText,
    ),
    claimSteps: claimSteps.length
      ? claimSteps
      : [...DEFAULT_RIDER_INSURANCE_SETTINGS.claimSteps],
    coverages: normalizeRiderInsuranceCoverages(
      normalizedPayload.rider_insurance_coverages,
    ),
  };
}

export function displayRiderInsuranceValue(value) {
  return normalizeRiderInsuranceText(value, "以平台发布为准");
}

export function openRiderInsuranceExternalLink(options = {}) {
  const {
    url,
    emptyMessage,
    uniApp,
    windowObject,
    plusRuntime,
  } = options;
  const target = normalizeRiderInsuranceText(url, "");
  const runtimeUni = resolveRiderInsuranceUni(uniApp);
  const runtimeWindow = resolveRiderInsuranceWindow(windowObject);
  const runtimePlus = resolveRiderInsurancePlusRuntime(plusRuntime);

  if (!target) {
    showRiderInsuranceToast(runtimeUni, {
      title: emptyMessage || "链接暂未发布",
      icon: "none",
    });
    return false;
  }

  if (runtimeWindow && typeof runtimeWindow.open === "function") {
    runtimeWindow.open(target, "_blank");
    return true;
  }

  if (runtimePlus && typeof runtimePlus.openURL === "function") {
    runtimePlus.openURL(target);
    return true;
  }

  if (runtimeUni && typeof runtimeUni.setClipboardData === "function") {
    runtimeUni.setClipboardData({
      data: target,
      success: () => {
        showRiderInsuranceToast(runtimeUni, {
          title: "链接已复制，请在浏览器打开",
          icon: "none",
        });
      },
    });
    return true;
  }

  return false;
}

export function createRiderInsurancePageLogic(options = {}) {
  const {
    fetchPublicRuntimeSettings,
    uniApp,
    windowObject,
    plusRuntime,
  } = options;

  return {
    data() {
      return {
        settings: buildRiderInsuranceSettings(),
        loading: false,
      };
    },
    onShow() {
      void this.loadSettings();
    },
    methods: {
      async loadSettings() {
        if (this.loading) {
          return;
        }

        this.loading = true;
        try {
          const payload =
            typeof fetchPublicRuntimeSettings === "function"
              ? await fetchPublicRuntimeSettings()
              : {};
          this.settings = buildRiderInsuranceSettings(payload);
        } catch (_error) {
          this.settings = buildRiderInsuranceSettings();
        } finally {
          this.loading = false;
        }
      },

      displayValue(value) {
        return displayRiderInsuranceValue(value);
      },

      openExternalLink(url, emptyMessage) {
        return openRiderInsuranceExternalLink({
          url,
          emptyMessage,
          uniApp,
          windowObject,
          plusRuntime,
        });
      },

      openClaim() {
        return this.openExternalLink(
          this.settings.claimUrl,
          "理赔入口暂未开放",
        );
      },

      openDetail() {
        return this.openExternalLink(
          this.settings.detailUrl,
          "保障详情暂未发布",
        );
      },
    },
  };
}
