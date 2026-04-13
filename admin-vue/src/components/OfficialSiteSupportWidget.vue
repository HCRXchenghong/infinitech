<template>
  <div v-if="storageAllowed" class="site-support-widget">
    <transition name="site-chat-panel">
      <section v-if="panelOpen" class="site-chat-panel">
        <header class="site-chat-header">
          <div>
            <div class="site-chat-title">在线客服</div>
            <div class="site-chat-subtitle">{{ isRealtimeConnected ? '实时在线' : '自动同步中' }}</div>
          </div>
          <button type="button" class="site-chat-close" @click="panelOpen = false">×</button>
        </header>

        <div ref="messageListRef" class="site-chat-messages no-scrollbar" v-loading="loadingMessages">
          <div v-if="!sessionToken && !messages.length" class="site-chat-row">
            <div class="site-chat-bubble site-chat-bubble-admin">
              您好，这里是悦享e食官方客服，请问有什么可以帮您？
            </div>
          </div>

          <div v-for="msg in messages" :key="messageKey(msg)" class="site-chat-row" :class="{ self: msg.sender_type === 'visitor' }">
            <div class="site-chat-meta">
              {{ msg.sender_type === 'admin' ? '客服' : '您' }} {{ formatDateTime(msg.created_at) }}
            </div>
            <div class="site-chat-bubble" :class="msg.sender_type === 'visitor' ? 'site-chat-bubble-self' : 'site-chat-bubble-admin'">
              {{ msg.content }}
            </div>
          </div>

          <el-empty
            v-if="!loadingMessages && sessionToken && messages.length === 0"
            description="还没有聊天记录"
            :image-size="64"
          />
        </div>

        <div class="site-chat-composer">
          <div class="site-chat-tip">{{ supportActionTip }}</div>
          <div class="site-chat-form">
            <el-input
              ref="inputRef"
              v-model="replyContent"
              placeholder="输入消息..."
              maxlength="500"
              @keyup.enter="sendMessage"
            />
            <el-button type="primary" :loading="creating || sending" @click="sendMessage">发送</el-button>
          </div>
        </div>
      </section>
    </transition>

    <button type="button" class="site-chat-trigger" @click="togglePanel">
      <svg viewBox="0 0 24 24" aria-hidden="true" class="site-chat-trigger-icon">
        <path
          d="M7 18.5c-1.2 0-2.2-1-2.2-2.2V7.7c0-1.2 1-2.2 2.2-2.2h10c1.2 0 2.2 1 2.2 2.2v8.6c0 1.2-1 2.2-2.2 2.2H10.4L7 21v-2.5Z"
          fill="none"
          stroke="currentColor"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="1.8"
        />
        <path d="M8.5 10.2h7M8.5 13.6h4.8" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.8" />
      </svg>
      <span v-if="triggerBadge" class="site-chat-trigger-badge">{{ triggerBadge }}</span>
    </button>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
import {
  appendOfficialSiteSupportMessage,
  createOfficialSiteSupportSession,
  extractErrorMessage,
  formatDateTime,
  getOfficialSiteSupportMessages,
  getOfficialSiteSupportSocketToken
} from '@/utils/officialSiteApi';
import {
  createOfficialSiteNotifySocket,
  OFFICIAL_SITE_SUPPORT_MESSAGE_EVENT,
  OFFICIAL_SITE_SUPPORT_SESSION_EVENT
} from '@/utils/officialSiteRealtime';
import {
  loadNotificationSoundRuntime,
  playMessageNotificationSound,
  unlockNotificationAudio
} from '@/utils/notificationSound';
import {
  persistOfficialSiteSupportToken,
  readOfficialSiteSupportToken,
  clearOfficialSiteSupportToken,
  getSiteCookieConsent,
  SITE_COOKIE_CONSENT_EVENT,
  syncOfficialSiteSupportTokenStorage
} from '@/utils/siteCookieConsent';

const PANEL_OPEN_EVENT = 'official-site-open-support';
const FALLBACK_POLL_INTERVAL_MS = 20000;
const READ_SYNC_DELAY_MS = 320;

const consentStatus = ref(getSiteCookieConsent());
const panelOpen = ref(false);
const sessionToken = ref('');
const session = ref(null);
const messages = ref([]);
const creating = ref(false);
const loadingMessages = ref(false);
const sending = ref(false);
const replyContent = ref('');
const inputRef = ref(null);
const messageListRef = ref(null);
const isRealtimeConnected = ref(false);
const realtimeStatus = ref('idle');

