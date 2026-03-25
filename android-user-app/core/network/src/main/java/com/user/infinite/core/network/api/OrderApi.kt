package com.user.infinite.core.network.api

import com.google.gson.JsonElement
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path

interface OrderApi {

    @POST("api/orders")
    suspend fun create(@Body payload: Map<String, Any?>): Response<JsonElement>

    @GET("api/orders/user/{userId}")
    suspend fun userOrders(@Path("userId") userId: String): Response<JsonElement>

    @GET("api/orders/{id}")
    suspend fun detail(@Path("id") orderId: String): Response<JsonElement>

    @POST("api/orders/{id}/reviewed")
    suspend fun markReviewed(@Path("id") orderId: String): Response<JsonElement>
}
