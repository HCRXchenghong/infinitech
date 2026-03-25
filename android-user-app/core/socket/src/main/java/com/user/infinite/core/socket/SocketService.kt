package com.user.infinite.core.socket

import com.user.infinite.core.model.socket.SocketEvent
import io.socket.client.IO
import io.socket.client.Socket
import kotlinx.coroutines.channels.BufferOverflow
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableSharedFlow
import org.json.JSONObject
import java.util.ArrayDeque

class SocketService {

    private data class PendingEmit(val event: String, val payload: Map<String, String>)
    private data class JoinedRoom(val roomId: String, val userId: String, val role: String)

    private var socket: Socket? = null

    private val eventsFlow = MutableSharedFlow<SocketEvent>(
        replay = 1,
        extraBufferCapacity = 64,
        onBufferOverflow = BufferOverflow.DROP_OLDEST,
    )

    private val pendingQueue = ArrayDeque<PendingEmit>()
    private val joinedRooms = linkedMapOf<String, JoinedRoom>()
    private val lock = Any()

    fun observeEvents(): Flow<SocketEvent> = eventsFlow

    fun connect(baseUrl: String, namespace: String, token: String) {
        disconnect(clearSession = false)

        val options = IO.Options.builder()
            .setAuth(mapOf("token" to token))
            .setReconnection(true)
            .setReconnectionAttempts(Int.MAX_VALUE)
            .setReconnectionDelay(1_000)
            .setReconnectionDelayMax(10_000)
            .setRandomizationFactor(0.5)
            .setForceNew(true)
            .build()

        val finalUrl = baseUrl.trimEnd('/') + namespace
        socket = IO.socket(finalUrl, options).also { ws ->
            ws.on(Socket.EVENT_CONNECT) {
                eventsFlow.tryEmit(SocketEvent.Connected)
                flushPendingMessages()
                rejoinRooms()
            }

            ws.on(Socket.EVENT_DISCONNECT) {
                eventsFlow.tryEmit(SocketEvent.Disconnected)
            }

            ws.on(Socket.EVENT_CONNECT_ERROR) {
                eventsFlow.tryEmit(SocketEvent.Disconnected)
            }
            ws.on("auth_error") { args ->
                val reason = args.firstOrNull()?.toString().orEmpty()
                eventsFlow.tryEmit(SocketEvent.AuthError(reason))
            }

            ws.on("new_message") { args ->
                val payload = args.firstOrNull()
                val json = payload as? JSONObject
                val roomId = json?.optString("chatId") ?: ""
                val content = json?.optString("content") ?: payload.toString()
                val messageType = json?.optString("messageType") ?: "text"
                eventsFlow.tryEmit(SocketEvent.NewMessage(roomId, content, messageType))
            }

            ws.on("message_sent") { args ->
                val json = args.firstOrNull() as? JSONObject
                eventsFlow.tryEmit(
                    SocketEvent.MessageSent(
                        tempId = json?.optString("tempId"),
                        messageId = json?.optString("messageId"),
                    ),
                )
            }

            ws.on("messages_loaded") { args ->
                val json = args.firstOrNull() as? JSONObject
                val roomId = json?.optString("chatId") ?: ""
                val total = json?.optJSONArray("messages")?.length() ?: 0
                eventsFlow.tryEmit(SocketEvent.MessagesLoaded(roomId, total))
            }

            ws.connect()
        }
    }

    fun joinRoom(roomId: String, userId: String, role: String) {
        synchronized(lock) {
            joinedRooms[roomId] = JoinedRoom(roomId = roomId, userId = userId, role = role)
        }

        emitOrQueue(
            event = "join_chat",
            payload = mapOf(
                "chatId" to roomId,
                "userId" to userId,
                "role" to role,
            ),
        )
        emitOrQueue(
            event = "load_messages",
            payload = mapOf("chatId" to roomId),
        )
    }

    fun sendMessage(
        roomId: String,
        sender: String,
        senderId: String,
        senderRole: String,
        content: String,
        messageType: String,
    ) {
        val payload = mapOf(
            "chatId" to roomId,
            "sender" to sender,
            "senderId" to senderId,
            "senderRole" to senderRole,
            "content" to content,
            "messageType" to messageType,
        )

        emitOrQueue("send_message", payload)
    }

    fun disconnect(clearSession: Boolean = true) {
        socket?.disconnect()
        socket?.off()
        socket = null

        if (clearSession) {
            synchronized(lock) {
                joinedRooms.clear()
                pendingQueue.clear()
            }
        }
    }

    private fun emitOrQueue(event: String, payload: Map<String, String>) {
        val ws = socket
        if (ws?.connected() == true) {
            ws.emit(event, payload.toJsonObject())
            return
        }

        synchronized(lock) {
            if (pendingQueue.size >= MAX_PENDING_MESSAGES) {
                if (pendingQueue.isNotEmpty()) {
                    pendingQueue.removeFirst()
                }
            }
            pendingQueue.addLast(PendingEmit(event = event, payload = payload.toMap()))
        }
    }

    private fun flushPendingMessages() {
        val ws = socket ?: return
        if (!ws.connected()) return

        val pending = synchronized(lock) {
            val snapshot = pendingQueue.toList()
            pendingQueue.clear()
            snapshot
        }

        pending.forEach { item ->
            ws.emit(item.event, item.payload.toJsonObject())
        }
    }

    private fun rejoinRooms() {
        val ws = socket ?: return
        if (!ws.connected()) return

        val rooms = synchronized(lock) {
            joinedRooms.values.toList()
        }

        rooms.forEach { room ->
            ws.emit(
                "join_chat",
                mapOf(
                    "chatId" to room.roomId,
                    "userId" to room.userId,
                    "role" to room.role,
                ).toJsonObject(),
            )
            ws.emit("load_messages", mapOf("chatId" to room.roomId).toJsonObject())
        }
    }

    private fun Map<String, String>.toJsonObject(): JSONObject {
        val json = JSONObject()
        forEach { (key, value) ->
            json.put(key, value)
        }
        return json
    }

    companion object {
        private const val MAX_PENDING_MESSAGES = 120
    }
}
