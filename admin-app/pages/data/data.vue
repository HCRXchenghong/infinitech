<template>
	<view class="page-container">
		<view class="hero">
			<view class="hero-head">
				<text class="hero-title">数据洞察</text>
				<view class="refresh-btn" :class="{ refreshing: loading }" @click="handleRefresh">
					{{ loading ? '刷新中' : '刷新' }}
				</view>
			</view>
			<view class="weather-pill">
				<text>{{ weatherText }} {{ temperatureText }}</text>
			</view>
			<view class="stat-grid">
				<view class="stat-item">
					<text class="stat-label">待接单</text>
					<text class="stat-value">{{ pendingOrdersCount }}</text>
				</view>
				<view class="stat-item">
					<text class="stat-label">在线骑手</text>
					<text class="stat-value">{{ onlineRiderCount }}</text>
				</view>
			</view>
		</view>
		<view class="content-panel">
			<view class="tab-switch">
				<view class="tab-item" :class="{ active: subTab === 'pending' }" @click="subTab = 'pending'">
					未接单 ({{ pendingCardList.length }})
				</view>
				<view class="tab-item" :class="{ active: subTab === 'aftersales' }" @click="subTab = 'aftersales'">
					售后单 ({{ afterSalesCardList.length }})
				</view>
			</view>
			<scroll-view scroll-y class="card-scroll">
				<view v-if="loadError" class="error-tip">{{ loadError }}</view>
				<template v-if="subTab === 'pending'">
					<view v-if="!loading && pendingCardList.length === 0" class="empty-tip">暂无待接单</view>
					<view v-for="card in pendingCardList" :key="card.key" class="card pending-card">
						<view class="card-top">
							<view>
								<text class="card-id">#{{ card.data.daily_order_id || card.data.id }}</text>
								<text class="card-time">下单: {{ card.timeText }}</text>
							</view>
							<text class="card-amount">{{ formatOrderAmount(card.data.total_price || card.data.package_price) }}</text>
						</view>
						<text class="card-line">顾客: {{ card.data.customer_name || card.data.customer_phone || '-' }}</text>
						<text class="card-line">地址: {{ card.data.address || card.data.dorm_number || '-' }}</text>
						<view
							class="card-btn"
							:class="{ disabled: dispatchingOrderId === String(card.data.id || '') }"
							@click="handleQuickDispatch(card.data)"
						>
							{{ dispatchingOrderId === String(card.data.id || '') ? '派单中...' : '一键派单' }}
						</view>
					</view>
				</template>
				<template v-else>
					<view v-if="!loading && afterSalesCardList.length === 0" class="empty-tip">暂无售后单</view>
					<view v-for="card in afterSalesCardList" :key="card.key" class="card after-card">
						<view class="card-top">
							<text class="card-id">#{{ card.data.requestNo || card.data.id }}</text>
							<text class="status-chip" :class="getAfterSalesStatusClass(card.data.status)">
								{{ card.data.statusText }}
							</text>
						</view>
						<text class="card-line">订单号: {{ card.data.orderNo || '-' }}</text>
						<text class="card-line">类型: {{ card.data.typeText || '-' }}</text>
						<text class="card-line">申请退款: {{ card.data.requestedRefundAmount > 0 ? `¥${fenToYuan(card.data.requestedRefundAmount)}` : '-' }}</text>
						<view class="action-row">
							<view
								class="action-btn warning"
								:class="{ disabled: processingAfterSalesId === String(card.data.id || '') }"
								@click="openRefundProcess(card.data)"
							>
								退款处理
							</view>
							<view
								class="action-btn danger"
								:class="{ disabled: processingAfterSalesId === String(card.data.id || '') }"
								@click="handleRejectAfterSales(card.data)"
							>
								驳回
							</view>
						</view>
					</view>
				</template>
			</scroll-view>
		</view>
		<view v-if="showProcessPanel" class="process-mask" @click="closeProcessPanel">
			<view class="process-panel" @click.stop>
				<view class="panel-head">
					<text class="panel-title">处理售后</text>
					<text class="panel-close" @click="closeProcessPanel">×</text>
				</view>
				<scroll-view scroll-y class="panel-scroll">
					<view class="form-row">
						<text class="form-label">售后单号</text>
						<text class="form-value">{{ processForm.requestNo || '-' }}</text>
					</view>
					<view class="form-row">
						<text class="form-label">申请退款</text>
						<text class="form-value">{{ processForm.requestedRefundAmount > 0 ? `¥${fenToYuan(processForm.requestedRefundAmount)}` : '-' }}</text>
					</view>
					<view class="form-block">
						<text class="form-label">处理状态</text>
						<view class="option-group">
							<view
								v-for="item in afterSalesStatusOptions"
								:key="item.value"
								class="option-chip"
								:class="{ active: processForm.status === item.value }"
								@click="processForm.status = item.value"
							>
								{{ item.label }}
							</view>
						</view>
					</view>
					<view class="form-block">
						<text class="form-label">退款处理</text>
						<view class="option-group">
							<view class="option-chip" :class="{ active: processForm.shouldRefund }" @click="processForm.shouldRefund = true">退款</view>
							<view class="option-chip" :class="{ active: !processForm.shouldRefund }" @click="processForm.shouldRefund = false">不退款</view>
						</view>
					</view>
					<view v-if="processForm.shouldRefund" class="form-block">
						<text class="form-label">退款金额（元）</text>
						<input
							v-model="processForm.refundAmountYuan"
							class="form-input"
							type="digit"
							placeholder="请输入退款金额"
							placeholder-style="color:#9ca3af"
						/>
					</view>
					<view class="form-block">
						<text class="form-label">退款说明</text>
						<textarea
							v-model="processForm.refundReason"
							class="form-textarea"
							placeholder="请输入退款/不退款说明（可选）"
							placeholder-style="color:#9ca3af"
						/>
					</view>
					<view class="form-block">
						<text class="form-label">处理备注</text>
						<textarea
							v-model="processForm.adminRemark"
							class="form-textarea"
							placeholder="请输入处理备注（可选）"
							placeholder-style="color:#9ca3af"
						/>
					</view>
				</scroll-view>
				<view class="panel-foot">
					<view class="foot-btn" @click="closeProcessPanel">取消</view>
					<view
						class="foot-btn primary"
						:class="{ disabled: processingAfterSalesId === processForm.id }"
						@click="submitAfterSalesProcess"
					>
						{{ processingAfterSalesId === processForm.id ? '提交中...' : '保存' }}
					</view>
				</view>
			</view>
		</view>
	</view>
