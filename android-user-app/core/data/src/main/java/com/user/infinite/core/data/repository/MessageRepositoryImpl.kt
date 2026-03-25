package com.user.infinite.core.data.repository

import com.user.infinite.core.common.ApiResult
import com.user.infinite.core.model.AppNotification
import com.user.infinite.core.model.AppNotificationDetail
import com.user.infinite.core.model.ChatMessage
import com.user.infinite.core.model.Conversation
import com.user.infinite.core.model.SyncMessageRequest
import com.user.infinite.core.model.repository.MessageRepository
import com.user.infinite.core.network.api.MessageApi
import com.user.infinite.core.network.api.SocketTokenApi
import com.user.infinite.core.database.dao.CacheDao

class MessageRepositoryImpl(
    private val messageApi: MessageApi,
    private val socketTokenApi: SocketTokenApi,
    private val cacheDao: CacheDao,
) : MessageRepository {

    override suspend fun fetchConversations(): ApiResult<List<Conversation>> {
        return executeWithCache(
            cacheDao = cacheDao,
            cacheKey = "messages:conversations",
            request = { messageApi.conversations() },
            parse = ::parseConversationList,
            fallbackMessage = "failed to load conversations",
        )
    }

    override suspend fun fetchHistory(roomId: String): ApiResult<List<ChatMessage>> {
        return executeWithCache(
            cacheDao = cacheDao,
            cacheKey = "messages:history:$roomId",
            request = { messageApi.history(roomId) },
            parse = ::parseChatMessageList,
            fallbackMessage = "failed to load chat history",
        )
    }

    override suspend fun upsertConversation(
        targetType: String,
        targetId: String,
        targetName: String?,
        targetPhone: String?,
    ): ApiResult<Conversation> {
        val payload = buildMap<String, Any?> {
            put("targetType", targetType)
            put("targetId", targetId)
            targetName?.takeIf { it.isNotBlank() }?.let { put("targetName", it) }
            targetPhone?.takeIf { it.isNotBlank() }?.let { put("targetPhone", it) }
        }

        return try {
            val response = messageApi.upsertConversation(payload)
            val body = response.body()
            if (!response.isSuccessful || body == null) {
                failureFromResponse(response, "failed to upsert conversation")
            } else {
                val conversation = parseConversation(body)
                if (conversation == null) {
                    ApiResult.Failure(
                        code = 500,
                        message = "conversation payload invalid",
                        recoverable = false,
                    )
                } else {
                    ApiResult.Success(conversation)
                }
            }
        } catch (throwable: Throwable) {
            failureFromThrowable(throwable, "failed to upsert conversation")
        }
    }

    override suspend fun syncMessage(request: SyncMessageRequest): ApiResult<ChatMessage> {
        val payload = buildMap<String, Any?> {
            put("chatId", request.roomId)
            put("senderId", request.senderId)
            put("senderRole", request.senderRole)
            put("senderName", request.senderName)
            put("content", request.content)
            put("messageType", request.messageType)
        }

        return try {
            val response = messageApi.syncMessage(payload)
            val body = response.body()
            if (!response.isSuccessful || body == null) {
                failureFromResponse(response, "failed to sync message")
            } else {
                val message = parseChatMessage(body)
                if (message == null) {
                    ApiResult.Failure(
                        code = 500,
                        message = "message payload invalid",
                        recoverable = false,
                    )
                } else {
                    ApiResult.Success(message)
                }
            }
        } catch (throwable: Throwable) {
            failureFromThrowable(throwable, "failed to sync message")
        }
    }

    override suspend fun fetchNotifications(page: Int, pageSize: Int): ApiResult<List<AppNotification>> {
        return executeWithCache(
            cacheDao = cacheDao,
            cacheKey = "notifications:list:$page:$pageSize",
            request = { messageApi.notifications(page, pageSize) },
            parse = ::parseNotificationList,
            fallbackMessage = "failed to load notifications",
        )
    }

    override suspend fun fetchNotificationDetail(id: String): ApiResult<AppNotificationDetail> {
        return executeWithCache(
            cacheDao = cacheDao,
            cacheKey = "notifications:detail:$id",
            request = { messageApi.notificationDetail(id) },
            parse = { payload ->
                parseNotificationDetail(payload)
                    ?: throw IllegalStateException("notification detail missing")
            },
            fallbackMessage = "failed to load notification detail",
        )
    }

    override suspend fun generateSocketToken(userId: String, role: String): ApiResult<String> {
        return try {
            val response = socketTokenApi.generateToken(
                mapOf(
                    "userId" to userId,
                    "role" to role,
                ),
            )
            val body = response.body()
            if (!response.isSuccessful || body == null) {
                failureFromResponse(response, "failed to generate socket token")
            } else {
                val token = parseSocketToken(body)
                if (token.isBlank()) {
                    ApiResult.Failure(
                        code = 500,
                        message = "socket token missing",
                        recoverable = false,
                    )
                } else {
                    ApiResult.Success(token)
                }
            }
        } catch (throwable: Throwable) {
            failureFromThrowable(throwable, "failed to generate socket token")
        }
    }
}
