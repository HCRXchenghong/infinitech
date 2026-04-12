import { logger } from './logger.js';
import { requestBackend } from './socketIdentity.js';
import { buildSocketRequestId } from './requestId.js';

function normalizeCallStatus(raw) {
  return String(raw || '').trim().toLowerCase();
}

function normalizeParticipantRole(raw) {
  switch (String(raw || '').trim().toLowerCase()) {
    case 'shop':
    case 'merchant':
      return 'merchant';
    case 'customer':
    case 'user':
      return 'user';
    case 'rider':
      return 'rider';
    case 'support':
    case 'admin':
      return 'admin';
    default:
      return '';
  }
}

function normalizeCallId(raw) {
  return String(raw || '').trim();
}

function resolveCallId(...sources) {
  for (const source of sources) {
    if (source === null || source === undefined) {
      continue;
    }
    if (typeof source === 'string' || typeof source === 'number') {
      const normalized = normalizeCallId(source);
      if (normalized) {
        return normalized;
      }
      continue;
    }
    if (typeof source !== 'object') {
      continue;
    }

    const candidates = [
      source.callId,
      source.callID,
      source.call_id,
      source.uid,
      source.id,
      source.callIdRaw,
      source.call_id_raw
    ];
    for (const candidate of candidates) {
      const normalized = normalizeCallId(candidate);
      if (normalized) {
        return normalized;
      }
    }
  }

  return '';
}

function normalizeIdentityId(raw) {
  return String(raw || '').trim();
}

function buildIdentityRoom(role, userId) {
  return `rtc_identity_${role}_${userId}`;
}

function buildCallRoom(callId) {
  return `rtc_call_${callId}`;
}

function getSocketActor(socket) {
  return {
    role: normalizeParticipantRole(socket?.userRole),
    id: normalizeIdentityId(socket?.userId)
  };
}

async function requestRTCBackend(socket, pathname, options = {}) {
  const authHeader = String(socket?.authToken || '').trim();
  if (!authHeader) {
    throw new Error('Missing business authorization for rtc signaling');
  }

  const requestId = options.requestId || buildSocketRequestId(socket, options.action || 'rtc', options.target || '');
  const { response, data } = await requestBackend(pathname, {
    method: options.method || 'GET',
    headers: { Authorization: authHeader },
    body: options.body,
    requestId
  });

  if (!response.ok) {
    const message = data?.error || data?.message || `RTC backend request failed: ${response.status}`;
    const err = new Error(message);
    err.statusCode = response.status;
    err.data = data;
    throw err;
  }

  const payload = data?.data !== undefined ? data.data : data;
  return { data: payload, requestId };
}

async function fetchCallRecord(socket, callId) {
  const normalizedCallId = normalizeCallId(callId);
  if (!normalizedCallId) {
    throw new Error('callId is required');
  }

  const { data } = await requestRTCBackend(socket, `/api/rtc/calls/${encodeURIComponent(normalizedCallId)}`, {
    method: 'GET',
    action: 'rtc-fetch',
    target: normalizedCallId
  });
  return data;
}

async function createCallRecord(socket, input) {
  const actor = getSocketActor(socket);
  const calleeRole = normalizeParticipantRole(input?.calleeRole);
  const calleeId = normalizeIdentityId(input?.calleeId);
  if (!actor.role || !actor.id) {
    throw new Error('socket actor is missing');
  }
  if (!calleeRole || !calleeId) {
    throw new Error('calleeRole and calleeId are required');
  }

  const body = {
    callId: normalizeCallId(input?.callId),
    callType: 'audio',
    calleeRole,
    calleeId,
    calleePhone: String(input?.calleePhone || '').trim(),
    conversationId: String(input?.conversationId || '').trim(),
    orderId: String(input?.orderId || '').trim(),
    entryPoint: String(input?.entryPoint || '').trim(),
    scene: String(input?.scene || '').trim(),
    clientPlatform: String(input?.clientPlatform || '').trim(),
    clientKind: String(input?.clientKind || '').trim(),
    status: 'initiated',
    metadata: input?.metadata || null
  };

  const { data } = await requestRTCBackend(socket, '/api/rtc/calls', {
    method: 'POST',
    body,
    action: 'rtc-create',
    target: calleeId
  });
  return data;
}

