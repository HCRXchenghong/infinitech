<template>
	<view class="page-container" :style="{ background: theme.bgGradient }">
		<view class="nav-bar glass-nav" :style="{ borderColor: theme.border }">
			<text class="back-btn" :style="{ color: theme.text }" @click="goBack">←</text>
			<text class="title" :style="{ color: theme.text }">{{ name }}</text>
			<text class="more" :style="{ color: theme.text }">⋮</text>
		</view>

		<scroll-view scroll-y class="chat-area" :scroll-top="scrollTop">
			<view class="msg-list">
				<view
					v-for="msg in msgs"
					:key="msg.id"
					class="msg-row"
					:class="{ 'msg-self': msg.self }"
				>
					<view
						v-if="msg.type === 'order'"
						class="order-card"
						:class="{ 'order-card-self': msg.self }"
						@click="openOrderDetail(msg.order)"
					>
						<view class="order-head">
							<text class="order-tag">订单消息</text>
							<text class="order-status">{{ getOrderStatusText(msg.order) }}</text>
						</view>
						<text class="order-shop">{{ msg.order && msg.order.shopName ? msg.order.shopName : '订单 #' + formatOrderNo(msg.order) }}</text>
						<view class="order-meta">
							<text class="order-no">#{{ formatOrderNo(msg.order) }}</text>
							<text class="order-amount">¥{{ formatOrderAmount(msg.order) }}</text>
						</view>
						<text class="order-link">查看详情</text>
					</view>

					<view
						v-else
						class="bubble"
						:style="{
							background: msg.self ? theme.accent : theme.panel,
							color: msg.self ? theme.accentText : theme.text
						}"
					>
						<image
							v-if="msg.type === 'image'"
							:src="msg.text"
							mode="widthFix"
							style="width: 400rpx; border-radius: 12rpx;"
							@click="previewImg(msg.text)"
						></image>
						<text v-else-if="msg.type === 'coupon'">🎫 {{ msg.coupon ? msg.coupon.name + ' ¥' + msg.coupon.amount : msg.text }}</text>
						<text v-else>{{ msg.text }}</text>
					</view>
					<view v-if="msg.self" class="msg-status-row">
						<text v-if="msg.status === 'sending'" class="msg-status sending">⏳</text>
						<text v-else-if="msg.status === 'failed'" class="msg-status failed" @click="resendMessage(msg)">❗发送失败</text>
						<text v-else-if="msg.status === 'read'" class="msg-status read">✓✓</text>
						<text v-else-if="msg.status === 'sent'" class="msg-status sent">✓</text>
					</view>
				</view>
			</view>
		</scroll-view>

		<view class="input-area glass-nav">
			<view class="tool-btn" @click="openOrderPicker">订单</view>
			<input class="input-field glass-panel" v-model="inputText" confirm-type="send" @confirm="send" :style="{ color: theme.text }" placeholder="发送消息..." placeholder-style="color:gray" />
			<view class="send-btn" :style="{ background: theme.accent }" @click="send">
				<text>↑</text>
			</view>
		</view>

		<view v-if="showOrderPicker" class="picker-mask" @click="showOrderPicker = false">
			<view class="picker-panel glass-panel" @click.stop>
				<view class="picker-head">
					<text class="picker-title">可发送订单</text>
					<text class="picker-close" @click="showOrderPicker = false">×</text>
				</view>
				<scroll-view class="picker-list" scroll-y>
					<view v-if="loadingOrders" class="picker-empty">加载中...</view>
					<view v-else-if="availableOrders.length === 0" class="picker-empty">暂无可发送订单</view>
					<view
						v-for="order in availableOrders"
						:key="order.id"
						class="picker-item"
						@click="sendOrderMessage(order)"
					>
						<view class="picker-main">
							<text class="picker-shop">{{ order.shopName || '订单 #' + formatOrderNo(order) }}</text>
							<text class="picker-no">#{{ formatOrderNo(order) }}</text>
						</view>
						<view class="picker-right">
							<text class="picker-amount">¥{{ formatOrderAmount(order) }}</text>
							<text class="picker-status">{{ getOrderStatusText(order) }}</text>
						</view>
					</view>
				</scroll-view>
			</view>
		</view>

		<OrderDetailPopup
			:show="showOrderDetailPopup"
			:order="currentOrderDetail"
			@close="showOrderDetailPopup = false"
		/>
	</view>
