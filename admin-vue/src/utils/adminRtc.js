import { reactive } from 'vue';
import { ElMessage } from 'element-plus';

import request from './request';
import socketService from './socket';
import { getCurrentAdminSocketIdentity } from './runtime';
import {
  canUseRTCMedia,
  createRTCMediaSession,
} from '../../../shared/mobile-common/rtc-media.js';
import {
  DEFAULT_RTC_RUNTIME_SETTINGS,
  createRTCRuntimeSettingsLoader,
} from '../../../shared/mobile-common/rtc-runtime.js';

const DEFAULT_ENTRY_POINT = 'admin_chat_console';
const DEFAULT_SCENE = 'admin_support';
const DEFAULT_CLIENT_PLATFORM = 'web-admin';
const DEFAULT_CLIENT_KIND = 'admin-vue';
const RTC_NAMESPACE = '/rtc';

function trimValue(value) {
  return String(value ?? '').trim();
}

function normalizeParticipantRole(value) {
  switch (trimValue(value).toLowerCase()) {
    case 'shop':
    case 'merchant':
      return 'merchant';
    case 'customer':
    case 'user':
      return 'user';
    case 'rider':
      return 'rider';
    case 'admin':
    case 'support':
      return 'admin';
    default:
      return '';
  }
}

function normalizeCallId(value) {
  if (!value) return '';
  if (typeof value === 'object') {
    return trimValue(value.uid || value.callId || value.call_id_raw || value.call_id);
  }
  return trimValue(value);
}

function normalizeCallStatus(value) {
  return trimValue(value || 'initiated').toLowerCase();
}

function isWaitingStatus(value) {
  return ['initiated', 'ringing'].includes(normalizeCallStatus(value));
}

function isFinalStatus(value) {
  return ['rejected', 'cancelled', 'ended', 'timeout', 'failed', 'busy'].includes(
    normalizeCallStatus(value)
  );
}

function roleLabel(role) {
  switch (normalizeParticipantRole(role)) {
    case 'user':
      return '用户';
    case 'merchant':
      return '商家';
    case 'rider':
      return '骑手';
    case 'admin':
      return '管理员';
    default:
      return '联系人';
  }
}

function buildFallbackTargetName(role, explicitName, targetId, targetPhone) {
  const resolvedName = trimValue(explicitName);
  if (resolvedName) return resolvedName;

  const phone = trimValue(targetPhone);
  if (phone) {
    return `${roleLabel(role)} ${phone}`;
  }

  const id = trimValue(targetId);
  if (id) {
    return `${roleLabel(role)} #${id}`;
  }

  return roleLabel(role);
}

function cloneDefaultRuntimeSettings() {
  return {
    ...DEFAULT_RTC_RUNTIME_SETTINGS,
    iceServers: DEFAULT_RTC_RUNTIME_SETTINGS.iceServers.map((item) => ({ ...item })),
  };
}

function normalizeSearchTargetsResponse(payload) {
  if (Array.isArray(payload?.targets)) return payload.targets;
  if (Array.isArray(payload?.data?.targets)) return payload.data.targets;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload)) return payload;
  return [];
}

function buildStatusMeta(status) {
  switch (normalizeCallStatus(status)) {
    case 'ringing':
      return {
        text: '等待接听',
        hint: 'RTC 呼叫已发起，正在等待对方响应。'
      };
    case 'accepted':
      return {
        text: '已接通',
        hint: '通话已接通，正在协商或传输音频。'
      };
    case 'rejected':
      return {
        text: '已拒绝',
        hint: '对方拒绝了本次 RTC 通话。'
      };
    case 'cancelled':
      return {
        text: '已取消',
        hint: '发起方已取消本次呼叫。'
      };
    case 'ended':
      return {
        text: '已结束',
        hint: '本次通话已结束。'
      };
    case 'timeout':
      return {
        text: '无人接听',
        hint: '对方未在有效时间内响应，本次呼叫已超时。'
      };
    case 'failed':
      return {
        text: '呼叫失败',
        hint: '当前呼叫未能正常建立，请稍后重试。'
      };
    case 'busy':
      return {
        text: '对方忙线',
        hint: '对方当前已有进行中的通话。'
      };
    default:
      return {
        text: '发起中',
        hint: '正在创建 RTC 会话。'
      };
  }
}