async function updateCallRecord(socket, callId, input = {}) {
  const normalizedCallId = normalizeCallId(callId);
  if (!normalizedCallId) {
    throw new Error('callId is required');
  }

  const body = {
    status: String(input?.status || '').trim(),
    failureReason: String(input?.failureReason || '').trim(),
    complaintStatus: String(input?.complaintStatus || '').trim(),
    recordingRetention: String(input?.recordingRetention || '').trim(),
    conversationId: String(input?.conversationId || '').trim(),
    orderId: String(input?.orderId || '').trim(),
    entryPoint: String(input?.entryPoint || '').trim(),
    scene: String(input?.scene || '').trim(),
    clientPlatform: String(input?.clientPlatform || '').trim(),
    clientKind: String(input?.clientKind || '').trim(),
    durationSeconds: Number.isFinite(Number(input?.durationSeconds))
      ? Number(input.durationSeconds)
      : 0,
    metadata: input?.metadata || null
  };

  if (input?.answeredAt) {
    body.answeredAt = input.answeredAt;
  }
  if (input?.endedAt) {
    body.endedAt = input.endedAt;
  }
  if (input?.startedAt) {
    body.startedAt = input.startedAt;
  }

  const { data } = await requestRTCBackend(socket, `/api/rtc/calls/${encodeURIComponent(normalizedCallId)}/status`, {
    method: 'POST',
    body,
    action: 'rtc-status',
    target: normalizedCallId
  });
  return data;
}

function resolvePeerParticipant(callRecord, actor) {
  if (!callRecord || !actor?.role || !actor?.id) return null;

  const callerRole = normalizeParticipantRole(callRecord.caller_role || callRecord.callerRole);
  const callerID = normalizeIdentityId(callRecord.caller_id || callRecord.callerId);
  const calleeRole = normalizeParticipantRole(callRecord.callee_role || callRecord.calleeRole);
  const calleeID = normalizeIdentityId(callRecord.callee_id || callRecord.calleeId);

  if (actor.role === callerRole && actor.id === callerID) {
    return {
      role: calleeRole,
      id: calleeID
    };
  }

  if (actor.role === calleeRole && actor.id === calleeID) {
    return {
      role: callerRole,
      id: callerID
    };
  }

  return null;
}

function emitToRTCParticipants(namespace, callRecord, eventName, payload, options = {}) {
  if (!callRecord) return;

  const callerRole = normalizeParticipantRole(callRecord.caller_role || callRecord.callerRole);
  const callerID = normalizeIdentityId(callRecord.caller_id || callRecord.callerId);
  const calleeRole = normalizeParticipantRole(callRecord.callee_role || callRecord.calleeRole);
  const calleeID = normalizeIdentityId(callRecord.callee_id || callRecord.calleeId);
  const excludeSocketId = String(options.excludeSocketId || '').trim();

  const targetRooms = [
    callerRole && callerID ? buildIdentityRoom(callerRole, callerID) : '',
    calleeRole && calleeID ? buildIdentityRoom(calleeRole, calleeID) : ''
  ].filter(Boolean);

  const sentRooms = new Set();
  for (const room of targetRooms) {
    if (sentRooms.has(room)) continue;
    sentRooms.add(room);
    if (excludeSocketId) {
      namespace.to(room).except(excludeSocketId).emit(eventName, payload);
    } else {
      namespace.to(room).emit(eventName, payload);
    }
  }
}

function emitRTCError(socket, action, err) {
  socket.emit('rtc_error', {
    action,
    message: err?.message || 'rtc signaling failed',
    statusCode: Number(err?.statusCode || 0) || undefined
  });
}

function buildSignalPayload(socket, callRecord, data) {
  const actor = getSocketActor(socket);
  return {
    callId: resolveCallId(callRecord, data),
    signalType: String(data?.signalType || '').trim() || 'unknown',
    signal: data?.signal ?? null,
    fromRole: actor.role,
    fromId: actor.id,
    timestamp: Date.now()
  };
}