</template>

<script setup>
import { ref, nextTick, onUnmounted } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { THEMES } from '@/common/data.js';
import { API_CONFIG } from '@/utils/config.js';
import { db } from '@/utils/database.js';
import { http } from '@/utils/request.js';
import socketService from '@/utils/socketService.js';
import OrderDetailPopup from '@/components/OrderDetailPopup.vue';
import {
	safeDecode,
	normalizeChatId,
	normalizeRole,
	normalizeOrder,
	normalizeMessage,
	formatOrderNo,
	formatOrderAmount,
	getOrderStatusText,
	getOrderList,
	matchRider
} from './chat-detail-helpers.js';

const theme = ref(THEMES.nebula);
const name = ref('');
const chatId = ref('');
const chatRole = ref('user');
const targetId = ref('');
const msgs = ref([]);
const inputText = ref('');
const scrollTop = ref(0);
const showOrderPicker = ref(false);
const loadingOrders = ref(false);
const availableOrders = ref([]);
const showOrderDetailPopup = ref(false);
const currentOrderDetail = ref(null);
const seenMessageKeys = new Set();

function hasSeenMessage(chatIdValue, messageId) {
	if (messageId === undefined || messageId === null || messageId === '') return false;
	const key = `${normalizeChatId(chatIdValue)}:${String(messageId)}`;
	if (seenMessageKeys.has(key)) return true;
	seenMessageKeys.add(key);
	if (seenMessageKeys.size > 6000) {
		const first = seenMessageKeys.values().next().value;
		if (first) seenMessageKeys.delete(first);
	}
	return false;
}

onLoad(async (options = {}) => {
	name.value = safeDecode(options.name || 'Chat');
	chatId.value = normalizeChatId(options.id || '');
	chatRole.value = normalizeRole(options.role || 'user');
	targetId.value = safeDecode(options.targetId || options.phone || options.id || '');

	await db.open();
	await loadMessages();
	await connectSocket();
});

onUnmounted(() => {
	socketService.off('new_message');
	socketService.off('messages_loaded');
	socketService.off('message_sent');
	socketService.off('message_read');
});

function inferChatMeta(messages = []) {
	const outsider = messages.find(m => m.senderRole && m.senderRole !== 'admin');
	if (!outsider) return;
	chatRole.value = normalizeRole(outsider.senderRole);
	if (!targetId.value && outsider.senderId) {
		targetId.value = String(outsider.senderId);
	}
}

async function loadMessages() {
	try {
		const cachedMsgs = await db.getMessages(chatId.value);
		if (cachedMsgs && cachedMsgs.length > 0) {
			msgs.value = cachedMsgs.map(m => normalizeMessage({
				id: m.id,
				content: m.content,
				messageType: m.messageType,
				senderRole: m.isSelf === 1 ? 'admin' : chatRole.value
			}, m.isSelf === 1));
		}
		scrollToBottom();
	} catch (err) {
		console.error('加载本地消息失败:', err);
	}
}

