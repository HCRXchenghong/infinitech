<template>
	<view class="page-container">
		<view class="profile-head">
			<view class="avatar-box">管</view>
			<view class="profile-main">
				<text class="phone">{{ adminPhoneDisplay }}</text>
				<text class="role">超级管理员</text>
			</view>
		</view>

		<scroll-view scroll-y class="content-scroll">
			<view class="stats-grid">
				<view v-for="item in statCards" :key="item.key" class="stat-card">
					<text class="stat-value" :class="item.color">{{ item.value }}</text>
					<text class="stat-label">{{ item.label }}</text>
				</view>
			</view>

			<view class="group-card">
				<view class="setting-row">
					<text class="setting-label">登录手机号</text>
					<text class="setting-value">{{ adminPhoneDisplay }}</text>
				</view>
				<view class="divider"></view>

				<view class="setting-row">
					<text class="setting-label">生物识别登录</text>
					<view class="switch" :class="{ on: biometric }" @click="toggleBiometric">
						<view class="dot"></view>
					</view>
				</view>
				<view class="divider"></view>

				<view class="setting-row">
					<text class="setting-label">消息通知</text>
					<view class="switch" :class="{ on: notifications }" @click="toggleNotifications">
						<view class="dot"></view>
					</view>
				</view>
				<view class="divider"></view>

				<view class="setting-row">
					<text class="setting-label">自动刷新数据</text>
					<view class="switch" :class="{ on: autoRefresh }" @click="toggleAutoRefresh">
						<view class="dot"></view>
					</view>
				</view>
				<view class="divider"></view>

				<view class="setting-row clickable" @click="clearAppCache">
					<text class="setting-label">清除缓存</text>
					<text class="setting-value">{{ cacheSizeText }}</text>
				</view>
			</view>

			<view class="group-card">
				<view class="setting-row clickable" @click="goArticle('agreement')">
					<text class="setting-label">用户协议与隐私政策</text>
					<text class="arrow">›</text>
				</view>
				<view class="divider"></view>
				<view class="setting-row clickable" @click="goArticle('about')">
					<text class="setting-label">关于悦享e食</text>
					<text class="setting-value">{{ appVersion }}</text>
				</view>
			</view>

			<view class="logout-btn" @click="logout">退出登录</view>

			<view v-if="loadError" class="error-tip">{{ loadError }}</view>
		</scroll-view>
	</view>
</template>

<script setup>
import { computed, ref } from 'vue';
import { onLoad, onShow } from '@dcloudio/uni-app';
import { THEMES } from '@/common/data.js';
import { API_CONFIG } from '@/utils/config.js';
import { http } from '@/utils/request.js';
import {
	AUTH_STORAGE_KEYS,
	clearAuthSession,
	ensureAuthenticated,
	getAuthUser,
	redirectToLogin
} from '@/utils/auth.js';

const theme = ref(THEMES.nebula);
const loading = ref(false);
const loadError = ref('');
const adminPhone = ref('');

const todayTurnoverFen = ref(0);
const todayProfitFen = ref(0);
const onlineRiderCount = ref(0);
const pendingOrdersCount = ref(0);

const biometric = ref(false);
const notifications = ref(true);
const autoRefresh = ref(true);
const cacheSizeText = ref('0 KB');
const appVersion = ref('v1.0.0');
const serviceSettings = ref({});

const SETTING_KEYS = {
	BIO_AUTH: 'bio_auth_enabled',
	NOTIFY: 'admin_notify_enabled',
	AUTO_REFRESH: 'admin_auto_refresh_enabled'
};

const adminPhoneDisplay = computed(() => String(adminPhone.value || '').trim() || '--');

const statCards = computed(() => [
	{ key: 'turnover', label: '今日流水', value: formatMoneyFen(todayTurnoverFen.value), color: 'orange' },
	{ key: 'profit', label: '今日利润', value: formatMoneyFen(todayProfitFen.value), color: 'green' },
	{ key: 'rider', label: '在线骑手', value: formatCount(onlineRiderCount.value), color: 'blue' },
	{ key: 'pending', label: '待接订单', value: formatCount(pendingOrdersCount.value), color: 'red' }
]);

onLoad(async () => {
	const authed = await ensureAuthenticated({ verifyRemote: true });
	if (!authed) return;
	loadProfile();
	loadLocalSettings();
	await Promise.all([loadOverview(), loadServiceSettings()]);
	refreshCacheSize();
	resolveAppVersion();
});

onShow(async () => {
	const authed = await ensureAuthenticated({ verifyRemote: true });
	if (!authed) return;
	loadProfile();
	loadLocalSettings();
	await loadOverview({ silent: true });
	refreshCacheSize();
});