async function joinCallRoom(socket, namespace, callId) {
  const callRecord = await fetchCallRecord(socket, callId);
  const normalizedCallId = resolveCallId(callRecord, callId);
  if (!normalizedCallId) {
    throw new Error('invalid rtc call record');
  }
  socket.join(buildCallRoom(normalizedCallId));
  socket.emit('rtc_joined', {
    callId: normalizedCallId,
    call: callRecord
  });
  return callRecord;
}

async function handleStatusUpdate(socket, namespace, status, data = {}) {
  const callId = normalizeCallId(data?.callId);
  if (!callId) {
    throw new Error('callId is required');
  }

  const now = new Date().toISOString();
  const payload = {
    status,
    failureReason: data?.failureReason,
    durationSeconds: data?.durationSeconds,
    clientPlatform: data?.clientPlatform,
    clientKind: data?.clientKind,
    metadata: data?.metadata || null
  };

  if (status === 'accepted') {
    payload.answeredAt = now;
  }
  if (['rejected', 'busy', 'cancelled', 'ended', 'failed', 'timeout'].includes(status)) {
    payload.endedAt = now;
  }

  const updatedCall = await updateCallRecord(socket, callId, payload);
  if (status === 'accepted') {
    socket.join(buildCallRoom(resolveCallId(updatedCall, callId)));
  }

  emitToRTCParticipants(namespace, updatedCall, 'rtc_status', {
    callId: resolveCallId(updatedCall, callId),
    status,
    call: updatedCall,
    failureReason: String(data?.failureReason || '').trim() || undefined,
    durationSeconds: Number.isFinite(Number(data?.durationSeconds)) ? Number(data.durationSeconds) : undefined
  });

  return updatedCall;
}

