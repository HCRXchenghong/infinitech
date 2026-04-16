function asRecord(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function cloneValue(value, fallback = value) {
  const source = value == null ? fallback : value;
  return JSON.parse(JSON.stringify(source));
}

function normalizeTrimmedText(value, fallback = "") {
  if (value === undefined || value === null) {
    return fallback;
  }
  const normalized = String(value).trim();
  return normalized || fallback;
}

function normalizeMultilineText(value, fallback = "") {
  if (value === undefined || value === null) {
    return fallback;
  }
  const normalized = String(value)
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trim();
  return normalized || fallback;
}

function normalizeBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    return value !== 0;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["1", "true", "yes", "on"].includes(normalized)) {
      return true;
    }
    if (["0", "false", "no", "off"].includes(normalized)) {
      return false;
    }
  }
  return Boolean(value);
}

function normalizeNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeInteger(value, { fallback = 0, min, max } = {}) {
  let parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    parsed = fallback;
  }
  parsed = Math.floor(parsed);
  if (typeof min === "number") {
    parsed = Math.max(min, parsed);
  }
  if (typeof max === "number") {
    parsed = Math.min(max, parsed);
  }
  return parsed;
}

function getFileExtension(file) {
  const fileName = normalizeTrimmedText(file?.name).toLowerCase();
  if (!fileName.includes(".")) {
    return "";
  }
  return `.${fileName.split(".").pop()}`;
}

export function normalizeServiceStringList(items = [], fallback = [], limit = 20) {
  const source = Array.isArray(items) ? items : fallback;
  const seen = new Set();

  return source
    .map((item) => normalizeTrimmedText(item))
    .filter((item) => {
      if (!item || seen.has(item)) {
        return false;
      }
      seen.add(item);
      return true;
    })
    .slice(0, limit);
}

const DEFAULT_SMS_CONFIG = {
  provider: "aliyun",
  access_key_id: "",
  access_key_secret: "",
  has_access_key_secret: false,
  sign_name: "",
  template_code: "",
  region_id: "cn-hangzhou",
  endpoint: "",
  consumer_enabled: true,
  merchant_enabled: true,
  rider_enabled: true,
  admin_enabled: true,
};

export function createDefaultSMSConfig() {
  return cloneValue(DEFAULT_SMS_CONFIG, DEFAULT_SMS_CONFIG);
}

export function normalizeSMSConfig(payload = {}) {
  const source = asRecord(payload);

  return {
    ...createDefaultSMSConfig(),
    provider: normalizeTrimmedText(source.provider, DEFAULT_SMS_CONFIG.provider),
    access_key_id: normalizeTrimmedText(
      source.access_key_id ?? source.access_key,
    ),
    access_key_secret: normalizeTrimmedText(source.access_key_secret),
    has_access_key_secret: normalizeBoolean(
      source.has_access_key_secret,
      false,
    ),
    sign_name: normalizeTrimmedText(source.sign_name ?? source.sign),
    template_code: normalizeTrimmedText(
      source.template_code ?? source.template_id,
    ),
    region_id: normalizeTrimmedText(
      source.region_id,
      DEFAULT_SMS_CONFIG.region_id,
    ),
    endpoint: normalizeTrimmedText(source.endpoint),
    consumer_enabled: normalizeBoolean(
      source.consumer_enabled ?? source.user_enabled,
      DEFAULT_SMS_CONFIG.consumer_enabled,
    ),
    merchant_enabled: normalizeBoolean(
      source.merchant_enabled,
      DEFAULT_SMS_CONFIG.merchant_enabled,
    ),
    rider_enabled: normalizeBoolean(
      source.rider_enabled,
      DEFAULT_SMS_CONFIG.rider_enabled,
    ),
    admin_enabled: normalizeBoolean(
      source.admin_enabled,
      DEFAULT_SMS_CONFIG.admin_enabled,
    ),
  };
}

export function buildSMSConfigPayload(payload = {}) {
  const normalized = normalizeSMSConfig(payload);
  return {
    provider: normalized.provider,
    access_key_id: normalized.access_key_id,
    access_key_secret: normalized.access_key_secret,
    sign_name: normalized.sign_name,
    template_code: normalized.template_code,
    region_id: normalized.region_id,
    endpoint: normalized.endpoint,
    consumer_enabled: normalized.consumer_enabled,
    merchant_enabled: normalized.merchant_enabled,
    rider_enabled: normalized.rider_enabled,
    admin_enabled: normalized.admin_enabled,
  };
}

const DEFAULT_WEATHER_CONFIG = {
  api_base_url: "https://uapis.cn/api/v1/misc/weather",
  api_key: "",
  city: "",
  adcode: "",
  lang: "zh",
  extended: true,
  forecast: true,
  hourly: true,
  minutely: true,
  indices: true,
  timeout_ms: 8000,
  refresh_interval_minutes: 10,
};

export function createDefaultWeatherConfig() {
  return cloneValue(DEFAULT_WEATHER_CONFIG, DEFAULT_WEATHER_CONFIG);
}

export function normalizeWeatherConfig(payload = {}) {
  const source = {
    ...createDefaultWeatherConfig(),
    ...asRecord(payload),
  };

  return {
    ...source,
    api_base_url: normalizeTrimmedText(
      source.api_base_url,
      DEFAULT_WEATHER_CONFIG.api_base_url,
    ),
    api_key: normalizeTrimmedText(source.api_key),
    city: normalizeTrimmedText(source.city || source.location),
    adcode: normalizeTrimmedText(source.adcode),
    lang: normalizeTrimmedText(source.lang, DEFAULT_WEATHER_CONFIG.lang),
    extended: normalizeBoolean(source.extended, DEFAULT_WEATHER_CONFIG.extended),
    forecast: normalizeBoolean(source.forecast, DEFAULT_WEATHER_CONFIG.forecast),
    hourly: normalizeBoolean(source.hourly, DEFAULT_WEATHER_CONFIG.hourly),
    minutely: normalizeBoolean(source.minutely, DEFAULT_WEATHER_CONFIG.minutely),
    indices: normalizeBoolean(source.indices, DEFAULT_WEATHER_CONFIG.indices),
    timeout_ms: normalizeInteger(source.timeout_ms, {
      fallback: DEFAULT_WEATHER_CONFIG.timeout_ms,
      min: 1000,
      max: 60000,
    }),
    refresh_interval_minutes: normalizeInteger(
      source.refresh_interval_minutes,
      {
        fallback: DEFAULT_WEATHER_CONFIG.refresh_interval_minutes,
        min: 1,
        max: 1440,
      },
    ),
  };
}