function loadProfile() {
	const user = getAuthUser();
	adminPhone.value = String(user?.phone || '').trim();
}

async function loadOverview(options = {}) {
	if (loading.value) return;
	const silent = Boolean(options.silent);
	loading.value = true;
	if (!silent) {
		loadError.value = '';
	}

	const errors = [];
	try {
		const [statsRes, financialRes] = await Promise.allSettled([
			http.get(API_CONFIG.API.STATS || '/api/stats'),
			http.get(API_CONFIG.API.FINANCIAL_OVERVIEW || '/api/financial/overview', { periodType: 'daily' })
		]);

		if (statsRes.status === 'fulfilled') {
			onlineRiderCount.value = safeCount(statsRes.value?.onlineRiderCount);
			pendingOrdersCount.value = safeCount(statsRes.value?.pendingOrdersCount);
		} else {
			errors.push(getErrorMessage(statsRes.reason, '统计数据加载失败'));
		}

		if (financialRes.status === 'fulfilled') {
			todayTurnoverFen.value = safeMoney(financialRes.value?.totalTransactionAmount);
			todayProfitFen.value = safeMoney(financialRes.value?.platformRevenue);
		} else {
			errors.push(getErrorMessage(financialRes.reason, '财务数据加载失败'));
		}
	} finally {
		loading.value = false;
		loadError.value = errors.length > 0 ? errors[0] : '';
	}
}

function loadLocalSettings() {
	biometric.value = parseBoolean(uni.getStorageSync(SETTING_KEYS.BIO_AUTH), false);
	notifications.value = parseBoolean(uni.getStorageSync(SETTING_KEYS.NOTIFY), true);
	autoRefresh.value = parseBoolean(uni.getStorageSync(SETTING_KEYS.AUTO_REFRESH), true);
}

async function loadServiceSettings() {
	try {
		const data = await http.get(API_CONFIG.API.SERVICE_SETTINGS || '/api/service-settings');
		serviceSettings.value = data && typeof data === 'object' ? data : {};

		notifications.value = parseBoolean(
			resolveSettingValue(serviceSettings.value, ['admin_notify_enabled', 'notify_enabled']),
			notifications.value
		);
		autoRefresh.value = parseBoolean(
			resolveSettingValue(serviceSettings.value, ['admin_auto_refresh_enabled', 'auto_refresh_enabled']),
			autoRefresh.value
		);
		persistToggleToLocal();
	} catch (err) {
		// keep local values
	}
}

function toggleBiometric() {
	if (!biometric.value) {
		uni.startSoterAuthentication({
			requestAuthModes: ['fingerPrint', 'facial'],
			challenge: 'enable_bio_auth',
			authContent: '验证指纹或面容以启用生物识别登录',
			success: () => {
				biometric.value = true;
				uni.setStorageSync(SETTING_KEYS.BIO_AUTH, 'true');
				uni.showToast({ title: '已启用生物识别', icon: 'success' });
			},
			fail: () => {
				biometric.value = false;
				uni.setStorageSync(SETTING_KEYS.BIO_AUTH, 'false');
				uni.showToast({ title: '验证失败', icon: 'none' });
			}
		});
		return;
	}

	biometric.value = false;
	uni.setStorageSync(SETTING_KEYS.BIO_AUTH, 'false');
	uni.showToast({ title: '已关闭生物识别', icon: 'none' });
}

async function toggleNotifications() {
	const previous = notifications.value;
	const next = !previous;
	notifications.value = next;
	uni.setStorageSync(SETTING_KEYS.NOTIFY, next ? 'true' : 'false');

	const ok = await saveServiceSettings({ admin_notify_enabled: next });
	if (!ok) {
		notifications.value = previous;
		uni.setStorageSync(SETTING_KEYS.NOTIFY, previous ? 'true' : 'false');
	}
}

async function toggleAutoRefresh() {
	const previous = autoRefresh.value;
	const next = !previous;
	autoRefresh.value = next;
	uni.setStorageSync(SETTING_KEYS.AUTO_REFRESH, next ? 'true' : 'false');

	const ok = await saveServiceSettings({ admin_auto_refresh_enabled: next });
	if (!ok) {
		autoRefresh.value = previous;
		uni.setStorageSync(SETTING_KEYS.AUTO_REFRESH, previous ? 'true' : 'false');
	}
}

async function saveServiceSettings(patch) {
	const next = { ...(serviceSettings.value || {}), ...(patch || {}) };
	try {
		await http.post(API_CONFIG.API.SERVICE_SETTINGS || '/api/service-settings', next);
		serviceSettings.value = next;
		return true;
	} catch (err) {
		uni.showToast({ title: getErrorMessage(err, '保存失败'), icon: 'none' });
		return false;
	}
}

