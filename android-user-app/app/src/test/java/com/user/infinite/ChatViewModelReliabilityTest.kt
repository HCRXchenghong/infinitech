package com.user.infinite

import com.user.infinite.core.common.ApiResult
import com.user.infinite.core.model.AppNotification
import com.user.infinite.core.model.AppNotificationDetail
import com.user.infinite.core.model.ChatMessage
import com.user.infinite.core.model.Conversation
import com.user.infinite.core.model.SyncMessageRequest
import com.user.infinite.core.model.repository.MessageRepository
import com.user.infinite.core.model.socket.SocketEvent
import com.user.infinite.core.socket.SocketService
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class ChatViewModelReliabilityTest {

    @get:Rule
    val mainDispatcherRule = MainDispatcherRule()

    @Test
    fun socketEvents_updateConnectionAndAuthErrorState() = runTest {
        val repository = FakeMessageRepository()
        val socketService = SocketService()
        val viewModel = ChatViewModel(repository, socketService)

        advanceUntilIdle()
        emitSocketEvent(socketService, SocketEvent.Disconnected)
        emitSocketEvent(socketService, SocketEvent.Connected)
        emitSocketEvent(socketService, SocketEvent.AuthError("token expired"))
        advanceUntilIdle()

        val state = viewModel.uiState.value
        assertTrue(state.connected)
        assertEquals("token expired", state.error)
    }

    @Test
    fun newMessage_onlyAppendsForCurrentRoom_andDedupes() = runTest {
        val repository = FakeMessageRepository()
        val socketService = SocketService()
        val viewModel = ChatViewModel(repository, socketService)

        setRoom(viewModel, roomId = "room-1")
        advanceUntilIdle()

        emitSocketEvent(socketService, SocketEvent.NewMessage(roomId = "room-2", payload = "skip", messageType = "text"))
        emitSocketEvent(socketService, SocketEvent.NewMessage(roomId = "room-1", payload = "hello", messageType = "text"))
        emitSocketEvent(socketService, SocketEvent.NewMessage(roomId = "room-1", payload = "hello", messageType = "text"))
        advanceUntilIdle()

        val state = viewModel.uiState.value
        assertEquals(1, state.messages.size)
        assertEquals("hello", state.messages.first().content)
    }

    @Test
    fun sendMessage_whenSyncFails_keepsQueuedMessageAndError() = runTest {
        val repository = FakeMessageRepository().apply {
            nextSyncResult = ApiResult.Failure(code = 503, message = "network timeout", recoverable = true)
        }
        val socketService = SocketService()
        val viewModel = ChatViewModel(repository, socketService)

        setRoom(viewModel, roomId = "room-1")
        advanceUntilIdle()

        viewModel.sendMessage(
            content = "hello",
            userId = "u-1",
            userName = "tester",
            userRole = "customer",
        )
        advanceUntilIdle()

        val state = viewModel.uiState.value
        assertFalse(state.sending)
        assertEquals("network timeout", state.error)
        assertEquals(1, state.messages.size)
        assertEquals(1, pendingQueueSize(socketService))
    }

    private fun emitSocketEvent(socketService: SocketService, event: SocketEvent) {
        val field = SocketService::class.java.getDeclaredField("eventsFlow")
        field.isAccessible = true
        @Suppress("UNCHECKED_CAST")
        val flow = field.get(socketService) as MutableSharedFlow<SocketEvent>
        flow.tryEmit(event)
    }

    private fun setRoom(viewModel: ChatViewModel, roomId: String) {
        val field = ChatViewModel::class.java.getDeclaredField("_uiState")
        field.isAccessible = true
        @Suppress("UNCHECKED_CAST")
        val stateFlow = field.get(viewModel) as MutableStateFlow<ChatUiState>
        stateFlow.value = stateFlow.value.copy(roomId = roomId, roomName = "Support")
    }

    private fun pendingQueueSize(socketService: SocketService): Int {
        val field = SocketService::class.java.getDeclaredField("pendingQueue")
        field.isAccessible = true
        @Suppress("UNCHECKED_CAST")
        val queue = field.get(socketService) as MutableCollection<*>
        return queue.size
    }

    private class FakeMessageRepository : MessageRepository {
        var nextSyncResult: ApiResult<ChatMessage>? = null

        override suspend fun fetchConversations(): ApiResult<List<Conversation>> =
            ApiResult.Success(emptyList())

        override suspend fun fetchHistory(roomId: String): ApiResult<List<ChatMessage>> =
            ApiResult.Success(emptyList())

        override suspend fun upsertConversation(
            targetType: String,
            targetId: String,
            targetName: String?,
            targetPhone: String?,
        ): ApiResult<Conversation> = ApiResult.Success(
            Conversation(
                id = targetId,
                name = targetName.orEmpty(),
                role = targetType,
            ),
        )

        override suspend fun syncMessage(request: SyncMessageRequest): ApiResult<ChatMessage> {
            val queued = nextSyncResult
            if (queued != null) {
                nextSyncResult = null
                return queued
            }
            return ApiResult.Success(
                ChatMessage(
                    id = "remote-1",
                    roomId = request.roomId,
                    senderId = request.senderId,
                    senderRole = request.senderRole,
                    senderName = request.senderName,
                    content = request.content,
                    messageType = request.messageType,
                    time = "now",
                ),
            )
        }

        override suspend fun fetchNotifications(page: Int, pageSize: Int): ApiResult<List<AppNotification>> =
            ApiResult.Success(emptyList())

        override suspend fun fetchNotificationDetail(id: String): ApiResult<AppNotificationDetail> =
            ApiResult.Success(
                AppNotificationDetail(
                    id = id,
                    title = "n",
                    contentText = "detail",
                ),
            )

        override suspend fun generateSocketToken(userId: String, role: String): ApiResult<String> =
            ApiResult.Success("socket-token")
    }
}
