package com.user.infinite.core.network.api

import com.google.gson.JsonElement
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Query

interface WalletApi {

    @GET("api/wallet/balance")
    suspend fun balance(
        @Query("userId") userId: String,
        @Query("userType") userType: String,
    ): Response<JsonElement>

    @GET("api/wallet/transactions")
    suspend fun transactions(
        @Query("userId") userId: String,
        @Query("userType") userType: String,
        @Query("page") page: Int,
        @Query("limit") limit: Int,
    ): Response<JsonElement>

    @POST("api/wallet/recharge")
    suspend fun recharge(@Body payload: Map<String, Any?>): Response<JsonElement>

    @POST("api/wallet/payment")
    suspend fun payment(@Body payload: Map<String, Any?>): Response<JsonElement>

    @POST("api/wallet/withdraw")
    suspend fun withdraw(@Body payload: Map<String, Any?>): Response<JsonElement>
}
