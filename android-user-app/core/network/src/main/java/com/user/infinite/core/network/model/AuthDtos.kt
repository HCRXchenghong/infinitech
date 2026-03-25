package com.user.infinite.core.network.model

import com.google.gson.annotations.SerializedName

/**
 * Compatible payload parser for existing backend/BFF response shapes.
 */
data class LoginResponseDto(
    @SerializedName("success") val success: Boolean = false,
    @SerializedName("token") val token: String? = null,
    @SerializedName("refreshToken") val refreshToken: String? = null,
    @SerializedName("expiresIn") val expiresIn: Long? = null,
    @SerializedName("user") val user: UserDto? = null,
    @SerializedName("error") val error: String? = null,
    @SerializedName("message") val message: String? = null,
)

data class RefreshResponseDto(
    @SerializedName("success") val success: Boolean = false,
    @SerializedName("token") val token: String? = null,
    @SerializedName("refreshToken") val refreshToken: String? = null,
    @SerializedName("expiresIn") val expiresIn: Long? = null,
    @SerializedName("error") val error: String? = null,
)

data class UserDto(
    @SerializedName("id") val id: String? = null,
    @SerializedName("userId") val userId: String? = null,
    @SerializedName("phone") val phone: String? = null,
    @SerializedName("nickname") val nickname: String? = null,
    @SerializedName("name") val name: String? = null,
    @SerializedName("avatarUrl") val avatarUrl: String? = null,
)

data class ErrorResponseDto(
    @SerializedName("error") val error: String? = null,
    @SerializedName("message") val message: String? = null,
)
