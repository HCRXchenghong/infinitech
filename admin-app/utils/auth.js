import { API_CONFIG } from './config.js';
import {
	ADMIN_AUTH_STORAGE_KEYS,
	DEFAULT_ADMIN_VERIFY_MAX_AGE_MS,
	buildAdminAuthSession,
	getAdminSessionAccountId,
	isAdminAuthSessionExpired,
	isAdminAuthSessionValid,
	isAdminSessionUser,
	mergeAdminVerifiedSession,
	normalizeAdminAuthSessionRecord
} from '../../packages/admin-core/src/admin-auth-session.js';
import { clearCachedSocketToken as clearCachedSocketTokenCache } from '../../packages/client-sdk/src/realtime-token.js';

export const AUTH_STORAGE_KEYS = ADMIN_AUTH_STORAGE_KEYS;

function safeJsonParse(value, fallback = null) {
	if (!value || typeof value !== 'string') {
		return fallback;
	}
	try {
		return JSON.parse(value);
	} catch (err) {
		return fallback;
	}
}

export function isAdminUser(user) {
	return isAdminSessionUser(user);
}

function writeSession(session) {
	uni.setStorageSync(API_CONFIG.TOKEN_KEY, session.token);
	uni.setStorageSync(API_CONFIG.USER_KEY, JSON.stringify(session.user));
	uni.setStorageSync(AUTH_STORAGE_KEYS.SESSION_KEY, JSON.stringify(session));
}

function readLegacySession() {
	const token = String(uni.getStorageSync(API_CONFIG.TOKEN_KEY) || '').trim();
	if (!token) {
		return null;
	}

	const userRaw = uni.getStorageSync(API_CONFIG.USER_KEY);
	let user = null;
	if (typeof userRaw === 'string') {
		user = safeJsonParse(userRaw, null);
	} else if (userRaw && typeof userRaw === 'object') {
		user = userRaw;
	}
	if (!user) {
		return null;
	}

	try {
		return buildAdminAuthSession(token, user, { source: 'legacy' });
	} catch (err) {
		return null;
	}
}

export function getAuthSession() {
	const raw = uni.getStorageSync(AUTH_STORAGE_KEYS.SESSION_KEY);
	let session = safeJsonParse(typeof raw === 'string' ? raw : '', null);

	if (!session) {
		session = readLegacySession();
		if (session) {
			writeSession(session);
		}
	}

	if (!session || typeof session !== 'object') {
		return null;
	}

	return normalizeAdminAuthSessionRecord(session);
}

export function isSessionExpired(session, skewMs) {
	return isAdminAuthSessionExpired(session, skewMs);
}

export function isAuthSessionValid(session = getAuthSession()) {
	return isAdminAuthSessionValid(session);
}

export function getAuthToken() {
	const session = getAuthSession();
	if (!isAuthSessionValid(session)) {
		return '';
	}
	return session.token;
}

export function getAuthUser() {
	const session = getAuthSession();
	if (!isAuthSessionValid(session)) {
		return null;
	}
	return session.user;
}

export function saveAuthSession(token, user, options = {}) {
	const session = buildAdminAuthSession(token, user, { source: options.source || 'password' });
	writeSession(session);
	return session;
}

export function markSessionVerified(user) {
	const session = getAuthSession();
	if (!session) {
		return;
	}

	const nextSession = mergeAdminVerifiedSession(session, user);
	if (!nextSession) {
		return;
	}
	writeSession(nextSession);
}

export function clearAuthSession(options = {}) {
	const keepBiometric = options.keepBiometric !== false;

	uni.removeStorageSync(API_CONFIG.TOKEN_KEY);
	uni.removeStorageSync(API_CONFIG.USER_KEY);
	uni.removeStorageSync(AUTH_STORAGE_KEYS.SESSION_KEY);
	clearCachedSocketTokenCache({ uniApp: uni });
	uni.removeStorageSync(AUTH_STORAGE_KEYS.BIO_APP_LOCK_KEY);

	if (!keepBiometric) {
		uni.removeStorageSync(AUTH_STORAGE_KEYS.BIO_CONFIG_KEY);
		uni.removeStorageSync(AUTH_STORAGE_KEYS.BIO_FAIL_STATE_KEY);
	}
}

