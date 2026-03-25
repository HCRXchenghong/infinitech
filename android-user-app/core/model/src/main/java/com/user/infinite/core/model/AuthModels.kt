package com.user.infinite.core.model

import kotlinx.serialization.Serializable

@Serializable
data class AuthSession(
    val token: String,
    val refreshToken: String,
    val expiresAt: Long,
    val authMode: AuthMode,
)

@Serializable
enum class AuthMode {
    USER,
    GUEST,
}

@Serializable
data class FeatureFlag(
    val key: String,
    val enabled: Boolean,
    val description: String = "",
)

@Serializable
data class UserProfile(
    val id: String,
    val phone: String,
    val nickname: String,
    val avatarUrl: String? = null,
)

@Serializable
data class LoginPayload(
    val phone: String,
    val password: String? = null,
    val code: String? = null,
)

@Serializable
data class LoginResult(
    val session: AuthSession,
    val profile: UserProfile,
)

@Serializable
data class SmsCodeResult(
    val success: Boolean,
    val message: String,
    val needCaptcha: Boolean = false,
    val sessionId: String? = null,
    val debugCode: String? = null,
)