let socket = null;
let pollTimer = 0;
let readSyncTimer = 0;
let connectSequence = 0;
let autoOpenedOnce = false;
let audioUnlockBound = false;

const storageAllowed = computed(() => consentStatus.value === 'accepted');

const triggerBadge = computed(() => {
  const unread = Number(session.value?.unread_visitor_count || 0);
  if (!unread || panelOpen.value) {
    return '';
  }
  return unread > 99 ? '99+' : String(unread);
});

const supportActionTip = computed(() => {
  if (!sessionToken.value) {
    return '首次发送会自动创建会话';
  }
  if (isRealtimeConnected.value) {
    return '当前为实时消息同步';
  }
  return '实时链路异常时会自动切换为慢速同步';
});

onMounted(() => {
  void loadNotificationSoundRuntime();
  hydrateStoredToken(false);
  maybeAutoOpenPanel();
  bindAudioUnlockGestures();

  window.addEventListener(PANEL_OPEN_EVENT, openPanelFromEvent);
  window.addEventListener(SITE_COOKIE_CONSENT_EVENT, handleCookieConsentChange);
  window.addEventListener('storage', handleCookieConsentChange);
});

onBeforeUnmount(() => {
  window.removeEventListener(PANEL_OPEN_EVENT, openPanelFromEvent);
  window.removeEventListener(SITE_COOKIE_CONSENT_EVENT, handleCookieConsentChange);
  window.removeEventListener('storage', handleCookieConsentChange);
  stopFallbackPolling();
  clearReadSyncTimer();
  destroySocket();
  unbindAudioUnlockGestures();
});

watch(panelOpen, (opened) => {
  if (opened) {
    focusInputSoon();
    if (sessionToken.value) {
      void bootstrapRealtime(false);
      void reloadMessages(true);
    }
    startFallbackPolling();
    return;
  }
  stopFallbackPolling();
});

watch(messages, async () => {
  await nextTick();
  scrollMessagesToBottom();
});

function openPanelFromEvent() {
  if (!storageAllowed.value) {
    return;
  }
  autoOpenedOnce = true;
  panelOpen.value = true;
}

function handleCookieConsentChange() {
  consentStatus.value = getSiteCookieConsent();
  if (!storageAllowed.value) {
    panelOpen.value = false;
    resetSupportSession();
    return;
  }
  hydrateStoredToken(true);
  maybeAutoOpenPanel();
}

function togglePanel() {
  if (!storageAllowed.value) {
    return;
  }
  void unlockNotificationAudio();
  panelOpen.value = !panelOpen.value;
  if (panelOpen.value) {
    autoOpenedOnce = true;
  }
}

function maybeAutoOpenPanel() {
  if (!storageAllowed.value || autoOpenedOnce) {
    return;
  }
  autoOpenedOnce = true;
  panelOpen.value = true;
}

function hydrateStoredToken(reloadIfExists) {
  if (!storageAllowed.value) {
    return;
  }
  const storedToken = syncOfficialSiteSupportTokenStorage() || readOfficialSiteSupportToken();
  if (!storedToken) {
    if (sessionToken.value) {
      resetSupportSession();
    }
    return;
  }
  if (storedToken !== sessionToken.value) {
    sessionToken.value = storedToken;
    void bootstrapRealtime(false);
  }
  if (reloadIfExists && panelOpen.value) {
    void reloadMessages(true);
  }
}

function focusInputSoon() {
  window.setTimeout(() => {
    inputRef.value?.focus?.();
  }, 80);
}

function startFallbackPolling() {
  stopFallbackPolling();
  pollTimer = window.setInterval(() => {
    if (!panelOpen.value || !sessionToken.value || isRealtimeConnected.value) {
      return;
    }
    void reloadMessages({
      silent: true,
      notifyOnNewAdminMessages: true
    });
  }, FALLBACK_POLL_INTERVAL_MS);
}

function stopFallbackPolling() {
  if (pollTimer) {
    window.clearInterval(pollTimer);
    pollTimer = 0;
  }
}

function clearReadSyncTimer() {
  if (readSyncTimer) {
    window.clearTimeout(readSyncTimer);
    readSyncTimer = 0;
  }
}

function scheduleReadSync() {
  if (!panelOpen.value || !sessionToken.value) {
    return;
  }
  clearReadSyncTimer();
  readSyncTimer = window.setTimeout(() => {
    readSyncTimer = 0;
    void reloadMessages(true);
  }, READ_SYNC_DELAY_MS);
}

