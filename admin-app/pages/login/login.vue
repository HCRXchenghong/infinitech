<template>
	<view class="page">
		<view class="logo-wrap">
			<view class="logo-box">悦</view>
			<text class="app-title">悦享e食</text>
			<text class="app-sub">商家与管理协作平台</text>
		</view>

		<view class="tabs">
			<view
				:class="['tab-btn', { active: loginType === 'password' }]"
				@click="loginType = 'password'"
			>
				密码登录
			</view>
			<view
				:class="['tab-btn', { active: loginType === 'code' }]"
				@click="loginType = 'code'"
			>
				验证码登录
			</view>
		</view>

		<view class="form-wrap">
			<view class="input-row">
				<text class="input-icon">📱</text>
				<input
					v-model.trim="phone"
					type="number"
					maxlength="11"
					placeholder="请输入手机号"
					class="input"
					placeholder-style="color:#9ca3af"
				/>
			</view>

			<view v-if="loginType === 'password'" class="input-row">
				<text class="input-icon">🔒</text>
				<input
					v-model="password"
					password
					placeholder="请输入密码"
					class="input"
					placeholder-style="color:#9ca3af"
				/>
			</view>

			<view v-else class="code-row">
				<view class="input-row code-input-row">
					<text class="input-icon">🛡️</text>
					<input
						v-model.trim="code"
						type="number"
						maxlength="6"
						placeholder="验证码"
						class="input"
						placeholder-style="color:#9ca3af"
					/>
				</view>
				<view class="code-btn" @click="sendCode">
					{{ countdown > 0 ? `${countdown}s` : '获取验证码' }}
				</view>
			</view>

			<text v-if="error" class="error-text">{{ error }}</text>

			<button class="login-btn" :loading="loading" @click="handleLogin">
				{{ loading ? '登录中...' : '登 录' }}
			</button>
		</view>

		<view class="bio-wrap">
			<text class="bio-tip">其他方式登录</text>
			<view class="bio-btn" @click="bioLogin">👆</view>
		</view>
	</view>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { http } from '@/utils/request.js';
import { API_CONFIG } from '@/utils/config.js';
import { db } from '@/utils/database.js';
import { saveAuthSession } from '@/utils/auth.js';

const phone = ref('');
const password = ref('');
const code = ref('');
const loginType = ref('password');
const loading = ref(false);
const error = ref('');
const countdown = ref(0);
let countdownTimer = null;

onMounted(async () => {
	try {
		await db.open();
	} catch (err) {
		console.error('数据库初始化失败:', err);
	}
});

onBeforeUnmount(() => {
	stopCountdown();
});

function stopCountdown() {
	if (!countdownTimer) return;
	clearInterval(countdownTimer);
	countdownTimer = null;
}

function startCountdown() {
	stopCountdown();
	countdown.value = 60;
	countdownTimer = setInterval(() => {
		countdown.value -= 1;
		if (countdown.value <= 0) {
			stopCountdown();
			countdown.value = 0;
		}
	}, 1000);
}

async function sendCode() {
	if (countdown.value > 0) return;
	error.value = '';
	const target = String(phone.value || '').trim();
	if (!/^1[3-9]\d{9}$/.test(target)) {
		error.value = '请输入正确手机号';
		return;
	}

	try {
		await http.post(API_CONFIG.API.SEND_SMS, {
			phone: target,
			scene: 'login'
		});
		startCountdown();
		uni.showToast({ title: '验证码已发送', icon: 'success' });
	} catch (err) {
		error.value = err && err.message ? err.message : '发送验证码失败';
	}
}

async function handleLogin() {
	if (loading.value) return;
	error.value = '';

	const targetPhone = String(phone.value || '').trim();
	if (!/^1[3-9]\d{9}$/.test(targetPhone)) {
		error.value = '请输入正确手机号';
		return;
	}

	const payload = {
		phone: targetPhone,
		loginType: loginType.value
	};

	if (loginType.value === 'password') {
		if (!password.value) {
			error.value = '请输入密码';
			return;
		}
		payload.password = password.value;
	} else {
		if (!code.value) {
			error.value = '请输入验证码';
			return;
		}
		payload.code = code.value;
	}

	loading.value = true;
	try {
		const data = await http.post(API_CONFIG.API.LOGIN, payload);
		if (!data || !data.token || !data.user) {
			error.value = '登录失败，请重试';
			return;
		}

		saveAuthSession(data.token, data.user, { source: loginType.value });
		uni.showToast({ title: '登录成功', icon: 'success' });
		setTimeout(() => {
			uni.switchTab({ url: '/pages/chat/chat' });
		}, 300);
	} catch (err) {
		error.value = err && err.message ? err.message : '登录失败';
	} finally {
		loading.value = false;
	}
}

