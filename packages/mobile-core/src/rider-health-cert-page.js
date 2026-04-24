import { resolveUploadAssetUrl } from "../../contracts/src/http.js";

function normalizeRiderHealthCertText(value, fallback = "") {
  const normalized = String(value == null ? "" : value).trim();
  return normalized || fallback;
}

function resolveRiderHealthCertUniRuntime(uniApp) {
  return uniApp || globalThis.uni || null;
}

function showRiderHealthCertToast(uniApp, payload) {
  if (uniApp && typeof uniApp.showToast === "function") {
    uniApp.showToast(payload);
  }
}

function showRiderHealthCertLoading(uniApp, payload) {
  if (uniApp && typeof uniApp.showLoading === "function") {
    uniApp.showLoading(payload);
  }
}

function hideRiderHealthCertLoading(uniApp) {
  if (uniApp && typeof uniApp.hideLoading === "function") {
    uniApp.hideLoading();
  }
}

function cloneRiderHealthCertRecord() {
  return {
    certStatus: "valid",
    certImageUrl: "/static/placeholder-cert.jpg",
    certNumber: "440300202401001234",
    issuingAuthority: "深圳市南山区疾控中心",
    issueDate: "2024-06-30",
    expireDate: "2025-06-30",
    tipText: "健康证是从事外卖配送的必要条件，请确保健康证在有效期内",
  };
}

export const DEFAULT_RIDER_HEALTH_CERT_RECORD = Object.freeze(
  cloneRiderHealthCertRecord(),
);

export function resolveRiderHealthCertStatusMeta(status, options = {}) {
  const expireDate = normalizeRiderHealthCertText(
    options.expireDate,
    DEFAULT_RIDER_HEALTH_CERT_RECORD.expireDate,
  );
  const normalized = normalizeRiderHealthCertText(status, "valid").toLowerCase();

  if (normalized === "expired") {
    return {
      status: "expired",
      icon: "⚠",
      title: "健康证已过期",
      desc: "请立即更新健康证并重新提交审核",
    };
  }

  if (normalized === "expiring") {
    return {
      status: "expiring",
      icon: "⚠",
      title: "健康证即将过期",
      desc: `有效期至 ${expireDate}，请及时更新健康证`,
    };
  }

  return {
    status: "valid",
    icon: "✓",
    title: "健康证有效",
    desc: `有效期至 ${expireDate}`,
  };
}

export function buildRiderHealthCertInfoRows(record = {}) {
  const source = {
    ...cloneRiderHealthCertRecord(),
    ...(record && typeof record === "object" ? record : {}),
  };

  return [
    { label: "证件编号", value: normalizeRiderHealthCertText(source.certNumber) },
    { label: "发证机关", value: normalizeRiderHealthCertText(source.issuingAuthority) },
    { label: "发证日期", value: normalizeRiderHealthCertText(source.issueDate) },
    { label: "有效期至", value: normalizeRiderHealthCertText(source.expireDate) },
  ];
}

export function createRiderHealthCertPageLogic(options = {}) {
  const {
    uniApp,
    uploadHealthCertImage,
    downloadHealthCertImage,
  } = options;
  const runtimeUni = resolveRiderHealthCertUniRuntime(uniApp);

  return {
    data() {
      return cloneRiderHealthCertRecord();
    },
    computed: {
      certStatusMeta() {
        return resolveRiderHealthCertStatusMeta(this.certStatus, {
          expireDate: this.expireDate,
        });
      },
      certInfoRows() {
        return buildRiderHealthCertInfoRows({
          certNumber: this.certNumber,
          issuingAuthority: this.issuingAuthority,
          issueDate: this.issueDate,
          expireDate: this.expireDate,
        });
      },
    },
    methods: {
      previewImage() {
        const target = normalizeRiderHealthCertText(this.certImageUrl);
        if (!target) {
          showRiderHealthCertToast(runtimeUni, {
            title: "暂无证件图片",
            icon: "none",
          });
          return;
        }

        if (runtimeUni && typeof runtimeUni.previewImage === "function") {
          runtimeUni.previewImage({
            urls: [target],
            current: target,
          });
        }
      },

      uploadImage() {
        if (!runtimeUni || typeof runtimeUni.chooseImage !== "function") {
          return;
        }

        runtimeUni.chooseImage({
          count: 1,
          success: async (result) => {
            const filePath = result?.tempFilePaths?.[0];
            if (!filePath) {
              return;
            }

            showRiderHealthCertLoading(runtimeUni, { title: "上传中..." });
            try {
              let nextImageUrl = filePath;
              if (typeof uploadHealthCertImage === "function") {
                const payload = await uploadHealthCertImage(filePath);
                nextImageUrl =
                  normalizeRiderHealthCertText(resolveUploadAssetUrl(payload), filePath);
              }
              this.certImageUrl = nextImageUrl;
              showRiderHealthCertToast(runtimeUni, {
                title: "上传成功",
                icon: "success",
              });
            } catch (_error) {
              showRiderHealthCertToast(runtimeUni, {
                title: "上传失败",
                icon: "none",
              });
            } finally {
              hideRiderHealthCertLoading(runtimeUni);
            }
          },
        });
      },

      async downloadImage() {
        const target = normalizeRiderHealthCertText(this.certImageUrl);
        if (!target) {
          showRiderHealthCertToast(runtimeUni, {
            title: "暂无可下载图片",
            icon: "none",
          });
          return;
        }

        try {
          if (typeof downloadHealthCertImage === "function") {
            await downloadHealthCertImage(target);
          }
          showRiderHealthCertToast(runtimeUni, {
            title: "下载成功",
            icon: "success",
          });
        } catch (_error) {
          showRiderHealthCertToast(runtimeUni, {
            title: "下载失败",
            icon: "none",
          });
        }
      },
    },
  };
}