function buildMediaStatusText(stage, mediaSupported, remoteAudioReady) {
  if (!mediaSupported) {
    return '当前设备不支持 WebRTC 音频';
  }
  if (remoteAudioReady) {
    return '远端音频已接入';
  }
  switch (trimValue(stage)) {
    case 'local-ready':
      return '麦克风已就绪';
    case 'offer-sent':
      return '已发送 offer';
    case 'answer-sent':
      return '已发送 answer';
    case 'streaming':
      return '远端音频已接入';
    case 'connected':
      return '连接已建立';
    case 'ending':
      return '正在结束';
    default:
      return '等待协商';
  }
}

const adminRTCState = reactive({
  bridgeConnected: false,
  visible: false,
  mode: 'outgoing',
  callId: '',
  conversationId: '',
  orderId: '',
  entryPoint: DEFAULT_ENTRY_POINT,
  scene: DEFAULT_SCENE,
  targetRole: '',
  targetId: '',
  targetName: '',
  targetPhone: '',
  status: 'initiated',
  calleeOnline: false,
  errorMessage: '',
  busy: false,
  mediaSupported: canUseRTCMedia(),
  mediaStage: 'idle',
  remoteAudioReady: false,
  statusText: buildStatusMeta('initiated').text,
  statusHint: buildStatusMeta('initiated').hint,
  mediaStatusText: buildMediaStatusText('idle', canUseRTCMedia(), false),
  runtimeSettings: cloneDefaultRuntimeSettings(),
});

const runtimeLoader = createRTCRuntimeSettingsLoader(async () => {
  const { data } = await request.get('/api/public/runtime-settings');
  return data?.data || data || {};
});

let rtcSocket = null;
let socketHandlers = null;
let mediaSession = null;
let offerSent = false;
let answerSent = false;

function syncDerivedState() {
  const statusMeta = buildStatusMeta(adminRTCState.status);
  adminRTCState.statusText = statusMeta.text;
  adminRTCState.statusHint = adminRTCState.errorMessage || statusMeta.hint;
  adminRTCState.mediaStatusText = buildMediaStatusText(
    adminRTCState.mediaStage,
    adminRTCState.mediaSupported,
    adminRTCState.remoteAudioReady
  );
}

function resetTransientCallState() {
  adminRTCState.mode = 'outgoing';
  adminRTCState.callId = '';
  adminRTCState.conversationId = '';
  adminRTCState.orderId = '';
  adminRTCState.entryPoint = DEFAULT_ENTRY_POINT;
  adminRTCState.scene = DEFAULT_SCENE;
  adminRTCState.targetRole = '';
  adminRTCState.targetId = '';
  adminRTCState.targetName = '';
  adminRTCState.targetPhone = '';
  adminRTCState.status = 'initiated';
  adminRTCState.calleeOnline = false;
  adminRTCState.errorMessage = '';
  adminRTCState.busy = false;
  adminRTCState.mediaStage = 'idle';
  adminRTCState.remoteAudioReady = false;
  offerSent = false;
  answerSent = false;
  syncDerivedState();
}

function clearCallDialogState() {
  adminRTCState.visible = false;
  resetTransientCallState();
}

function disposeMediaSession() {
  if (mediaSession && typeof mediaSession.stop === 'function') {
    mediaSession.stop();
  }
  mediaSession = null;
  adminRTCState.mediaStage = 'idle';
  adminRTCState.remoteAudioReady = false;
  offerSent = false;
  answerSent = false;
  syncDerivedState();
}

async function loadAdminRTCRuntimeSettings(force = false) {
  const runtimeSettings = await runtimeLoader.loadRTCRuntimeSettings(force);
  adminRTCState.runtimeSettings = runtimeSettings;
  syncDerivedState();
  return runtimeSettings;
}

function buildSignalMeta() {
  return {
    orderId: adminRTCState.orderId,
    conversationId: adminRTCState.conversationId,
    entryPoint: adminRTCState.entryPoint || DEFAULT_ENTRY_POINT,
    scene: adminRTCState.scene || DEFAULT_SCENE,
    clientPlatform: DEFAULT_CLIENT_PLATFORM,
    clientKind: DEFAULT_CLIENT_KIND,
  };
}