function bioLogin() {
	uni.getStorage({
		key: 'bio_auth_enabled',
		success: (res) => {
			if (res.data !== 'true') {
				uni.showToast({ title: '请先在设置中启用生物识别', icon: 'none' });
				return;
			}

			uni.startSoterAuthentication({
				requestAuthModes: ['fingerPrint', 'facial'],
				challenge: 'bio_login',
				authContent: '验证指纹或面容以登录',
				success: async () => {
					try {
						const verify = await http.get(API_CONFIG.API.VERIFY_TOKEN || '/api/verify-token');
						if (verify && verify.valid) {
							uni.showToast({ title: '验证成功', icon: 'success' });
							setTimeout(() => {
								uni.switchTab({ url: '/pages/chat/chat' });
							}, 300);
							return;
						}
						uni.showToast({ title: '登录已过期，请重新登录', icon: 'none' });
					} catch (err) {
						uni.showToast({ title: '登录已过期，请重新登录', icon: 'none' });
					}
				},
				fail: () => {
					uni.showToast({ title: '验证失败', icon: 'none' });
				}
			});
		},
		fail: () => {
			uni.showToast({ title: '请先在设置中启用生物识别', icon: 'none' });
		}
	});
}
</script>

<style>
.page {
	min-height: 100vh;
	padding: 80rpx 48rpx 56rpx;
	background: linear-gradient(180deg, #f8fafc 0%, #f3f4f6 100%);
	display: flex;
	flex-direction: column;
}

.logo-wrap {
	margin-top: 50rpx;
	margin-bottom: 60rpx;
	display: flex;
	flex-direction: column;
	align-items: center;
}

.logo-box {
	width: 132rpx;
	height: 132rpx;
	border-radius: 28rpx;
	background: #2563eb;
	color: #fff;
	font-size: 60rpx;
	font-weight: 700;
	display: flex;
	align-items: center;
	justify-content: center;
	box-shadow: 0 16rpx 36rpx rgba(37, 99, 235, 0.28);
}

.app-title {
	margin-top: 24rpx;
	font-size: 46rpx;
	font-weight: 700;
	color: #111827;
}

.app-sub {
	margin-top: 10rpx;
	font-size: 24rpx;
	color: #6b7280;
}

.tabs {
	display: flex;
	border-bottom: 1px solid #e5e7eb;
	margin-bottom: 38rpx;
}

.tab-btn {
	position: relative;
	padding: 0 8rpx 18rpx;
	margin-right: 40rpx;
	font-size: 30rpx;
	font-weight: 600;
	color: #9ca3af;
}

.tab-btn.active {
	color: #2563eb;
}

.tab-btn.active::after {
	content: '';
	position: absolute;
	left: 0;
	right: 0;
	bottom: -2rpx;
	height: 4rpx;
	border-radius: 999rpx;
	background: #2563eb;
}

.form-wrap {
	flex: 1;
}

.input-row {
	height: 92rpx;
	padding: 0 24rpx;
	border-radius: 20rpx;
	background: #f9fafb;
	display: flex;
	align-items: center;
	margin-bottom: 22rpx;
	border: 1px solid #eef2f7;
}

.input-icon {
	font-size: 32rpx;
	margin-right: 14rpx;
}

.input {
	flex: 1;
	height: 100%;
	font-size: 28rpx;
	color: #111827;
}

.code-row {
	display: flex;
	gap: 12rpx;
	margin-bottom: 22rpx;
}

.code-input-row {
	flex: 1;
	margin-bottom: 0;
}

.code-btn {
	width: 180rpx;
	height: 92rpx;
	border-radius: 20rpx;
	background: #dbeafe;
	color: #1d4ed8;
	font-size: 24rpx;
	font-weight: 700;
	display: flex;
	align-items: center;
	justify-content: center;
}

.error-text {
	display: block;
	margin: 4rpx 8rpx 0;
	font-size: 24rpx;
	color: #dc2626;
}

.login-btn {
	margin-top: 26rpx;
	height: 92rpx;
	line-height: 92rpx;
	border-radius: 20rpx;
	background: #2563eb;
	color: #ffffff;
	font-size: 32rpx;
	font-weight: 700;
	border: none;
	box-shadow: 0 14rpx 32rpx rgba(37, 99, 235, 0.25);
}

.bio-wrap {
	padding-bottom: calc(18rpx + env(safe-area-inset-bottom));
	display: flex;
	flex-direction: column;
	align-items: center;
}

.bio-tip {
	font-size: 24rpx;
	color: #9ca3af;
	margin-bottom: 18rpx;
}

.bio-btn {
	width: 96rpx;
	height: 96rpx;
	border-radius: 999rpx;
	background: #eef2f7;
	color: #4b5563;
	font-size: 42rpx;
	display: flex;
	align-items: center;
	justify-content: center;
}
</style>