function destroySocket() {
  if (socket) {
    socket.off('connect', handleSocketConnect);
    socket.off('disconnect', handleSocketDisconnect);
    socket.off('connect_error', handleSocketConnectError);
    socket.off(OFFICIAL_SITE_SUPPORT_MESSAGE_EVENT, handleRealtimeMessage);
    socket.off(OFFICIAL_SITE_SUPPORT_SESSION_EVENT, handleRealtimeSession);
    socket.disconnect();
    socket = null;
  }
  isRealtimeConnected.value = false;
  realtimeStatus.value = sessionToken.value ? 'fallback' : 'idle';
}

function handleSocketConnect() {
  isRealtimeConnected.value = true;
  realtimeStatus.value = 'connected';
}

function handleSocketDisconnect() {
  isRealtimeConnected.value = false;
  realtimeStatus.value = sessionToken.value ? 'fallback' : 'idle';
}

function handleSocketConnectError() {
  isRealtimeConnected.value = false;
  realtimeStatus.value = sessionToken.value ? 'fallback' : 'idle';
}

function attachSocket(socketToken) {
  destroySocket();
  realtimeStatus.value = 'connecting';
  socket = createOfficialSiteNotifySocket(socketToken);
  socket.on('connect', handleSocketConnect);
  socket.on('disconnect', handleSocketDisconnect);
  socket.on('connect_error', handleSocketConnectError);
  socket.on(OFFICIAL_SITE_SUPPORT_MESSAGE_EVENT, handleRealtimeMessage);
  socket.on(OFFICIAL_SITE_SUPPORT_SESSION_EVENT, handleRealtimeSession);
}

async function bootstrapRealtime(showError) {
  if (!sessionToken.value) {
    return;
  }

  const sequence = ++connectSequence;
  realtimeStatus.value = 'connecting';

  try {
    const data = await getOfficialSiteSupportSocketToken(sessionToken.value);
    if (sequence !== connectSequence) {
      return;
    }

    const socketToken = String(data?.token || '').trim();
    const sessionPayload = data?.session || null;
    const nextToken = String(sessionPayload?.token || sessionToken.value).trim();

    if (!socketToken || !nextToken) {
      throw new Error('socket token missing');
    }

    sessionToken.value = nextToken;
    persistOfficialSiteSupportToken(nextToken);
    session.value = mergeSessionPayload(session.value, sessionPayload);
    attachSocket(socketToken);
  } catch (error) {
    if (sequence !== connectSequence) {
      return;
    }

    const status = Number(error?.response?.status || 0);
    if (status === 400 || status === 404) {
      resetSupportSession();
      if (showError) {
        ElMessage.error('客服会话已失效，请重新发送消息');
      }
      return;
    }

    realtimeStatus.value = sessionToken.value ? 'fallback' : 'idle';
    if (showError) {
      ElMessage.warning('实时连接暂不可用，已切换为自动同步');
    }
  }
}

async function reloadMessages(options = {}) {
  const normalizedOptions = typeof options === 'boolean'
    ? { silent: options, notifyOnNewAdminMessages: false }
    : (options || {});
  const silent = normalizedOptions.silent === true;
  const notifyOnNewAdminMessages = normalizedOptions.notifyOnNewAdminMessages === true;

  if (!sessionToken.value) {
    return;
  }

  const previousMessages = Array.isArray(messages.value) ? [...messages.value] : [];
  if (!silent) {
    loadingMessages.value = true;
  }

  try {
    const data = await getOfficialSiteSupportMessages(sessionToken.value);
    session.value = mergeSessionPayload(session.value, data?.session || null);
    const nextMessages = normalizeMessages(Array.isArray(data?.messages) ? data.messages : []);
    const hasNewAdminMessages = notifyOnNewAdminMessages && findNewAdminMessages(previousMessages, nextMessages);
    messages.value = nextMessages;
    if (hasNewAdminMessages) {
      playMessageNotificationSound();
      if (panelOpen.value) {
        scheduleReadSync();
      }
    }
  } catch (error) {
    resetSupportSession();
    if (!silent) {
      ElMessage.error(extractErrorMessage(error, '客服会话已失效，请重新发送消息'));
    }
  } finally {
    loadingMessages.value = false;
  }
}

async function sendMessage() {
  void unlockNotificationAudio();
  const content = replyContent.value.trim();
  if (!content) {
    ElMessage.warning('请输入消息内容');
    return;
  }

  if (!sessionToken.value) {
    await createSession(content);
    return;
  }

  sending.value = true;
  try {
    const data = await appendOfficialSiteSupportMessage(sessionToken.value, { content });
    const message = data?.data || null;
    if (message) {
      messages.value = mergeMessages(messages.value, [message]);
    }
    session.value = mergeSessionPayload(session.value, {
      status: 'open',
      unread_visitor_count: 0,
      last_actor: 'visitor',
      last_message_preview: content,
      last_message_at: new Date().toISOString()
    });
    replyContent.value = '';
  } catch (error) {
    ElMessage.error(extractErrorMessage(error, '发送失败'));
  } finally {
    sending.value = false;
  }
}