function applyCallRecord(record, options = {}) {
  if (!record) return;

  const direction = trimValue(options.direction || adminRTCState.mode).toLowerCase();
  const callId = normalizeCallId(record);
  if (callId) {
    adminRTCState.callId = callId;
  }

  adminRTCState.status = normalizeCallStatus(record.status);
  adminRTCState.orderId = trimValue(
    record.orderId || record.order_id || adminRTCState.orderId
  );
  adminRTCState.conversationId = trimValue(
    record.conversationId || record.conversation_id || adminRTCState.conversationId
  );

  if (direction === 'incoming') {
    adminRTCState.targetRole = normalizeParticipantRole(
      record.callerRole || record.caller_role || adminRTCState.targetRole
    );
    adminRTCState.targetId = trimValue(
      record.callerId || record.caller_id || adminRTCState.targetId
    );
    adminRTCState.targetPhone = trimValue(
      record.callerPhone || record.caller_phone || adminRTCState.targetPhone
    );
  } else {
    adminRTCState.targetRole = normalizeParticipantRole(
      record.calleeRole || record.callee_role || adminRTCState.targetRole
    );
    adminRTCState.targetId = trimValue(
      record.calleeId || record.callee_id || adminRTCState.targetId
    );
    adminRTCState.targetPhone = trimValue(
      record.calleePhone || record.callee_phone || adminRTCState.targetPhone
    );
  }

  adminRTCState.targetName = buildFallbackTargetName(
    adminRTCState.targetRole,
    adminRTCState.targetName,
    adminRTCState.targetId,
    adminRTCState.targetPhone
  );
  syncDerivedState();
}

async function searchChatTargets(keyword) {
  const q = trimValue(keyword);
  if (!q) return [];

  const { data } = await request.get('/api/messages/targets/search', {
    params: {
      q,
      limit: 20,
    },
  });
  return normalizeSearchTargetsResponse(data);
}

function pickSearchCandidate(candidates, context, role) {
  const normalizedRole = normalizeParticipantRole(role);
  if (!normalizedRole) return null;

  const targetId = trimValue(context.targetId);
  const chatId = trimValue(context.chatId || context.id);
  const phone = trimValue(context.phone);
  const name = trimValue(context.name);

  const normalizedCandidates = (candidates || []).filter(
    (item) => normalizeParticipantRole(item?.role) === normalizedRole
  );
  if (normalizedCandidates.length === 0) return null;

  const exact = normalizedCandidates.find((item) => {
    const legacyId = trimValue(item?.legacyId);
    const id = trimValue(item?.id);
    const uid = trimValue(item?.uid);
    const itemChatId = trimValue(item?.chatId);
    return (
      (targetId && [legacyId, id, uid, itemChatId].includes(targetId)) ||
      (chatId && [legacyId, id, uid, itemChatId].includes(chatId)) ||
      (phone && trimValue(item?.phone) === phone)
    );
  });
  if (exact) return exact;

  const nameMatch = normalizedCandidates.find((item) => {
    return name && trimValue(item?.name) === name;
  });
  if (nameMatch) return nameMatch;

  return normalizedCandidates[0] || null;
}

async function resolveRTCTarget(context = {}) {
  const role = normalizeParticipantRole(context.role || context.targetRole);
  if (!role || role === 'admin') {
    throw new Error('当前会话不支持发起 RTC 通话');
  }

  const directNumericTargetId = trimValue(context.targetLegacyId || context.legacyId || context.targetId);
  if (/^\d+$/.test(directNumericTargetId)) {
    return {
      role,
      targetId: directNumericTargetId,
      targetPhone: trimValue(context.phone || context.targetPhone),
      targetName: buildFallbackTargetName(
        role,
        context.name || context.targetName,
        directNumericTargetId,
        context.phone || context.targetPhone
      ),
    };
  }

  const fallbackChatId = trimValue(context.chatId || context.id);
  if (/^\d+$/.test(fallbackChatId)) {
    return {
      role,
      targetId: fallbackChatId,
      targetPhone: trimValue(context.phone || context.targetPhone),
      targetName: buildFallbackTargetName(
        role,
        context.name || context.targetName,
        fallbackChatId,
        context.phone || context.targetPhone
      ),
    };
  }

  const searchKeywords = Array.from(
    new Set([
      trimValue(context.targetId),
      trimValue(context.phone || context.targetPhone),
      trimValue(context.name || context.targetName),
      fallbackChatId,
    ].filter(Boolean))
  );

  for (const keyword of searchKeywords) {
    const targets = await searchChatTargets(keyword);
    const matched = pickSearchCandidate(targets, context, role);
    if (!matched) continue;

    const resolvedTargetId = trimValue(matched.legacyId || matched.id || matched.chatId);
    if (!resolvedTargetId) continue;

    return {
      role,
      targetId: resolvedTargetId,
      targetPhone: trimValue(matched.phone || context.phone || context.targetPhone),
      targetName: buildFallbackTargetName(
        role,
        matched.name || context.name || context.targetName,
        resolvedTargetId,
        matched.phone || context.phone || context.targetPhone
      ),
    };
  }

  throw new Error('未能解析 RTC 呼叫目标，请先确认该会话对应的用户身份已完整入库');
}

