import {
	AUTH_STORAGE_KEYS,
	getAuthSession,
	getCurrentAccountId,
	isAuthSessionValid,
	verifySessionRemote
} from './auth.js';

const MAX_BIO_FAIL_COUNT = 5;
const BIO_LOCK_DURATION_MS = 5 * 60 * 1000;
const DEFAULT_AUTH_CONTENT = '请完成生物识别认证';
const VALID_AUTH_MODES = ['fingerPrint', 'facial'];

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

function readBioConfig() {
	const raw = uni.getStorageSync(AUTH_STORAGE_KEYS.BIO_CONFIG_KEY);
	const parsed = safeJsonParse(typeof raw === 'string' ? raw : '', null);
	if (!parsed || typeof parsed !== 'object') {
		return null;
	}
	return {
		enabled: parsed.enabled === true,
		accountId: String(parsed.accountId || ''),
		accountPhone: String(parsed.accountPhone || ''),
		accountName: String(parsed.accountName || ''),
		authModes: Array.isArray(parsed.authModes) ? parsed.authModes : [],
		enabledAt: Number(parsed.enabledAt || 0),
		updatedAt: Number(parsed.updatedAt || 0)
	};
}

function writeBioConfig(config) {
	uni.setStorageSync(AUTH_STORAGE_KEYS.BIO_CONFIG_KEY, JSON.stringify(config));
}

function removeBioConfig() {
	uni.removeStorageSync(AUTH_STORAGE_KEYS.BIO_CONFIG_KEY);
	uni.removeStorageSync(AUTH_STORAGE_KEYS.BIO_FAIL_STATE_KEY);
	uni.removeStorageSync(AUTH_STORAGE_KEYS.BIO_APP_LOCK_KEY);
}

function readBioFailState() {
	const raw = uni.getStorageSync(AUTH_STORAGE_KEYS.BIO_FAIL_STATE_KEY);
	const parsed = safeJsonParse(typeof raw === 'string' ? raw : '', null);
	if (!parsed || typeof parsed !== 'object') {
		return {
			failCount: 0,
			lockUntil: 0,
			updatedAt: 0
		};
	}
	return {
		failCount: Number(parsed.failCount || 0),
		lockUntil: Number(parsed.lockUntil || 0),
		updatedAt: Number(parsed.updatedAt || 0)
	};
}

function writeBioFailState(state) {
	uni.setStorageSync(AUTH_STORAGE_KEYS.BIO_FAIL_STATE_KEY, JSON.stringify(state));
}

function resetBioFailState() {
	uni.removeStorageSync(AUTH_STORAGE_KEYS.BIO_FAIL_STATE_KEY);
}

function isSupportedRuntime() {
	return (
		typeof uni !== 'undefined'
		&& typeof uni.startSoterAuthentication === 'function'
		&& typeof uni.checkIsSupportSoterAuthentication === 'function'
		&& typeof uni.checkIsSoterEnrolledInDevice === 'function'
	);
}

function callUniApi(name, payload = {}) {
	return new Promise((resolve, reject) => {
		const fn = uni[name];
		if (typeof fn !== 'function') {
			reject(new Error(`uni.${name} 不可用`));
			return;
		}
		fn({
			...payload,
			success: (res) => resolve(res),
			fail: (err) => reject(err)
		});
	});
}

function getCurrentSessionAccount(session) {
	if (!session || !session.user) {
		return '';
	}
	return String(session.user.id || session.user.phone || '');
}

function buildChallenge(action, accountId) {
	const randomPart = Math.random().toString(36).slice(2);
	return `${action}:${accountId}:${Date.now()}:${randomPart}`;
}

function getLockInfo() {
	const state = readBioFailState();
	const now = Date.now();
	if (state.lockUntil > now) {
		return {
			locked: true,
			lockUntil: state.lockUntil,
			remainingSeconds: Math.ceil((state.lockUntil - now) / 1000)
		};
	}
	return {
		locked: false,
		lockUntil: 0,
		remainingSeconds: 0
	};
}