export function buildWeatherConfigPayload(payload = {}) {
  const normalized = normalizeWeatherConfig(payload);
  const { location, ...rest } = normalized;
  return rest;
}

const DEFAULT_SERVICE_SETTINGS = {
  service_phone: "",
  support_chat_title: "平台客服",
  support_chat_welcome_message: "您好！我是平台客服，有什么可以帮助您的吗？",
  merchant_chat_welcome_message: "欢迎光临，有什么可以帮您的？",
  rider_chat_welcome_message: "您好，您的骑手正在配送中。",
  message_notification_sound_url: "",
  order_notification_sound_url: "",
  rider_about_summary:
    "骑手端聚焦接单、配送、收入与保障场景，帮助骑手稳定履约并提升效率。",
  rider_portal_title: "骑手登录",
  rider_portal_subtitle: "悦享e食 · 骑手端",
  rider_portal_login_footer: "骑手账号由平台邀约开通",
  merchant_portal_title: "商户工作台",
  merchant_portal_subtitle: "悦享e食 · Merchant Console",
  merchant_portal_login_footer:
    "账号由平台管理员分配，登录后可直接管理订单和商品",
  merchant_privacy_policy:
    "我们会在必要范围内处理商户信息，用于订单履约、结算和风控，详细条款请联系平台管理员获取。",
  merchant_service_agreement:
    "使用商户端即表示你同意平台商户服务协议，包含店铺经营规范、结算与售后条款。",
  consumer_portal_title: "欢迎使用悦享e食",
  consumer_portal_subtitle: "一站式本地生活服务平台",
  consumer_portal_login_footer: "登录后可同步订单、消息、地址与优惠权益",
  consumer_about_summary:
    "悦享e食专注本地生活即时服务，覆盖外卖、跑腿、到店和会员等场景，持续优化用户体验。",
  consumer_privacy_policy:
    "平台仅在提供服务所必需的范围内处理账号、定位和订单信息，并遵循最小必要原则。",
  consumer_user_agreement:
    "使用平台服务前，请确认已阅读并同意用户协议、隐私政策及相关活动规则。",
  invite_landing_url: "",
  wechat_login_enabled: false,
  wechat_login_entry_url: "",
  medicine_support_phone: "",
  medicine_support_title: "一键医务室",
  medicine_support_subtitle: "紧急连线\n人工服务",
  medicine_delivery_description: "24小时配送\n平均30分钟达",
  medicine_season_tip:
    "近期流感高发，建议常备布洛芬、连花清瘟。如遇高热不退请及时就医。",
  rider_exception_report_reasons: [
    "商家出餐慢",
    "联系不上顾客",
    "顾客位置错误",
    "车辆故障",
    "恶劣天气",
    "道路拥堵",
    "订单信息错误",
    "其他原因",
  ],
  rider_insurance_status_title: "骑手保障信息",
  rider_insurance_status_desc: "保障内容、承保信息和理赔入口以平台发布为准",
  rider_insurance_policy_number: "",
  rider_insurance_provider: "",
  rider_insurance_effective_date: "",
  rider_insurance_expire_date: "",
  rider_insurance_claim_url: "",
  rider_insurance_detail_url: "",
  rider_insurance_claim_button_text: "联系平台处理",
  rider_insurance_detail_button_text: "查看保障说明",
  rider_insurance_coverages: [],
  rider_insurance_claim_steps: [
    "发生意外后第一时间联系客服或站点负责人",
    "准备相关证明材料（医疗票据、诊断证明、事故说明等）",
    "按平台指引提交理赔申请与补充材料",
    "等待保险审核与回款通知",
  ],
  rtc_enabled: true,
  rtc_timeout_seconds: 35,
  rtc_ice_servers: [
    { url: "stun:stun.l.google.com:19302", username: "", credential: "" },
  ],
  map_provider: "proxy",
  map_search_url: "",
  map_reverse_url: "",
  map_api_key: "",
  map_tile_template: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
  map_timeout_seconds: 5,
};

export function createDefaultServiceSettings() {
  return cloneValue(DEFAULT_SERVICE_SETTINGS, DEFAULT_SERVICE_SETTINGS);
}

export function normalizeRiderInsuranceCoverages(items = []) {
  if (!Array.isArray(items)) {
    return [];
  }
  return items
    .map((item) => ({
      icon: normalizeMultilineText(item?.icon),
      name: normalizeMultilineText(item?.name),
      amount: normalizeMultilineText(item?.amount),
    }))
    .filter((item) => item.icon || item.name || item.amount)
    .slice(0, 10);
}

export function createEmptyRiderInsuranceCoverage() {
  return {
    icon: "",
    name: "",
    amount: "",
  };
}

export function normalizeRTCIceServers(items = []) {
  if (!Array.isArray(items)) {
    return [];
  }
  return items
    .map((item) => ({
      url: normalizeTrimmedText(item?.url),
      username: normalizeTrimmedText(item?.username),
      credential: normalizeTrimmedText(item?.credential),
    }))
    .filter((item) => item.url || item.username || item.credential)
    .slice(0, 10);
}

export function createEmptyRTCIceServer() {
  return {
    url: "",
    username: "",
    credential: "",
  };
}

