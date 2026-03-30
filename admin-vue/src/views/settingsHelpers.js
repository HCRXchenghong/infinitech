import { ref, reactive, onMounted, onUnmounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import request from '@/utils/request';
import { useDataManagementPage } from './dataManagementHelpers';
import { useSettingsApiManagement } from './settingsApiManagementHelpers';
import { useSettingsActionHelpers } from './settingsActionHelpers';
import { DEFAULT_SMS_CONFIG, normalizeSMSConfig, buildSMSConfigPayload } from './smsConfigHelpers';
import {
  DEFAULT_VIP_SETTINGS,
  normalizeVIPSettings,
  buildVIPSettingsPayload,
  createEmptyVIPLevel,
  createEmptyVIPBenefit,
  createEmptyVIPTask,
} from './vipSettingsHelpers';

export function useSettingsPage() {
  const router = useRouter();

  const isMobile = ref(window.innerWidth <= 768);

  const loading = ref(false);
  const saving = ref(false);
  const loadError = ref('');

  const sms = ref({ ...DEFAULT_SMS_CONFIG });
  const DEFAULT_WEATHER_CONFIG = {
    api_base_url: 'https://uapis.cn/api/v1/misc/weather',
    api_key: '',
    city: '',
    adcode: '',
    lang: 'zh',
    extended: true,
    forecast: true,
    hourly: true,
    minutely: true,
    indices: true,
    timeout_ms: 8000,
    refresh_interval_minutes: 10
  };
  const weather = ref({ ...DEFAULT_WEATHER_CONFIG });
  const DEFAULT_RIDER_EXCEPTION_REPORT_REASONS = [
    '商家出餐慢',
    '联系不上顾客',
    '顾客位置错误',
    '车辆故障',
    '恶劣天气',
    '道路拥堵',
    '订单信息错误',
    '其他原因'
  ];
  const DEFAULT_RIDER_INSURANCE_CLAIM_STEPS = [
    '发生意外后第一时间联系客服或站点负责人',
    '准备相关证明材料（医疗票据、诊断证明、事故说明等）',
    '按平台指引提交理赔申请与补充材料',
    '等待保险审核与回款通知'
  ];
  const DEFAULT_SERVICE_SETTINGS = {
    service_phone: '',
    support_chat_title: '平台客服',
    support_chat_welcome_message: '您好！我是平台客服，有什么可以帮助您的吗？',
    merchant_chat_welcome_message: '欢迎光临，有什么可以帮您的？',
    rider_chat_welcome_message: '您好，您的骑手正在配送中。',
    rider_about_summary: '骑手端聚焦接单、配送、收入与保障场景，帮助骑手稳定履约并提升效率。',
    rider_portal_title: '骑手登录',
    rider_portal_subtitle: '悦享e食 · 骑手端',
    rider_portal_login_footer: '骑手账号由平台邀约开通',
    merchant_portal_title: '商户工作台',
    merchant_portal_subtitle: '悦享e食 · Merchant Console',
    merchant_portal_login_footer: '账号由平台管理员分配，登录后可直接管理订单和商品',
    merchant_privacy_policy: '我们会在必要范围内处理商户信息，用于订单履约、结算和风控，详细条款请联系平台管理员获取。',
    merchant_service_agreement: '使用商户端即表示你同意平台商户服务协议，包含店铺经营规范、结算与售后条款。',
    consumer_portal_title: '欢迎使用悦享e食',
    consumer_portal_subtitle: '一站式本地生活服务平台',
    consumer_portal_login_footer: '登录后可同步订单、消息、地址与优惠权益',
    consumer_about_summary: '悦享e食专注本地生活即时服务，覆盖外卖、跑腿、到店和会员等场景，持续优化用户体验。',
    consumer_privacy_policy: '平台仅在提供服务所必需的范围内处理账号、定位和订单信息，并遵循最小必要原则。',
    consumer_user_agreement: '使用平台服务前，请确认已阅读并同意用户协议、隐私政策及相关活动规则。',
    invite_landing_url: '',
    wechat_login_enabled: false,
    wechat_login_entry_url: '',
    medicine_support_phone: '',
    medicine_support_title: '一键医务室',
    medicine_support_subtitle: '紧急连线\n人工服务',
    medicine_delivery_description: '24小时配送\n平均30分钟达',
    medicine_season_tip: '近期流感高发，建议常备布洛芬、连花清瘟。如遇高热不退请及时就医。',
    rider_insurance_status_title: '骑手保障信息',
    rider_insurance_status_desc: '保障内容、承保信息和理赔入口以平台发布为准',
    rider_insurance_policy_number: '',
    rider_insurance_provider: '',
    rider_insurance_effective_date: '',
    rider_insurance_expire_date: '',
    rider_insurance_claim_url: '',
    rider_insurance_detail_url: '',
    rider_insurance_claim_button_text: '联系平台处理',
    rider_insurance_detail_button_text: '查看保障说明',
    rider_insurance_coverages: [],
    rider_insurance_claim_steps: [...DEFAULT_RIDER_INSURANCE_CLAIM_STEPS],
    rtc_enabled: true,
    rtc_timeout_seconds: 35,
    rtc_ice_servers: [{ url: 'stun:stun.l.google.com:19302', username: '', credential: '' }],
    map_provider: 'proxy',
    map_search_url: '',
    map_reverse_url: '',
    map_api_key: '',
    map_tile_template: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    map_timeout_seconds: 5
  };
  DEFAULT_SERVICE_SETTINGS.rider_exception_report_reasons = [...DEFAULT_RIDER_EXCEPTION_REPORT_REASONS];
  const serviceSettings = ref({ ...DEFAULT_SERVICE_SETTINGS });
  const savingServiceSettings = ref(false);
  const DEFAULT_CHARITY_SETTINGS = {
    enabled: true,
    page_title: '悦享公益',
    page_subtitle: '让每一份善意都被看见',
    hero_image_url: 'https://images.unsplash.com/photo-1593113598332-cd288d649433?w=1200',
    hero_tagline: '以长期、透明、可配置的方式，把平台善意送到真正需要帮助的人手里。',
    hero_days_running: 0,
    fund_pool_amount: 0,
    today_donation_count: 0,
    project_status_text: '筹备中',
    leaderboard_title: '善行榜单',
    news_title: '公益资讯',
    mission_title: '初心',
    mission_paragraph_one: '悦享e食不只是生活服务平台，也希望成为连接商户、用户与城市善意的长期基础设施。',
    mission_paragraph_two: '公益页面展示、参与入口与说明文案均以管理端发布为准，避免前端静态内容误导用户。',
    matching_plan_title: '公益参与计划',
    matching_plan_description: '平台会根据运营策略配置公益参与方式，当前展示内容和入口均可在管理端统一调整。',
    action_label: '了解参与方式',
    action_note: 'OPERATED BY CHARITY OPS',
    participation_notice: '公益参与方式由平台统一发布。若当前未开放线上参与，请留意后续活动公告。',
    join_url: '',
    leaderboard: [],
    news_list: [],
  };
  const charitySettings = ref({ ...DEFAULT_CHARITY_SETTINGS });
  const savingCharitySettings = ref(false);
  const vipSettings = ref({ ...DEFAULT_VIP_SETTINGS });
  const savingVipSettings = ref(false);
  const DEFAULT_WECHAT_LOGIN_CONFIG = {
    enabled: false,
    app_id: '',
    app_secret: '',
    has_app_secret: false,
    callback_url: '',
    scope: 'snsapi_userinfo'
  };
  const wechatLoginConfig = ref({ ...DEFAULT_WECHAT_LOGIN_CONFIG });
  const savingWechatLoginConfig = ref(false);

  const appDownloadConfig = ref({
    ios_url: '',
    android_url: '',
    ios_version: '',
    android_version: '',
    latest_version: '',
    updated_at: ''
  });
  const savingAppDownload = ref(false);
  const uploadingPackage = reactive({
    ios: false,
    android: false
  });

  const debugMode = ref({ enabled: false, delivery: false, phone_film: false, massage: false, coffee: false });
  const savingDebugMode = ref(false);
  const payMode = ref({ isProd: false });
  const savingPayMode = ref(false);
  const wxpay = ref({ appId: '', mchId: '', apiKey: '', apiV3Key: '', serialNo: '', notifyUrl: '' });
  const savingWx = ref(false);
  const alipay = ref({ appId: '', privateKey: '', alipayPublicKey: '', notifyUrl: '', sandbox: true });
  const savingAli = ref(false);

  const clearAllDialogVisible = ref(false);
  const clearingAllData = ref(false);
  const clearAllVerifyForm = reactive({
    verifyAccount: '',
    verifyPassword: ''
  });

  function extractErrorMessage(error, fallback) {
    return error?.response?.data?.error || error?.response?.data?.message || error?.message || fallback;
  }

  function mergeWeatherConfig(payload = {}) {
    weather.value = {
      ...DEFAULT_WEATHER_CONFIG,
      ...(payload || {})
    };
    if (!weather.value.city && weather.value.location) {
      weather.value.city = weather.value.location;
    }
    weather.value.refresh_interval_minutes = Number(weather.value.refresh_interval_minutes || 10);
  }

  function normalizeServiceStringList(items = [], fallback = []) {
    const source = Array.isArray(items) ? items : fallback;
    const seen = new Set();
    return source
      .map((item) => String(item || '').trim())
      .filter((item) => {
        if (!item || seen.has(item)) {
          return false;
        }
        seen.add(item);
        return true;
      })
      .slice(0, 20);
  }

  function normalizeServiceText(value, fallback = '') {
    const normalized = String(value || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
    return normalized || fallback;
  }

  function normalizeRiderInsuranceCoverages(items = []) {
    if (!Array.isArray(items)) {
      return [];
    }
    return items
      .map((item) => ({
        icon: normalizeServiceText(item?.icon, ''),
        name: normalizeServiceText(item?.name, ''),
        amount: normalizeServiceText(item?.amount, ''),
      }))
      .filter((item) => item.icon || item.name || item.amount)
      .slice(0, 10);
  }

  function createEmptyRiderInsuranceCoverage() {
    return {
      icon: '',
      name: '',
      amount: '',
    };
  }

  function normalizeRTCIceServers(items = []) {
    if (!Array.isArray(items)) {
      return [];
    }
    return items
      .map((item) => ({
        url: String(item?.url || '').trim(),
        username: String(item?.username || '').trim(),
        credential: String(item?.credential || '').trim(),
      }))
      .filter((item) => item.url || item.username || item.credential)
      .slice(0, 10);
  }

  function createEmptyRTCIceServer() {
    return {
      url: '',
      username: '',
      credential: '',
    };
  }

  function mergeServiceSettings(payload = {}) {
    serviceSettings.value = {
      ...DEFAULT_SERVICE_SETTINGS,
      ...(payload || {})
    };
    serviceSettings.value.service_phone = String(serviceSettings.value.service_phone || '').trim();
    serviceSettings.value.support_chat_title = String(serviceSettings.value.support_chat_title || DEFAULT_SERVICE_SETTINGS.support_chat_title).trim() || DEFAULT_SERVICE_SETTINGS.support_chat_title;
    serviceSettings.value.support_chat_welcome_message = String(serviceSettings.value.support_chat_welcome_message || DEFAULT_SERVICE_SETTINGS.support_chat_welcome_message).trim() || DEFAULT_SERVICE_SETTINGS.support_chat_welcome_message;
    serviceSettings.value.merchant_chat_welcome_message = String(serviceSettings.value.merchant_chat_welcome_message || DEFAULT_SERVICE_SETTINGS.merchant_chat_welcome_message).trim() || DEFAULT_SERVICE_SETTINGS.merchant_chat_welcome_message;
    serviceSettings.value.rider_chat_welcome_message = String(serviceSettings.value.rider_chat_welcome_message || DEFAULT_SERVICE_SETTINGS.rider_chat_welcome_message).trim() || DEFAULT_SERVICE_SETTINGS.rider_chat_welcome_message;
    serviceSettings.value.rider_about_summary = normalizeServiceText(serviceSettings.value.rider_about_summary, DEFAULT_SERVICE_SETTINGS.rider_about_summary);
    serviceSettings.value.rider_portal_title = String(serviceSettings.value.rider_portal_title || DEFAULT_SERVICE_SETTINGS.rider_portal_title).trim() || DEFAULT_SERVICE_SETTINGS.rider_portal_title;
    serviceSettings.value.rider_portal_subtitle = String(serviceSettings.value.rider_portal_subtitle || DEFAULT_SERVICE_SETTINGS.rider_portal_subtitle).trim() || DEFAULT_SERVICE_SETTINGS.rider_portal_subtitle;
    serviceSettings.value.rider_portal_login_footer = normalizeServiceText(serviceSettings.value.rider_portal_login_footer, DEFAULT_SERVICE_SETTINGS.rider_portal_login_footer);
    serviceSettings.value.merchant_portal_title = String(serviceSettings.value.merchant_portal_title || DEFAULT_SERVICE_SETTINGS.merchant_portal_title).trim() || DEFAULT_SERVICE_SETTINGS.merchant_portal_title;
    serviceSettings.value.merchant_portal_subtitle = String(serviceSettings.value.merchant_portal_subtitle || DEFAULT_SERVICE_SETTINGS.merchant_portal_subtitle).trim() || DEFAULT_SERVICE_SETTINGS.merchant_portal_subtitle;
    serviceSettings.value.merchant_portal_login_footer = normalizeServiceText(serviceSettings.value.merchant_portal_login_footer, DEFAULT_SERVICE_SETTINGS.merchant_portal_login_footer);
    serviceSettings.value.merchant_privacy_policy = normalizeServiceText(serviceSettings.value.merchant_privacy_policy, DEFAULT_SERVICE_SETTINGS.merchant_privacy_policy);
    serviceSettings.value.merchant_service_agreement = normalizeServiceText(serviceSettings.value.merchant_service_agreement, DEFAULT_SERVICE_SETTINGS.merchant_service_agreement);
    serviceSettings.value.consumer_portal_title = String(serviceSettings.value.consumer_portal_title || DEFAULT_SERVICE_SETTINGS.consumer_portal_title).trim() || DEFAULT_SERVICE_SETTINGS.consumer_portal_title;
    serviceSettings.value.consumer_portal_subtitle = String(serviceSettings.value.consumer_portal_subtitle || DEFAULT_SERVICE_SETTINGS.consumer_portal_subtitle).trim() || DEFAULT_SERVICE_SETTINGS.consumer_portal_subtitle;
    serviceSettings.value.consumer_portal_login_footer = normalizeServiceText(serviceSettings.value.consumer_portal_login_footer, DEFAULT_SERVICE_SETTINGS.consumer_portal_login_footer);
    serviceSettings.value.consumer_about_summary = normalizeServiceText(serviceSettings.value.consumer_about_summary, DEFAULT_SERVICE_SETTINGS.consumer_about_summary);
    serviceSettings.value.consumer_privacy_policy = normalizeServiceText(serviceSettings.value.consumer_privacy_policy, DEFAULT_SERVICE_SETTINGS.consumer_privacy_policy);
    serviceSettings.value.consumer_user_agreement = normalizeServiceText(serviceSettings.value.consumer_user_agreement, DEFAULT_SERVICE_SETTINGS.consumer_user_agreement);
    serviceSettings.value.invite_landing_url = String(serviceSettings.value.invite_landing_url || '').trim();
    serviceSettings.value.wechat_login_enabled = Boolean(serviceSettings.value.wechat_login_enabled);
    serviceSettings.value.wechat_login_entry_url = String(serviceSettings.value.wechat_login_entry_url || '').trim();
    serviceSettings.value.medicine_support_phone = String(serviceSettings.value.medicine_support_phone || '').trim();
    serviceSettings.value.medicine_support_title = String(serviceSettings.value.medicine_support_title || DEFAULT_SERVICE_SETTINGS.medicine_support_title).trim() || DEFAULT_SERVICE_SETTINGS.medicine_support_title;
    serviceSettings.value.medicine_support_subtitle = String(serviceSettings.value.medicine_support_subtitle || DEFAULT_SERVICE_SETTINGS.medicine_support_subtitle).trim() || DEFAULT_SERVICE_SETTINGS.medicine_support_subtitle;
    serviceSettings.value.medicine_delivery_description = String(serviceSettings.value.medicine_delivery_description || DEFAULT_SERVICE_SETTINGS.medicine_delivery_description).trim() || DEFAULT_SERVICE_SETTINGS.medicine_delivery_description;
    serviceSettings.value.medicine_season_tip = String(serviceSettings.value.medicine_season_tip || DEFAULT_SERVICE_SETTINGS.medicine_season_tip).trim() || DEFAULT_SERVICE_SETTINGS.medicine_season_tip;
    serviceSettings.value.rider_insurance_status_title = normalizeServiceText(serviceSettings.value.rider_insurance_status_title, DEFAULT_SERVICE_SETTINGS.rider_insurance_status_title);
    serviceSettings.value.rider_insurance_status_desc = normalizeServiceText(serviceSettings.value.rider_insurance_status_desc, DEFAULT_SERVICE_SETTINGS.rider_insurance_status_desc);
    serviceSettings.value.rider_insurance_policy_number = String(serviceSettings.value.rider_insurance_policy_number || '').trim();
    serviceSettings.value.rider_insurance_provider = String(serviceSettings.value.rider_insurance_provider || '').trim();
    serviceSettings.value.rider_insurance_effective_date = String(serviceSettings.value.rider_insurance_effective_date || '').trim();
    serviceSettings.value.rider_insurance_expire_date = String(serviceSettings.value.rider_insurance_expire_date || '').trim();
    serviceSettings.value.rider_insurance_claim_url = String(serviceSettings.value.rider_insurance_claim_url || '').trim();
    serviceSettings.value.rider_insurance_detail_url = String(serviceSettings.value.rider_insurance_detail_url || '').trim();
    serviceSettings.value.rider_insurance_claim_button_text = normalizeServiceText(serviceSettings.value.rider_insurance_claim_button_text, DEFAULT_SERVICE_SETTINGS.rider_insurance_claim_button_text);
    serviceSettings.value.rider_insurance_detail_button_text = normalizeServiceText(serviceSettings.value.rider_insurance_detail_button_text, DEFAULT_SERVICE_SETTINGS.rider_insurance_detail_button_text);
    serviceSettings.value.rider_insurance_coverages = normalizeRiderInsuranceCoverages(serviceSettings.value.rider_insurance_coverages);
    serviceSettings.value.rider_insurance_claim_steps = normalizeServiceStringList(
      serviceSettings.value.rider_insurance_claim_steps,
      DEFAULT_RIDER_INSURANCE_CLAIM_STEPS
    );
    serviceSettings.value.rtc_enabled = Boolean(serviceSettings.value.rtc_enabled);
    serviceSettings.value.rtc_timeout_seconds = Number(serviceSettings.value.rtc_timeout_seconds || DEFAULT_SERVICE_SETTINGS.rtc_timeout_seconds);
    serviceSettings.value.rtc_ice_servers = normalizeRTCIceServers(serviceSettings.value.rtc_ice_servers);
    serviceSettings.value.map_provider = String(serviceSettings.value.map_provider || DEFAULT_SERVICE_SETTINGS.map_provider).trim() || DEFAULT_SERVICE_SETTINGS.map_provider;
    serviceSettings.value.map_search_url = String(serviceSettings.value.map_search_url || '').trim();
    serviceSettings.value.map_reverse_url = String(serviceSettings.value.map_reverse_url || '').trim();
    serviceSettings.value.map_api_key = String(serviceSettings.value.map_api_key || '').trim();
    serviceSettings.value.map_tile_template = String(serviceSettings.value.map_tile_template || DEFAULT_SERVICE_SETTINGS.map_tile_template).trim() || DEFAULT_SERVICE_SETTINGS.map_tile_template;
    serviceSettings.value.map_timeout_seconds = Number(serviceSettings.value.map_timeout_seconds || DEFAULT_SERVICE_SETTINGS.map_timeout_seconds);
    serviceSettings.value.rider_exception_report_reasons = normalizeServiceStringList(
      serviceSettings.value.rider_exception_report_reasons,
      DEFAULT_RIDER_EXCEPTION_REPORT_REASONS
    );
  }

  function addRiderReportReason() {
    const reasons = normalizeServiceStringList(serviceSettings.value.rider_exception_report_reasons, []);
    if (reasons.length >= 20) {
      ElMessage.warning('异常上报原因最多保留 20 条');
      return;
    }
    serviceSettings.value.rider_exception_report_reasons = [
      ...reasons,
      ''
    ];
  }

  function removeRiderReportReason(index) {
    const reasons = Array.isArray(serviceSettings.value.rider_exception_report_reasons)
      ? [...serviceSettings.value.rider_exception_report_reasons]
      : [];
    reasons.splice(index, 1);
    serviceSettings.value.rider_exception_report_reasons = reasons;
  }

  function addRiderInsuranceCoverage() {
    const items = normalizeRiderInsuranceCoverages(serviceSettings.value.rider_insurance_coverages);
    if (items.length >= 10) {
      ElMessage.warning('保障项目最多保留 10 项');
      return;
    }
    serviceSettings.value.rider_insurance_coverages = [
      ...items,
      createEmptyRiderInsuranceCoverage()
    ];
  }

  function removeRiderInsuranceCoverage(index) {
    const items = Array.isArray(serviceSettings.value.rider_insurance_coverages)
      ? [...serviceSettings.value.rider_insurance_coverages]
      : [];
    items.splice(index, 1);
    serviceSettings.value.rider_insurance_coverages = items;
  }

  function addRiderInsuranceClaimStep() {
    const steps = normalizeServiceStringList(serviceSettings.value.rider_insurance_claim_steps, []);
    if (steps.length >= 10) {
      ElMessage.warning('理赔步骤最多保留 10 条');
      return;
    }
    serviceSettings.value.rider_insurance_claim_steps = [
      ...steps,
      ''
    ];
  }

  function removeRiderInsuranceClaimStep(index) {
    const steps = Array.isArray(serviceSettings.value.rider_insurance_claim_steps)
      ? [...serviceSettings.value.rider_insurance_claim_steps]
      : [];
    steps.splice(index, 1);
    serviceSettings.value.rider_insurance_claim_steps = steps;
  }

  function addRTCIceServer() {
    const servers = normalizeRTCIceServers(serviceSettings.value.rtc_ice_servers);
    if (servers.length >= 10) {
      ElMessage.warning('RTC ICE/TURN 最多保留 10 组');
      return;
    }
    serviceSettings.value.rtc_ice_servers = [
      ...servers,
      createEmptyRTCIceServer()
    ];
  }

  function removeRTCIceServer(index) {
    const servers = Array.isArray(serviceSettings.value.rtc_ice_servers)
      ? [...serviceSettings.value.rtc_ice_servers]
      : [];
    servers.splice(index, 1);
    serviceSettings.value.rtc_ice_servers = servers;
  }

  function normalizeCharityText(value, fallback = '') {
    const normalized = String(value || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
    return normalized || fallback;
  }

  function normalizeCharityLeaderboard(items = []) {
    if (!Array.isArray(items)) {
      return [];
    }
    return items
      .map((item) => ({
        name: normalizeCharityText(item?.name, ''),
        amount: Math.max(0, Number(item?.amount || 0)),
        time_label: normalizeCharityText(item?.time_label, ''),
      }))
      .filter((item) => item.name || item.amount > 0 || item.time_label)
      .slice(0, 20);
  }

  function normalizeCharityNewsList(items = []) {
    if (!Array.isArray(items)) {
      return [];
    }
    return items
      .map((item) => ({
        title: normalizeCharityText(item?.title, ''),
        summary: normalizeCharityText(item?.summary, ''),
        source: normalizeCharityText(item?.source, ''),
        time_label: normalizeCharityText(item?.time_label, ''),
        image_url: normalizeCharityText(item?.image_url, ''),
      }))
      .filter((item) => item.title || item.summary || item.source || item.time_label || item.image_url)
      .slice(0, 20);
  }

  function createEmptyCharityLeaderboardItem() {
    return { name: '', amount: 0, time_label: '' };
  }

  function createEmptyCharityNewsItem() {
    return { title: '', summary: '', source: '', time_label: '', image_url: '' };
  }

  function mergeCharitySettings(payload = {}) {
    const merged = {
      ...DEFAULT_CHARITY_SETTINGS,
      ...(payload || {})
    };

    charitySettings.value = {
      enabled: Boolean(merged.enabled),
      page_title: normalizeCharityText(merged.page_title, DEFAULT_CHARITY_SETTINGS.page_title),
      page_subtitle: normalizeCharityText(merged.page_subtitle, DEFAULT_CHARITY_SETTINGS.page_subtitle),
      hero_image_url: normalizeCharityText(merged.hero_image_url, DEFAULT_CHARITY_SETTINGS.hero_image_url),
      hero_tagline: normalizeCharityText(merged.hero_tagline, DEFAULT_CHARITY_SETTINGS.hero_tagline),
      hero_days_running: Math.max(0, Number(merged.hero_days_running || 0)),
      fund_pool_amount: Math.max(0, Number(merged.fund_pool_amount || 0)),
      today_donation_count: Math.max(0, Number(merged.today_donation_count || 0)),
      project_status_text: normalizeCharityText(merged.project_status_text, DEFAULT_CHARITY_SETTINGS.project_status_text),
      leaderboard_title: normalizeCharityText(merged.leaderboard_title, DEFAULT_CHARITY_SETTINGS.leaderboard_title),
      news_title: normalizeCharityText(merged.news_title, DEFAULT_CHARITY_SETTINGS.news_title),
      mission_title: normalizeCharityText(merged.mission_title, DEFAULT_CHARITY_SETTINGS.mission_title),
      mission_paragraph_one: normalizeCharityText(merged.mission_paragraph_one, DEFAULT_CHARITY_SETTINGS.mission_paragraph_one),
      mission_paragraph_two: normalizeCharityText(merged.mission_paragraph_two, DEFAULT_CHARITY_SETTINGS.mission_paragraph_two),
      matching_plan_title: normalizeCharityText(merged.matching_plan_title, DEFAULT_CHARITY_SETTINGS.matching_plan_title),
      matching_plan_description: normalizeCharityText(merged.matching_plan_description, DEFAULT_CHARITY_SETTINGS.matching_plan_description),
      action_label: normalizeCharityText(merged.action_label, DEFAULT_CHARITY_SETTINGS.action_label),
      action_note: normalizeCharityText(merged.action_note, DEFAULT_CHARITY_SETTINGS.action_note),
      participation_notice: normalizeCharityText(merged.participation_notice, DEFAULT_CHARITY_SETTINGS.participation_notice),
      join_url: normalizeCharityText(merged.join_url, ''),
      leaderboard: normalizeCharityLeaderboard(merged.leaderboard),
      news_list: normalizeCharityNewsList(merged.news_list),
    };
  }

  function mergeWechatLoginConfig(payload = {}) {
    wechatLoginConfig.value = {
      ...DEFAULT_WECHAT_LOGIN_CONFIG,
      ...(payload || {})
    };
    wechatLoginConfig.value.enabled = Boolean(wechatLoginConfig.value.enabled);
    wechatLoginConfig.value.app_id = String(wechatLoginConfig.value.app_id || '').trim();
    wechatLoginConfig.value.app_secret = String(wechatLoginConfig.value.app_secret || '').trim();
    wechatLoginConfig.value.has_app_secret = Boolean(wechatLoginConfig.value.has_app_secret);
    wechatLoginConfig.value.callback_url = String(wechatLoginConfig.value.callback_url || '').trim();
    wechatLoginConfig.value.scope = String(wechatLoginConfig.value.scope || DEFAULT_WECHAT_LOGIN_CONFIG.scope).trim() || DEFAULT_WECHAT_LOGIN_CONFIG.scope;
  }

  function mergeVIPSettings(payload = {}) {
    vipSettings.value = normalizeVIPSettings(payload);
  }

  const dataManagement = useDataManagementPage();
  const {
    exporting,
    importing,
    exportingRiders,
    importingRiders,
    exportingOrders,
    importingOrders,
    exportingMerchants,
    importingMerchants,
    exportingAll,
    importingAll,
    exportUsers,
    beforeImport,
    handleImport: handleImportByType,
    exportRiders,
    exportOrders,
    exportMerchants,
    exportAllData,
    handleImportAll,
    validateDataType,
  } = dataManagement;

  async function handleImport(options) {
    return handleImportByType(options, 'users');
  }

  async function handleImportRiders(options) {
    return handleImportByType(options, 'riders');
  }

  async function handleImportOrders(options) {
    return handleImportByType(options, 'orders');
  }

  async function handleImportMerchants(options) {
    return handleImportByType(options, 'merchants');
  }

  async function handleImportAllData(options) {
    return handleImportAll(options);
  }

  const dataMgmtItems = computed(() => [
    { label: '用户数据', exporting: exporting.value, importing: importing.value, onExport: exportUsers, onImport: handleImport },
    { label: '骑手数据', exporting: exportingRiders.value, importing: importingRiders.value, onExport: exportRiders, onImport: handleImportRiders },
    { label: '订单数据', exporting: exportingOrders.value, importing: importingOrders.value, onExport: exportOrders, onImport: handleImportOrders },
    { label: '商户数据', exporting: exportingMerchants.value, importing: importingMerchants.value, onExport: exportMerchants, onImport: handleImportMerchants },
    { label: '全部数据', exporting: exportingAll.value, importing: importingAll.value, onExport: exportAllData, onImport: handleImportAllData },
  ]);

  const apiManagement = useSettingsApiManagement({
    request,
    router,
    ElMessage,
    ElMessageBox,
    extractErrorMessage,
  });

  const {
    apiListError,
    apiList,
    apiListLoading,
    apiDialogVisible,
    editingApi,
    apiForm,
    savingApi,
    downloadDialogVisible,
    downloadLanguage,
    downloadingApi,
    currentDownloadApi,
    loadApiList,
    showAddApiDialog,
    editApi,
    deleteApi,
    saveApi,
    resetApiForm,
    generateApiKey,
    copyApiKey,
    getPermissionLabel,
    handleApiPermissionChange,
    showApiDocumentation,
    generateApiDocumentation,
    showDownloadDialog,
    generateMarkdownDoc,
    downloadApiDoc,
  } = apiManagement;

  const pageError = computed(() => apiListError.value || loadError.value || '');

  const handleResize = () => {
    isMobile.value = window.innerWidth <= 768;
  };

  onMounted(() => {
    loadAll();
    window.addEventListener('resize', handleResize);
  });

  onUnmounted(() => {
    window.removeEventListener('resize', handleResize);
  });

  async function loadAll() {
    loadError.value = '';
    loading.value = true;
    try {
      const results = await Promise.allSettled([
        request.get('/api/sms-config'),
        request.get('/api/debug-mode'),
        request.get('/api/weather-config'),
        request.get('/api/wechat-login-config'),
        request.get('/api/service-settings'),
        request.get('/api/charity-settings'),
        request.get('/api/vip-settings'),
        request.get('/api/app-download-config'),
        request.get('/api/pay-config/mode'),
        request.get('/api/pay-config/wxpay'),
        request.get('/api/pay-config/alipay'),
      ]);

      const [smsResp, debugResp, weaResp, wechatLoginResp, serviceResp, charityResp, vipResp, downloadResp, payModeResp, wxResp, aliResp] = results;

      if (smsResp.status === 'fulfilled' && smsResp.value?.data) {
        sms.value = normalizeSMSConfig(smsResp.value.data);
      }
      if (debugResp.status === 'fulfilled' && debugResp.value?.data) {
        debugMode.value = {
          enabled: false,
          delivery: false,
          phone_film: false,
          massage: false,
          coffee: false,
          ...debugResp.value.data
        };
      }
      if (weaResp.status === 'fulfilled' && weaResp.value?.data) {
        mergeWeatherConfig(weaResp.value.data);
      }
      if (wechatLoginResp.status === 'fulfilled' && wechatLoginResp.value?.data) {
        mergeWechatLoginConfig(wechatLoginResp.value.data);
      }
      if (serviceResp.status === 'fulfilled' && serviceResp.value?.data) {
        mergeServiceSettings(serviceResp.value.data);
      }
      if (charityResp.status === 'fulfilled' && charityResp.value?.data) {
        mergeCharitySettings(charityResp.value.data);
      }
      if (vipResp.status === 'fulfilled' && vipResp.value?.data) {
        mergeVIPSettings(vipResp.value.data);
      }
      if (downloadResp.status === 'fulfilled' && downloadResp.value?.data) {
        appDownloadConfig.value = {
          ios_url: downloadResp.value.data.ios_url || '',
          android_url: downloadResp.value.data.android_url || '',
          ios_version: downloadResp.value.data.ios_version || '',
          android_version: downloadResp.value.data.android_version || '',
          latest_version: downloadResp.value.data.latest_version || '',
          updated_at: downloadResp.value.data.updated_at || ''
        };
      }
      if (payModeResp.status === 'fulfilled' && payModeResp.value?.data) {
        payMode.value = { isProd: payModeResp.value.data.isProd || false };
      }
      if (wxResp.status === 'fulfilled' && wxResp.value?.data) {
        Object.assign(wxpay.value, wxResp.value.data);
      }
      if (aliResp.status === 'fulfilled' && aliResp.value?.data) {
        Object.assign(alipay.value, aliResp.value.data);
      }

      if (results.some((item) => item.status === 'rejected')) {
        loadError.value = '部分系统配置加载失败，请稍后重试';
      }
    } catch (error) {
      loadError.value = extractErrorMessage(error, '加载系统设置失败，请稍后重试');
    } finally {
      loading.value = false;
    }

    loadApiList();
  }

  const {
    savePayMode,
    saveDebugMode,
    saveWxpay,
    saveAlipay,
    handleLogout,
  } = useSettingsActionHelpers({
    request,
    payMode,
    debugMode,
    wxpay,
    alipay,
    savingPayMode,
    savingDebugMode,
    savingWx,
    savingAli,
    loadAll,
    router,
    ElMessage,
    ElMessageBox,
  });

  async function saveSms() {
    saving.value = true;
    try {
      await request.post('/api/sms-config', buildSMSConfigPayload(sms.value));
      ElMessage.success('短信配置保存成功');
      setTimeout(() => {
        loadAll();
      }, 100);
    } catch (error) {
      ElMessage.error('保存失败: ' + (error?.response?.data?.error || error.message));
    } finally {
      saving.value = false;
    }
  }

  async function saveWeather() {
    saving.value = true;
    try {
      const payload = {
        ...weather.value,
        city: (weather.value.city || '').trim(),
        adcode: (weather.value.adcode || '').trim(),
        lang: weather.value.lang || 'zh',
        refresh_interval_minutes: Number(weather.value.refresh_interval_minutes || 10)
      };
      await request.post('/api/weather-config', payload);
      ElMessage.success('天气配置保存成功');
    } catch (error) {
      ElMessage.error('保存失败: ' + (error?.response?.data?.error || error.message));
    } finally {
      saving.value = false;
    }
  }

  async function saveServiceSettings() {
    savingServiceSettings.value = true;
    try {
      const payload = {
        ...serviceSettings.value,
        service_phone: (serviceSettings.value.service_phone || '').trim(),
        support_chat_title: (serviceSettings.value.support_chat_title || DEFAULT_SERVICE_SETTINGS.support_chat_title).trim(),
        support_chat_welcome_message: (serviceSettings.value.support_chat_welcome_message || DEFAULT_SERVICE_SETTINGS.support_chat_welcome_message).trim(),
        merchant_chat_welcome_message: (serviceSettings.value.merchant_chat_welcome_message || DEFAULT_SERVICE_SETTINGS.merchant_chat_welcome_message).trim(),
        rider_chat_welcome_message: (serviceSettings.value.rider_chat_welcome_message || DEFAULT_SERVICE_SETTINGS.rider_chat_welcome_message).trim(),
        rider_about_summary: normalizeServiceText(serviceSettings.value.rider_about_summary, DEFAULT_SERVICE_SETTINGS.rider_about_summary),
        rider_portal_title: (serviceSettings.value.rider_portal_title || DEFAULT_SERVICE_SETTINGS.rider_portal_title).trim(),
        rider_portal_subtitle: (serviceSettings.value.rider_portal_subtitle || DEFAULT_SERVICE_SETTINGS.rider_portal_subtitle).trim(),
        rider_portal_login_footer: normalizeServiceText(serviceSettings.value.rider_portal_login_footer, DEFAULT_SERVICE_SETTINGS.rider_portal_login_footer),
        merchant_portal_title: (serviceSettings.value.merchant_portal_title || DEFAULT_SERVICE_SETTINGS.merchant_portal_title).trim(),
        merchant_portal_subtitle: (serviceSettings.value.merchant_portal_subtitle || DEFAULT_SERVICE_SETTINGS.merchant_portal_subtitle).trim(),
        merchant_portal_login_footer: normalizeServiceText(serviceSettings.value.merchant_portal_login_footer, DEFAULT_SERVICE_SETTINGS.merchant_portal_login_footer),
        merchant_privacy_policy: normalizeServiceText(serviceSettings.value.merchant_privacy_policy, DEFAULT_SERVICE_SETTINGS.merchant_privacy_policy),
        merchant_service_agreement: normalizeServiceText(serviceSettings.value.merchant_service_agreement, DEFAULT_SERVICE_SETTINGS.merchant_service_agreement),
        consumer_portal_title: (serviceSettings.value.consumer_portal_title || DEFAULT_SERVICE_SETTINGS.consumer_portal_title).trim(),
        consumer_portal_subtitle: (serviceSettings.value.consumer_portal_subtitle || DEFAULT_SERVICE_SETTINGS.consumer_portal_subtitle).trim(),
        consumer_portal_login_footer: normalizeServiceText(serviceSettings.value.consumer_portal_login_footer, DEFAULT_SERVICE_SETTINGS.consumer_portal_login_footer),
        consumer_about_summary: normalizeServiceText(serviceSettings.value.consumer_about_summary, DEFAULT_SERVICE_SETTINGS.consumer_about_summary),
        consumer_privacy_policy: normalizeServiceText(serviceSettings.value.consumer_privacy_policy, DEFAULT_SERVICE_SETTINGS.consumer_privacy_policy),
        consumer_user_agreement: normalizeServiceText(serviceSettings.value.consumer_user_agreement, DEFAULT_SERVICE_SETTINGS.consumer_user_agreement),
        invite_landing_url: (serviceSettings.value.invite_landing_url || '').trim(),
        wechat_login_enabled: Boolean(serviceSettings.value.wechat_login_enabled),
        wechat_login_entry_url: (serviceSettings.value.wechat_login_entry_url || '').trim(),
        medicine_support_phone: (serviceSettings.value.medicine_support_phone || '').trim(),
        medicine_support_title: (serviceSettings.value.medicine_support_title || DEFAULT_SERVICE_SETTINGS.medicine_support_title).trim(),
        medicine_support_subtitle: (serviceSettings.value.medicine_support_subtitle || DEFAULT_SERVICE_SETTINGS.medicine_support_subtitle).trim(),
        medicine_delivery_description: (serviceSettings.value.medicine_delivery_description || DEFAULT_SERVICE_SETTINGS.medicine_delivery_description).trim(),
        medicine_season_tip: (serviceSettings.value.medicine_season_tip || DEFAULT_SERVICE_SETTINGS.medicine_season_tip).trim(),
        rider_insurance_status_title: normalizeServiceText(serviceSettings.value.rider_insurance_status_title, DEFAULT_SERVICE_SETTINGS.rider_insurance_status_title),
        rider_insurance_status_desc: normalizeServiceText(serviceSettings.value.rider_insurance_status_desc, DEFAULT_SERVICE_SETTINGS.rider_insurance_status_desc),
        rider_insurance_policy_number: (serviceSettings.value.rider_insurance_policy_number || '').trim(),
        rider_insurance_provider: (serviceSettings.value.rider_insurance_provider || '').trim(),
        rider_insurance_effective_date: (serviceSettings.value.rider_insurance_effective_date || '').trim(),
        rider_insurance_expire_date: (serviceSettings.value.rider_insurance_expire_date || '').trim(),
        rider_insurance_claim_url: (serviceSettings.value.rider_insurance_claim_url || '').trim(),
        rider_insurance_detail_url: (serviceSettings.value.rider_insurance_detail_url || '').trim(),
        rider_insurance_claim_button_text: normalizeServiceText(serviceSettings.value.rider_insurance_claim_button_text, DEFAULT_SERVICE_SETTINGS.rider_insurance_claim_button_text),
        rider_insurance_detail_button_text: normalizeServiceText(serviceSettings.value.rider_insurance_detail_button_text, DEFAULT_SERVICE_SETTINGS.rider_insurance_detail_button_text),
        rider_insurance_coverages: normalizeRiderInsuranceCoverages(serviceSettings.value.rider_insurance_coverages),
        rider_insurance_claim_steps: normalizeServiceStringList(
          serviceSettings.value.rider_insurance_claim_steps,
          DEFAULT_RIDER_INSURANCE_CLAIM_STEPS
        ),
        rtc_enabled: Boolean(serviceSettings.value.rtc_enabled),
        rtc_timeout_seconds: Number(serviceSettings.value.rtc_timeout_seconds || DEFAULT_SERVICE_SETTINGS.rtc_timeout_seconds),
        rtc_ice_servers: normalizeRTCIceServers(serviceSettings.value.rtc_ice_servers),
        rider_exception_report_reasons: normalizeServiceStringList(
          serviceSettings.value.rider_exception_report_reasons,
          DEFAULT_RIDER_EXCEPTION_REPORT_REASONS
        ),
        map_provider: (serviceSettings.value.map_provider || DEFAULT_SERVICE_SETTINGS.map_provider).trim() || DEFAULT_SERVICE_SETTINGS.map_provider,
        map_search_url: (serviceSettings.value.map_search_url || '').trim(),
        map_reverse_url: (serviceSettings.value.map_reverse_url || '').trim(),
        map_api_key: (serviceSettings.value.map_api_key || '').trim(),
        map_tile_template: (serviceSettings.value.map_tile_template || DEFAULT_SERVICE_SETTINGS.map_tile_template).trim(),
        map_timeout_seconds: Number(serviceSettings.value.map_timeout_seconds || DEFAULT_SERVICE_SETTINGS.map_timeout_seconds)
      };
      await request.post('/api/service-settings', payload);
      mergeServiceSettings(payload);
      ElMessage.success('服务配置保存成功');
    } catch (error) {
      ElMessage.error('保存失败: ' + (error?.response?.data?.error || error.message));
    } finally {
      savingServiceSettings.value = false;
    }
  }

  function addCharityLeaderboardItem() {
    if (charitySettings.value.leaderboard.length >= 20) {
      ElMessage.warning('善行榜单最多保留 20 条');
      return;
    }
    charitySettings.value.leaderboard.push(createEmptyCharityLeaderboardItem());
  }

  function removeCharityLeaderboardItem(index) {
    charitySettings.value.leaderboard.splice(index, 1);
  }

  function addCharityNewsItem() {
    if (charitySettings.value.news_list.length >= 20) {
      ElMessage.warning('公益资讯最多保留 20 条');
      return;
    }
    charitySettings.value.news_list.push(createEmptyCharityNewsItem());
  }

  function removeCharityNewsItem(index) {
    charitySettings.value.news_list.splice(index, 1);
  }

  function addVIPLevel() {
    if (vipSettings.value.levels.length >= 8) {
      ElMessage.warning('会员等级最多保留 8 档');
      return;
    }
    vipSettings.value.levels.push(createEmptyVIPLevel());
  }

  function removeVIPLevel(index) {
    vipSettings.value.levels.splice(index, 1);
  }

  function addVIPBenefit(levelIndex) {
    const level = vipSettings.value.levels[levelIndex];
    if (!level) {
      return;
    }
    if (!Array.isArray(level.benefits)) {
      level.benefits = [];
    }
    if (level.benefits.length >= 12) {
      ElMessage.warning('单个会员等级最多保留 12 项权益');
      return;
    }
    level.benefits.push(createEmptyVIPBenefit());
  }

  function removeVIPBenefit(levelIndex, benefitIndex) {
    const level = vipSettings.value.levels[levelIndex];
    if (!level || !Array.isArray(level.benefits)) {
      return;
    }
    level.benefits.splice(benefitIndex, 1);
  }

  function addVIPTask() {
    if (vipSettings.value.growth_tasks.length >= 20) {
      ElMessage.warning('成长任务最多保留 20 项');
      return;
    }
    vipSettings.value.growth_tasks.push(createEmptyVIPTask());
  }

  function removeVIPTask(index) {
    vipSettings.value.growth_tasks.splice(index, 1);
  }

  function addVIPPointRule() {
    if (vipSettings.value.point_rules.length >= 20) {
      ElMessage.warning('积分规则最多保留 20 条');
      return;
    }
    vipSettings.value.point_rules.push('');
  }

  function removeVIPPointRule(index) {
    vipSettings.value.point_rules.splice(index, 1);
  }

  async function saveCharitySettings() {
    savingCharitySettings.value = true;
    try {
      const payload = {
        enabled: Boolean(charitySettings.value.enabled),
        page_title: normalizeCharityText(charitySettings.value.page_title, DEFAULT_CHARITY_SETTINGS.page_title),
        page_subtitle: normalizeCharityText(charitySettings.value.page_subtitle, DEFAULT_CHARITY_SETTINGS.page_subtitle),
        hero_image_url: normalizeCharityText(charitySettings.value.hero_image_url, DEFAULT_CHARITY_SETTINGS.hero_image_url),
        hero_tagline: normalizeCharityText(charitySettings.value.hero_tagline, DEFAULT_CHARITY_SETTINGS.hero_tagline),
        hero_days_running: Math.max(0, Number(charitySettings.value.hero_days_running || 0)),
        fund_pool_amount: Math.max(0, Number(charitySettings.value.fund_pool_amount || 0)),
        today_donation_count: Math.max(0, Number(charitySettings.value.today_donation_count || 0)),
        project_status_text: normalizeCharityText(charitySettings.value.project_status_text, DEFAULT_CHARITY_SETTINGS.project_status_text),
        leaderboard_title: normalizeCharityText(charitySettings.value.leaderboard_title, DEFAULT_CHARITY_SETTINGS.leaderboard_title),
        news_title: normalizeCharityText(charitySettings.value.news_title, DEFAULT_CHARITY_SETTINGS.news_title),
        mission_title: normalizeCharityText(charitySettings.value.mission_title, DEFAULT_CHARITY_SETTINGS.mission_title),
        mission_paragraph_one: normalizeCharityText(charitySettings.value.mission_paragraph_one, DEFAULT_CHARITY_SETTINGS.mission_paragraph_one),
        mission_paragraph_two: normalizeCharityText(charitySettings.value.mission_paragraph_two, DEFAULT_CHARITY_SETTINGS.mission_paragraph_two),
        matching_plan_title: normalizeCharityText(charitySettings.value.matching_plan_title, DEFAULT_CHARITY_SETTINGS.matching_plan_title),
        matching_plan_description: normalizeCharityText(charitySettings.value.matching_plan_description, DEFAULT_CHARITY_SETTINGS.matching_plan_description),
        action_label: normalizeCharityText(charitySettings.value.action_label, DEFAULT_CHARITY_SETTINGS.action_label),
        action_note: normalizeCharityText(charitySettings.value.action_note, DEFAULT_CHARITY_SETTINGS.action_note),
        participation_notice: normalizeCharityText(charitySettings.value.participation_notice, DEFAULT_CHARITY_SETTINGS.participation_notice),
        join_url: normalizeCharityText(charitySettings.value.join_url, ''),
        leaderboard: normalizeCharityLeaderboard(charitySettings.value.leaderboard),
        news_list: normalizeCharityNewsList(charitySettings.value.news_list),
      };
      await request.post('/api/charity-settings', payload);
      mergeCharitySettings(payload);
      ElMessage.success('公益配置保存成功');
    } catch (error) {
      ElMessage.error('保存失败: ' + (error?.response?.data?.error || error.message));
    } finally {
      savingCharitySettings.value = false;
    }
  }

  async function saveVIPSettings() {
    savingVipSettings.value = true;
    try {
      const payload = buildVIPSettingsPayload(vipSettings.value);
      await request.post('/api/vip-settings', payload);
      mergeVIPSettings(payload);
      ElMessage.success('会员配置保存成功');
    } catch (error) {
      ElMessage.error('保存失败: ' + (error?.response?.data?.error || error.message));
    } finally {
      savingVipSettings.value = false;
    }
  }

  async function saveWechatLoginConfig() {
    savingWechatLoginConfig.value = true;
    try {
      const payload = {
        ...wechatLoginConfig.value,
        enabled: Boolean(wechatLoginConfig.value.enabled),
        app_id: (wechatLoginConfig.value.app_id || '').trim(),
        app_secret: (wechatLoginConfig.value.app_secret || '').trim(),
        callback_url: (wechatLoginConfig.value.callback_url || '').trim(),
        scope: (wechatLoginConfig.value.scope || DEFAULT_WECHAT_LOGIN_CONFIG.scope).trim() || DEFAULT_WECHAT_LOGIN_CONFIG.scope
      };
      await request.post('/api/wechat-login-config', payload);
      mergeWechatLoginConfig({
        ...payload,
        app_secret: '',
        has_app_secret: payload.app_secret !== '' || wechatLoginConfig.value.has_app_secret
      });
      ElMessage.success('微信登录配置保存成功');
    } catch (error) {
      ElMessage.error('保存失败: ' + (error?.response?.data?.error || error.message));
    } finally {
      savingWechatLoginConfig.value = false;
    }
  }

  async function saveAppDownload() {
    savingAppDownload.value = true;
    try {
      await request.post('/api/app-download-config', appDownloadConfig.value);
      ElMessage.success('APP下载配置保存成功');
    } catch (error) {
      ElMessage.error('保存失败: ' + (error?.response?.data?.error || error.message));
    } finally {
      savingAppDownload.value = false;
    }
  }

  function beforePackageUpload(file) {
    const fileName = String(file?.name || '').toLowerCase();
    const allowed = ['.ipa', '.apk', '.aab'];
    const matched = allowed.some((ext) => fileName.endsWith(ext));
    if (!matched) {
      ElMessage.error('仅支持 .ipa / .apk / .aab 安装包');
      return false;
    }
    if (file.size > 300 * 1024 * 1024) {
      ElMessage.error('安装包不能超过300MB');
      return false;
    }
    return true;
  }

  async function handlePackageUpload(platform, options) {
    const file = options?.file;
    if (!file) return;

    uploadingPackage[platform] = true;
    try {
      const formData = new FormData();
      formData.append('file', file);
      const { data } = await request.post('/api/upload-package', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const nextUrl = data?.url || '';
      if (!nextUrl) {
        throw new Error('上传返回地址为空');
      }

      if (platform === 'ios') {
        appDownloadConfig.value.ios_url = nextUrl;
      } else {
        appDownloadConfig.value.android_url = nextUrl;
      }
      ElMessage.success('安装包上传成功');
      options?.onSuccess?.(data);
    } catch (error) {
      ElMessage.error(error?.response?.data?.error || error.message || '安装包上传失败');
      options?.onError?.(error);
    } finally {
      uploadingPackage[platform] = false;
    }
  }

  function openDownloadLink(url, label) {
    if (!url) {
      ElMessage.warning(`${label} 下载地址为空`);
      return;
    }
    window.open(url, '_blank');
  }

  function openClearAllDataDialog() {
    clearAllVerifyForm.verifyAccount = '';
    clearAllVerifyForm.verifyPassword = '';
    clearAllDialogVisible.value = true;
  }

  async function confirmClearAllData() {
    if (!clearAllVerifyForm.verifyAccount || !clearAllVerifyForm.verifyPassword) {
      ElMessage.warning('请输入验证账号和密码');
      return;
    }

    clearingAllData.value = true;
    try {
      const { data } = await request.post('/api/settings/clear-all-data', {
        verifyAccount: clearAllVerifyForm.verifyAccount,
        verifyPassword: clearAllVerifyForm.verifyPassword
      });
      const rows = Number(data?.goResult?.result?.clearedRows || 0);
      ElMessage.success(`系统数据清空完成，共清理约 ${rows} 条记录`);
      clearAllDialogVisible.value = false;
      await loadAll();
    } catch (error) {
      ElMessage.error(error?.response?.data?.error || '清空全部信息失败');
    } finally {
      clearingAllData.value = false;
    }
  }

  return {
    router,
    isMobile,
    loading,
    saving,
    loadError,
    apiListError,
    pageError,
    sms,
    DEFAULT_WEATHER_CONFIG,
    weather,
    DEFAULT_SERVICE_SETTINGS,
    serviceSettings,
    DEFAULT_CHARITY_SETTINGS,
    charitySettings,
    DEFAULT_VIP_SETTINGS,
    vipSettings,
    DEFAULT_WECHAT_LOGIN_CONFIG,
    wechatLoginConfig,
    savingWechatLoginConfig,
    savingServiceSettings,
    savingCharitySettings,
    savingVipSettings,
    appDownloadConfig,
    savingAppDownload,
    uploadingPackage,
    exporting,
    importing,
    exportingRiders,
    importingRiders,
    exportingOrders,
    importingOrders,
    exportingMerchants,
    importingMerchants,
    exportingAll,
    importingAll,
    dataMgmtItems,
    debugMode,
    savingDebugMode,
    payMode,
    savingPayMode,
    wxpay,
    savingWx,
    alipay,
    savingAli,
    apiList,
    apiListLoading,
    apiDialogVisible,
    editingApi,
    apiForm,
    savingApi,
    downloadDialogVisible,
    downloadLanguage,
    downloadingApi,
    currentDownloadApi,
    clearAllDialogVisible,
    clearingAllData,
    clearAllVerifyForm,
    extractErrorMessage,
    mergeWeatherConfig,
    handleResize,
    loadAll,
    saveSms,
    saveWeather,
    saveWechatLoginConfig,
    saveServiceSettings,
    addRiderReportReason,
    removeRiderReportReason,
    addRiderInsuranceCoverage,
    removeRiderInsuranceCoverage,
    addRiderInsuranceClaimStep,
    removeRiderInsuranceClaimStep,
    addRTCIceServer,
    removeRTCIceServer,
    saveCharitySettings,
    addCharityLeaderboardItem,
    removeCharityLeaderboardItem,
    addCharityNewsItem,
    removeCharityNewsItem,
    saveVIPSettings,
    addVIPLevel,
    removeVIPLevel,
    addVIPBenefit,
    removeVIPBenefit,
    addVIPTask,
    removeVIPTask,
    addVIPPointRule,
    removeVIPPointRule,
    saveAppDownload,
    beforePackageUpload,
    handlePackageUpload,
    openDownloadLink,
    openClearAllDataDialog,
    confirmClearAllData,
    savePayMode,
    saveDebugMode,
    saveWxpay,
    saveAlipay,
    handleLogout,
    exportUsers,
    beforeImport,
    handleImport,
    exportRiders,
    handleImportRiders,
    validateDataType,
    exportOrders,
    handleImportOrders,
    exportMerchants,
    handleImportMerchants,
    exportAllData,
    handleImportAllData,
    loadApiList,
    showAddApiDialog,
    editApi,
    deleteApi,
    saveApi,
    resetApiForm,
    generateApiKey,
    copyApiKey,
    getPermissionLabel,
    handleApiPermissionChange,
    showApiDocumentation,
    generateApiDocumentation,
    showDownloadDialog,
    generateMarkdownDoc,
    downloadApiDoc,
  };
}