function detachRTCBridgeSocket() {
  if (!rtcSocket || !socketHandlers) {
    socketHandlers = null;
    return;
  }

  Object.entries(socketHandlers).forEach(([eventName, handler]) => {
    rtcSocket.off(eventName, handler);
  });
  socketHandlers = null;
}

async function ensureMediaSession() {
  if (!adminRTCState.mediaSupported) {
    throw new Error('当前设备不支持 WebRTC 音频能力');
  }

  if (mediaSession) {
    return mediaSession;
  }

  mediaSession = createRTCMediaSession({
    iceServers: Array.isArray(adminRTCState.runtimeSettings?.iceServers)
      ? adminRTCState.runtimeSettings.iceServers
      : [],
    onIceCandidate: (candidate) => {
      if (!candidate || !rtcSocket || !adminRTCState.callId) return;
      rtcSocket.emit('rtc_signal', {
        callId: adminRTCState.callId,
        signalType: 'ice-candidate',
        signal: candidate,
        ...buildSignalMeta(),
      });
    },
    onTrack: () => {
      adminRTCState.remoteAudioReady = true;
      adminRTCState.mediaStage = 'streaming';
      syncDerivedState();
    },
    onConnectionStateChange: (state) => {
      if (state === 'connected') {
        adminRTCState.mediaStage = 'connected';
      } else if (state === 'failed') {
        adminRTCState.errorMessage = 'RTC 连接失败，请稍后重试';
      }
      syncDerivedState();
    },
  });

  await mediaSession.ensureLocalAudio();
  adminRTCState.mediaStage = 'local-ready';
  syncDerivedState();
  return mediaSession;
}

async function bootstrapAcceptedMedia() {
  if (!rtcSocket || !adminRTCState.callId || adminRTCState.status !== 'accepted') {
    return;
  }
  if (!adminRTCState.mediaSupported) {
    return;
  }

  const media = await ensureMediaSession();
  if (adminRTCState.mode === 'outgoing' && !offerSent) {
    const offer = await media.createOffer();
    rtcSocket.emit('rtc_signal', {
      callId: adminRTCState.callId,
      signalType: 'offer',
      signal: offer,
      ...buildSignalMeta(),
    });
    offerSent = true;
    adminRTCState.mediaStage = 'offer-sent';
    syncDerivedState();
  }
}

async function handleRTCSignal(payload = {}) {
  if (!payload || normalizeCallId(payload.callId) !== adminRTCState.callId) {
    return;
  }

  const signalType = trimValue(payload.signalType).toLowerCase();
  if (!signalType) {
    return;
  }

  const media = await ensureMediaSession();
  if (signalType === 'offer') {
    const answer = await media.applyOffer(payload.signal);
    answerSent = true;
    adminRTCState.mediaStage = 'answer-sent';
    syncDerivedState();
    rtcSocket.emit('rtc_signal', {
      callId: adminRTCState.callId,
      signalType: 'answer',
      signal: answer,
      ...buildSignalMeta(),
    });
    return;
  }

  if (signalType === 'answer') {
    await media.applyAnswer(payload.signal);
    adminRTCState.mediaStage = 'connected';
    syncDerivedState();
    return;
  }

  if (signalType === 'ice-candidate') {
    await media.addIceCandidate(payload.signal);
  }
}