function shouldCountFailure(err) {
	const code = Number(err && err.errCode ? err.errCode : 0);
	// 用户主动取消/关闭不计入锁定
	if (code === 90011 || code === 90010) {
		return false;
	}
	return true;
}

function recordAuthFailure(err) {
	const now = Date.now();
	const current = readBioFailState();
	let failCount = Number(current.failCount || 0);
	let lockUntil = Number(current.lockUntil || 0);

	if (shouldCountFailure(err)) {
		failCount += 1;
		if (failCount >= MAX_BIO_FAIL_COUNT) {
			lockUntil = now + BIO_LOCK_DURATION_MS;
			failCount = 0;
		}
	}

	writeBioFailState({
		failCount,
		lockUntil,
		updatedAt: now
	});

	if (lockUntil > now) {
		return `验证失败次数过多，请 ${Math.ceil((lockUntil - now) / 1000)} 秒后再试`;
	}
	if (!shouldCountFailure(err)) {
		return '已取消生物识别验证';
	}
	const remain = Math.max(0, MAX_BIO_FAIL_COUNT - failCount);
	return remain > 0 ? `验证失败，还可重试 ${remain} 次` : '验证失败';
}

async function getSupportedModes() {
	if (!isSupportedRuntime()) {
		return [];
	}

	try {
		const supportResult = await callUniApi('checkIsSupportSoterAuthentication');
		const modes = Array.isArray(supportResult.supportMode) ? supportResult.supportMode : [];
		return modes.filter((mode) => VALID_AUTH_MODES.includes(mode));
	} catch (err) {
		return [];
	}
}

async function getEnrolledModes(inputModes) {
	const supported = Array.isArray(inputModes) ? inputModes : await getSupportedModes();
	if (!supported.length) {
		return [];
	}

	const checks = supported.map(async (mode) => {
		try {
			const enrolled = await callUniApi('checkIsSoterEnrolledInDevice', {
				checkAuthMode: mode
			});
			return enrolled && enrolled.isEnrolled ? mode : '';
		} catch (err) {
			return '';
		}
	});

	const modes = await Promise.all(checks);
	return modes.filter(Boolean);
}

async function performBiometricAuth(action, authContent) {
	if (!isSupportedRuntime()) {
		throw new Error('当前设备不支持生物识别');
	}

	const lockInfo = getLockInfo();
	if (lockInfo.locked) {
		throw new Error(`验证已锁定，请 ${lockInfo.remainingSeconds} 秒后再试`);
	}

	const modes = await getEnrolledModes();
	if (!modes.length) {
		throw new Error('设备未录入指纹或面容信息');
	}

	const challenge = buildChallenge(action, getCurrentAccountId() || 'unknown');
	return new Promise((resolve, reject) => {
		uni.startSoterAuthentication({
			requestAuthModes: modes,
			challenge,
			authContent: authContent || DEFAULT_AUTH_CONTENT,
			success: (res) => {
				resetBioFailState();
				resolve(res);
			},
			fail: (err) => {
				reject(new Error(recordAuthFailure(err)));
			}
		});
	});
}

export function getBiometricConfig() {
	return readBioConfig();
}

export function clearBiometricAppLock() {
	uni.removeStorageSync(AUTH_STORAGE_KEYS.BIO_APP_LOCK_KEY);
}

export function markBiometricAppLockRequired() {
	const session = getAuthSession();
	if (!isAuthSessionValid(session)) {
		return;
	}
	if (!isBiometricEnabledForCurrentSession(session)) {
		return;
	}
	uni.setStorageSync(AUTH_STORAGE_KEYS.BIO_APP_LOCK_KEY, '1');
}

