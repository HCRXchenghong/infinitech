export function toArray(source) {
  if (Array.isArray(source)) return source;
  if (typeof source === 'string') {
    try {
      const parsed = JSON.parse(source);
      if (Array.isArray(parsed)) return parsed;
    } catch (error) {
      return source.split(',').map((item) => item.trim()).filter(Boolean);
    }
  }
  return [];
}

export function commaTextToArray(text) {
  return (text || '')
    .split(/[,\n，]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function parseImages(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === 'string') {
    const text = value.trim();
    if (!text) return [];
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) {
        return parsed.filter(Boolean).map((item) => String(item));
      }
    } catch (error) {
      return commaTextToArray(text);
    }
    return [];
  }
  return [];
}

function firstNonEmptyString(...values) {
  for (const item of values) {
    if (typeof item === 'string' && item.trim()) {
      return item.trim();
    }
  }
  return '';
}

export function getMerchantQualification(source = {}) {
  return firstNonEmptyString(
    source.merchantQualification,
    source.merchant_qualification,
    source.merchantQualificationImage,
    source.businessLicense,
    source.businessLicenseImage
  );
}

export function getFoodBusinessLicense(source = {}) {
  return firstNonEmptyString(
    source.foodBusinessLicense,
    source.food_business_license,
    source.foodBusinessLicenseImage,
    source.foodLicense,
    source.foodLicenseImage
  );
}

export function normalizeReview(raw, defaultShopId = '') {
  return {
    id: String(raw.id || ''),
    shopId: String(raw.shopId || raw.shop_id || defaultShopId || ''),
    userId: String(raw.userId || raw.user_id || ''),
    orderId: String(raw.orderId || raw.order_id || ''),
    userName: raw.userName || raw.user_name || '匿名用户',
    userAvatar: raw.userAvatar || raw.user_avatar || '',
    rating: Number(raw.rating || 0),
    content: raw.content || '',
    reply: raw.reply || '',
    images: parseImages(raw.images),
    createdAt: raw.created_at || raw.createdAt || ''
  };
}

export function formatDateTime(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const h = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${d} ${h}:${mm}`;
}

export function formatDate(value) {
  if (!value) return '-';
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function normalizeDateValue(value) {
  if (!value) return '';
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
    const matched = trimmed.match(/^(\d{4}-\d{2}-\d{2})/);
    if (matched) return matched[1];
  }
  return formatDate(value);
}

export function formatAge(value) {
  const age = Number(value || 0);
  if (!Number.isFinite(age) || age <= 0) return '-';
  return `${Math.floor(age)} 岁`;
}

export function buildEmptyReviewForm() {
  return {
    userId: '',
    orderId: '',
    userName: '',
    userAvatar: '',
    rating: 5,
    content: '',
    images: [],
    reply: ''
  };
}