function handleIncomingInvite(payload = {}) {
  const call = payload.call || payload || {};
  const incomingCallId = normalizeCallId(call) || normalizeCallId(payload.callId);
  if (!incomingCallId) {
    return;
  }

  if (adminRTCState.callId && adminRTCState.callId !== incomingCallId && !isFinalStatus(adminRTCState.status)) {
    ElMessage.warning('当前已有进行中的 RTC 通话，请先处理当前通话');
    return;
  }

  disposeMediaSession();
  resetTransientCallState();
  adminRTCState.visible = true;
  adminRTCState.mode = 'incoming';
  applyCallRecord(call, { direction: 'incoming' });
  adminRTCState.callId = incomingCallId;
  adminRTCState.targetName = buildFallbackTargetName(
    adminRTCState.targetRole,
    adminRTCState.targetName,
    adminRTCState.targetId,
    adminRTCState.targetPhone
  );
  syncDerivedState();

  if (rtcSocket) {
    rtcSocket.emit('rtc_join_call', { callId: incomingCallId });
  }
}

function attachRTCBridgeSocket(socket) {
  detachRTCBridgeSocket();
  rtcSocket = socket;
  if (!rtcSocket) {
    adminRTCState.bridgeConnected = false;
    return;
  }

  socketHandlers = {
    connect: () => {
      adminRTCState.bridgeConnected = true;
      syncDerivedState();
      if (adminRTCState.callId) {
        rtcSocket.emit('rtc_join_call', { callId: adminRTCState.callId });
      }
    },
    disconnect: () => {
      adminRTCState.bridgeConnected = false;
      syncDerivedState();
    },
    rtc_ready: () => {
      adminRTCState.bridgeConnected = true;
      syncDerivedState();
      if (adminRTCState.callId) {
        rtcSocket.emit('rtc_join_call', { callId: adminRTCState.callId });
      }
    },
    rtc_invite: (payload) => {
      handleIncomingInvite(payload);
    },
    rtc_call_created: async (payload) => {
      const call = payload?.call || payload || {};
      const nextCallId = normalizeCallId(call) || normalizeCallId(payload?.callId);
      if (adminRTCState.callId && nextCallId && nextCallId !== adminRTCState.callId) {
        return;
      }
      if (nextCallId) {
        adminRTCState.callId = nextCallId;
      }
      adminRTCState.calleeOnline = Boolean(payload?.calleeOnline);
      applyCallRecord(call, { direction: adminRTCState.mode });
      if (adminRTCState.status === 'accepted') {
        await bootstrapAcceptedMedia();
      }
    },
    rtc_status: async (payload) => {
      if (!payload || normalizeCallId(payload.callId) !== adminRTCState.callId) {
        return;
      }
      applyCallRecord(payload.call || payload, { direction: adminRTCState.mode });
      if (adminRTCState.status === 'accepted') {
        await bootstrapAcceptedMedia();
        return;
      }
      if (isFinalStatus(adminRTCState.status)) {
        adminRTCState.mediaStage = 'ending';
        syncDerivedState();
        disposeMediaSession();
      }
    },
    rtc_signal: async (payload) => {
      try {
        await handleRTCSignal(payload);
      } catch (error) {
        adminRTCState.errorMessage = error?.message || 'RTC 媒体协商失败';
        syncDerivedState();
      }
    },
    rtc_error: (payload) => {
      adminRTCState.errorMessage = trimValue(payload?.message) || 'RTC 信令处理失败';
      syncDerivedState();
    },
    connect_error: () => {
      adminRTCState.bridgeConnected = false;
      adminRTCState.errorMessage = 'RTC 连接失败，请检查网络后重试';
      syncDerivedState();
    },
    auth_error: () => {
      adminRTCState.bridgeConnected = false;
      adminRTCState.errorMessage = 'RTC 鉴权已失效，请重新登录后重试';
      syncDerivedState();
    },
  };

  Object.entries(socketHandlers).forEach(([eventName, handler]) => {
    rtcSocket.on(eventName, handler);
  });

  if (rtcSocket.connected) {
    adminRTCState.bridgeConnected = true;
    syncDerivedState();
    if (adminRTCState.callId) {
      rtcSocket.emit('rtc_join_call', { callId: adminRTCState.callId });
    }
  }
}

export async function ensureAdminRTCBridge() {
  const identity = getCurrentAdminSocketIdentity();
  if (!identity) {
    disconnectAdminRTCBridge();
    return null;
  }

  await loadAdminRTCRuntimeSettings();
  const socket = await socketService.connect(RTC_NAMESPACE);
  if (socket !== rtcSocket || !socketHandlers) {
    attachRTCBridgeSocket(socket);
  }
  return socket;
}

export function disconnectAdminRTCBridge() {
  detachRTCBridgeSocket();
  disposeMediaSession();
  clearCallDialogState();
  adminRTCState.bridgeConnected = false;
  socketService.disconnect(RTC_NAMESPACE);
  rtcSocket = null;
}

