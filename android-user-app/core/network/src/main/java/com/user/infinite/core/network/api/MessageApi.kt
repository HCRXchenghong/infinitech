package com.user.infinite.core.network.api

import com.google.gson.JsonElement
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query

interface MessageApi {

    @GET("api/messages/conversations")
    suspend fun conversations(): Response<JsonElement>

    @GET("api/messages/{roomId}")
    suspend fun history(@Path("roomId") roomId: String): Response<JsonElement>

    @POST("api/messages/conversations/upsert")
    suspend fun upsertConversation(@Body payload: Map<String, Any?>): Response<JsonElement>

    @POST("api/messages/sync")
    suspend fun syncMessage(@Body payload: Map<String, Any?>): Response<JsonElement>

    @GET("api/notifications")
    suspend fun notifications(
        @Query("page") page: Int,
        @Query("pageSize") pageSize: Int,
    ): Response<JsonElement>

    @GET("api/notifications/{id}")
    suspend fun notificationDetail(@Path("id") id: String): Response<JsonElement>
}
