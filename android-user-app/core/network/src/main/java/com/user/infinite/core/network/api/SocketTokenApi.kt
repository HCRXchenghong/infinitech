package com.user.infinite.core.network.api

import com.google.gson.JsonElement
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.POST

interface SocketTokenApi {

    @POST("api/generate-token")
    suspend fun generateToken(@Body payload: Map<String, String>): Response<JsonElement>
}
