package com.user.infinite.core.network.api

import com.google.gson.JsonObject
import com.user.infinite.core.network.model.LoginResponseDto
import com.user.infinite.core.network.model.RefreshResponseDto
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.POST

interface AuthApi {

    @POST("api/auth/login")
    suspend fun login(@Body body: Map<String, String>): Response<LoginResponseDto>

    @POST("api/auth/refresh")
    suspend fun refresh(@Body body: Map<String, String>): Response<RefreshResponseDto>

    @POST("api/request-sms-code")
    suspend fun requestSmsCode(@Body body: Map<String, String>): Response<JsonObject>

    @POST("api/verify-sms-code")
    suspend fun verifySmsCode(@Body body: Map<String, String>): Response<JsonObject>

    @POST("api/verify-sms-code-check")
    suspend fun verifySmsCodeCheck(@Body body: Map<String, String>): Response<JsonObject>

    @POST("api/auth/register")
    suspend fun register(@Body body: Map<String, String>): Response<JsonObject>

    @POST("api/set-new-password")
    suspend fun setNewPassword(@Body body: Map<String, String>): Response<JsonObject>
}
