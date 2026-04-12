<template>
	<view class="page-container" :style="{ background: theme.bgGradient }">
		<view class="header">
			<text class="back-btn" :style="{ color: theme.text }" @click="goBack">‹</text>
			<text class="page-title" :style="{ color: theme.text }">设置</text>
			<view class="header-gap" />
		</view>

		<scroll-view scroll-y class="content-scroll">
			<view class="section">
				<text class="section-title" :style="{ color: theme.textSub }">账号与安全</text>
				<view class="group glass-panel" :style="{ borderColor: theme.border }">
					<view class="setting-item">
						<view class="item-main">
							<text class="item-label" :style="{ color: theme.text }">登录手机号</text>
							<text class="item-sub" :style="{ color: theme.textSub }">{{ adminPhoneDisplay }}</text>
						</view>
					</view>
					<view class="item-divider" />
					<view class="setting-item setting-clickable" @click="openPasswordPanel">
						<view class="item-main">
							<text class="item-label" :style="{ color: theme.text }">修改登录密码</text>
							<text class="item-sub" :style="{ color: theme.textSub }">使用当前密码验证后更新</text>
						</view>
						<text class="item-arrow">›</text>
					</view>
					<view class="item-divider" />
					<view class="setting-item">
						<view class="item-main">
							<text class="item-label" :style="{ color: theme.text }">生物识别登录</text>
							<text class="item-sub" :style="{ color: theme.textSub }">指纹/面容快捷登录</text>
						</view>
						<switch :checked="bioAuth" @change="toggleBioAuth" color="#60a5fa" />
					</view>
				</view>
			</view>

			<view class="section">
				<text class="section-title" :style="{ color: theme.textSub }">通知与偏好</text>
				<view class="group glass-panel" :style="{ borderColor: theme.border }">
					<view class="setting-item">
						<view class="item-main">
							<text class="item-label" :style="{ color: theme.text }">消息通知</text>
							<text class="item-sub" :style="{ color: theme.textSub }">保存到平台设置并立即生效</text>
						</view>
						<switch :checked="notifyEnabled" @change="toggleNotify" color="#34d399" />
					</view>
					<view class="item-divider" />
					<view class="setting-item">
						<view class="item-main">
							<text class="item-label" :style="{ color: theme.text }">自动刷新数据</text>
							<text class="item-sub" :style="{ color: theme.textSub }">控制洞察页 20 秒自动刷新</text>
						</view>
						<switch :checked="autoRefreshEnabled" @change="toggleAutoRefresh" color="#34d399" />
					</view>
				</view>
			</view>

			<view class="section">
				<text class="section-title" :style="{ color: theme.textSub }">通用</text>
				<view class="group glass-panel" :style="{ borderColor: theme.border }">
					<view class="setting-item setting-clickable" @click="clearAppCache">
						<view class="item-main">
							<text class="item-label" :style="{ color: theme.text }">清理缓存</text>
							<text class="item-sub" :style="{ color: theme.textSub }">当前缓存 {{ cacheSizeText }}</text>
						</view>
						<text class="item-arrow">›</text>
					</view>
				</view>
			</view>

			<view class="section">
				<text class="section-title" :style="{ color: theme.textSub }">关于</text>
				<view class="group glass-panel" :style="{ borderColor: theme.border }">
					<view class="setting-item">
						<view class="item-main">
							<text class="item-label" :style="{ color: theme.text }">版本号</text>
							<text class="item-sub" :style="{ color: theme.textSub }">{{ appVersion }}</text>
						</view>
					</view>
					<view class="item-divider" />
					<view class="setting-item setting-clickable" @click="goArticle('agreement')">
						<view class="item-main">
							<text class="item-label" :style="{ color: theme.text }">用户协议</text>
						</view>
						<text class="item-arrow">›</text>
					</view>
					<view class="item-divider" />
					<view class="setting-item setting-clickable" @click="goArticle('privacy')">
						<view class="item-main">
							<text class="item-label" :style="{ color: theme.text }">隐私政策</text>
						</view>
						<text class="item-arrow">›</text>
					</view>
					<view class="item-divider" />
					<view class="setting-item setting-clickable" @click="goArticle('about')">
						<view class="item-main">
							<text class="item-label" :style="{ color: theme.text }">关于悦享e食</text>
						</view>
						<text class="item-arrow">›</text>
					</view>
				</view>
			</view>

			<view class="section">
				<text class="section-title" :style="{ color: theme.textSub }">账号</text>
				<view class="group glass-panel" :style="{ borderColor: theme.border }">
					<view class="setting-item setting-clickable" @click="logout">
						<view class="item-main">
							<text class="item-label danger-text">退出登录</text>
						</view>
						<text class="item-arrow">›</text>
					</view>
				</view>
			</view>
		</scroll-view>

		<view v-if="showPasswordPanel" class="panel-mask" @click="closePasswordPanel">
			<view class="password-panel glass-panel" :style="{ borderColor: theme.border }" @click.stop>
				<view class="panel-head">
					<text class="panel-title" :style="{ color: theme.text }">修改登录密码</text>
					<text class="panel-close" :style="{ color: theme.textSub }" @click="closePasswordPanel">×</text>
				</view>
				<view class="panel-body">
					<view class="form-item">
						<text class="form-label" :style="{ color: theme.textSub }">当前密码</text>
						<input
							v-model="passwordForm.currentPassword"
							class="form-input"
							password
							placeholder="请输入当前密码"
							placeholder-style="color:#94a3b8"
						/>
					</view>
					<view class="form-item">
						<text class="form-label" :style="{ color: theme.textSub }">新密码</text>
						<input
							v-model="passwordForm.newPassword"
							class="form-input"
							password
							placeholder="请输入新密码（至少6位）"
							placeholder-style="color:#94a3b8"
						/>
					</view>
					<view class="form-item">
						<text class="form-label" :style="{ color: theme.textSub }">确认新密码</text>
						<input
							v-model="passwordForm.confirmPassword"
							class="form-input"
							password
							placeholder="请再次输入新密码"
							placeholder-style="color:#94a3b8"
						/>
					</view>
				</view>
				<view class="panel-foot">
					<view class="foot-btn" @click="closePasswordPanel">取消</view>
					<view
						class="foot-btn primary"
						:class="{ disabled: passwordSaving }"
						@click="submitPasswordChange"
					>
						{{ passwordSaving ? '保存中...' : '保存' }}
					</view>
				</view>
			</view>
		</view>
	</view>