async function connectSocket() {
	await socketService.connect('/support');

	socketService.on('new_message', (data) => {
		const incomingChatId = normalizeChatId(data.chatId);
		if (incomingChatId !== normalizeChatId(chatId.value)) return;
		if (hasSeenMessage(incomingChatId, data.id)) return;
		if (data.senderRole !== 'admin') {
			chatRole.value = normalizeRole(data.senderRole || chatRole.value);
			if (!targetId.value && data.senderId) {
				targetId.value = String(data.senderId);
			}
			if (data.id && msgs.value.some(m => String(m.id) === String(data.id))) return;
			msgs.value.push(normalizeMessage(data, false));
			syncMessageToBackend({
				externalMessageId: data.id,
				senderId: data.senderId,
				senderRole: data.senderRole,
				sender: data.sender,
				content: data.content,
				messageType: data.messageType,
				coupon: data.coupon,
				order: data.order,
				imageUrl: data.imageUrl,
				avatar: data.avatar
			});
			scrollToBottom();
		}
	});

	socketService.on('messages_loaded', async (data) => {
		const loadedChatId = normalizeChatId(data.chatId);
		if (loadedChatId === normalizeChatId(chatId.value)) {
			inferChatMeta(data.messages || []);
			msgs.value = (data.messages || []).map(m => normalizeMessage(m, m.senderRole === 'admin'));
			(data.messages || []).forEach((msg) => {
				hasSeenMessage(loadedChatId, msg.id);
			});

			try {
				await db.saveMessages(chatId.value, (data.messages || []).map(m => ({
					id: m.id,
					senderId: m.senderId,
					sender: m.sender,
					content: m.content,
					messageType: m.messageType,
					timestamp: Date.now(),
					isSelf: m.senderRole === 'admin',
					avatar: m.avatar || ''
				})));
			} catch (err) {
				console.error('❌ 保存消息到本地失败:', err);
			}

			scrollToBottom();
		}
	});

	socketService.emit('join_chat', {
		chatId: chatId.value,
		userId: 'admin',
		role: 'admin'
	});

	socketService.emit('load_messages', {
		chatId: chatId.value
	});

	socketService.on('message_sent', (data) => {
		const msg = msgs.value.find(m => m.id === data.tempId);
		if (msg) {
			msg.id = data.messageId;
			msg.status = 'sent';
		}
	});

	socketService.on('message_read', (data) => {
		const msg = msgs.value.find(m => m.id === data.messageId);
		if (msg) msg.status = 'read';
	});
}

const goBack = () => uni.navigateBack();

function previewImg(url) {
	uni.previewImage({ urls: [url], current: url });
}

function openOrderDetail(order) {
	const normalized = normalizeOrder(order);
	if (!normalized) {
		uni.showToast({ title: '订单信息不完整', icon: 'none' });
		return;
	}
	currentOrderDetail.value = normalized;
	showOrderDetailPopup.value = true;
}

async function openOrderPicker() {
	showOrderPicker.value = true;
	await loadAvailableOrders();
}

async function loadAvailableOrders() {
	loadingOrders.value = true;
	try {
		if (chatRole.value === 'rider') {
			const riderKey = String(targetId.value || '');
			const [pendingRes, acceptedRes] = await Promise.all([
				http.get('/api/orders', { status: 'pending', page: 1, limit: 200 }),
				http.get('/api/orders', { status: 'accepted', page: 1, limit: 200 })
			]);
			const pendingOrders = getOrderList(pendingRes).map(normalizeOrder).filter(Boolean);
			const acceptedOrders = getOrderList(acceptedRes)
				.filter(order => matchRider(order, riderKey))
				.map(normalizeOrder)
				.filter(Boolean);
			const unique = {};
			[...pendingOrders, ...acceptedOrders].forEach(order => {
				unique[String(order.id)] = order;
			});
			availableOrders.value = Object.values(unique);
		} else if (chatRole.value === 'user') {
			if (!targetId.value) {
				availableOrders.value = [];
				return;
			}
			const res = await http.get(`/api/orders/user/${encodeURIComponent(targetId.value)}`);
			availableOrders.value = getOrderList(res).map(normalizeOrder).filter(Boolean);
		} else {
			availableOrders.value = [];
		}
	} catch (err) {
		console.error('加载可发送订单失败:', err);
		availableOrders.value = [];
		uni.showToast({ title: '加载订单失败', icon: 'none' });
	} finally {
		loadingOrders.value = false;
	}
}

