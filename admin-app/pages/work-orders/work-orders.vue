<template>
	<view class="page-container">
		<view class="topbar">
			<view class="back-btn" @click="goBack">‹</view>
			<text class="title">订单查询</text>
		</view>

		<scroll-view scroll-y class="content-scroll">
			<view class="search-box">
				<input
					class="search-input"
					v-model.trim="orderKeyword"
					placeholder="输入手机号或用户ID..."
					placeholder-style="color:#9ca3af"
					@confirm="searchOrders"
				/>
				<view class="search-btn" @click="searchOrders">
					{{ orderLoading ? '查询中' : '查询' }}
				</view>
			</view>

			<view v-if="orderLoading" class="tip">正在查询订单...</view>
			<view v-else-if="orderSearched && orderList.length === 0" class="tip">未找到相关订单</view>

			<view v-if="orderList.length > 0" class="order-list">
				<text class="section-title">最新订单</text>
				<view v-for="order in orderList" :key="order.key" class="order-card">
					<view class="row-top">
						<text class="order-no">#{{ order.orderNo || order.id || '-' }}</text>
						<text class="status-pill" :class="statusClass(order.status)">{{ formatStatus(order.status) }}</text>
					</view>
					<text class="meta">用户ID：{{ order.userId || '-' }}</text>
					<text class="meta">用户手机号：{{ order.customerPhone || '-' }}</text>
					<text class="meta">骑手：{{ order.riderName || '-' }}{{ order.riderPhone ? ` (${order.riderPhone})` : '' }}</text>
					<view class="call-btn" :class="{ disabled: !order.riderPhone }" @click="callRider(order)">
						一键拨打骑手手机号
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

const orderKeyword = ref('');
const orderLoading = ref(false);
const orderSearched = ref(false);
const orderList = ref([]);

const statusMap = {
	pending: '待确认',
	accepted: '待上门',
	delivering: '配送中',
	priced: '待付款',
	paid_unused: '待核销',
	redeemed: '已核销',
	refunding: '退款中',
	refunded: '已退款',
	expired: '已过期',
	completed: '已完成',
	cancelled: '已取消'
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
	if (authed.value && orderSearched.value && orderKeyword.value) {
		await searchOrders();
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

function showToast(message) {
	uni.showToast({ title: String(message || ''), icon: 'none' });
}

function normalizeOrder(raw = {}) {
	const id = String(raw.id || raw.tsid || raw.daily_order_id || raw.legacyId || '').trim();
	return {
		key: id || `${raw.created_at || ''}-${raw.customer_phone || ''}`,
		id: String(raw.id || raw.tsid || raw.legacyId || '').trim(),
		orderNo: String(raw.daily_order_id || '').trim(),
		status: String(raw.status || '').trim().toLowerCase(),
		userId: String(raw.user_id || '').trim(),
		customerPhone: String(raw.customer_phone || '').trim(),
		customerName: String(raw.customer_name || '').trim(),
		riderName: String(raw.rider_name || '').trim(),
		riderPhone: String(raw.rider_phone || '').trim()
	};
}

function orderKeywordMatch(order, keyword) {
	const text = String(keyword || '').trim();
	if (!text) return true;
	return [
		order.orderNo,
		order.id,
		order.userId,
		order.customerPhone,
		order.customerName,
		order.riderName,
		order.riderPhone
	].some(field => String(field || '').includes(text));
}

async function searchOrders() {
	if (!authed.value) return;
	const keyword = String(orderKeyword.value || '').trim();
	if (!keyword) {
		showToast('请输入手机号或用户ID');
		return;
	}

	orderLoading.value = true;
	orderSearched.value = true;
	try {
		const response = await http.get('/api/orders', { search: keyword, page: 1, limit: 50 });
		let records = extractList(response, ['orders']).map(normalizeOrder);

		if (records.length === 0) {
			const fallback = await http.get('/api/orders', { page: 1, limit: 200 });
			records = extractList(fallback, ['orders'])
				.map(normalizeOrder)
				.filter(item => orderKeywordMatch(item, keyword));
		}

		const uniqueMap = {};
		for (const item of records) {
			uniqueMap[item.key] = item;
		}
		orderList.value = Object.values(uniqueMap);
	} catch (err) {
		showToast(err && err.message ? err.message : '订单查询失败');
	} finally {
		orderLoading.value = false;
	}
}

function statusClass(status) {
	switch (String(status || '').toLowerCase()) {
		case 'completed':
		case 'redeemed':
		case 'paid_unused':
			return 'ok';
		case 'cancelled':
		case 'expired':
		case 'refunded':
			return 'warn';
		default:
			return 'doing';
	}
}

function formatStatus(status) {
	const key = String(status || '').toLowerCase();
	return statusMap[key] || status || '未知状态';
}

function callRider(order) {
	const phone = String(order && order.riderPhone ? order.riderPhone : '').trim();
	if (!phone) {
		showToast('该订单暂无骑手手机号');
		return;
	}
	uni.makePhoneCall({
		phoneNumber: phone,
		fail: () => showToast('拨号失败，请检查设备权限')
	});
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

.search-box {
	display: flex;
	background: #ffffff;
	padding: 10rpx;
	border-radius: 20rpx;
	box-shadow: 0 8rpx 22rpx rgba(15, 23, 42, 0.05);
	margin-bottom: 14rpx;
}

.search-input {
	flex: 1;
	height: 68rpx;
	padding: 0 16rpx;
	font-size: 26rpx;
	color: #111827;
}

.search-btn {
	width: 110rpx;
	height: 68rpx;
	border-radius: 14rpx;
	background: #f3f4f6;
	color: #4b5563;
	font-size: 24rpx;
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

.order-card {
	background: #ffffff;
	border-radius: 20rpx;
	padding: 18rpx;
	margin-bottom: 12rpx;
	box-shadow: 0 8rpx 22rpx rgba(15, 23, 42, 0.05);
}

.row-top {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 8rpx;
	gap: 10rpx;
}

.order-no {
	font-size: 30rpx;
	font-weight: 700;
	color: #111827;
}

.status-pill {
	padding: 4rpx 12rpx;
	border-radius: 10rpx;
	font-size: 21rpx;
	font-weight: 700;
}

.status-pill.ok {
	background: #dcfce7;
	color: #15803d;
}

.status-pill.warn {
	background: #fee2e2;
	color: #b91c1c;
}

.status-pill.doing {
	background: #dbeafe;
	color: #1d4ed8;
}

.meta {
	display: block;
	font-size: 23rpx;
	color: #6b7280;
	margin-top: 8rpx;
}

.call-btn {
	margin-top: 14rpx;
	height: 64rpx;
	border-radius: 14rpx;
	background: #2563eb;
	color: #ffffff;
	font-size: 24rpx;
	font-weight: 700;
	display: flex;
	align-items: center;
	justify-content: center;
}

.call-btn.disabled {
	opacity: 0.5;
}
</style>