export function normalizeServiceSettings(payload = {}) {
  const source = {
    ...createDefaultServiceSettings(),
    ...asRecord(payload),
  };

  return {
    ...source,
    service_phone: normalizeTrimmedText(source.service_phone),
    support_chat_title: normalizeTrimmedText(
      source.support_chat_title,
      DEFAULT_SERVICE_SETTINGS.support_chat_title,
    ),
    support_chat_welcome_message: normalizeMultilineText(
      source.support_chat_welcome_message,
      DEFAULT_SERVICE_SETTINGS.support_chat_welcome_message,
    ),
    merchant_chat_welcome_message: normalizeMultilineText(
      source.merchant_chat_welcome_message,
      DEFAULT_SERVICE_SETTINGS.merchant_chat_welcome_message,
    ),
    rider_chat_welcome_message: normalizeMultilineText(
      source.rider_chat_welcome_message,
      DEFAULT_SERVICE_SETTINGS.rider_chat_welcome_message,
    ),
    message_notification_sound_url: normalizeTrimmedText(
      source.message_notification_sound_url,
    ),
    order_notification_sound_url: normalizeTrimmedText(
      source.order_notification_sound_url,
    ),
    rider_about_summary: normalizeMultilineText(
      source.rider_about_summary,
      DEFAULT_SERVICE_SETTINGS.rider_about_summary,
    ),
    rider_portal_title: normalizeTrimmedText(
      source.rider_portal_title,
      DEFAULT_SERVICE_SETTINGS.rider_portal_title,
    ),
    rider_portal_subtitle: normalizeTrimmedText(
      source.rider_portal_subtitle,
      DEFAULT_SERVICE_SETTINGS.rider_portal_subtitle,
    ),
    rider_portal_login_footer: normalizeMultilineText(
      source.rider_portal_login_footer,
      DEFAULT_SERVICE_SETTINGS.rider_portal_login_footer,
    ),
    merchant_portal_title: normalizeTrimmedText(
      source.merchant_portal_title,
      DEFAULT_SERVICE_SETTINGS.merchant_portal_title,
    ),
    merchant_portal_subtitle: normalizeTrimmedText(
      source.merchant_portal_subtitle,
      DEFAULT_SERVICE_SETTINGS.merchant_portal_subtitle,
    ),
    merchant_portal_login_footer: normalizeMultilineText(
      source.merchant_portal_login_footer,
      DEFAULT_SERVICE_SETTINGS.merchant_portal_login_footer,
    ),
    merchant_privacy_policy: normalizeMultilineText(
      source.merchant_privacy_policy,
      DEFAULT_SERVICE_SETTINGS.merchant_privacy_policy,
    ),
    merchant_service_agreement: normalizeMultilineText(
      source.merchant_service_agreement,
      DEFAULT_SERVICE_SETTINGS.merchant_service_agreement,
    ),
    consumer_portal_title: normalizeTrimmedText(
      source.consumer_portal_title,
      DEFAULT_SERVICE_SETTINGS.consumer_portal_title,
    ),
    consumer_portal_subtitle: normalizeTrimmedText(
      source.consumer_portal_subtitle,
      DEFAULT_SERVICE_SETTINGS.consumer_portal_subtitle,
    ),
    consumer_portal_login_footer: normalizeMultilineText(
      source.consumer_portal_login_footer,
      DEFAULT_SERVICE_SETTINGS.consumer_portal_login_footer,
    ),
    consumer_about_summary: normalizeMultilineText(
      source.consumer_about_summary,
      DEFAULT_SERVICE_SETTINGS.consumer_about_summary,
    ),
    consumer_privacy_policy: normalizeMultilineText(
      source.consumer_privacy_policy,
      DEFAULT_SERVICE_SETTINGS.consumer_privacy_policy,
    ),
    consumer_user_agreement: normalizeMultilineText(
      source.consumer_user_agreement,
      DEFAULT_SERVICE_SETTINGS.consumer_user_agreement,
    ),
    invite_landing_url: normalizeTrimmedText(source.invite_landing_url),
    wechat_login_enabled: normalizeBoolean(source.wechat_login_enabled, false),
    wechat_login_entry_url: normalizeTrimmedText(source.wechat_login_entry_url),
    medicine_support_phone: normalizeTrimmedText(source.medicine_support_phone),
    medicine_support_title: normalizeTrimmedText(
      source.medicine_support_title,
      DEFAULT_SERVICE_SETTINGS.medicine_support_title,
    ),
    medicine_support_subtitle: normalizeMultilineText(
      source.medicine_support_subtitle,
      DEFAULT_SERVICE_SETTINGS.medicine_support_subtitle,
    ),
    medicine_delivery_description: normalizeMultilineText(
      source.medicine_delivery_description,
      DEFAULT_SERVICE_SETTINGS.medicine_delivery_description,
    ),
    medicine_season_tip: normalizeMultilineText(
      source.medicine_season_tip,
      DEFAULT_SERVICE_SETTINGS.medicine_season_tip,
    ),
    rider_exception_report_reasons: normalizeServiceStringList(
      source.rider_exception_report_reasons,
      DEFAULT_SERVICE_SETTINGS.rider_exception_report_reasons,
      20,
    ),
    rider_insurance_status_title: normalizeMultilineText(
      source.rider_insurance_status_title,
      DEFAULT_SERVICE_SETTINGS.rider_insurance_status_title,
    ),
    rider_insurance_status_desc: normalizeMultilineText(
      source.rider_insurance_status_desc,
      DEFAULT_SERVICE_SETTINGS.rider_insurance_status_desc,
    ),
    rider_insurance_policy_number: normalizeTrimmedText(
      source.rider_insurance_policy_number,
    ),
    rider_insurance_provider: normalizeTrimmedText(
      source.rider_insurance_provider,
    ),
    rider_insurance_effective_date: normalizeTrimmedText(
      source.rider_insurance_effective_date,
    ),
    rider_insurance_expire_date: normalizeTrimmedText(
      source.rider_insurance_expire_date,
    ),
    rider_insurance_claim_url: normalizeTrimmedText(
      source.rider_insurance_claim_url,
    ),
    rider_insurance_detail_url: normalizeTrimmedText(
      source.rider_insurance_detail_url,
    ),
    rider_insurance_claim_button_text: normalizeMultilineText(
      source.rider_insurance_claim_button_text,
      DEFAULT_SERVICE_SETTINGS.rider_insurance_claim_button_text,
    ),
    rider_insurance_detail_button_text: normalizeMultilineText(
      source.rider_insurance_detail_button_text,
      DEFAULT_SERVICE_SETTINGS.rider_insurance_detail_button_text,
    ),
    rider_insurance_coverages: normalizeRiderInsuranceCoverages(
      source.rider_insurance_coverages,
    ),
    rider_insurance_claim_steps: normalizeServiceStringList(
      source.rider_insurance_claim_steps,
      DEFAULT_SERVICE_SETTINGS.rider_insurance_claim_steps,
      10,
    ),
    rtc_enabled: normalizeBoolean(
      source.rtc_enabled,
      DEFAULT_SERVICE_SETTINGS.rtc_enabled,
    ),
    rtc_timeout_seconds: normalizeInteger(source.rtc_timeout_seconds, {
      fallback: DEFAULT_SERVICE_SETTINGS.rtc_timeout_seconds,
      min: 10,
      max: 120,
    }),
    rtc_ice_servers: normalizeRTCIceServers(source.rtc_ice_servers),
    map_provider: normalizeTrimmedText(
      source.map_provider,
      DEFAULT_SERVICE_SETTINGS.map_provider,
    ),
    map_search_url: normalizeTrimmedText(source.map_search_url),
    map_reverse_url: normalizeTrimmedText(source.map_reverse_url),
    map_api_key: normalizeTrimmedText(source.map_api_key),
    map_tile_template: normalizeTrimmedText(
      source.map_tile_template,
      DEFAULT_SERVICE_SETTINGS.map_tile_template,
    ),
    map_timeout_seconds: normalizeInteger(source.map_timeout_seconds, {
      fallback: DEFAULT_SERVICE_SETTINGS.map_timeout_seconds,
      min: 1,
      max: 30,
    }),
  };
}