function syncMessageToBackend(payload = {}) {
	const body = {
		chatId: chatId.value,
		externalMessageId: payload.externalMessageId || payload.id || '',
		senderId: payload.senderId || '',
		senderRole: payload.senderRole || 'admin',
		senderName: payload.sender || '',
		content: payload.content || '',
		messageType: payload.messageType || 'text',
		coupon: payload.coupon || null,
		order: payload.order || null,
		imageUrl: payload.imageUrl || '',
		avatar: payload.avatar || '',
		targetType: chatRole.value || 'user',
		targetId: targetId.value || chatId.value,
		targetPhone: targetId.value || '',
		targetName: name.value || '',
		targetAvatar: ''
	};

	http.post(API_CONFIG.API.CHAT_SYNC_MESSAGE, body).catch((err) => {
		console.error('同步聊天消息到 BFF 失败:', err);
	});
}

function sendOrderMessage(order) {
	const normalized = normalizeOrder(order);
	if (!normalized || !normalized.id) {
		uni.showToast({ title: '订单数据无效', icon: 'none' });
		return;
	}
	const tempId = Date.now();
	const message = {
		id: tempId,
		text: '',
		self: true,
		type: 'order',
		order: normalized,
		status: 'sending'
	};
	msgs.value.push(message);
	showOrderPicker.value = false;

	socketService.emit('send_message', {
		chatId: chatId.value,
		senderId: 'admin',
		senderRole: 'admin',
		sender: '客服',
		messageType: 'order',
		content: JSON.stringify(normalized),
		tempId: tempId
	});
	syncMessageToBackend({
		externalMessageId: tempId,
		senderId: 'admin',
		senderRole: 'admin',
		sender: '客服',
		messageType: 'order',
		content: JSON.stringify(normalized),
		order: normalized
	});

	setTimeout(() => {
		if (message.status === 'sending') message.status = 'failed';
	}, 5000);

	scrollToBottom();
}

function resendMessage(msg) {
	msg.status = 'sending';
	const tempId = Date.now();
	msg.id = tempId;
	socketService.emit('send_message', {
		chatId: chatId.value,
		senderId: 'admin',
		senderRole: 'admin',
		sender: '客服',
		messageType: msg.type,
		content: msg.type === 'order' ? JSON.stringify(msg.order || {}) : msg.text,
		tempId: tempId
	});
	syncMessageToBackend({
		externalMessageId: tempId,
		senderId: 'admin',
		senderRole: 'admin',
		sender: '客服',
		messageType: msg.type,
		content: msg.type === 'order' ? JSON.stringify(msg.order || {}) : msg.text,
		order: msg.type === 'order' ? (msg.order || null) : null
	});
	setTimeout(() => {
		if (msg.status === 'sending') msg.status = 'failed';
	}, 5000);
}

const send = async () => {
	if (!inputText.value.trim()) return;

	const tempId = Date.now();
	const message = {
		id: tempId,
		text: inputText.value,
		self: true,
		type: 'text',
		status: 'sending'
	};

	msgs.value.push(message);
	const content = inputText.value;
	inputText.value = '';

	try {
		await socketService.emit('send_message', {
			chatId: chatId.value,
			senderId: 'admin',
			senderRole: 'admin',
			sender: '客服',
			messageType: 'text',
			content,
			tempId
		});
		syncMessageToBackend({
			externalMessageId: tempId,
			senderId: 'admin',
			senderRole: 'admin',
			sender: '客服',
			messageType: 'text',
			content
		});

		setTimeout(() => {
			if (message.status === 'sending') message.status = 'failed';
		}, 5000);

		scrollToBottom();
	} catch (err) {
		console.error('发送消息失败:', err);
		message.status = 'failed';
	}
};

function scrollToBottom() {
	nextTick(() => {
		scrollTop.value = 999999;
	});
}
</script>

<style src="./chat-detail.css"></style>