</template>

<script setup>
import { computed, reactive, ref } from 'vue';
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
import {
	parseBoolean,
	resolveSettingValue,
	getErrorMessage,
	formatCacheSize,
	confirmAction
} from './settings-helpers.js';

const theme = ref(THEMES.nebula);
const bioAuth = ref(false);
const notifyEnabled = ref(true);
const autoRefreshEnabled = ref(true);
const cacheSizeText = ref('0 KB');
const appVersion = ref('v1.0.1');
const adminPhone = ref('');
const serviceSettings = ref({});

const showPasswordPanel = ref(false);
const passwordSaving = ref(false);
const passwordForm = reactive({
	currentPassword: '',
	newPassword: '',
	confirmPassword: ''
});

const SETTING_KEYS = {
	BIO_AUTH: 'bio_auth_enabled',
	NOTIFY: 'admin_notify_enabled',
	AUTO_REFRESH: 'admin_auto_refresh_enabled'
};

const adminPhoneDisplay = computed(() => {
	return String(adminPhone.value || '').trim() || '--';
});

onLoad(async () => {
	const authed = await ensureAuthenticated({ verifyRemote: true });
	if (!authed) return;
	loadProfile();
	loadLocalSettings();
	await loadServiceSettings();
	refreshCacheSize();
	resolveAppVersion();
});

onShow(async () => {
	const authed = await ensureAuthenticated({ verifyRemote: true });
	if (!authed) return;
	loadProfile();
	loadLocalSettings();
	refreshCacheSize();
});

function loadProfile() {
	const user = getAuthUser();
	adminPhone.value = String(user?.phone || '').trim();
}

function loadLocalSettings() {
	bioAuth.value = parseBoolean(uni.getStorageSync(SETTING_KEYS.BIO_AUTH), false);
	notifyEnabled.value = parseBoolean(uni.getStorageSync(SETTING_KEYS.NOTIFY), true);
	autoRefreshEnabled.value = parseBoolean(uni.getStorageSync(SETTING_KEYS.AUTO_REFRESH), true);
}