export function buildServiceSettingsPayload(payload = {}) {
  return normalizeServiceSettings(payload);
}

export function validateAdminAudioFile(file, maxMB = 10) {
  const mimeType = normalizeTrimmedText(file?.type).toLowerCase();
  const extension = getFileExtension(file);
  const allowedExts = [".mp3", ".m4a", ".aac", ".wav", ".ogg", ".amr"];
  const isAudio = mimeType.startsWith("audio/") || allowedExts.includes(extension);

  if (!isAudio) {
    return {
      valid: false,
      message: "仅支持 mp3、m4a、aac、wav、ogg、amr 音频文件",
    };
  }

  if (Number(file?.size || 0) > maxMB * 1024 * 1024) {
    return {
      valid: false,
      message: `音频文件大小不能超过 ${maxMB}MB`,
    };
  }

  return { valid: true, message: "" };
}

export function resolveAdminServiceSoundPreviewUrl(kind) {
  return kind === "order" ? "/audio/come.mp3" : "/audio/chat.mp3";
}

const DEFAULT_CHARITY_SETTINGS = {
  enabled: true,
  page_title: "悦享公益",
  page_subtitle: "让每一份善意都被看见",
  hero_image_url:
    "https://images.unsplash.com/photo-1593113598332-cd288d649433?w=1200",
  hero_tagline:
    "以长期、透明、可配置的方式，把平台善意送到真正需要帮助的人手里。",
  hero_days_running: 0,
  fund_pool_amount: 0,
  today_donation_count: 0,
  project_status_text: "筹备中",
  leaderboard_title: "善行榜单",
  news_title: "公益资讯",
  mission_title: "初心",
  mission_paragraph_one:
    "悦享e食不只是生活服务平台，也希望成为连接商户、用户与城市善意的长期基础设施。",
  mission_paragraph_two:
    "公益页面展示、参与入口与说明文案均以管理端发布为准，避免前端静态内容误导用户。",
  matching_plan_title: "公益参与计划",
  matching_plan_description:
    "平台会根据运营策略配置公益参与方式，当前展示内容和入口均可在管理端统一调整。",
  action_label: "了解参与方式",
  action_note: "OPERATED BY CHARITY OPS",
  participation_notice:
    "公益参与方式由平台统一发布。若当前未开放线上参与，请留意后续活动公告。",
  join_url: "",
  leaderboard: [],
  news_list: [],
};

export function createDefaultCharitySettings() {
  return cloneValue(DEFAULT_CHARITY_SETTINGS, DEFAULT_CHARITY_SETTINGS);
}

export function createEmptyCharityLeaderboardItem() {
  return { name: "", amount: 0, time_label: "" };
}

export function createEmptyCharityNewsItem() {
  return { title: "", summary: "", source: "", time_label: "", image_url: "" };
}

export function normalizeCharityLeaderboard(items = []) {
  if (!Array.isArray(items)) {
    return [];
  }
  return items
    .map((item) => ({
      name: normalizeMultilineText(item?.name),
      amount: Math.max(0, normalizeNumber(item?.amount, 0)),
      time_label: normalizeMultilineText(item?.time_label),
    }))
    .filter((item) => item.name || item.amount > 0 || item.time_label)
    .slice(0, 20);
}