</template>
<script setup>
import { computed, onBeforeUnmount, reactive, ref } from 'vue';
import { onHide, onLoad, onShow } from '@dcloudio/uni-app';
import { THEMES } from '@/common/data.js';
import { API_CONFIG } from '@/utils/config.js';
import { http } from '@/utils/request.js';
import { ensureAuthenticated } from '@/utils/auth.js';
import {
	statsHasPendingCount,
	canQuickDispatch,
	normalizeAfterSalesRecord,
	getAfterSalesStatusClass,
	resolveAdminName,
	fenToYuan,
	yuanToFen,
	formatOrderAmount,
	formatTemperature,
	formatDateTime,
	toTime,
	getErrorMessage,
	confirmAction
} from './data-helpers.js';
const theme = ref(THEMES.nebula);
const authed = ref(false);
const loading = ref(false);
const loadError = ref('');
const AUTO_REFRESH_SETTING_KEY = 'admin_auto_refresh_enabled';
const weatherText = ref('--');
const temperatureText = ref('--');
const pendingOrdersCount = ref(0);
const onlineRiderCount = ref(0);
const pendingOrders = ref([]);
const afterSalesOrders = ref([]);
const subTab = ref('pending');
const dispatchingOrderId = ref('');
const processingAfterSalesId = ref('');
const showProcessPanel = ref(false);
const processForm = reactive({
	id: '',
	requestNo: '',
	status: 'approved',
	shouldRefund: true,
	requestedRefundAmount: 0,
	refundAmountYuan: '',
	refundReason: '',
	adminRemark: ''
});
const afterSalesStatusOptions = [
	{ label: '待处理', value: 'pending' },
	{ label: '处理中', value: 'processing' },
	{ label: '已通过', value: 'approved' },
	{ label: '已拒绝', value: 'rejected' },
	{ label: '已完成', value: 'completed' }
];
const orderCards = computed(() => {
	const pendingCards = pendingOrders.value.map((item) => ({
		key: `pending_${item.id || item.daily_order_id || Math.random()}`,
		type: 'pending',
		timeText: formatDateTime(item.created_at || item.createdAt),
		sortTime: toTime(item.created_at || item.createdAt),
		data: item
	}));
	const afterSalesCards = afterSalesOrders.value.map((item) => ({
		key: `after_${item.id || item.requestNo || Math.random()}`,
		type: 'after_sales',
		timeText: formatDateTime(item.createdAt || item.created_at),
		sortTime: toTime(item.createdAt || item.created_at),
		data: item
	}));
	return [...pendingCards, ...afterSalesCards].sort((a, b) => b.sortTime - a.sortTime);
});
const pendingCardList = computed(() => orderCards.value.filter((item) => item.type === 'pending'));
const afterSalesCardList = computed(() => orderCards.value.filter((item) => item.type === 'after_sales'));
let refreshTimer = null;
onLoad(async () => {
	const ok = await ensureAuthed();
	if (!ok) return;
	await loadInsightData();
	syncAutoRefresh();
});
onShow(async () => {
	const ok = await ensureAuthed();
	if (!ok) return;
	syncAutoRefresh();
	await loadInsightData({ silent: true });
});
onHide(() => {
	stopAutoRefresh();
});
onBeforeUnmount(() => {
	stopAutoRefresh();
});
async function ensureAuthed() {
	if (authed.value) return true;
	authed.value = await ensureAuthenticated({ verifyRemote: true });
	return authed.value;
}
function startAutoRefresh() {
	stopAutoRefresh();
	refreshTimer = setInterval(() => {
		loadInsightData({ silent: true });
	}, 20000);
}
function syncAutoRefresh() {
	if (isAutoRefreshEnabled()) {
		startAutoRefresh();
		return;
	}
	stopAutoRefresh();
}
function isAutoRefreshEnabled() {
	const raw = uni.getStorageSync(AUTO_REFRESH_SETTING_KEY);
	const text = String(raw || '').trim().toLowerCase();
	if (text === '') {
		return true;
	}
	return ['1', 'true', 'yes', 'y'].includes(text);
}
function stopAutoRefresh() {
	if (!refreshTimer) return;
	clearInterval(refreshTimer);
	refreshTimer = null;
}
async function handleRefresh() {
	await loadInsightData();
}
async function loadInsightData(options = {}) {
	if (loading.value) return;
	const silent = Boolean(options.silent);
	loading.value = true;
	if (!silent) {
		loadError.value = '';
	}
	const errors = [];
	try {
		const results = await Promise.allSettled([
			http.get(API_CONFIG.API.STATS || '/api/stats'),
			http.get(API_CONFIG.API.WEATHER || '/api/weather'),
			http.get(API_CONFIG.API.ORDERS || '/api/orders', {
				page: 1,
				limit: 200,
				status: 'pending',
				bizType: 'takeout'
			}),
			http.get(API_CONFIG.API.AFTER_SALES || '/api/after-sales', {
				page: 1,
				limit: 100
			})
		]);
		const [statsRes, weatherRes, ordersRes, afterSalesRes] = results;
		if (statsRes.status === 'fulfilled') {
			applyStats(statsRes.value || {});
		} else {
			errors.push(getErrorMessage(statsRes.reason, '统计数据加载失败'));
		}
		if (weatherRes.status === 'fulfilled') {
			applyWeather(weatherRes.value || {});
		} else {
			errors.push(getErrorMessage(weatherRes.reason, '天气数据加载失败'));
		}
		if (ordersRes.status === 'fulfilled') {
			const rawList = Array.isArray(ordersRes.value?.orders)
				? ordersRes.value.orders
				: Array.isArray(ordersRes.value)
					? ordersRes.value
					: [];
			pendingOrders.value = rawList
				.filter((item) => canQuickDispatch(item))
				.sort((a, b) => toTime(b.created_at || b.createdAt) - toTime(a.created_at || a.createdAt));
			if (!statsHasPendingCount(statsRes)) {
				pendingOrdersCount.value = pendingOrders.value.length;
			}
		} else {
			errors.push(getErrorMessage(ordersRes.reason, '待接单加载失败'));
		}
		if (afterSalesRes.status === 'fulfilled') {
			const rawList = Array.isArray(afterSalesRes.value?.list)
				? afterSalesRes.value.list
				: Array.isArray(afterSalesRes.value)
					? afterSalesRes.value
					: [];
			afterSalesOrders.value = rawList
				.map((item) => normalizeAfterSalesRecord(item))
				.sort((a, b) => toTime(b.createdAt || b.created_at) - toTime(a.createdAt || a.created_at));
		} else {
			errors.push(getErrorMessage(afterSalesRes.reason, '售后单加载失败'));
		}
	} finally {
		loading.value = false;
		if (errors.length > 0) {
			loadError.value = errors[0];
		}
	}
}
function applyStats(stats = {}) {
	pendingOrdersCount.value = Number(stats.pendingOrdersCount || 0);
	onlineRiderCount.value = Number(stats.onlineRiderCount || 0);
}
function applyWeather(weather = {}) {
	weatherText.value = String(weather.weather_main || weather.weather || '未知').trim() || '未知';
	temperatureText.value = formatTemperature(weather.temperature ?? weather.temp ?? '--');
}
async function handleQuickDispatch(order) {
	const orderId = String(order?.id || '').trim();
	if (!orderId || dispatchingOrderId.value) return;
	const confirmed = await confirmAction('一键派单', `确认派单订单 #${order.daily_order_id || orderId} 吗？`);
	if (!confirmed) return;
	dispatchingOrderId.value = orderId;
	try {
		const result = await http.post(`${API_CONFIG.API.ORDERS || '/api/orders'}/${encodeURIComponent(orderId)}/dispatch`);
		const riderName = result?.rider?.name || result?.rider?.phone || '骑手';
		uni.showToast({ title: `派单成功，已分配给 ${riderName}`, icon: 'none' });
		await loadInsightData({ silent: true });
	} catch (err) {
		uni.showToast({ title: getErrorMessage(err, '一键派单失败'), icon: 'none' });
	} finally {
		dispatchingOrderId.value = '';
	}
}
function openRefundProcess(record) {
	if (!record || !record.id) return;
	const fallbackRefund = Number(record.refundAmount || record.requestedRefundAmount || 0);
	Object.assign(processForm, {
		id: String(record.id || ''),
		requestNo: String(record.requestNo || ''),
		status: ['processing', 'approved', 'completed'].includes(String(record.status || ''))
			? String(record.status)
			: 'approved',
		shouldRefund: true,
		requestedRefundAmount: Number(record.requestedRefundAmount || 0),
		refundAmountYuan: fallbackRefund > 0 ? fenToYuan(fallbackRefund) : '',
		refundReason: String(record.refundReason || ''),
		adminRemark: String(record.adminRemark || '')
	});
	showProcessPanel.value = true;
}
function closeProcessPanel() {
	if (processingAfterSalesId.value) return;
	showProcessPanel.value = false;
}
async function handleRejectAfterSales(record) {
	const afterSalesId = String(record?.id || '').trim();
	if (!afterSalesId || processingAfterSalesId.value) return;
	const confirmed = await confirmAction('驳回售后', `确认驳回售后单 #${record.requestNo || afterSalesId} 吗？`);
	if (!confirmed) return;
	processingAfterSalesId.value = afterSalesId;
	try {
		await http.put(`${API_CONFIG.API.AFTER_SALES || '/api/after-sales'}/${encodeURIComponent(afterSalesId)}/status`, {
			status: 'rejected',
			adminRemark: '管理员驳回',
			processedBy: resolveAdminName(API_CONFIG.USER_KEY),
			shouldRefund: false,
			refundAmount: 0,
			refundReason: ''
		});
		uni.showToast({ title: '已驳回', icon: 'none' });
		await loadInsightData({ silent: true });
	} catch (err) {
		uni.showToast({ title: getErrorMessage(err, '驳回失败'), icon: 'none' });
	} finally {
		processingAfterSalesId.value = '';
	}
}
async function submitAfterSalesProcess() {
	const afterSalesId = String(processForm.id || '').trim();
	if (!afterSalesId || processingAfterSalesId.value) return;
	if (processForm.shouldRefund && ['pending', 'rejected'].includes(processForm.status)) {
		uni.showToast({ title: '当前状态不允许执行退款', icon: 'none' });
		return;
	}
	const refundAmount = processForm.shouldRefund ? yuanToFen(processForm.refundAmountYuan) : 0;
	if (processForm.shouldRefund && refundAmount <= 0) {
		uni.showToast({ title: '请填写有效的退款金额', icon: 'none' });
		return;
	}
	processingAfterSalesId.value = afterSalesId;
	try {
		const result = await http.put(
			`${API_CONFIG.API.AFTER_SALES || '/api/after-sales'}/${encodeURIComponent(afterSalesId)}/status`,
			{
				status: processForm.status,
				adminRemark: processForm.adminRemark || '',
				processedBy: resolveAdminName(API_CONFIG.USER_KEY),
				shouldRefund: Boolean(processForm.shouldRefund),
				refundAmount,
				refundReason: processForm.refundReason || ''
			}
		);
		const latest = normalizeAfterSalesRecord(result || {});
		if (processForm.shouldRefund && !latest.refundTransactionId) {
			uni.showToast({ title: '状态已更新，但未生成退款流水号', icon: 'none' });
		} else {
			uni.showToast({ title: '处理成功', icon: 'none' });
		}
		showProcessPanel.value = false;
		await loadInsightData({ silent: true });
	} catch (err) {
		uni.showToast({ title: getErrorMessage(err, '售后处理失败'), icon: 'none' });
	} finally {
		processingAfterSalesId.value = '';
	}
}
</script>
<style src="./data.css"></style>
