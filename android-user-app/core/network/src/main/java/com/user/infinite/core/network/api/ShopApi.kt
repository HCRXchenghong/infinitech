package com.user.infinite.core.network.api

import com.google.gson.JsonElement
import retrofit2.Response
import retrofit2.http.GET
import retrofit2.http.Path
import retrofit2.http.Query

interface ShopApi {

    @GET("api/shops/categories")
    suspend fun categories(): Response<JsonElement>

    @GET("api/shops")
    suspend fun shops(@Query("category") category: String? = null): Response<JsonElement>

    @GET("api/shops/today-recommended")
    suspend fun todayRecommended(): Response<JsonElement>

    @GET("api/shops/{id}")
    suspend fun detail(@Path("id") shopId: String): Response<JsonElement>

    @GET("api/shops/{id}/menu")
    suspend fun menu(@Path("id") shopId: String): Response<JsonElement>

    @GET("api/shops/{id}/coupons/active")
    suspend fun activeCoupons(@Path("id") shopId: String): Response<JsonElement>
}