export function normalizeCharityNewsList(items = []) {
  if (!Array.isArray(items)) {
    return [];
  }
  return items
    .map((item) => ({
      title: normalizeMultilineText(item?.title),
      summary: normalizeMultilineText(item?.summary),
      source: normalizeMultilineText(item?.source),
      time_label: normalizeMultilineText(item?.time_label),
      image_url: normalizeMultilineText(item?.image_url),
    }))
    .filter(
      (item) =>
        item.title ||
        item.summary ||
        item.source ||
        item.time_label ||
        item.image_url,
    )
    .slice(0, 20);
}

export function normalizeCharitySettings(payload = {}) {
  const source = {
    ...createDefaultCharitySettings(),
    ...asRecord(payload),
  };

  return {
    ...source,
    enabled: normalizeBoolean(source.enabled, DEFAULT_CHARITY_SETTINGS.enabled),
    page_title: normalizeMultilineText(
      source.page_title,
      DEFAULT_CHARITY_SETTINGS.page_title,
    ),
    page_subtitle: normalizeMultilineText(
      source.page_subtitle,
      DEFAULT_CHARITY_SETTINGS.page_subtitle,
    ),
    hero_image_url: normalizeMultilineText(
      source.hero_image_url,
      DEFAULT_CHARITY_SETTINGS.hero_image_url,
    ),
    hero_tagline: normalizeMultilineText(
      source.hero_tagline,
      DEFAULT_CHARITY_SETTINGS.hero_tagline,
    ),
    hero_days_running: Math.max(
      0,
      normalizeNumber(source.hero_days_running, 0),
    ),
    fund_pool_amount: Math.max(0, normalizeNumber(source.fund_pool_amount, 0)),
    today_donation_count: Math.max(
      0,
      normalizeNumber(source.today_donation_count, 0),
    ),
    project_status_text: normalizeMultilineText(
      source.project_status_text,
      DEFAULT_CHARITY_SETTINGS.project_status_text,
    ),
    leaderboard_title: normalizeMultilineText(
      source.leaderboard_title,
      DEFAULT_CHARITY_SETTINGS.leaderboard_title,
    ),
    news_title: normalizeMultilineText(
      source.news_title,
      DEFAULT_CHARITY_SETTINGS.news_title,
    ),
    mission_title: normalizeMultilineText(
      source.mission_title,
      DEFAULT_CHARITY_SETTINGS.mission_title,
    ),
    mission_paragraph_one: normalizeMultilineText(
      source.mission_paragraph_one,
      DEFAULT_CHARITY_SETTINGS.mission_paragraph_one,
    ),
    mission_paragraph_two: normalizeMultilineText(
      source.mission_paragraph_two,
      DEFAULT_CHARITY_SETTINGS.mission_paragraph_two,
    ),
    matching_plan_title: normalizeMultilineText(
      source.matching_plan_title,
      DEFAULT_CHARITY_SETTINGS.matching_plan_title,
    ),
    matching_plan_description: normalizeMultilineText(
      source.matching_plan_description,
      DEFAULT_CHARITY_SETTINGS.matching_plan_description,
    ),
    action_label: normalizeMultilineText(
      source.action_label,
      DEFAULT_CHARITY_SETTINGS.action_label,
    ),
    action_note: normalizeMultilineText(
      source.action_note,
      DEFAULT_CHARITY_SETTINGS.action_note,
    ),
    participation_notice: normalizeMultilineText(
      source.participation_notice,
      DEFAULT_CHARITY_SETTINGS.participation_notice,
    ),
    join_url: normalizeTrimmedText(source.join_url),
    leaderboard: normalizeCharityLeaderboard(source.leaderboard),
    news_list: normalizeCharityNewsList(source.news_list),
  };
}

export function buildCharitySettingsPayload(payload = {}) {
  return normalizeCharitySettings(payload);
}

const DEFAULT_WECHAT_LOGIN_CONFIG = {
  enabled: false,
  app_id: "",
  app_secret: "",
  has_app_secret: false,
  callback_url: "",
  scope: "snsapi_userinfo",
};

export function createDefaultWechatLoginConfig() {
  return cloneValue(
    DEFAULT_WECHAT_LOGIN_CONFIG,
    DEFAULT_WECHAT_LOGIN_CONFIG,
  );
}

export function normalizeWechatLoginConfig(payload = {}) {
  const source = {
    ...createDefaultWechatLoginConfig(),
    ...asRecord(payload),
  };

  return {
    ...source,
    enabled: normalizeBoolean(source.enabled, false),
    app_id: normalizeTrimmedText(source.app_id),
    app_secret: normalizeTrimmedText(source.app_secret),
    has_app_secret: normalizeBoolean(source.has_app_secret, false),
    callback_url: normalizeTrimmedText(source.callback_url),
    scope: normalizeTrimmedText(
      source.scope,
      DEFAULT_WECHAT_LOGIN_CONFIG.scope,
    ),
  };
}

export function buildWechatLoginConfigPayload(payload = {}) {
  const normalized = normalizeWechatLoginConfig(payload);
  return {
    enabled: normalized.enabled,
    app_id: normalized.app_id,
    app_secret: normalized.app_secret,
    callback_url: normalized.callback_url,
    scope: normalized.scope,
  };
}

const DEFAULT_APP_DOWNLOAD_CONFIG = {
  ios_url: "",
  android_url: "",
  ios_version: "",
  android_version: "",
  latest_version: "",
  updated_at: "",
  mini_program_qr_url: "",
};

export function createDefaultAppDownloadConfig() {
  return cloneValue(DEFAULT_APP_DOWNLOAD_CONFIG, DEFAULT_APP_DOWNLOAD_CONFIG);
}

export function normalizeAppDownloadConfig(payload = {}) {
  const source = {
    ...createDefaultAppDownloadConfig(),
    ...asRecord(payload),
  };

  return {
    ...source,
    ios_url: normalizeTrimmedText(source.ios_url),
    android_url: normalizeTrimmedText(source.android_url),
    ios_version: normalizeTrimmedText(source.ios_version),
    android_version: normalizeTrimmedText(source.android_version),
    latest_version: normalizeTrimmedText(source.latest_version),
    updated_at: normalizeTrimmedText(source.updated_at),
    mini_program_qr_url: normalizeTrimmedText(source.mini_program_qr_url),
  };
}

