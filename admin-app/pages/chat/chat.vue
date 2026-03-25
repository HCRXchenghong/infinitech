<template>
	<view class="page-container">
		<view class="header">
			<text class="page-title">沟通</text>
			<view class="plus-btn" @click="toggleQuickMenu">+</view>
		</view>

		<view v-if="showQuickMenu" class="menu-mask" @click="closeQuickMenu">
			<view class="quick-menu" @click.stop>
				<view class="quick-item" @click="handleScan">扫一扫</view>
				<view class="quick-item" @click="openSearchPanel">搜索用户</view>
			</view>
		</view>

		<scroll-view scroll-y class="content-scroll">
			<view class="chat-list">
				<view v-if="loading && chats.length === 0" class="state-text">加载中...</view>
				<view v-else-if="!loading && chats.length === 0" class="state-text">暂无客服会话</view>

				<view
					v-for="chat in chats"
					:key="chat.id"
					class="chat-card"
					@click="goChat(chat)"
				>
					<view class="avatar-wrap">
						<image v-if="chat.avatar" :src="chat.avatar" class="avatar" mode="aspectFill"></image>
						<view
							v-else
							:class="[
								'avatar',
								'avatar-fallback',
								normalizeRole(chat.role) === 'rider'
									? 'avatar-rider'
									: normalizeRole(chat.role) === 'merchant'
										? 'avatar-merchant'
										: 'avatar-user'
							]"
						>
							<text class="avatar-text">{{ (chat.name || '客').slice(0, 1) }}</text>
						</view>
						<view v-if="chat.unread" class="badge">{{ chat.unread }}</view>
					</view>

					<view class="chat-main">
						<view class="chat-top">
							<view class="name-wrap">
								<text class="chat-name">{{ chat.name }}</text>
								<text class="role-tag">{{ roleLabel(chat.role) }}</text>
							</view>
							<text class="chat-time">{{ chat.time }}</text>
						</view>
						<text class="chat-msg">{{ chat.msg }}</text>
					</view>
				</view>
			</view>
		</scroll-view>

		<view v-if="showSearchPanel" class="search-mask" @click="closeSearchPanel">
			<view class="search-panel" @click.stop>
				<view class="search-head">
					<text class="search-title">搜索并创建会话</text>
					<text class="search-close" @click="closeSearchPanel">×</text>
				</view>
				<view class="search-input-row">
					<input
						class="search-input"
						v-model="searchKeyword"
						confirm-type="search"
						placeholder="输入用户/商家/骑手ID或手机号"
						placeholder-style="color:#9ca3af"
						@confirm="searchTargets"
					/>
					<view class="search-btn" @click="searchTargets">搜索</view>
				</view>

				<view v-if="searching" class="search-tip">搜索中...</view>
				<view v-else-if="searchTried && searchResults.length === 0" class="search-tip">未找到匹配对象</view>

				<scroll-view v-if="searchResults.length > 0" scroll-y class="search-results">
					<view
						v-for="target in searchResults"
						:key="target.key"
						class="search-item"
						@click="createConversation(target)"
					>
						<image v-if="target.avatar" :src="target.avatar" class="search-avatar" mode="aspectFill"></image>
						<view v-else class="search-avatar search-avatar-fallback">
							<text class="avatar-text">{{ (target.name || '客').slice(0, 1) }}</text>
						</view>
						<view class="search-main">
							<view class="search-top-row">
								<text class="search-name">{{ target.name }}</text>
								<text class="search-role">{{ roleLabel(target.role) }}</text>
							</view>
							<text class="search-meta">ID: {{ target.displayId }}</text>
							<text class="search-meta">手机号: {{ target.phone || '--' }}</text>
						</view>
					</view>
				</scroll-view>
			</view>
		</view>
	</view>
</template>

<script setup>
import { ref } from 'vue';
import { onLoad, onShow, onHide, onPullDownRefresh } from '@dcloudio/uni-app';
import { THEMES } from '@/common/data.js';
import { API_CONFIG } from '@/utils/config.js';
import { http } from '@/utils/request.js';
import { db } from '@/utils/database.js';
import socketService from '@/utils/socketService.js';
import { ensureAuthenticated } from '@/utils/auth.js';
import {
	normalizeChatId,
	normalizeRole,
	roleLabel,
	toMessagePreview,
	formatTime,
	normalizeChat,
	getRequestErrorMessage,
	looksLikeWebLoginQr,
	normalizeSearchTarget
} from './chat-helpers.js';

const theme = ref(THEMES.nebula);
const chats = ref([]);
const loading = ref(false);
const authed = ref(false);

const showQuickMenu = ref(false);
const showSearchPanel = ref(false);
const searchKeyword = ref('');
const searching = ref(false);
const searchTried = ref(false);
const searchResults = ref([]);
const seenMessageKeys = new Set();

const SUPPORT_NAMESPACE = '/support';
let socketEventsBound = false;

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

