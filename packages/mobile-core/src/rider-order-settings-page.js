import {
  buildRiderPreferencePayload,
  clampRiderPreferenceDistance,
  DEFAULT_RIDER_PREFERENCE_SETTINGS,
  extractRiderPreferenceSettings,
} from "../../client-sdk/src/mobile-capabilities.js";

function resolveRiderOrderSettingsUniRuntime(uniApp) {
  return uniApp || globalThis.uni || null;
}

function resolveRiderOrderSettingsErrorMessage(error, fallback) {
  const message = error && (error.error || error.message);
  return String(message || fallback);
}

function showRiderOrderSettingsToast(uniApp, payload) {
  if (uniApp && typeof uniApp.showToast === "function") {
    uniApp.showToast(payload);
  }
}

function showRiderOrderSettingsModal(uniApp, payload) {
  if (uniApp && typeof uniApp.showModal === "function") {
    uniApp.showModal(payload);
  }
}

export const RIDER_ORDER_SETTINGS_TIP =
  "合理设置接单偏好，可提升候选单排序质量与自动接单命中率";
export const RIDER_ORDER_SETTINGS_AUTO_ACCEPT_CONFIRM = {
  title: "开启自动接单",
  content: "开启后将自动接受符合条件的订单，确定开启吗？",
};

export function normalizeRiderOrderSettings(payload = {}) {
  return extractRiderPreferenceSettings(payload);
}

export function buildRiderOrderSettingsSavePayload(settings = {}) {
  return buildRiderPreferencePayload(settings);
}

export function normalizeRiderOrderSettingsDistance(value) {
  return clampRiderPreferenceDistance(value);
}

export function createRiderOrderSettingsPageLogic(options = {}) {
  const {
    fetchRiderPreferences,
    saveRiderPreferences,
    uniApp,
  } = options;
  const runtimeUni = resolveRiderOrderSettingsUniRuntime(uniApp);

  return {
    data() {
      return {
        loading: false,
        saving: false,
        orderSettings: { ...DEFAULT_RIDER_PREFERENCE_SETTINGS },
        tipText: RIDER_ORDER_SETTINGS_TIP,
      };
    },
    onLoad() {
      void this.loadPreferences();
    },
    onShow() {
      void this.loadPreferences();
    },
    methods: {
      normalizePreferences(raw = {}) {
        return normalizeRiderOrderSettings(raw);
      },
      buildSavePayload(settings = this.orderSettings) {
        return buildRiderOrderSettingsSavePayload(settings);
      },
      async loadPreferences() {
        this.loading = true;
        try {
          if (typeof fetchRiderPreferences !== "function") {
            this.orderSettings = this.normalizePreferences();
            return;
          }

          const response = await fetchRiderPreferences();
          this.orderSettings = this.normalizePreferences(response);
        } catch (error) {
          this.orderSettings = this.normalizePreferences();
          showRiderOrderSettingsToast(runtimeUni, {
            title: resolveRiderOrderSettingsErrorMessage(error, "加载设置失败"),
            icon: "none",
          });
        } finally {
          this.loading = false;
        }
      },
      handleDistanceChange(event) {
        this.orderSettings = {
          ...this.orderSettings,
          maxDistanceKm: normalizeRiderOrderSettingsDistance(
            event && event.detail ? event.detail.value : undefined,
          ),
        };
      },
      handleSwitchChange(field, event) {
        const key = String(field || "");
        if (!Object.prototype.hasOwnProperty.call(this.orderSettings, key)) {
          return;
        }

        this.orderSettings = {
          ...this.orderSettings,
          [key]: !!(event && event.detail && event.detail.value),
        };
      },
      toggleAuto() {
        const nextValue = !this.orderSettings.autoAcceptEnabled;

        if (nextValue) {
          showRiderOrderSettingsModal(runtimeUni, {
            ...RIDER_ORDER_SETTINGS_AUTO_ACCEPT_CONFIRM,
            success: (res) => {
              this.orderSettings = {
                ...this.orderSettings,
                autoAcceptEnabled: !!(res && res.confirm),
              };
            },
          });
          return;
        }

        this.orderSettings = {
          ...this.orderSettings,
          autoAcceptEnabled: false,
        };
      },
      async savePreferences() {
        if (this.saving || this.loading) {
          return;
        }

        this.saving = true;
        try {
          if (typeof saveRiderPreferences !== "function") {
            return;
          }

          const response = await saveRiderPreferences(this.buildSavePayload());
          this.orderSettings = this.normalizePreferences(response);
          showRiderOrderSettingsToast(runtimeUni, {
            title: "保存成功",
            icon: "success",
          });
        } catch (error) {
          showRiderOrderSettingsToast(runtimeUni, {
            title: resolveRiderOrderSettingsErrorMessage(error, "保存失败"),
            icon: "none",
          });
        } finally {
          this.saving = false;
        }
      },
    },
  };
}
