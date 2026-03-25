<template>
	<view class="page-container">
		<view class="topbar">
			<view class="back-btn" @click="goBack">‹</view>
			<text class="title">用户邀请</text>
		</view>

		<scroll-view scroll-y class="content-scroll">
			<view class="panel">
				<text class="panel-title">邀请类型</text>
				<view class="type-grid">
					<view
						v-for="inviteType in inviteTypes"
						:key="inviteType.key"
						class="type-item"
						:class="{ active: selectedType === inviteType.key }"
						@click="selectedType = inviteType.key"
					>
						{{ inviteType.label }}
					</view>
				</view>
			</view>

			<view class="panel config-panel">
				<view class="config-row">
					<text class="cfg-label">有效期</text>
					<input class="cfg-input" v-model.trim="inviteForm.expiresHours" type="number" />
					<text class="cfg-unit">小时</text>
				</view>
				<view class="config-row">
					<text class="cfg-label">可用次数</text>
					<input class="cfg-input" v-model.trim="inviteForm.maxUses" type="number" />
					<text class="cfg-unit">次</text>
				</view>
			</view>

			<view class="link-panel">
				<text class="link-title">邀请链接</text>
				<text class="link-text">{{ currentInvite.invite_url || '尚未生成邀请链接' }}</text>
				<text v-if="currentInvite.invite_url" class="link-meta">
					剩余 {{ currentRemaining }} 次 · 过期 {{ formatDateTime(currentInvite.expires_at) }}
				</text>
			</view>

			<view class="action-row">
				<view class="copy-btn" @click="copyInviteLink(selectedType)">复制链接</view>
				<view class="gen-btn" @click="generateInviteLink(selectedType)">
					{{ inviteLoading[selectedType] ? '生成中...' : '生成并复制链接' }}
				</view>
			</view>
		</scroll-view>
	</view>
</template>

<script setup>
import { computed, reactive, ref } from 'vue';
import { onLoad, onShow } from '@dcloudio/uni-app';
import { THEMES } from '@/common/data.js';
import { ensureAuthenticated } from '@/utils/auth.js';
import { http } from '@/utils/request.js';

const theme = ref(THEMES.nebula);
const authed = ref(false);

const inviteTypes = [
	{ key: 'old_user', label: '老用户邀请', desc: '唤醒沉默用户重新回流' },
	{ key: 'rider', label: '骑手邀请', desc: '快速发放骑手入职链接' },
	{ key: 'merchant', label: '商户邀请', desc: '用于商户入驻申请入口' }
];

const selectedType = ref('old_user');

const inviteForm = reactive({
	expiresHours: '72',
	maxUses: '1'
});

const inviteLoading = reactive({
	old_user: false,
	rider: false,
	merchant: false
});

const inviteState = reactive({
	old_user: createInviteState(),
	rider: createInviteState(),
	merchant: createInviteState()
});

const currentInvite = computed(() => inviteState[selectedType.value] || createInviteState());

const currentRemaining = computed(() => formatRemaining(selectedType.value));

onLoad(async () => {
	authed.value = await ensureAuthenticated({ verifyRemote: true });
});

onShow(async () => {
	if (!authed.value) {
		authed.value = await ensureAuthenticated({ verifyRemote: true });
	}
});

function goBack() {
	uni.navigateBack();
}

function createInviteState() {
	return {
		invite_url: '',
		expires_at: '',
		max_uses: 1,
		used_count: 0,
		remaining_uses: 1
	};
}

function showToast(message) {
	uni.showToast({ title: String(message || ''), icon: 'none' });
}

function normalizePositiveInt(value, fallback) {
	const num = Number(value);
	if (!Number.isFinite(num) || num <= 0) return fallback;
	return Math.floor(num);
}

async function generateInviteLink(type) {
	if (!authed.value || !inviteState[type]) return;
	if (inviteLoading[type]) return;

	inviteLoading[type] = true;
	try {
		const expiresHours = normalizePositiveInt(inviteForm.expiresHours, 72);
		const maxUses = normalizePositiveInt(inviteForm.maxUses, 1);
		const response = await http.post('/api/admin/onboarding/invites', {
			invite_type: type,
			expires_hours: expiresHours,
			max_uses: maxUses
		});
		const payload = response && response.data ? response.data : {};
		Object.assign(inviteState[type], {
			invite_url: payload.invite_url || '',
			expires_at: payload.expires_at || '',
			max_uses: Number(payload.max_uses || maxUses),
			used_count: Number(payload.used_count || 0),
			remaining_uses: Number(payload.remaining_uses || 0)
		});

		if (inviteState[type].invite_url) {
			copyInviteLink(type);
			showToast('邀请链接已生成并复制');
		} else {
			showToast('邀请链接生成失败');
		}
	} catch (err) {
		showToast(err && err.message ? err.message : '邀请链接生成失败');
	} finally {
		inviteLoading[type] = false;
	}
}

