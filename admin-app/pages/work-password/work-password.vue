<template>
	<view class="page-container">
		<view class="topbar">
			<view class="back-btn" @click="goBack">‹</view>
			<text class="title">密码找回</text>
		</view>

		<scroll-view scroll-y class="content-scroll">
			<view class="search-row">
				<input
					class="search-input"
					v-model.trim="recoverPhone"
					type="number"
					maxlength="11"
					placeholder="请输入手机号查询"
					placeholder-style="color:#9ca3af"
					@confirm="searchRecoverTargets"
				/>
				<view class="search-btn" @click="searchRecoverTargets">
					{{ recoverLoading ? '查询中' : '查询' }}
				</view>
			</view>

			<view v-if="recoverLoading" class="tip">正在检索账号...</view>
			<view v-else-if="recoverSearched && recoverMatches.length === 0" class="tip">未找到匹配账号</view>

			<view v-if="recoverMatches.length > 0" class="result-list">
				<text class="section-title">查询结果</text>
				<view v-for="item in recoverMatches" :key="item.key" class="result-card">
					<view class="result-main">
						<text class="line-title">用户 ID: {{ item.id || '-' }}</text>
						<text class="line-sub">账号类型: {{ item.roleLabel }}</text>
						<text class="line-sub">手机号: {{ item.phone || '-' }}</text>
					</view>
					<view
						class="reset-btn"
						:class="{ disabled: resettingKey === item.key }"
						@click="handleResetPassword(item)"
					>
						{{ resettingKey === item.key ? '重置中...' : '重置密码' }}
					</view>
				</view>
			</view>
		</scroll-view>
	</view>
</template>

<script setup>
import { ref } from 'vue';
import { onLoad, onPullDownRefresh, onShow } from '@dcloudio/uni-app';
import { THEMES } from '@/common/data.js';
import { ensureAuthenticated } from '@/utils/auth.js';
import { http } from '@/utils/request.js';

const theme = ref(THEMES.nebula);
const authed = ref(false);

const recoverPhone = ref('');
const recoverLoading = ref(false);
const recoverSearched = ref(false);
const recoverMatches = ref([]);
const resettingKey = ref('');

const roleLabelMap = {
	user: '用户端',
	rider: '骑手端',
	merchant: '商户端',
	admin: '管理端'
};

onLoad(async () => {
	authed.value = await ensureAuthenticated({ verifyRemote: true });
});

onShow(async () => {
	if (!authed.value) {
		authed.value = await ensureAuthenticated({ verifyRemote: true });
	}
});

onPullDownRefresh(async () => {
	if (!authed.value) {
		authed.value = await ensureAuthenticated({ verifyRemote: true });
	}
	if (authed.value && recoverSearched.value && recoverPhone.value) {
		await searchRecoverTargets();
	}
	uni.stopPullDownRefresh();
});

function goBack() {
	uni.navigateBack();
}

function extractList(payload, keys = []) {
	if (Array.isArray(payload)) return payload;
	if (!payload || typeof payload !== 'object') return [];
	for (const key of keys) {
		if (Array.isArray(payload[key])) return payload[key];
	}
	if (Array.isArray(payload.data)) return payload.data;
	return [];
}

function normalizeAccount(role, raw = {}) {
	const id = String(raw.id || raw.uid || raw.role_id || raw.legacyId || '').trim();
	const phone = String(raw.phone || '').trim();
	if (!id || !phone) return null;
	const name = String(raw.name || raw.owner_name || raw.nickname || raw.real_name || '').trim() || phone;
	return {
		key: `${role}:${id}`,
		role,
		roleLabel: roleLabelMap[role] || role,
		id,
		phone,
		name
	};
}

function showToast(message) {
	uni.showToast({ title: String(message || ''), icon: 'none' });
}

function withKeywordFilter(items, keyword) {
	const text = String(keyword || '').trim();
	if (!text) return items;
	return items.filter(item => String(item.phone || '').includes(text) || String(item.id || '').includes(text));
}

function showConfirmModal({ title, content, showCancel = true }) {
	return new Promise(resolve => {
		uni.showModal({
			title: title || '提示',
			content: content || '',
			showCancel,
			success: res => resolve(res),
			fail: () => resolve({ confirm: false, cancel: true })
		});
	});
}

