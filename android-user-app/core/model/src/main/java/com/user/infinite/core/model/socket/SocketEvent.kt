package com.user.infinite.core.model.socket

sealed interface SocketEvent {
    data object Connected : SocketEvent
    data object Disconnected : SocketEvent
    data class AuthError(val reason: String) : SocketEvent
    data class NewMessage(val roomId: String, val payload: String, val messageType: String) : SocketEvent
    data class MessageSent(val tempId: String?, val messageId: String?) : SocketEvent
    data class MessagesLoaded(val roomId: String, val total: Int) : SocketEvent
}