function copyInviteLink(type) {
	const link = inviteState[type] && inviteState[type].invite_url ? String(inviteState[type].invite_url) : '';
	if (!link) {
		showToast('请先生成邀请链接');
		return;
	}
	uni.setClipboardData({
		data: link,
		success: () => showToast('邀请链接已复制'),
		fail: () => showToast('复制失败，请手动复制')
	});
}

function formatDateTime(value) {
	if (!value) return '-';
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return String(value);
	const pad = num => String(num).padStart(2, '0');
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatRemaining(type) {
	const state = inviteState[type];
	if (!state) return 0;
	const remaining = Number(state.remaining_uses);
	if (Number.isFinite(remaining)) return Math.max(0, remaining);
	const maxUses = Number(state.max_uses || 1);
	const usedCount = Number(state.used_count || 0);
	return Math.max(0, maxUses - usedCount);
}
</script>

<style>
.page-container {
	height: 100vh;
	background: #f3f4f6;
	display: flex;
	flex-direction: column;
}

.topbar {
	height: 104rpx;
	padding: 36rpx 20rpx 0;
	display: flex;
	align-items: center;
	background: #ffffff;
	box-shadow: 0 2rpx 12rpx rgba(15, 23, 42, 0.04);
}

.back-btn {
	width: 64rpx;
	height: 64rpx;
	border-radius: 999rpx;
	background: #f3f4f6;
	font-size: 52rpx;
	line-height: 56rpx;
	color: #374151;
	display: flex;
	align-items: center;
	justify-content: center;
	margin-right: 12rpx;
}

.title {
	font-size: 34rpx;
	font-weight: 700;
	color: #111827;
}

.content-scroll {
	flex: 1;
	height: 0;
	padding: 20rpx;
}

.panel {
	background: #ffffff;
	border-radius: 20rpx;
	padding: 18rpx;
	box-shadow: 0 8rpx 22rpx rgba(15, 23, 42, 0.05);
	margin-bottom: 12rpx;
}

.panel-title {
	display: block;
	font-size: 24rpx;
	color: #6b7280;
	margin-bottom: 10rpx;
}

.type-grid {
	display: grid;
	grid-template-columns: repeat(3, minmax(0, 1fr));
	gap: 10rpx;
}

.type-item {
	height: 72rpx;
	border-radius: 14rpx;
	background: #f3f4f6;
	color: #6b7280;
	font-size: 23rpx;
	font-weight: 600;
	display: flex;
	align-items: center;
	justify-content: center;
	text-align: center;
	padding: 0 8rpx;
}

.type-item.active {
	background: #2563eb;
	color: #fff;
}

.config-panel {
	padding-top: 12rpx;
}

.config-row {
	height: 78rpx;
	display: flex;
	align-items: center;
	border-bottom: 1px solid #f3f4f6;
}

.config-row:last-child {
	border-bottom: none;
}

.cfg-label {
	width: 120rpx;
	font-size: 25rpx;
	color: #374151;
}

.cfg-input {
	flex: 1;
	height: 64rpx;
	border-radius: 12rpx;
	background: #f9fafb;
	font-size: 24rpx;
	padding: 0 14rpx;
	color: #111827;
}

.cfg-unit {
	width: 56rpx;
	text-align: right;
	font-size: 23rpx;
	color: #6b7280;
}

.link-panel {
	background: #ffffff;
	border-radius: 20rpx;
	padding: 18rpx;
	box-shadow: 0 8rpx 22rpx rgba(15, 23, 42, 0.05);
}

.link-title {
	display: block;
	font-size: 24rpx;
	color: #6b7280;
	margin-bottom: 10rpx;
}

.link-text {
	display: block;
	font-size: 23rpx;
	line-height: 1.5;
	color: #111827;
	word-break: break-all;
	overflow-wrap: anywhere;
}

.link-meta {
	display: block;
	margin-top: 8rpx;
	font-size: 22rpx;
	color: #9ca3af;
}

.action-row {
	margin-top: 18rpx;
	display: flex;
	gap: 12rpx;
}

.copy-btn,
.gen-btn {
	flex: 1;
	height: 84rpx;
	border-radius: 18rpx;
	font-size: 26rpx;
	font-weight: 700;
	display: flex;
	align-items: center;
	justify-content: center;
}

.copy-btn {
	background: #e5e7eb;
	color: #374151;
}

.gen-btn {
	background: #2563eb;
	color: #fff;
}
</style>