async function searchRecoverTargets() {
	if (!authed.value) return;
	const keyword = String(recoverPhone.value || '').replace(/\s+/g, '');
	if (keyword.length < 3) {
		showToast('请输入至少 3 位手机号进行匹配');
		return;
	}

	recoverLoading.value = true;
	recoverSearched.value = true;
	try {
		const [usersRes, ridersRes, merchantsRes, adminsRes] = await Promise.allSettled([
			http.get('/api/users', { search: keyword, page: 1, limit: 30 }),
			http.get('/api/riders', { search: keyword, page: 1, limit: 30 }),
			http.get('/api/merchants', { search: keyword, page: 1, limit: 30 }),
			http.get('/api/admins')
		]);

		const users = usersRes.status === 'fulfilled' ? extractList(usersRes.value, ['users']) : [];
		const riders = ridersRes.status === 'fulfilled' ? extractList(ridersRes.value, ['riders']) : [];
		const merchants = merchantsRes.status === 'fulfilled' ? extractList(merchantsRes.value, ['merchants']) : [];
		const admins = adminsRes.status === 'fulfilled' ? extractList(adminsRes.value) : [];

		const merged = []
			.concat(users.map(item => normalizeAccount('user', item)))
			.concat(riders.map(item => normalizeAccount('rider', item)))
			.concat(merchants.map(item => normalizeAccount('merchant', item)))
			.concat(admins.map(item => normalizeAccount('admin', item)))
			.filter(Boolean);

		const uniqueMap = {};
		for (const item of merged) {
			uniqueMap[item.key] = item;
		}
		recoverMatches.value = withKeywordFilter(Object.values(uniqueMap), keyword);
	} catch (err) {
		showToast(err && err.message ? err.message : '账号检索失败');
	} finally {
		recoverLoading.value = false;
	}
}

function resetPasswordPath(account) {
	switch (account.role) {
		case 'user':
			return `/api/users/${encodeURIComponent(account.id)}/reset-password`;
		case 'rider':
			return `/api/riders/${encodeURIComponent(account.id)}/reset-password`;
		case 'merchant':
			return `/api/merchants/${encodeURIComponent(account.id)}/reset-password`;
		case 'admin':
			return `/api/admins/${encodeURIComponent(account.id)}/reset-password`;
		default:
			return '';
	}
}

async function handleResetPassword(account) {
	if (resettingKey.value) return;
	const apiPath = resetPasswordPath(account);
	if (!apiPath) {
		showToast('当前账号不支持重置');
		return;
	}

	const confirmRes = await showConfirmModal({
		title: '确认重置密码',
		content: '此操作将会重置密码，确认继续吗？'
	});
	if (!confirmRes.confirm) return;

	resettingKey.value = account.key;
	try {
		const response = await http.post(apiPath, {});
		const newPassword = String(response && response.newPassword ? response.newPassword : '123456');
		await showConfirmModal({
			title: '重置成功',
			content: `账号 ${account.phone} 的密码已重置为 ${newPassword}`,
			showCancel: false
		});
	} catch (err) {
		showToast(err && err.message ? err.message : '重置密码失败');
	} finally {
		resettingKey.value = '';
	}
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

.search-row {
	display: flex;
	gap: 12rpx;
	margin-bottom: 18rpx;
}

.search-input {
	flex: 1;
	height: 88rpx;
	border-radius: 18rpx;
	background: #ffffff;
	padding: 0 20rpx;
	font-size: 28rpx;
	color: #111827;
	border: 1px solid #e5e7eb;
}

.search-btn {
	width: 140rpx;
	height: 88rpx;
	border-radius: 18rpx;
	background: #2563eb;
	color: #fff;
	font-size: 26rpx;
	font-weight: 700;
	display: flex;
	align-items: center;
	justify-content: center;
}

.tip {
	font-size: 24rpx;
	color: #9ca3af;
	padding: 8rpx 6rpx;
}

.section-title {
	display: block;
	font-size: 24rpx;
	color: #6b7280;
	margin: 6rpx 4rpx 12rpx;
}

.result-list {
	padding-bottom: 14rpx;
}

.result-card {
	background: #ffffff;
	border-radius: 20rpx;
	padding: 18rpx;
	margin-bottom: 12rpx;
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 14rpx;
	box-shadow: 0 8rpx 22rpx rgba(15, 23, 42, 0.05);
}

.result-main {
	flex: 1;
	min-width: 0;
}

.line-title {
	display: block;
	font-size: 27rpx;
	font-weight: 700;
	color: #111827;
}

.line-sub {
	display: block;
	margin-top: 8rpx;
	font-size: 23rpx;
	color: #6b7280;
}

.reset-btn {
	width: 150rpx;
	height: 64rpx;
	border-radius: 14rpx;
	background: #fee2e2;
	color: #dc2626;
	font-size: 23rpx;
	font-weight: 700;
	display: flex;
	align-items: center;
	justify-content: center;
}

.reset-btn.disabled {
	opacity: 0.55;
}
</style>