onLoad(async () => {
	authed.value = await ensureAuthenticated({ verifyRemote: true });
	if (!authed.value) {
		return;
	}

	try {
		await db.open();
		const cached = await db.getChats();
		if (Array.isArray(cached) && cached.length > 0) {
			chats.value = cached.map(normalizeChat);
		}
	} catch (err) {
		console.error('加载本地会话缓存失败:', err);
	}
});

onShow(async () => {
	if (!authed.value) {
		authed.value = await ensureAuthenticated({ verifyRemote: true });
		if (!authed.value) return;
	}
	await connectAndLoad();
});

onHide(() => {
	closeQuickMenu();
	unbindSocketEvents();
});

onPullDownRefresh(async () => {
	await connectAndLoad();
	uni.stopPullDownRefresh();
});

async function connectAndLoad() {
	loading.value = true;
	try {
		await socketService.connect(SUPPORT_NAMESPACE);
		bindSocketEvents();
		socketService.emit('load_all_chats');
	} catch (err) {
		console.error('连接客服 socket 失败:', err);
		uni.showToast({ title: '连接客服服务失败', icon: 'none' });
	} finally {
		loading.value = false;
	}
}

function bindSocketEvents() {
	if (socketEventsBound) {
		unbindSocketEvents();
	}
	socketService.on('all_chats_loaded', onAllChatsLoaded);
	socketService.on('new_message', onNewMessage);
	socketService.on('messages_cleared', onMessagesCleared);
	socketEventsBound = true;
}

function unbindSocketEvents() {
	if (!socketEventsBound) return;
	socketService.off('all_chats_loaded');
	socketService.off('new_message');
	socketService.off('messages_cleared');
	socketEventsBound = false;
}

async function onAllChatsLoaded(payload = {}) {
	const raw = Array.isArray(payload.chats) ? payload.chats : [];
	const normalized = raw
		.map(normalizeChat)
		.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
	chats.value = normalized;
	await persistChats();
}

function onNewMessage(message = {}) {
	const chatId = normalizeChatId(message.chatId);
	if (!chatId) return;
	if (hasSeenMessage(chatId, message.id || message.uid || message.tsid || '')) return;

	const index = chats.value.findIndex(item => normalizeChatId(item.id) === chatId);
	const preview = toMessagePreview(message);
	const nextTime = String(message.time || formatTime(new Date()));
	const updatedAt = Date.now();
	const incoming = message.senderRole !== 'admin';

	if (index >= 0) {
		const current = chats.value[index];
		const merged = {
			...current,
			msg: preview,
			lastMessage: preview,
			time: nextTime,
			updatedAt,
			name: current.name || message.sender || '官方客服',
			phone: current.phone || String(message.senderId || ''),
			avatar: current.avatar || message.avatar || '',
			unread: incoming ? (Number(current.unread || 0) + 1) : Number(current.unread || 0),
			role: normalizeRole(current.role || message.senderRole || 'user')
		};
		chats.value.splice(index, 1);
		chats.value.unshift(merged);
	} else {
		chats.value.unshift(normalizeChat({
			id: chatId,
			name: message.sender || '客户',
			phone: String(message.senderId || ''),
			avatar: message.avatar || '',
			lastMessage: preview,
			time: nextTime,
			unread: incoming ? 1 : 0,
			role: normalizeRole(message.senderRole || 'user'),
			updatedAt
		}));
	}

	syncMessageRecord(message);
	persistChats();
}

function onMessagesCleared(payload = {}) {
	const chatId = normalizeChatId(payload.chatId);
	if (!chatId) return;
	const index = chats.value.findIndex(item => normalizeChatId(item.id) === chatId);
	if (index < 0) return;

	const updated = {
		...chats.value[index],
		msg: '[会话已清空]',
		lastMessage: '[会话已清空]',
		updatedAt: Date.now()
	};
	chats.value.splice(index, 1, updated);
	persistChats();
}

async function persistChats() {
	if (!chats.value.length) return;
	try {
		await db.saveChats(chats.value);
	} catch (err) {
		console.error('保存会话缓存失败:', err);
	}
}

function goChat(chat) {
	const role = normalizeRole(chat.role || 'user');
	const targetId = chat.phone || chat.id;

	socketService.emit('mark_all_read', { chatId: chat.id });
	const idx = chats.value.findIndex(item => String(item.id) === String(chat.id));
	if (idx >= 0) {
		chats.value[idx].unread = 0;
	}

	uni.navigateTo({
		url: `/pages/chat-detail/chat-detail?id=${encodeURIComponent(chat.id)}&name=${encodeURIComponent(chat.name || 'Chat')}&role=${role}&targetId=${encodeURIComponent(String(targetId || ''))}`
	});
}

function toggleQuickMenu() {
	showQuickMenu.value = !showQuickMenu.value;
}

function closeQuickMenu() {
	showQuickMenu.value = false;
}

function openSearchPanel() {
	closeQuickMenu();
	showSearchPanel.value = true;
	searchTried.value = false;
}

function closeSearchPanel() {
	showSearchPanel.value = false;
	searching.value = false;
	searchResults.value = [];
}

