export const MEDICINE_HOME_TEXTS = {
  pageTitle: "您哪里不舒服？",
  pageSubtitle: "全天候医药守护",
  aiTitle: "AI 智能问诊",
  aiDesc: "描述症状，快速获取用药建议",
  startConsult: "开始咨询",
  fastTitle: "极速买药",
  seasonTipLabel: "季节提醒：",
  cancel: "取消",
  callNow: "立即拨打",
  supportModalFallback:
    "当前医药热线以平台发布为准，如需帮助请先联系在线客服。",
  hotlineUnavailable: "医药热线暂未开放",
  callFailed: "无法拨打电话，请检查权限",
  contactPrefix: "联系",
};

export const DEFAULT_MEDICINE_RUNTIME_SETTINGS = {
  service_phone: "",
  medicine_support_phone: "",
  medicine_support_title: "一键医务室",
  medicine_support_subtitle: "紧急情况可联系人工作服务",
  medicine_delivery_description: "24小时配送\n平台30分钟达",
  medicine_season_tip:
    "近期流感高发，建议常备常用药。如遇高热不退请及时就医。",
};

function normalizeText(value, fallback = "") {
  const text = String(value || "").replace(/\\n/g, "\n").trim();
  return text || fallback;
}

export function normalizeMedicineRuntimeSettings(raw) {
  const payload = raw && typeof raw === "object" ? raw : {};
  return {
    service_phone: normalizeText(
      payload.service_phone,
      DEFAULT_MEDICINE_RUNTIME_SETTINGS.service_phone,
    ),
    medicine_support_phone: normalizeText(
      payload.medicine_support_phone,
      DEFAULT_MEDICINE_RUNTIME_SETTINGS.medicine_support_phone,
    ),
    medicine_support_title: normalizeText(
      payload.medicine_support_title,
      DEFAULT_MEDICINE_RUNTIME_SETTINGS.medicine_support_title,
    ),
    medicine_support_subtitle: normalizeText(
      payload.medicine_support_subtitle,
      DEFAULT_MEDICINE_RUNTIME_SETTINGS.medicine_support_subtitle,
    ),
    medicine_delivery_description: normalizeText(
      payload.medicine_delivery_description,
      DEFAULT_MEDICINE_RUNTIME_SETTINGS.medicine_delivery_description,
    ),
    medicine_season_tip: normalizeText(
      payload.medicine_season_tip,
      DEFAULT_MEDICINE_RUNTIME_SETTINGS.medicine_season_tip,
    ),
  };
}

export function resolveMedicineHotlinePhone(settings = {}) {
  return (
    String(settings?.medicine_support_phone || "").trim() ||
    String(settings?.service_phone || "").trim()
  );
}

export function buildMedicineSupportModalTitle(
  texts = MEDICINE_HOME_TEXTS,
  settings = {},
) {
  const prefix = String(texts?.contactPrefix || MEDICINE_HOME_TEXTS.contactPrefix);
  const title = String(
    settings?.medicine_support_title ||
      DEFAULT_MEDICINE_RUNTIME_SETTINGS.medicine_support_title,
  ).trim();
  return `${prefix}${title}`;
}

export function buildMedicineSupportModalCopy(
  texts = MEDICINE_HOME_TEXTS,
  hotlinePhone = "",
  settings = {},
) {
  const normalizedPhone = String(hotlinePhone || "").trim();
  if (!normalizedPhone) {
    return String(
      texts?.supportModalFallback || MEDICINE_HOME_TEXTS.supportModalFallback,
    );
  }
  const subtitle = String(
    settings?.medicine_support_subtitle ||
      DEFAULT_MEDICINE_RUNTIME_SETTINGS.medicine_support_subtitle,
  ).trim();
  return `即将拨打 ${normalizedPhone}\n${subtitle}`;
}