export function enforceBiometricAppLockOnShow() {
	const required = uni.getStorageSync(AUTH_STORAGE_KEYS.BIO_APP_LOCK_KEY);
	if (required !== '1') {
		return false;
	}

	const session = getAuthSession();
	if (!isAuthSessionValid(session) || !isBiometricEnabledForCurrentSession(session)) {
		clearBiometricAppLock();
		return false;
	}

	const pages = typeof getCurrentPages === 'function' ? getCurrentPages() : [];
	const current = pages && pages.length ? pages[pages.length - 1] : null;
	const currentRoute = current && current.route ? String(current.route) : '';
	if (currentRoute === 'pages/login/login') {
		return false;
	}

	uni.reLaunch({ url: '/pages/login/login?unlock=1' });
	return true;
}

export function isBiometricEnabledForCurrentSession(session = getAuthSession()) {
	const config = readBioConfig();
	if (!config || !config.enabled) {
		return false;
	}
	if (!isAuthSessionValid(session)) {
		return false;
	}
	const accountId = getCurrentSessionAccount(session);
	if (!accountId) {
		return false;
	}
	return config.accountId === accountId;
}

export async function getBiometricStatus() {
	const lockInfo = getLockInfo();
	const supportedModes = await getSupportedModes();
	const enrolledModes = await getEnrolledModes(supportedModes);
	const session = getAuthSession();
	const enabled = isBiometricEnabledForCurrentSession(session);
	const available = supportedModes.length > 0 && enrolledModes.length > 0;

	let message = '';
	if (!available) {
		if (!isSupportedRuntime()) {
			message = '当前运行环境不支持生物识别';
		} else if (!supportedModes.length) {
			message = '设备不支持指纹/面容识别';
		} else {
			message = '请先在系统中录入指纹或面容';
		}
	} else if (lockInfo.locked) {
		message = `验证已锁定，请 ${lockInfo.remainingSeconds} 秒后重试`;
	}

	return {
		available,
		enabled,
		supportedModes,
		enrolledModes,
		locked: lockInfo.locked,
		lockUntil: lockInfo.lockUntil,
		lockSeconds: lockInfo.remainingSeconds,
		message
	};
}

export async function enableBiometricForCurrentSession() {
	const session = getAuthSession();
	if (!isAuthSessionValid(session)) {
		throw new Error('请先登录后再开启生物识别');
	}

	const accountId = getCurrentSessionAccount(session);
	if (!accountId) {
		throw new Error('账号信息异常，请重新登录后再试');
	}

	await performBiometricAuth('enable_bio', '验证身份以启用生物识别登录');

	const modes = await getEnrolledModes();
	const now = Date.now();
	const user = session.user || {};
	const config = {
		enabled: true,
		accountId,
		accountPhone: String(user.phone || ''),
		accountName: String(user.name || ''),
		authModes: modes,
		enabledAt: now,
		updatedAt: now
	};
	writeBioConfig(config);
	clearBiometricAppLock();
	return config;
}

export function disableBiometric() {
	removeBioConfig();
}

export async function verifyBiometricForSensitiveAction(options = {}) {
	const session = getAuthSession();
	if (!isAuthSessionValid(session)) {
		throw new Error('登录会话已失效，请重新登录');
	}
	if (!isBiometricEnabledForCurrentSession(session)) {
		return false;
	}

	await performBiometricAuth(
		options.action || 'sensitive_action',
		options.authContent || '请通过生物识别确认敏感操作'
	);

	const verifyResult = await verifySessionRemote();
	if (!verifyResult.valid) {
		throw new Error(verifyResult.error || '登录状态已失效，请重新登录');
	}

	return true;
}

export async function runBiometricLogin() {
	const session = getAuthSession();
	if (!isAuthSessionValid(session)) {
		throw new Error('登录会话已失效，请使用账号密码重新登录');
	}
	if (!isBiometricEnabledForCurrentSession(session)) {
		throw new Error('请先在设置中启用生物识别登录');
	}

	await performBiometricAuth('bio_login', '验证指纹或面容以继续登录');

	const verifyResult = await verifySessionRemote();
	if (!verifyResult.valid) {
		throw new Error(verifyResult.error || '登录状态已失效，请重新登录');
	}

	clearBiometricAppLock();
	return true;
}