export function buildAppDownloadConfigPayload(payload = {}) {
  return normalizeAppDownloadConfig(payload);
}

export function validateAdminPackageFile(file, maxMB = 300) {
  const extension = getFileExtension(file);
  const allowedExts = [".ipa", ".apk", ".aab"];
  if (!allowedExts.includes(extension)) {
    return { valid: false, message: "仅支持 .ipa / .apk / .aab 安装包" };
  }
  if (Number(file?.size || 0) > maxMB * 1024 * 1024) {
    return { valid: false, message: `安装包不能超过${maxMB}MB` };
  }
  return { valid: true, message: "" };
}

export function validateAdminMiniProgramQrFile(file, maxMB = 10) {
  const mimeType = normalizeTrimmedText(file?.type).toLowerCase();
  const extension = getFileExtension(file);
  const allowedExts = [".png", ".jpg", ".jpeg", ".webp", ".gif"];
  const isImage = mimeType.startsWith("image/") || allowedExts.includes(extension);

  if (!isImage) {
    return { valid: false, message: "仅支持上传图片格式的小程序二维码" };
  }

  if (Number(file?.size || 0) > maxMB * 1024 * 1024) {
    return {
      valid: false,
      message: `小程序二维码图片不能超过 ${maxMB}MB`,
    };
  }

  return { valid: true, message: "" };
}

const DEFAULT_DEBUG_MODE = {
  enabled: false,
  delivery: false,
  phone_film: false,
  massage: false,
  coffee: false,
};

export function createDefaultDebugMode() {
  return cloneValue(DEFAULT_DEBUG_MODE, DEFAULT_DEBUG_MODE);
}

export function normalizeDebugModeConfig(payload = {}) {
  const source = {
    ...createDefaultDebugMode(),
    ...asRecord(payload),
  };

  return {
    ...source,
    enabled: normalizeBoolean(source.enabled, DEFAULT_DEBUG_MODE.enabled),
    delivery: normalizeBoolean(source.delivery, DEFAULT_DEBUG_MODE.delivery),
    phone_film: normalizeBoolean(
      source.phone_film,
      DEFAULT_DEBUG_MODE.phone_film,
    ),
    massage: normalizeBoolean(source.massage, DEFAULT_DEBUG_MODE.massage),
    coffee: normalizeBoolean(source.coffee, DEFAULT_DEBUG_MODE.coffee),
  };
}

export function buildDebugModePayload(payload = {}) {
  return normalizeDebugModeConfig(payload);
}

const DEFAULT_PAY_MODE = {
  isProd: false,
};

export function createDefaultPayMode() {
  return cloneValue(DEFAULT_PAY_MODE, DEFAULT_PAY_MODE);
}

export function normalizePayModeConfig(payload = {}) {
  const source = {
    ...createDefaultPayMode(),
    ...asRecord(payload),
  };

  return {
    ...source,
    isProd: normalizeBoolean(source.isProd ?? source.is_prod, false),
  };
}

export function buildPayModePayload(payload = {}) {
  const normalized = normalizePayModeConfig(payload);
  return { isProd: normalized.isProd };
}

const DEFAULT_WXPAY_CONFIG = {
  appId: "",
  mchId: "",
  apiKey: "",
  apiV3Key: "",
  serialNo: "",
  notifyUrl: "",
};

export function createDefaultWxpayConfig() {
  return cloneValue(DEFAULT_WXPAY_CONFIG, DEFAULT_WXPAY_CONFIG);
}

export function normalizeWxpayConfig(payload = {}) {
  const source = {
    ...createDefaultWxpayConfig(),
    ...asRecord(payload),
  };

  return {
    ...source,
    appId: normalizeTrimmedText(source.appId),
    mchId: normalizeTrimmedText(source.mchId),
    apiKey: normalizeTrimmedText(source.apiKey),
    apiV3Key: normalizeTrimmedText(source.apiV3Key),
    serialNo: normalizeTrimmedText(source.serialNo),
    notifyUrl: normalizeTrimmedText(source.notifyUrl),
  };
}

export function buildWxpayConfigPayload(payload = {}) {
  return normalizeWxpayConfig(payload);
}

const DEFAULT_ALIPAY_CONFIG = {
  appId: "",
  privateKey: "",
  alipayPublicKey: "",
  notifyUrl: "",
  sandbox: true,
};

export function createDefaultAlipayConfig() {
  return cloneValue(DEFAULT_ALIPAY_CONFIG, DEFAULT_ALIPAY_CONFIG);
}

export function normalizeAlipayConfig(payload = {}) {
  const source = {
    ...createDefaultAlipayConfig(),
    ...asRecord(payload),
  };

  return {
    ...source,
    appId: normalizeTrimmedText(source.appId),
    privateKey: normalizeTrimmedText(source.privateKey),
    alipayPublicKey: normalizeTrimmedText(source.alipayPublicKey),
    notifyUrl: normalizeTrimmedText(source.notifyUrl),
    sandbox: normalizeBoolean(source.sandbox, DEFAULT_ALIPAY_CONFIG.sandbox),
  };
}

export function buildAlipayConfigPayload(payload = {}) {
  return normalizeAlipayConfig(payload);
}

