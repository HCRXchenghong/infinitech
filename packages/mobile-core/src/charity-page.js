const SAFE_CHARITY_JOIN_PROTOCOLS = new Set([
  "http:",
  "https:",
  "mailto:",
  "tel:",
  "sms:",
  "weixin:",
  "alipays:",
]);

export const DEFAULT_CHARITY_SETTINGS = {
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

function normalizeCharityText(value, fallback = "") {
  const normalized = String(value || "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trim();
  return normalized || fallback;
}

function normalizeNonNegativeNumber(value) {
  const normalized = Number(value);
  if (!Number.isFinite(normalized) || normalized < 0) {
    return 0;
  }
  return normalized;
}

export function createDefaultCharitySettings() {
  return {
    ...DEFAULT_CHARITY_SETTINGS,
    leaderboard: [],
    news_list: [],
  };
}

export function normalizeCharityLeaderboard(items = []) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .map((item) => ({
      name: normalizeCharityText(item && item.name),
      amount: normalizeNonNegativeNumber(item && item.amount),
      time_label: normalizeCharityText(item && item.time_label),
    }))
    .filter((item) => item.name || item.amount > 0 || item.time_label);
}

export function normalizeCharityNewsList(items = []) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .map((item) => ({
      title: normalizeCharityText(item && item.title),
      summary: normalizeCharityText(item && item.summary),
      source: normalizeCharityText(item && item.source),
      time_label: normalizeCharityText(item && item.time_label),
      image_url: normalizeCharityText(item && item.image_url),
    }))
    .filter(
      (item) =>
        item.title ||
        item.summary ||
        item.source ||
        item.time_label ||
        item.image_url,
    );
}

export function normalizeCharityJoinUrl(value) {
  const raw = normalizeCharityText(value);
  if (!raw) {
    return "";
  }

  if (/^(\/(?!\/)|\?)/.test(raw)) {
    return raw;
  }

  try {
    const parsed = new URL(raw);
    if (!SAFE_CHARITY_JOIN_PROTOCOLS.has(parsed.protocol)) {
      return "";
    }
    return parsed.toString();
  } catch (_error) {
    return "";
  }
}

export function normalizeCharitySettings(payload = {}) {
  const source = payload && typeof payload === "object" ? payload : {};
  const defaults = createDefaultCharitySettings();

  return {
    enabled:
      source.enabled === undefined ? Boolean(defaults.enabled) : Boolean(source.enabled),
    page_title: normalizeCharityText(source.page_title, defaults.page_title),
    page_subtitle: normalizeCharityText(
      source.page_subtitle,
      defaults.page_subtitle,
    ),
    hero_image_url: normalizeCharityText(
      source.hero_image_url,
      defaults.hero_image_url,
    ),
    hero_tagline: normalizeCharityText(source.hero_tagline, defaults.hero_tagline),
    hero_days_running: normalizeNonNegativeNumber(source.hero_days_running),
    fund_pool_amount: normalizeNonNegativeNumber(source.fund_pool_amount),
    today_donation_count: normalizeNonNegativeNumber(source.today_donation_count),
    project_status_text: normalizeCharityText(
      source.project_status_text,
      defaults.project_status_text,
    ),
    leaderboard_title: normalizeCharityText(
      source.leaderboard_title,
      defaults.leaderboard_title,
    ),
    news_title: normalizeCharityText(source.news_title, defaults.news_title),
    mission_title: normalizeCharityText(
      source.mission_title,
      defaults.mission_title,
    ),
    mission_paragraph_one: normalizeCharityText(
      source.mission_paragraph_one,
      defaults.mission_paragraph_one,
    ),
    mission_paragraph_two: normalizeCharityText(
      source.mission_paragraph_two,
      defaults.mission_paragraph_two,
    ),
    matching_plan_title: normalizeCharityText(
      source.matching_plan_title,
      defaults.matching_plan_title,
    ),
    matching_plan_description: normalizeCharityText(
      source.matching_plan_description,
      defaults.matching_plan_description,
    ),
    action_label: normalizeCharityText(source.action_label, defaults.action_label),
    action_note: normalizeCharityText(source.action_note, defaults.action_note),
    participation_notice: normalizeCharityText(
      source.participation_notice,
      defaults.participation_notice,
    ),
    join_url: normalizeCharityJoinUrl(source.join_url),
    leaderboard: normalizeCharityLeaderboard(source.leaderboard),
    news_list: normalizeCharityNewsList(source.news_list),
  };
}

export function buildCharityLeaderboardToShow(
  leaderboard = [],
  showAll = false,
  limit = 5,
) {
  const list = Array.isArray(leaderboard) ? leaderboard : [];
  const normalizedLimit = Math.max(0, Number(limit) || 0);
  if (showAll) {
    return list.slice();
  }
  return list.slice(0, normalizedLimit);
}

export function formatCharityAmount(value, locale = "en-US") {
  return normalizeNonNegativeNumber(value).toLocaleString(locale);
}