function requestRaw(options) {
	return new Promise((resolve, reject) => {
		uni.request({
			...options,
			success: (res) => resolve(res),
			fail: (err) => reject(err)
		});
	});
}

function buildVerifyUrl() {
	const base = String(API_CONFIG.BFF_BASE_URL || '').replace(/\/+$/, '');
	return `${base}${API_CONFIG.API.VERIFY_TOKEN || '/api/verify-token'}`;
}

export async function verifySessionRemote(options = {}) {
	const session = getAuthSession();
	if (!isAuthSessionValid(session)) {
		return {
			valid: false,
			error: '会话无效或已过期'
		};
	}

	try {
		const response = await requestRaw({
			url: buildVerifyUrl(),
			method: 'GET',
			timeout: options.timeout || 8000,
			header: {
				Authorization: `Bearer ${session.token}`
			}
		});

		const data = response && response.data && typeof response.data === 'object' ? response.data : {};
		if (response.statusCode >= 200 && response.statusCode < 300 && data.valid) {
			const nextSession = mergeAdminVerifiedSession(session, data.user);
			if (nextSession) {
				writeSession(nextSession);
			}
			return {
				valid: true,
				user: nextSession ? nextSession.user : session.user
			};
		}

		return {
			valid: false,
			error: data.error || '登录状态已失效'
		};
	} catch (err) {
		return {
			valid: false,
			error: '网络异常，无法校验会话'
		};
	}
}

export function redirectToLogin(message) {
	if (message) {
		uni.showToast({ title: message, icon: 'none' });
	}

	const pages = typeof getCurrentPages === 'function' ? getCurrentPages() : [];
	const current = pages && pages.length ? pages[pages.length - 1] : null;
	const currentRoute = current && current.route ? String(current.route) : '';
	if (currentRoute === 'pages/login/login') {
		return;
	}

	uni.reLaunch({ url: '/pages/login/login' });
}

export async function ensureAuthenticated(options = {}) {
	const shouldRedirect = options.redirect !== false;
	const verifyRemote = options.verifyRemote === true;
	const verifyMaxAgeInput = Number(options.verifyMaxAgeMs);
	const verifyMaxAgeMs = Number.isFinite(verifyMaxAgeInput)
		? Math.max(0, verifyMaxAgeInput)
		: DEFAULT_ADMIN_VERIFY_MAX_AGE_MS;

	let session = getAuthSession();
	if (!isAuthSessionValid(session)) {
		clearAuthSession({ keepBiometric: true });
		if (shouldRedirect) {
			redirectToLogin(options.expiredMessage || '登录已过期，请重新登录');
		}
		return false;
	}

	if (verifyRemote) {
		const lastVerifiedAt = Number(session.lastVerifiedAt || 0);
		if (!lastVerifiedAt || Date.now() - lastVerifiedAt >= verifyMaxAgeMs) {
			const verified = await verifySessionRemote({ timeout: options.verifyTimeout });
			if (!verified.valid) {
				clearAuthSession({ keepBiometric: true });
				if (shouldRedirect) {
					redirectToLogin(verified.error || '登录已失效，请重新登录');
				}
				return false;
			}
			session = getAuthSession();
		}
	}

	return isAuthSessionValid(session);
}

export function getCurrentAccountId() {
	const user = getAuthUser();
	return getAdminSessionAccountId(user);
}

export function isProtectedRoute(route) {
	const normalized = String(route || '').trim().replace(/^\/+/, '');
	return normalized && normalized !== 'pages/login/login';
}
