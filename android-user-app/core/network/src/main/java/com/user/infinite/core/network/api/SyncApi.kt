package com.user.infinite.core.network.api

import com.google.gson.JsonElement
import retrofit2.Response
import retrofit2.http.GET
import retrofit2.http.Path
import retrofit2.http.Query

interface SyncApi {

    @GET("api/sync/state")
    suspend fun state(): Response<JsonElement>

    @GET("api/sync/{dataset}")
    suspend fun dataset(
        @Path("dataset") dataset: String,
        @Query("since") since: Long? = null,
    ): Response<JsonElement>
}
