package com.user.infinite.core.network.api

import com.google.gson.JsonElement
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query

interface UserApi {

    @GET("api/user/{id}")
    suspend fun profile(@Path("id") userId: String): Response<JsonElement>

    @GET("api/user/{id}/favorites")
    suspend fun favorites(
        @Path("id") userId: String,
        @Query("page") page: Int,
        @Query("pageSize") pageSize: Int,
    ): Response<JsonElement>

    @GET("api/user/{id}/favorites/{shopId}/status")
    suspend fun favoriteStatus(
        @Path("id") userId: String,
        @Path("shopId") shopId: String,
    ): Response<JsonElement>

    @POST("api/user/{id}/favorites")
    suspend fun addFavorite(
        @Path("id") userId: String,
        @Body payload: Map<String, String>,
    ): Response<JsonElement>

    @DELETE("api/user/{id}/favorites/{shopId}")
    suspend fun removeFavorite(
        @Path("id") userId: String,
        @Path("shopId") shopId: String,
    ): Response<JsonElement>
}
