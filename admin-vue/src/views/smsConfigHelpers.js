export const DEFAULT_SMS_CONFIG = Object.freeze({
  provider: 'aliyun',
  access_key_id: '',
  access_key_secret: '',
  has_access_key_secret: false,
  sign_name: '',
  template_code: '',
  region_id: 'cn-hangzhou',
  endpoint: '',
});

export function normalizeSMSConfig(payload = {}) {
  const source = payload || {};
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
  };
}