export function setupRTCNamespace({
  io,
  authMiddleware,
  addOnlineUser,
  removeOnlineUser,
  ringTimeoutMs = 35_000
}) {
  const rtcNamespace = io.of('/rtc');
  rtcNamespace.use(authMiddleware);
  const timeoutHandles = new Map();

  function clearCallTimeout(callId) {
    const normalizedCallId = normalizeCallId(callId);
    if (!normalizedCallId) return;
    const timer = timeoutHandles.get(normalizedCallId);
    if (timer) {
      clearTimeout(timer);
      timeoutHandles.delete(normalizedCallId);
    }
  }

  function shouldAutoTimeout(status) {
    const normalizedStatus = normalizeCallStatus(status);
    return normalizedStatus === 'initiated' || normalizedStatus === 'ringing';
  }

  function scheduleCallTimeout(socket, callId) {
    const normalizedCallId = normalizeCallId(callId);
    if (!normalizedCallId || ringTimeoutMs <= 0) {
      return;
    }

    clearCallTimeout(normalizedCallId);
    const timer = setTimeout(async () => {
      timeoutHandles.delete(normalizedCallId);
      try {
        const callRecord = await fetchCallRecord(socket, normalizedCallId);
        if (!shouldAutoTimeout(callRecord?.status)) {
          return;
        }
        const updatedCall = await updateCallRecord(socket, normalizedCallId, {
          status: 'timeout',
          failureReason: 'no_answer_timeout'
        });
        emitToRTCParticipants(rtcNamespace, updatedCall, 'rtc_status', {
          callId: resolveCallId(updatedCall, normalizedCallId),
          status: 'timeout',
          call: updatedCall,
          failureReason: 'no_answer_timeout'
        });
      } catch (err) {
        logger.warn('rtc auto-timeout failed:', err?.message || err);
      }
    }, ringTimeoutMs);
    timeoutHandles.set(normalizedCallId, timer);
  }

  rtcNamespace.on('connection', (socket) => {
    const actor = getSocketActor(socket);
    addOnlineUser(socket.id, socket.userId, socket.userRole);

    if (actor.role && actor.id) {
      socket.join(buildIdentityRoom(actor.role, actor.id));
    }

    socket.emit('rtc_ready', {
      role: actor.role,
      userId: actor.id
    });

    socket.on('rtc_start_call', async (data = {}) => {
      try {
        let callRecord = await createCallRecord(socket, data);
        const callId = resolveCallId(callRecord, data);
        if (!callId) {
          logger.warn('rtc_start_call missing callId in call record:', callRecord);
          throw new Error('rtc callId missing from backend record');
        }
        const peer = resolvePeerParticipant(callRecord, actor);
        socket.join(buildCallRoom(callId));

        const peerRoom = peer?.role && peer?.id ? buildIdentityRoom(peer.role, peer.id) : '';
        const calleeOnline = peerRoom
          ? (rtcNamespace.adapter.rooms.get(peerRoom)?.size || 0) > 0
          : false;

        if (calleeOnline) {
          try {
            callRecord = await updateCallRecord(socket, callId, {
              status: 'ringing'
            });
          } catch (err) {
            logger.warn('rtc mark ringing failed:', err?.message || err);
          }
        }

        socket.emit('rtc_call_created', {
          callId,
          call: callRecord,
          calleeOnline
        });

        if (peerRoom) {
          rtcNamespace.to(peerRoom).emit('rtc_invite', {
            callId,
            call: callRecord,
            fromRole: actor.role,
            fromId: actor.id,
            timestamp: Date.now()
          });
        }

        scheduleCallTimeout(socket, callId);
      } catch (err) {
        logger.warn('rtc_start_call failed:', err?.message || err);
        emitRTCError(socket, 'rtc_start_call', err);
      }
    });

    socket.on('rtc_join_call', async (data = {}) => {
      try {
        await joinCallRoom(socket, rtcNamespace, data?.callId);
      } catch (err) {
        logger.warn('rtc_join_call failed:', err?.message || err);
        emitRTCError(socket, 'rtc_join_call', err);
      }
    });

    socket.on('rtc_accept_call', async (data = {}) => {
      try {
        clearCallTimeout(data?.callId);
        await handleStatusUpdate(socket, rtcNamespace, 'accepted', data);
      } catch (err) {
        logger.warn('rtc_accept_call failed:', err?.message || err);
        emitRTCError(socket, 'rtc_accept_call', err);
      }
    });

    socket.on('rtc_reject_call', async (data = {}) => {
      try {
        clearCallTimeout(data?.callId);
        await handleStatusUpdate(socket, rtcNamespace, 'rejected', data);
      } catch (err) {
        logger.warn('rtc_reject_call failed:', err?.message || err);
        emitRTCError(socket, 'rtc_reject_call', err);
      }
    });

    socket.on('rtc_cancel_call', async (data = {}) => {
      try {
        clearCallTimeout(data?.callId);
        await handleStatusUpdate(socket, rtcNamespace, 'cancelled', data);
      } catch (err) {
        logger.warn('rtc_cancel_call failed:', err?.message || err);
        emitRTCError(socket, 'rtc_cancel_call', err);
      }
    });

    socket.on('rtc_end_call', async (data = {}) => {
      try {
        clearCallTimeout(data?.callId);
        await handleStatusUpdate(socket, rtcNamespace, 'ended', data);
      } catch (err) {
        logger.warn('rtc_end_call failed:', err?.message || err);
        emitRTCError(socket, 'rtc_end_call', err);
      }
    });

    socket.on('rtc_timeout_call', async (data = {}) => {
      try {
        clearCallTimeout(data?.callId);
        await handleStatusUpdate(socket, rtcNamespace, 'timeout', data);
      } catch (err) {
        logger.warn('rtc_timeout_call failed:', err?.message || err);
        emitRTCError(socket, 'rtc_timeout_call', err);
      }
    });

    socket.on('rtc_signal', async (data = {}) => {
      try {
        const callRecord = await fetchCallRecord(socket, data?.callId);
        const payload = buildSignalPayload(socket, callRecord, data);
        emitToRTCParticipants(rtcNamespace, callRecord, 'rtc_signal', payload, {
          excludeSocketId: socket.id
        });
      } catch (err) {
        logger.warn('rtc_signal failed:', err?.message || err);
        emitRTCError(socket, 'rtc_signal', err);
      }
    });

    socket.on('rtc_leave_call', (data = {}) => {
      const callId = normalizeCallId(data?.callId);
      if (!callId) return;
      socket.leave(buildCallRoom(callId));
      socket.emit('rtc_left', { callId });
    });

    socket.on('disconnect', () => {
      removeOnlineUser(socket.id);
    });
  });

  return {
    rtcNamespace
  };
}