async function submitQrLoginDecision(scanText, approve) {
	await http.post(API_CONFIG.API.QR_LOGIN_CONFIRM, {
		scanText,
		approve: Boolean(approve)
	});
}

function handleScan() {
	closeQuickMenu();
	uni.scanCode({
		onlyFromCamera: false,
		success: (res) => {
			const value = String(res.result || '').trim();
			if (!value) {
				uni.showToast({ title: '未识别到内容', icon: 'none' });
				return;
			}

			if (!looksLikeWebLoginQr(value)) {
				uni.showToast({ title: '请扫描管理端网页登录二维码', icon: 'none' });
				return;
			}

			http.post(API_CONFIG.API.QR_LOGIN_SCAN, {
				scanText: value
			}).then(() => {
				uni.showModal({
					title: '网页登录确认',
					content: '检测到管理端 Web 登录请求，是否确认授权登录？',
					confirmText: '确认登录',
					cancelText: '拒绝',
					success: async (modalRes) => {
						try {
							await submitQrLoginDecision(value, Boolean(modalRes.confirm));
							uni.showToast({
								title: modalRes.confirm ? '已确认登录' : '已拒绝登录',
								icon: 'none'
							});
						} catch (err) {
							console.error('确认扫码登录失败:', err);
							uni.showToast({
								title: getRequestErrorMessage(err, '处理扫码登录失败'),
								icon: 'none'
							});
						}
					}
				});
			}).catch((err) => {
				console.error('扫码登录校验失败:', err);
				uni.showToast({
					title: getRequestErrorMessage(err, '二维码无效或已过期'),
					icon: 'none'
				});
			});
		},
		fail: () => {
			uni.showToast({ title: '扫码已取消', icon: 'none' });
		}
	});
}

async function searchTargets() {
	const keyword = searchKeyword.value.trim();
	if (!keyword) {
		uni.showToast({ title: '请输入ID或手机号', icon: 'none' });
		return;
	}
	searching.value = true;
	searchTried.value = true;
	searchResults.value = [];
	try {
		const res = await http.get(API_CONFIG.API.CHAT_SEARCH_TARGETS, {
			q: keyword,
			limit: 30
		});
		const raw = Array.isArray(res?.targets) ? res.targets : (Array.isArray(res) ? res : []);
		searchResults.value = raw
			.map(normalizeSearchTarget)
			.filter(item => item.chatId && item.role);
	} catch (err) {
		console.error('搜索聊天对象失败:', err);
		uni.showToast({ title: '搜索失败，请稍后重试', icon: 'none' });
	} finally {
		searching.value = false;
	}
}

function syncMessageRecord(message = {}) {
	const chatId = String(message.chatId || '');
	if (!chatId) return;

	http.post(API_CONFIG.API.CHAT_SYNC_MESSAGE, {
		chatId,
		externalMessageId: message.id || '',
		senderId: String(message.senderId || ''),
		senderRole: String(message.senderRole || 'user'),
		senderName: String(message.sender || ''),
		content: String(message.content || ''),
		messageType: String(message.messageType || message.type || 'text'),
		coupon: message.coupon || null,
		order: message.order || null,
		imageUrl: message.imageUrl || '',
		avatar: message.avatar || '',
		targetType: normalizeRole(message.senderRole || 'user'),
		targetId: String(message.senderId || chatId),
		targetPhone: String(message.senderId || ''),
		targetName: String(message.sender || ''),
		targetAvatar: String(message.avatar || '')
	}).catch((err) => {
		console.error('同步会话消息失败:', err);
	});
}

async function createConversation(target) {
	const payload = {
		targetType: normalizeRole(target.role),
		targetId: target.uid || target.id || target.chatId,
		targetPhone: target.phone,
		targetName: target.name,
		targetAvatar: target.avatar
	};

	try {
		const res = await http.post(API_CONFIG.API.CHAT_UPSERT_CONVERSATION, payload);
		const chat = normalizeChat({
			id: String(res?.chatId || target.chatId || payload.targetId || ''),
			name: String(res?.name || target.name || roleLabel(target.role)),
			phone: String(res?.phone || target.phone || ''),
			role: String(res?.role || target.role || 'user'),
			avatar: String(res?.avatar || target.avatar || ''),
			lastMessage: String(res?.lastMessage || '[暂无消息]'),
			time: String(res?.time || '--:--'),
			unread: 0,
			updatedAt: Number(res?.updatedAt || Date.now())
		});

		if (!chat.id) {
			uni.showToast({ title: '创建会话失败', icon: 'none' });
			return;
		}

		const idx = chats.value.findIndex(item => String(item.id) === String(chat.id));
		if (idx >= 0) {
			chats.value.splice(idx, 1);
		}
		chats.value.unshift(chat);
		persistChats();
		closeSearchPanel();
		goChat(chat);
	} catch (err) {
		console.error('创建会话失败:', err);
		uni.showToast({ title: '创建会话失败', icon: 'none' });
	}
}
</script>

<style src="./chat.css"></style>
