export const SITE_COOKIE_CONSENT_KEY = 'official_site_cookie_consent_v1';
export const SITE_COOKIE_CONSENT_EVENT = 'official-site-cookie-consent-change';
export const SITE_SUPPORT_TOKEN_STORAGE_KEY = 'official_site_support_token_v2';

const SITE_SUPPORT_TOKEN_LEGACY_LOCAL_KEY = 'official_site_support_token_v1';
const SITE_SUPPORT_TOKEN_LEGACY_SESSION_KEY = 'official_site_support_token_session_v1';

function getStorage(name) {
  if (typeof window === 'undefined') return null;
  try {
    return window[name];
  } catch (_error) {
    return null;
  }
}

function safeRead(storage, key) {
  try {
    return String(storage?.getItem(key) || '').trim();
  } catch (_error) {
    return '';
  }
}

function safeWrite(storage, key, value) {
  try {
    if (storage) {
      storage.setItem(key, value);
    }
  } catch (_error) {
    // ignore storage failure
  }
}

function safeRemove(storage, key) {
  try {
    storage?.removeItem(key);
  } catch (_error) {
    // ignore storage failure
  }
}

export function getSiteCookieConsent() {
  const localStorage = getStorage('localStorage');
  const value = safeRead(localStorage, SITE_COOKIE_CONSENT_KEY);
  return value === 'accepted' || value === 'rejected' ? value : '';
}

export function isSiteCookieAccepted() {
  return getSiteCookieConsent() === 'accepted';
}

export function setSiteCookieConsent(status) {
  if (status !== 'accepted' && status !== 'rejected') {
    return;
  }

  const localStorage = getStorage('localStorage');
  safeWrite(localStorage, SITE_COOKIE_CONSENT_KEY, status);
  if (status === 'rejected') {
    clearOfficialSiteSupportToken();
  }
  syncOfficialSiteSupportTokenStorage();

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(SITE_COOKIE_CONSENT_EVENT, {
      detail: { status }
    }));
  }
}

export function readOfficialSiteSupportToken() {
  if (!isSiteCookieAccepted()) {
    return '';
  }
  const localStorage = getStorage('localStorage');
  return safeRead(localStorage, SITE_SUPPORT_TOKEN_STORAGE_KEY);
}

export function persistOfficialSiteSupportToken(token) {
  const value = String(token || '').trim();
  const localStorage = getStorage('localStorage');

  if (!value || !isSiteCookieAccepted()) {
    clearOfficialSiteSupportToken();
    return;
  }

  safeWrite(localStorage, SITE_SUPPORT_TOKEN_STORAGE_KEY, value);
}

export function clearOfficialSiteSupportToken() {
  const localStorage = getStorage('localStorage');
  const sessionStorage = getStorage('sessionStorage');
  safeRemove(localStorage, SITE_SUPPORT_TOKEN_STORAGE_KEY);
  safeRemove(localStorage, SITE_SUPPORT_TOKEN_LEGACY_LOCAL_KEY);
  safeRemove(sessionStorage, SITE_SUPPORT_TOKEN_LEGACY_SESSION_KEY);
}

export function syncOfficialSiteSupportTokenStorage() {
  const consent = getSiteCookieConsent();
  const localStorage = getStorage('localStorage');
  const sessionStorage = getStorage('sessionStorage');
  const token = [
    safeRead(localStorage, SITE_SUPPORT_TOKEN_STORAGE_KEY),
    safeRead(localStorage, SITE_SUPPORT_TOKEN_LEGACY_LOCAL_KEY),
    safeRead(sessionStorage, SITE_SUPPORT_TOKEN_LEGACY_SESSION_KEY)
  ].find(Boolean) || '';

  if (consent !== 'accepted') {
    clearOfficialSiteSupportToken();
    return '';
  }

  if (!token) {
    clearOfficialSiteSupportToken();
    return '';
  }

  persistOfficialSiteSupportToken(token);
  safeRemove(localStorage, SITE_SUPPORT_TOKEN_LEGACY_LOCAL_KEY);
  safeRemove(sessionStorage, SITE_SUPPORT_TOKEN_LEGACY_SESSION_KEY);
  return token;
}
