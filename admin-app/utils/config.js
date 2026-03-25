const BFF_BASE_URL_KEY = 'admin_bff_base_url';
const DEFAULT_BFF_BASE_URL = process.env.VUE_APP_BFF_BASE_URL || '';

function normalizeBaseUrl(raw) {
  const text = String(raw || '').trim();
  if (!text) return '';
  return text.replace(/\/+$/, '');
}

function resolveH5BaseUrl() {
  try {
    if (typeof window !== 'undefined' && window.location && window.location.hostname) {
      const protocol = window.location.protocol || 'http:';
      const host = window.location.hostname;
      return `${protocol}//${host}:25500`;
    }
  } catch (err) {
    // ignore
  }
  return '';
}

function resolveBffBaseUrl() {
  try {
    const local = typeof uni !== 'undefined' ? uni.getStorageSync(BFF_BASE_URL_KEY) : '';
    const localBase = normalizeBaseUrl(local);
    if (localBase) {
      return localBase;
    }
  } catch (err) {
    // ignore
  }

  const h5Base = normalizeBaseUrl(resolveH5BaseUrl());
  if (h5Base) {
    return h5Base;
  }

  return DEFAULT_BFF_BASE_URL;
}

export function setBffBaseUrl(url) {
  const normalized = normalizeBaseUrl(url);
  if (!normalized) {
    if (typeof uni !== 'undefined') {
      uni.removeStorageSync(BFF_BASE_URL_KEY);
    }
    return '';
  }
  if (typeof uni !== 'undefined') {
    uni.setStorageSync(BFF_BASE_URL_KEY, normalized);
  }
  return normalized;
}

// API 配置
export const API_CONFIG = {
  // BFF 服务地址
  BFF_BASE_URL: resolveBffBaseUrl(),

  // 超时时间
  TIMEOUT: 15000,

  // Token 存储 key
  TOKEN_KEY: 'admin_token',
  USER_KEY: 'admin_user',

  // API 路径
  API: {
    LOGIN: '/api/login',
    SEND_SMS: '/api/send-admin-sms-code',
    VERIFY_TOKEN: '/api/verify-token',
    QR_LOGIN_SESSION: '/api/qr-login/session',
    QR_LOGIN_SCAN: '/api/qr-login/scan',
    QR_LOGIN_CONFIRM: '/api/qr-login/confirm',
    CHAT_LIST: '/api/messages/conversations',
    CHAT_MESSAGES: '/api/messages',
    CHAT_SEARCH_TARGETS: '/api/messages/targets/search',
    CHAT_UPSERT_CONVERSATION: '/api/messages/conversations/upsert',
    CHAT_SYNC_MESSAGE: '/api/messages/sync',
    SEND_MESSAGE: '/api/chat/send',
    STATS: '/api/stats',
    WEATHER: '/api/weather',
    ORDERS: '/api/orders',
    AFTER_SALES: '/api/after-sales',
    FINANCIAL_OVERVIEW: '/api/financial/overview',
    SERVICE_SETTINGS: '/api/service-settings',
    CHANGE_ADMIN_PASSWORD: '/api/admins/change-password'
  }
};