export async function startAdminRTCCall(context = {}) {
  await loadAdminRTCRuntimeSettings();
  if (adminRTCState.runtimeSettings.enabled === false) {
    throw new Error('RTC 通话当前已在系统设置中关闭');
  }
  if (adminRTCState.callId && !isFinalStatus(adminRTCState.status)) {
    throw new Error('当前已有进行中的 RTC 通话');
  }

  const socket = await ensureAdminRTCBridge();
  if (!socket) {
    throw new Error('RTC 连接尚未就绪，请稍后重试');
  }

  const target = await resolveRTCTarget(context);
  disposeMediaSession();
  resetTransientCallState();
  adminRTCState.visible = true;
  adminRTCState.mode = 'outgoing';
  adminRTCState.targetRole = target.role;
  adminRTCState.targetId = target.targetId;
  adminRTCState.targetPhone = target.targetPhone;
  adminRTCState.targetName = target.targetName;
  adminRTCState.conversationId = trimValue(context.chatId || context.conversationId || context.id);
  adminRTCState.orderId = trimValue(context.orderId);
  adminRTCState.entryPoint = trimValue(context.entryPoint) || DEFAULT_ENTRY_POINT;
  adminRTCState.scene = trimValue(context.scene) || DEFAULT_SCENE;
  syncDerivedState();

  const payload = {
    callType: 'audio',
    calleeRole: target.role,
    calleeId: target.targetId,
    calleePhone: target.targetPhone,
    conversationId: adminRTCState.conversationId,
    orderId: adminRTCState.orderId,
    entryPoint: adminRTCState.entryPoint,
    scene: adminRTCState.scene,
    clientPlatform: DEFAULT_CLIENT_PLATFORM,
    clientKind: DEFAULT_CLIENT_KIND,
  };

  const { data } = await request.post('/api/rtc/calls', payload);
  const call = data?.data || data;
  const callId = normalizeCallId(call);
  if (!callId) {
    throw new Error('RTC 呼叫创建成功但未返回有效 callId');
  }

  adminRTCState.callId = callId;
  applyCallRecord(call, { direction: 'outgoing' });
  rtcSocket.emit('rtc_start_call', {
    ...payload,
    callId,
  });
}

async function runRTCAction(action) {
  if (!rtcSocket || !adminRTCState.callId) {
    throw new Error('RTC 会话尚未就绪');
  }

  adminRTCState.busy = true;
  adminRTCState.errorMessage = '';
  syncDerivedState();
  try {
    await action();
  } finally {
    adminRTCState.busy = false;
    syncDerivedState();
  }
}

export async function acceptAdminRTCCall() {
  await runRTCAction(async () => {
    if (adminRTCState.mediaSupported) {
      await ensureMediaSession();
    }
    rtcSocket.emit('rtc_accept_call', {
      callId: adminRTCState.callId,
      ...buildSignalMeta(),
    });
  });
}

export async function rejectAdminRTCCall() {
  await runRTCAction(async () => {
    rtcSocket.emit('rtc_reject_call', {
      callId: adminRTCState.callId,
      ...buildSignalMeta(),
    });
  });
}

export async function cancelAdminRTCCall() {
  await runRTCAction(async () => {
    rtcSocket.emit('rtc_cancel_call', {
      callId: adminRTCState.callId,
      ...buildSignalMeta(),
    });
  });
}

export async function endAdminRTCCall() {
  await runRTCAction(async () => {
    adminRTCState.mediaStage = 'ending';
    syncDerivedState();
    rtcSocket.emit('rtc_end_call', {
      callId: adminRTCState.callId,
      ...buildSignalMeta(),
    });
    disposeMediaSession();
  });
}

export function dismissAdminRTCCallDialog(force = false) {
  if (!force && adminRTCState.callId && !isFinalStatus(adminRTCState.status)) {
    return false;
  }

  disposeMediaSession();
  clearCallDialogState();
  return true;
}

export function canStartAdminRTCCall(target = {}) {
  return ['user', 'merchant', 'rider'].includes(
    normalizeParticipantRole(target.role || target.targetRole)
  );
}

export {
  adminRTCState,
  buildStatusMeta,
  buildMediaStatusText,
  isFinalStatus,
  isWaitingStatus,
  loadAdminRTCRuntimeSettings,
};
