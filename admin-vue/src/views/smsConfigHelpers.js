export const DEFAULT_SMS_CONFIG = Object.freeze({
  provider: 'aliyun',
  access_key_id: '',
  access_key_secret: '',
  has_access_key_secret: false,
  sign_name: '',
  template_code: '',
  region_id: 'cn-hangzhou',
  endpoint: '',
  consumer_enabled: true,
  merchant_enabled: true,
  rider_enabled: true,
  admin_enabled: true,
});

export function normalizeSMSConfig(payload = {}) {
  const source = payload || {};
  const normalizeBool = (value, fallback = true) => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value !== 0;
    if (typeof value === 'string') {
      const text = value.trim().toLowerCase();
      if (['1', 'true', 'yes', 'on'].includes(text)) return true;
      if (['0', 'false', 'no', 'off'].includes(text)) return false;
    }
    return fallback;
  };
  return {
    ...DEFAULT_SMS_CONFIG,
    provider: String(source.provider || DEFAULT_SMS_CONFIG.provider).trim() || DEFAULT_SMS_CONFIG.provider,
    access_key_id: String(source.access_key_id || source.access_key || '').trim(),
    access_key_secret: String(source.access_key_secret || '').trim(),
    has_access_key_secret: Boolean(source.has_access_key_secret),
    sign_name: String(source.sign_name || source.sign || '').trim(),
    template_code: String(source.template_code || source.template_id || '').trim(),
    region_id: String(source.region_id || DEFAULT_SMS_CONFIG.region_id).trim() || DEFAULT_SMS_CONFIG.region_id,
    endpoint: String(source.endpoint || '').trim(),
    consumer_enabled: normalizeBool(source.consumer_enabled ?? source.user_enabled, DEFAULT_SMS_CONFIG.consumer_enabled),
    merchant_enabled: normalizeBool(source.merchant_enabled, DEFAULT_SMS_CONFIG.merchant_enabled),
    rider_enabled: normalizeBool(source.rider_enabled, DEFAULT_SMS_CONFIG.rider_enabled),
    admin_enabled: normalizeBool(source.admin_enabled, DEFAULT_SMS_CONFIG.admin_enabled),
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