async function loadServiceSettings() {
	try {
		const data = await http.get(API_CONFIG.API.SERVICE_SETTINGS || '/api/service-settings');
		serviceSettings.value = data && typeof data === 'object' ? data : {};

		notifyEnabled.value = parseBoolean(
			resolveSettingValue(serviceSettings.value, ['admin_notify_enabled', 'notify_enabled']),
			notifyEnabled.value
		);
		autoRefreshEnabled.value = parseBoolean(
			resolveSettingValue(serviceSettings.value, ['admin_auto_refresh_enabled', 'auto_refresh_enabled']),
			autoRefreshEnabled.value
		);
		persistToggleToLocal();
	} catch (err) {
		// 使用本地配置兜底
	}
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

function toggleBioAuth(e) {
	const enabled = Boolean(e?.detail?.value);
	if (enabled) {
		uni.startSoterAuthentication({
			requestAuthModes: ['fingerPrint', 'facial'],
			challenge: 'enable_bio_auth',
			authContent: '验证指纹或面容以启用生物识别登录',
			success: () => {
				bioAuth.value = true;
				uni.setStorageSync(SETTING_KEYS.BIO_AUTH, 'true');
				uni.showToast({ title: '已启用生物识别', icon: 'success' });
			},
			fail: () => {
				bioAuth.value = false;
				uni.setStorageSync(SETTING_KEYS.BIO_AUTH, 'false');
				uni.showToast({ title: '验证失败', icon: 'none' });
			}
		});
		return;
	}

	bioAuth.value = false;
	uni.setStorageSync(SETTING_KEYS.BIO_AUTH, 'false');
	uni.showToast({ title: '已关闭生物识别', icon: 'none' });
}

async function toggleNotify(e) {
	const previous = notifyEnabled.value;
	const enabled = Boolean(e?.detail?.value);
	notifyEnabled.value = enabled;
	uni.setStorageSync(SETTING_KEYS.NOTIFY, enabled ? 'true' : 'false');

	const ok = await saveServiceSettings({ admin_notify_enabled: enabled });
	if (!ok) {
		notifyEnabled.value = previous;
		uni.setStorageSync(SETTING_KEYS.NOTIFY, previous ? 'true' : 'false');
	}
}

async function toggleAutoRefresh(e) {
	const previous = autoRefreshEnabled.value;
	const enabled = Boolean(e?.detail?.value);
	autoRefreshEnabled.value = enabled;
	uni.setStorageSync(SETTING_KEYS.AUTO_REFRESH, enabled ? 'true' : 'false');

	const ok = await saveServiceSettings({ admin_auto_refresh_enabled: enabled });
	if (!ok) {
		autoRefreshEnabled.value = previous;
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
	uni.setStorageSync(SETTING_KEYS.NOTIFY, notifyEnabled.value ? 'true' : 'false');
	uni.setStorageSync(SETTING_KEYS.AUTO_REFRESH, autoRefreshEnabled.value ? 'true' : 'false');
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
		uni.showToast({ title: '缓存已清理', icon: 'success' });
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

function openPasswordPanel() {
	passwordForm.currentPassword = '';
	passwordForm.newPassword = '';
	passwordForm.confirmPassword = '';
	showPasswordPanel.value = true;
}

function closePasswordPanel() {
	if (passwordSaving.value) return;
	showPasswordPanel.value = false;
}

async function submitPasswordChange() {
	if (passwordSaving.value) return;

	const currentPassword = String(passwordForm.currentPassword || '');
	const newPassword = String(passwordForm.newPassword || '');
	const confirmPassword = String(passwordForm.confirmPassword || '');

	if (!currentPassword.trim()) {
		uni.showToast({ title: '请输入当前密码', icon: 'none' });
		return;
	}
	if (!newPassword.trim()) {
		uni.showToast({ title: '请输入新密码', icon: 'none' });
		return;
	}
	if (newPassword.trim().length < 6) {
		uni.showToast({ title: '新密码至少 6 位', icon: 'none' });
		return;
	}
	if (newPassword !== confirmPassword) {
		uni.showToast({ title: '两次输入的新密码不一致', icon: 'none' });
		return;
	}
	if (currentPassword === newPassword) {
		uni.showToast({ title: '新密码不能与当前密码相同', icon: 'none' });
		return;
	}

	passwordSaving.value = true;
	try {
		await http.post(API_CONFIG.API.CHANGE_ADMIN_PASSWORD || '/api/admins/change-password', {
			currentPassword,
			newPassword,
			confirmPassword
		});
		uni.showToast({ title: '密码已修改，请重新登录', icon: 'none' });
		showPasswordPanel.value = false;
		passwordForm.currentPassword = '';
		passwordForm.newPassword = '';
		passwordForm.confirmPassword = '';
		setTimeout(() => {
			clearAuthSession({ keepBiometric: true });
			redirectToLogin('请使用新密码重新登录');
		}, 700);
	} catch (err) {
		uni.showToast({ title: getErrorMessage(err, '修改密码失败'), icon: 'none' });
	} finally {
		passwordSaving.value = false;
	}
}

async function logout() {
	const confirmed = await confirmAction('退出登录', '确认退出当前账号吗？');
	if (!confirmed) return;
	clearAuthSession({ keepBiometric: true });
	redirectToLogin('已退出登录');
}

function goBack() {
	const pages = typeof getCurrentPages === 'function' ? getCurrentPages() : [];
	if (pages.length > 1) {
		uni.navigateBack({ delta: 1 });
		return;
	}
	uni.switchTab({ url: '/pages/profile/profile' });
}

</script>

<style src="./settings.css"></style>