async function createSession(content) {
  creating.value = true;
  try {
    const data = await createOfficialSiteSupportSession({
      nickname: '',
      contact: '',
      initial_message: content
    });

    const sessionPayload = data?.session || null;
    const nextToken = String(sessionPayload?.token || '').trim();
    if (!nextToken) {
      throw new Error('会话创建成功但未返回 token');
    }

    sessionToken.value = nextToken;
    persistOfficialSiteSupportToken(nextToken);
    session.value = mergeSessionPayload(session.value, sessionPayload);
    messages.value = normalizeMessages(Array.isArray(data?.messages) ? data.messages : []);
    replyContent.value = '';
    await bootstrapRealtime(false);
    ElMessage.success('已接入在线客服');
  } catch (error) {
    ElMessage.error(extractErrorMessage(error, '发起咨询失败'));
  } finally {
    creating.value = false;
  }
}

function handleRealtimeMessage(payload) {
  if (!matchesCurrentSession(payload)) {
    return;
  }

  session.value = mergeSessionPayload(session.value, payload?.session || null);
  if (payload?.message) {
    messages.value = mergeMessages(messages.value, [payload.message]);
    if (payload.message.sender_type === 'admin') {
      playMessageNotificationSound();
    }
  }

  if (panelOpen.value && payload?.message?.sender_type === 'admin') {
    scheduleReadSync();
  }
}

function handleRealtimeSession(payload) {
  if (!matchesCurrentSession(payload)) {
    return;
  }

  session.value = mergeSessionPayload(session.value, payload?.session || null);
}

function matchesCurrentSession(payload) {
  const payloadToken = String(payload?.session_token || payload?.session?.token || '').trim();
  return Boolean(payloadToken) && payloadToken === sessionToken.value;
}

function resetSupportSession() {
  connectSequence += 1;
  clearOfficialSiteSupportToken();
  clearReadSyncTimer();
  stopFallbackPolling();
  destroySocket();
  sessionToken.value = '';
  session.value = null;
  messages.value = [];
  realtimeStatus.value = 'idle';
}

function mergeSessionPayload(currentValue, payload) {
  if (!payload || typeof payload !== 'object') {
    return currentValue || null;
  }
  return {
    ...(currentValue || {}),
    ...payload
  };
}

function normalizeMessages(items) {
  return mergeMessages([], items);
}

function mergeMessages(existing, incoming) {
  const merged = new Map();
  [...(Array.isArray(existing) ? existing : []), ...(Array.isArray(incoming) ? incoming : [])].forEach((item) => {
    if (!item || typeof item !== 'object') {
      return;
    }
    merged.set(messageKey(item), item);
  });

  return Array.from(merged.values()).sort(compareMessages);
}

function messageKey(message) {
  if (message?.id) return `id:${message.id}`;
  if (message?.legacy_id) return `legacy:${message.legacy_id}`;
  return `${message?.sender_type || 'unknown'}:${message?.created_at || ''}:${message?.content || ''}`;
}

function compareMessages(left, right) {
  const leftTime = Date.parse(left?.created_at || '') || 0;
  const rightTime = Date.parse(right?.created_at || '') || 0;
  if (leftTime !== rightTime) {
    return leftTime - rightTime;
  }
  return messageKey(left).localeCompare(messageKey(right));
}

function findNewAdminMessages(previousMessages, nextMessages) {
  if (!Array.isArray(nextMessages) || nextMessages.length === 0) {
    return false;
  }
  const seen = new Set(
    (Array.isArray(previousMessages) ? previousMessages : []).map((item) => messageKey(item))
  );
  return nextMessages.some((item) => item?.sender_type === 'admin' && !seen.has(messageKey(item)));
}

function scrollMessagesToBottom() {
  if (!messageListRef.value) {
    return;
  }
  messageListRef.value.scrollTop = messageListRef.value.scrollHeight;
}

function handleAudioUnlockGesture() {
  void unlockNotificationAudio().then((unlocked) => {
    if (unlocked) {
      unbindAudioUnlockGestures();
    }
  });
}