const DEFAULT_VIP_SETTINGS = {
  enabled: true,
  page_title: "会员中心",
  rules_title: "会员权益规则",
  benefit_section_title: "权益全景",
  benefit_section_tag: "VIP专享",
  benefit_section_tip: "点击查看详情",
  tasks_section_title: "成长任务",
  tasks_section_tip: "完成任务，逐步解锁更多等级权益",
  points_section_title: "积分好礼",
  points_section_tip: "积分商品由积分商城实时维护",
  service_button_text: "客服",
  standard_action_text: "立即去点餐升级",
  premium_action_text: "联系专属客服",
  point_rules: [
    "平台消费 1 元 = 1 积分，按实付金额累计。",
    "会员倍数积分会在基础积分上额外叠加。",
    "退款订单对应积分会同步扣回。",
    "积分有效期与兑换规则以积分商城说明为准。",
  ],
  levels: [
    {
      name: "优享VIP",
      style_class: "level-quality",
      tagline: "日常省一点，从这里开始",
      threshold_label: "成长值 800",
      threshold_value: 800,
      multiplier: 1,
      is_black_gold: false,
      benefits: [
        {
          icon: "/static/icons/star.svg",
          title: "积分",
          desc: "消费返积分",
          detail: "平台消费 1 元可累计 1 积分，按订单实付金额计算。",
        },
        {
          icon: "/static/icons/gift.svg",
          title: "兑换好礼",
          desc: "积分兑换权益",
          detail: "积分可在积分商城兑换实物商品、会员卡和平台权益。",
        },
        {
          icon: "/static/icons/clock.svg",
          title: "超时赔付",
          desc: "超时自动补偿",
          detail: "订单超过承诺时效后，平台可按规则发放补偿。",
        },
      ],
    },
    {
      name: "黄金VIP",
      style_class: "level-gold",
      tagline: "返利升级，权益更进一步",
      threshold_label: "成长值 3000",
      threshold_value: 3000,
      multiplier: 2,
      is_black_gold: false,
      benefits: [
        {
          icon: "/static/icons/ticket.svg",
          title: "2元无门槛券",
          desc: "每月 1 张",
          detail: "每月发放 1 张 2 元无门槛券，面向指定业务场景可用。",
        },
        {
          icon: "/static/icons/clock.svg",
          title: "超时赔付",
          desc: "超时自动补偿",
          detail: "订单超过承诺时效后，平台可按规则发放补偿。",
        },
        {
          icon: "/static/icons/star.svg",
          title: "双倍积分",
          desc: "积分翻倍累计",
          detail: "在基础积分之上额外发放 1 倍会员积分。",
        },
        {
          icon: "/static/icons/gift.svg",
          title: "兑换好礼",
          desc: "积分兑换权益",
          detail: "积分可在积分商城兑换实物商品、会员卡和平台权益。",
        },
      ],
    },
    {
      name: "尊享VIP",
      style_class: "level-premium",
      tagline: "更多特权，服务更快一步",
      threshold_label: "成长值 5000",
      threshold_value: 5000,
      multiplier: 2,
      is_black_gold: false,
      benefits: [
        {
          icon: "/static/icons/ticket.svg",
          title: "2元无门槛券",
          desc: "每月 1 张",
          detail: "每月发放 1 张 2 元无门槛券，面向指定业务场景可用。",
        },
        {
          icon: "/static/icons/bike.svg",
          title: "免配送费",
          desc: "每月 1 次",
          detail: "每月可享 1 次免配送费权益。",
        },
        {
          icon: "/static/icons/clock.svg",
          title: "超时赔付",
          desc: "超时自动补偿",
          detail: "订单超过承诺时效后，平台可按规则发放补偿。",
        },
        {
          icon: "/static/icons/star.svg",
          title: "双倍积分",
          desc: "积分翻倍累计",
          detail: "在基础积分之上额外发放 1 倍会员积分。",
        },
        {
          icon: "/static/icons/gift.svg",
          title: "兑换好礼",
          desc: "积分兑换权益",
          detail: "积分可在积分商城兑换实物商品、会员卡和平台权益。",
        },
        {
          icon: "/static/icons/headphones.svg",
          title: "专属客服",
          desc: "优先响应支持",
          detail: "会员问题支持优先接入，保障处理效率。",
        },
      ],
    },
    {
      name: "黑金VIP",
      style_class: "level-supreme",
      tagline: "黑金尊享，服务与补贴双升级",
      threshold_label: "成长值 8000",
      threshold_value: 8000,
      multiplier: 3,
      is_black_gold: true,
      benefits: [
        {
          icon: "/static/icons/ticket.svg",
          title: "2元无门槛券",
          desc: "每月 2 张",
          detail: "每月发放 2 张 2 元无门槛券，面向指定业务场景可用。",
        },
        {
          icon: "/static/icons/bike.svg",
          title: "免配送费",
          desc: "每月 2 次",
          detail: "每月可享 2 次免配送费权益。",
        },
        {
          icon: "/static/icons/clock.svg",
          title: "超时赔付",
          desc: "超时自动补偿",
          detail: "订单超过承诺时效后，平台可按规则发放补偿。",
        },
        {
          icon: "/static/icons/star.svg",
          title: "三倍积分",
          desc: "积分三倍累计",
          detail: "在基础积分之上额外发放 2 倍会员积分。",
        },
        {
          icon: "/static/icons/gift.svg",
          title: "兑换好礼",
          desc: "积分兑换权益",
          detail: "积分可在积分商城兑换实物商品、会员卡和平台权益。",
        },
        {
          icon: "/static/icons/headphones.svg",
          title: "24h客服",
          desc: "一对一专属支持",
          detail: "黑金会员可享受一对一专属服务支持。",
        },
      ],
    },
  ],
  growth_tasks: [
    {
      title: "完成 1 笔早餐订单",
      description: "解锁本周首笔早餐订单成长奖励",
      reward_text: "+80 成长值",
      action_label: "去下单",
    },
    {
      title: "本周完成 5 笔订单",
      description: "保持活跃消费，累计会员成长值",
      reward_text: "+200 成长值",
      action_label: "去点餐",
    },
    {
      title: "连续 3 天下单",
      description: "连续活跃可提升等级成长速度",
      reward_text: "+120 成长值",
      action_label: "去完成",
    },
    {
      title: "浏览新品推荐",
      description: "查看新品专区可获得轻量成长奖励",
      reward_text: "+20 成长值",
      action_label: "去看看",
    },
  ],
};