function persistToggleToLocal() {
	uni.setStorageSync(SETTING_KEYS.NOTIFY, notifications.value ? 'true' : 'false');
	uni.setStorageSync(SETTING_KEYS.AUTO_REFRESH, autoRefresh.value ? 'true' : 'false');
}

async function clearAppCache() {
	const confirmed = await confirmAction('清理缓存', '将清除临时缓存，登录状态和核心设置会保留。是否继续？');
	if (!confirmed) return;

	const keepKeys = new Set([
		API_CONFIG.TOKEN_KEY,
		API_CONFIG.USER_KEY,
		AUTH_STORAGE_KEYS.SESSION_KEY,
		AUTH_STORAGE_KEYS.BIO_CONFIG_KEY,
		AUTH_STORAGE_KEYS.BIO_FAIL_STATE_KEY,
		AUTH_STORAGE_KEYS.BIO_APP_LOCK_KEY,
		SETTING_KEYS.BIO_AUTH,
		SETTING_KEYS.NOTIFY,
		SETTING_KEYS.AUTO_REFRESH,
		'socket_token',
		'socket_token_account_key'
	]);

	try {
		const info = uni.getStorageInfoSync();
		const keys = Array.isArray(info?.keys) ? info.keys : [];
		keys.forEach((key) => {
			if (!keepKeys.has(String(key))) {
				uni.removeStorageSync(key);
			}
		});
		refreshCacheSize();
		uni.showToast({ title: '缓存已清除', icon: 'none' });
	} catch (err) {
		uni.showToast({ title: '清理失败，请重试', icon: 'none' });
	}
}

function refreshCacheSize() {
	try {
		const info = uni.getStorageInfoSync();
		cacheSizeText.value = formatCacheSize(Number(info?.currentSize || 0));
	} catch (err) {
		cacheSizeText.value = '--';
	}
}

function goArticle(type) {
	const safeType = encodeURIComponent(String(type || 'agreement'));
	uni.navigateTo({
		url: `/pages/settings-article/settings-article?type=${safeType}`
	});
}

async function logout() {
	const confirmed = await confirmAction('退出登录', '确认退出当前账号吗？');
	if (!confirmed) return;
	clearAuthSession({ keepBiometric: true });
	redirectToLogin('已退出登录');
}

function resolveAppVersion() {
	try {
		const accountInfo = typeof uni.getAccountInfoSync === 'function' ? uni.getAccountInfoSync() : null;
		const versionText = String(accountInfo?.miniProgram?.version || accountInfo?.version || '').trim();
		if (versionText) {
			appVersion.value = `v${versionText}`;
		}
	} catch (err) {
		// ignore
	}
}

function safeMoney(raw) {
	const num = Number(raw);
	if (!Number.isFinite(num)) return 0;
	return Math.round(num);
}

function safeCount(raw) {
	const num = Number(raw);
	if (!Number.isFinite(num)) return 0;
	return Math.max(0, Math.round(num));
}

function formatMoneyFen(fen) {
	const num = Number(fen || 0);
	if (!Number.isFinite(num)) return '¥0.00';
	return `¥${(num / 100).toFixed(2)}`;
}

function formatCount(value) {
	return String(safeCount(value));
}

function formatCacheSize(sizeKB) {
	if (!Number.isFinite(sizeKB) || sizeKB < 0) return '--';
	if (sizeKB >= 1024) return `${(sizeKB / 1024).toFixed(2)} MB`;
	return `${Math.round(sizeKB)} KB`;
}

function parseBoolean(raw, fallback = false) {
	if (typeof raw === 'boolean') return raw;
	if (typeof raw === 'number') return raw !== 0;
	const text = String(raw || '').trim().toLowerCase();
	if (['1', 'true', 'yes', 'y'].includes(text)) return true;
	if (['0', 'false', 'no', 'n'].includes(text)) return false;
	if (text === '') return fallback;
	return fallback;
}

function resolveSettingValue(payload, keys) {
	if (!payload || typeof payload !== 'object') return undefined;
	for (const key of keys) {
		if (Object.prototype.hasOwnProperty.call(payload, key)) {
			return payload[key];
		}
	}
	return undefined;
}

function getErrorMessage(err, fallback = '加载失败') {
	const message = String(err?.message || '').trim();
	return message || fallback;
}

function confirmAction(title, content) {
	return new Promise((resolve) => {
		uni.showModal({
			title,
			content,
			success: (res) => resolve(Boolean(res.confirm)),
			fail: () => resolve(false)
		});
	});
}
</script>

<style src="./profile.css"></style>
