import { API_CONFIG } from './config.js';

const SESSION_VERSION = 2;
const DEFAULT_SESSION_TTL_MS = 2 * 60 * 60 * 1000;
const DEFAULT_VERIFY_MAX_AGE_MS = 2 * 60 * 1000;
const TOKEN_EXPIRE_SKEW_MS = 60 * 1000;

export const AUTH_STORAGE_KEYS = {
	SESSION_KEY: 'admin_session_v2',
	BIO_CONFIG_KEY: 'admin_bio_config_v2',
	BIO_FAIL_STATE_KEY: 'admin_bio_fail_state_v1',
	BIO_APP_LOCK_KEY: 'admin_bio_lock_required_v1'
};

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

function normalizeBase64Url(value) {
	const raw = String(value || '').replace(/-/g, '+').replace(/_/g, '/');
	const remain = raw.length % 4;
	if (!remain) {
		return raw;
	}
	return raw + '='.repeat(4 - remain);
}

function decodeBase64ToText(value) {
	const normalized = normalizeBase64Url(value);
	if (!normalized) {
		return '';
	}

	try {
		if (typeof uni !== 'undefined' && typeof uni.base64ToArrayBuffer === 'function') {
			const arrayBuffer = uni.base64ToArrayBuffer(normalized);
			const uint8 = new Uint8Array(arrayBuffer);
			if (typeof TextDecoder !== 'undefined') {
				return new TextDecoder('utf-8').decode(uint8);
			}
			let binary = '';
			for (let i = 0; i < uint8.length; i += 1) {
				binary += String.fromCharCode(uint8[i]);
			}
			return binary;
		}
	} catch (err) {
		// ignore and fallback
	}

	try {
		if (typeof atob === 'function') {
			return atob(normalized);
		}
	} catch (err) {
		// ignore and return empty
	}

	return '';
}

function decodeBase64UrlToJSON(value) {
	const text = decodeBase64ToText(value);
	return safeJsonParse(text, null);
}

function parseTokenPayload(token) {
	const raw = String(token || '').trim();
	if (!raw) {
		return null;
	}
	const parts = raw.split('.');
	const payloadPart = parts.length === 2 ? parts[0] : (parts.length >= 3 ? parts[1] : '');
	if (!payloadPart) {
		return null;
	}
	return decodeBase64UrlToJSON(payloadPart);
}

function getTokenExpAt(token) {
	const payload = parseTokenPayload(token);
	const exp = Number(payload && payload.exp ? payload.exp : 0);
	if (!Number.isFinite(exp) || exp <= 0) {
		return 0;
	}
	return exp * 1000;
}

function getTokenIssuedAt(token) {
	const payload = parseTokenPayload(token);
	const iat = Number(payload && payload.iat ? payload.iat : 0);
	if (!Number.isFinite(iat) || iat <= 0) {
		return 0;
	}
	return iat * 1000;
}

function normalizeAdminUser(user) {
	if (!user || typeof user !== 'object') {
		return null;
	}
	return {
		id: String(user.id || user.userId || user.uid || ''),
		phone: String(user.phone || ''),
		name: String(user.name || user.username || '管理员'),
		type: String(user.type || user.role || '').trim().toLowerCase()
	};
}

export function isAdminUser(user) {
	const normalized = normalizeAdminUser(user);
	if (!normalized) {
		return false;
	}
	return normalized.type === 'admin' || normalized.type === 'super_admin';
}

function getUserAccountId(user) {
	const normalized = normalizeAdminUser(user);
	if (!normalized) {
		return '';
	}
	return normalized.id || normalized.phone || '';
}

function buildSession(token, user, source) {
	const tokenValue = String(token || '').trim();
	if (!tokenValue) {
		throw new Error('登录令牌缺失');
	}

	const normalizedUser = normalizeAdminUser(user);
	if (!normalizedUser) {
		throw new Error('用户信息无效');
	}
	if (!normalizedUser.type) {
		const payload = parseTokenPayload(tokenValue);
		const tokenType = String(payload && (payload.type || payload.role || payload.userType) || '')
			.trim()
			.toLowerCase();
		if (tokenType) {
			normalizedUser.type = tokenType;
		}
	}
	if (!isAdminUser(normalizedUser)) {
		throw new Error('权限不足，仅支持管理员账号');
	}

	const now = Date.now();
	const expAt = getTokenExpAt(tokenValue);
	return {
		version: SESSION_VERSION,
		token: tokenValue,
		user: normalizedUser,
		source: String(source || 'password'),
		issuedAt: getTokenIssuedAt(tokenValue) || now,
		expiresAt: expAt || now + DEFAULT_SESSION_TTL_MS,
		lastVerifiedAt: 0,
		updatedAt: now
	};
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
		return buildSession(token, user, 'legacy');
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

	const token = String(session.token || '').trim();
	const user = normalizeAdminUser(session.user);
	if (!token || !user) {
		return null;
	}

	return {
		...session,
		token,
		user,
		expiresAt: Number(session.expiresAt || 0),
		issuedAt: Number(session.issuedAt || 0),
		lastVerifiedAt: Number(session.lastVerifiedAt || 0),
		updatedAt: Number(session.updatedAt || 0)
	};
}

export function isSessionExpired(session, skewMs = TOKEN_EXPIRE_SKEW_MS) {
	if (!session || typeof session !== 'object') {
		return true;
	}
	const expiresAt = Number(session.expiresAt || 0);
	if (!Number.isFinite(expiresAt) || expiresAt <= 0) {
		return true;
	}
	return Date.now() + Math.max(0, Number(skewMs || 0)) >= expiresAt;
}

export function isAuthSessionValid(session = getAuthSession()) {
	if (!session) {
		return false;
	}
	if (!session.token || !isAdminUser(session.user)) {
		return false;
	}
	return !isSessionExpired(session);
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
	const session = buildSession(token, user, options.source || 'password');
	writeSession(session);
	return session;
}

export function markSessionVerified(user) {
	const session = getAuthSession();
	if (!session) {
		return;
	}

	const verifiedUser = normalizeAdminUser(user);
	const nextSession = {
		...session,
		user: verifiedUser && isAdminUser(verifiedUser) ? verifiedUser : session.user,
		lastVerifiedAt: Date.now(),
		updatedAt: Date.now()
	};
	writeSession(nextSession);
}

export function clearAuthSession(options = {}) {
	const keepBiometric = options.keepBiometric !== false;

	uni.removeStorageSync(API_CONFIG.TOKEN_KEY);
	uni.removeStorageSync(API_CONFIG.USER_KEY);
	uni.removeStorageSync(AUTH_STORAGE_KEYS.SESSION_KEY);
	uni.removeStorageSync('socket_token');
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
			const verifiedUser = normalizeAdminUser(data.user);
			markSessionVerified(verifiedUser);
			return {
				valid: true,
				user: verifiedUser && isAdminUser(verifiedUser) ? verifiedUser : session.user
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
		: DEFAULT_VERIFY_MAX_AGE_MS;

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
	return getUserAccountId(user);
}

export function isProtectedRoute(route) {
	const normalized = String(route || '').trim().replace(/^\/+/, '');
	return normalized && normalized !== 'pages/login/login';
}
