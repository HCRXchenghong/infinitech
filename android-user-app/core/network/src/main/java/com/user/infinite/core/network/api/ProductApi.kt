package com.user.infinite.core.network.api

import com.google.gson.JsonElement
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.Path
import retrofit2.http.Query

interface ProductApi {

    @GET("api/categories")
    suspend fun categories(@Query("shopId") shopId: String? = null): Response<JsonElement>

    @GET("api/products")
    suspend fun products(
        @Query("shopId") shopId: String,
        @Query("categoryId") categoryId: String? = null,
    ): Response<JsonElement>

    @GET("api/products/{id}")
    suspend fun productDetail(@Path("id") productId: String): Response<JsonElement>

    @GET("api/banners")
    suspend fun banners(@Query("shopId") shopId: String? = null): Response<JsonElement>

    @GET("api/featured-products")
    suspend fun featuredProducts(): Response<JsonElement>
}