function bindAudioUnlockGestures() {
  if (audioUnlockBound || typeof window === 'undefined') {
    return;
  }
  audioUnlockBound = true;
  window.addEventListener('click', handleAudioUnlockGesture, { passive: true });
  window.addEventListener('pointerdown', handleAudioUnlockGesture, { passive: true });
  window.addEventListener('keydown', handleAudioUnlockGesture);
  window.addEventListener('touchstart', handleAudioUnlockGesture, { passive: true });
}

function unbindAudioUnlockGestures() {
  if (!audioUnlockBound || typeof window === 'undefined') {
    return;
  }
  audioUnlockBound = false;
  window.removeEventListener('click', handleAudioUnlockGesture);
  window.removeEventListener('pointerdown', handleAudioUnlockGesture);
  window.removeEventListener('keydown', handleAudioUnlockGesture);
  window.removeEventListener('touchstart', handleAudioUnlockGesture);
}
</script>

<style scoped>
.site-support-widget {
  position: fixed;
  right: 28px;
  bottom: calc(28px + env(safe-area-inset-bottom));
  z-index: 60;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 12px;
}

.site-chat-trigger {
  position: relative;
  width: 56px;
  height: 56px;
  border: 0;
  border-radius: 999px;
  background: #0f63c9;
  color: #ffffff;
  box-shadow: 0 18px 34px rgb(15 99 201 / 0.36);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease;
}

.site-chat-trigger:hover {
  background: #0c56ae;
  box-shadow: 0 20px 38px rgb(12 86 174 / 0.42);
}

.site-chat-trigger:active {
  transform: translateY(1px) scale(0.98);
}

.site-chat-trigger-icon {
  width: 25px;
  height: 25px;
}

.site-chat-trigger-badge {
  position: absolute;
  top: -3px;
  right: -3px;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  border-radius: 999px;
  background: #ef4444;
  color: #ffffff;
  border: 2px solid #ffffff;
  font-size: 10px;
  font-weight: 700;
  line-height: 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.site-chat-panel {
  width: min(372px, calc(100vw - 32px));
  height: min(500px, calc(100dvh - 124px));
  border-radius: 20px;
  overflow: hidden;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  box-shadow: 0 24px 60px rgb(15 23 42 / 0.18);
  display: flex;
  flex-direction: column;
}

.site-chat-header {
  padding: 14px 16px;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #ffffff;
}

.site-chat-title {
  font-size: 16px;
  font-weight: 700;
  color: #0f172a;
}

.site-chat-subtitle {
  margin-top: 4px;
  font-size: 12px;
  color: #64748b;
}

.site-chat-close {
  width: 32px;
  height: 32px;
  border: 0;
  border-radius: 999px;
  background: #f8fafc;
  color: #475569;
  font-size: 18px;
  line-height: 32px;
  cursor: pointer;
}

.site-chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 14px 14px 10px;
  background: #f8fafc;
}

.site-chat-row {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  margin-bottom: 12px;
}

.site-chat-row.self {
  align-items: flex-end;
}

.site-chat-meta {
  margin-bottom: 4px;
  font-size: 11px;
  color: #94a3b8;
}

.site-chat-bubble {
  max-width: 84%;
  padding: 10px 12px;
  border-radius: 14px;
  font-size: 13px;
  line-height: 1.65;
  word-break: break-word;
}

.site-chat-bubble-admin {
  background: #ffffff;
  color: #334155;
  border: 1px solid #e2e8f0;
  border-top-left-radius: 4px;
}

.site-chat-bubble-self {
  background: #1976d2;
  color: #ffffff;
  border-top-right-radius: 4px;
}

.site-chat-composer {
  padding: 12px 14px 14px;
  border-top: 1px solid #e2e8f0;
  background: #ffffff;
}

.site-chat-tip {
  margin-bottom: 10px;
  font-size: 11px;
  color: #94a3b8;
}

.site-chat-form {
  display: flex;
  gap: 8px;
  align-items: center;
}

.site-chat-form :deep(.el-input__wrapper) {
  box-shadow: 0 0 0 1px #e2e8f0 inset !important;
}

.site-chat-panel-enter-active,
.site-chat-panel-leave-active {
  transition: all 0.2s ease;
}

.site-chat-panel-enter-from,
.site-chat-panel-leave-to {
  opacity: 0;
  transform: translateY(10px) scale(0.98);
}

@media (max-width: 768px) {
  .site-support-widget {
    right: 16px;
    bottom: calc(16px + env(safe-area-inset-bottom));
  }

  .site-chat-panel {
    width: min(356px, calc(100vw - 20px));
    height: min(470px, calc(100dvh - 104px));
  }
}
</style>