export function createDefaultVIPSettings() {
  return cloneValue(DEFAULT_VIP_SETTINGS, DEFAULT_VIP_SETTINGS);
}

function dedupeStringList(items = []) {
  const seen = new Set();
  return (Array.isArray(items) ? items : [])
    .map((item) => normalizeMultilineText(item))
    .filter((item) => {
      if (!item || seen.has(item)) {
        return false;
      }
      seen.add(item);
      return true;
    });
}

export function createEmptyVIPBenefit() {
  return {
    icon: "/static/icons/star.svg",
    title: "",
    desc: "",
    detail: "",
  };
}

export function createEmptyVIPLevel() {
  return {
    name: "",
    style_class: "level-quality",
    tagline: "",
    threshold_label: "",
    threshold_value: 1000,
    multiplier: 1,
    is_black_gold: false,
    benefits: [createEmptyVIPBenefit()],
  };
}

export function createEmptyVIPTask() {
  return {
    title: "",
    description: "",
    reward_text: "",
    action_label: "去完成",
  };
}

function normalizeVIPBenefits(items = [], fallback = []) {
  const source = Array.isArray(items) && items.length ? items : fallback;
  return source
    .map((item) => ({
      icon: normalizeMultilineText(item?.icon, "/static/icons/star.svg"),
      title: normalizeMultilineText(item?.title),
      desc: normalizeMultilineText(item?.desc),
      detail: normalizeMultilineText(item?.detail),
    }))
    .filter((item) => item.title || item.desc || item.detail || item.icon)
    .slice(0, 12);
}

function normalizeVIPLevels(items = [], fallback = []) {
  const source = Array.isArray(items) && items.length ? items : fallback;
  return source
    .map((item, index) => ({
      name: normalizeMultilineText(item?.name),
      style_class: normalizeMultilineText(
        item?.style_class,
        index === 0 ? "level-quality" : "level-gold",
      ),
      tagline: normalizeMultilineText(item?.tagline),
      threshold_label: normalizeMultilineText(item?.threshold_label),
      threshold_value: Math.max(1, normalizeNumber(item?.threshold_value, 0)),
      multiplier: Math.max(1, normalizeNumber(item?.multiplier, 1)),
      is_black_gold: normalizeBoolean(item?.is_black_gold, false),
      benefits: normalizeVIPBenefits(item?.benefits, []),
    }))
    .filter((item) => item.name || item.threshold_value || item.benefits.length)
    .sort((left, right) => left.threshold_value - right.threshold_value)
    .slice(0, 8);
}

function normalizeVIPTasks(items = [], fallback = []) {
  const source = Array.isArray(items) && items.length ? items : fallback;
  return source
    .map((item) => ({
      title: normalizeMultilineText(item?.title),
      description: normalizeMultilineText(item?.description),
      reward_text: normalizeMultilineText(item?.reward_text),
      action_label: normalizeMultilineText(item?.action_label, "去完成"),
    }))
    .filter(
      (item) =>
        item.title || item.description || item.reward_text || item.action_label,
    )
    .slice(0, 20);
}

export function normalizeVIPSettings(payload = {}) {
  const merged = {
    ...createDefaultVIPSettings(),
    ...asRecord(payload),
  };

  return {
    enabled: normalizeBoolean(merged.enabled, DEFAULT_VIP_SETTINGS.enabled),
    page_title: normalizeMultilineText(
      merged.page_title,
      DEFAULT_VIP_SETTINGS.page_title,
    ),
    rules_title: normalizeMultilineText(
      merged.rules_title,
      DEFAULT_VIP_SETTINGS.rules_title,
    ),
    benefit_section_title: normalizeMultilineText(
      merged.benefit_section_title,
      DEFAULT_VIP_SETTINGS.benefit_section_title,
    ),
    benefit_section_tag: normalizeMultilineText(
      merged.benefit_section_tag,
      DEFAULT_VIP_SETTINGS.benefit_section_tag,
    ),
    benefit_section_tip: normalizeMultilineText(
      merged.benefit_section_tip,
      DEFAULT_VIP_SETTINGS.benefit_section_tip,
    ),
    tasks_section_title: normalizeMultilineText(
      merged.tasks_section_title,
      DEFAULT_VIP_SETTINGS.tasks_section_title,
    ),
    tasks_section_tip: normalizeMultilineText(
      merged.tasks_section_tip,
      DEFAULT_VIP_SETTINGS.tasks_section_tip,
    ),
    points_section_title: normalizeMultilineText(
      merged.points_section_title,
      DEFAULT_VIP_SETTINGS.points_section_title,
    ),
    points_section_tip: normalizeMultilineText(
      merged.points_section_tip,
      DEFAULT_VIP_SETTINGS.points_section_tip,
    ),
    service_button_text: normalizeMultilineText(
      merged.service_button_text,
      DEFAULT_VIP_SETTINGS.service_button_text,
    ),
    standard_action_text: normalizeMultilineText(
      merged.standard_action_text,
      DEFAULT_VIP_SETTINGS.standard_action_text,
    ),
    premium_action_text: normalizeMultilineText(
      merged.premium_action_text,
      DEFAULT_VIP_SETTINGS.premium_action_text,
    ),
    point_rules: dedupeStringList(
      Array.isArray(merged.point_rules)
        ? merged.point_rules
        : DEFAULT_VIP_SETTINGS.point_rules,
    ).slice(0, 20),
    levels: normalizeVIPLevels(merged.levels, DEFAULT_VIP_SETTINGS.levels),
    growth_tasks: normalizeVIPTasks(
      merged.growth_tasks,
      DEFAULT_VIP_SETTINGS.growth_tasks,
    ),
  };
}

export function buildVIPSettingsPayload(settings = {}) {
  return normalizeVIPSettings(settings);
}
