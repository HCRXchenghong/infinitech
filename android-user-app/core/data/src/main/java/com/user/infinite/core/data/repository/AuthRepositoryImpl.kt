package com.user.infinite.core.data.repository

import com.google.gson.JsonObject
import com.user.infinite.core.common.ApiResult
import com.user.infinite.core.model.AuthMode
import com.user.infinite.core.model.AuthSession
import com.user.infinite.core.model.LoginPayload
import com.user.infinite.core.model.LoginResult
import com.user.infinite.core.model.SmsCodeResult
import com.user.infinite.core.model.UserProfile
import com.user.infinite.core.model.repository.AuthRepository
import com.user.infinite.core.network.api.AuthApi
import com.user.infinite.core.network.model.LoginResponseDto
import com.user.infinite.core.storage.AuthSessionStore
import kotlinx.coroutines.flow.Flow

class AuthRepositoryImpl(
    private val authApi: AuthApi,
    private val authSessionStore: AuthSessionStore,
) : AuthRepository {

    override suspend fun login(payload: LoginPayload): ApiResult<LoginResult> {
        val body = buildMap {
            put("phone", payload.phone)
            payload.password?.takeIf { it.isNotBlank() }?.let { put("password", it) }
            payload.code?.takeIf { it.isNotBlank() }?.let { put("code", it) }
        }

        return try {
            val response = authApi.login(body)
            val dto = response.body()
            if (!response.isSuccessful || dto == null) {
                ApiResult.Failure(
                    code = response.code(),
                    message = dto?.error ?: "login request failed",
                    recoverable = response.code() >= 500,
                )
            } else {
                dto.toLoginResult()
            }
        } catch (throwable: Throwable) {
            ApiResult.Failure(
                code = -1,
                message = throwable.message ?: "network error",
                recoverable = true,
                throwable = throwable,
            )
        }
    }

    override suspend fun refreshToken(refreshToken: String): ApiResult<AuthSession> {
        return try {
            val response = authApi.refresh(mapOf("refreshToken" to refreshToken))
            val dto = response.body()
            if (!response.isSuccessful || dto == null || !dto.success || dto.token.isNullOrBlank()) {
                ApiResult.Failure(
                    code = response.code(),
                    message = dto?.error ?: "refresh token failed",
                    recoverable = false,
                )
            } else {
                val session = AuthSession(
                    token = dto.token.orEmpty(),
                    refreshToken = dto.refreshToken ?: refreshToken,
                    expiresAt = System.currentTimeMillis() + (dto.expiresIn ?: 7200L) * 1000L,
                    authMode = AuthMode.USER,
                )
                authSessionStore.saveSession(session)
                ApiResult.Success(session)
            }
        } catch (throwable: Throwable) {
            ApiResult.Failure(
                code = -1,
                message = throwable.message ?: "refresh token network error",
                recoverable = false,
                throwable = throwable,
            )
        }
    }

    override suspend fun requestSmsCode(
        phone: String,
        scene: String,
        captcha: String?,
        sessionId: String?,
    ): ApiResult<SmsCodeResult> {
        val body = buildMap {
            put("phone", phone.trim())
            put("scene", scene.trim())
            captcha?.takeIf { it.isNotBlank() }?.let { put("captcha", it) }
            sessionId?.takeIf { it.isNotBlank() }?.let { put("sessionId", it) }
        }

        return try {
            val response = authApi.requestSmsCode(body)
            val dto = response.body()
            if (!response.isSuccessful || dto == null) {
                failureFromResponse(response, "request sms code failed")
            } else {
                val success = dto.resolveSuccess(default = true)
                ApiResult.Success(
                    SmsCodeResult(
                        success = success,
                        message = dto.optString("message", "error")
                            ?: if (success) "验证码已发送" else "发送验证码失败",
                        needCaptcha = dto.optBoolean("needCaptcha", "need_captcha"),
                        sessionId = dto.optString("sessionId", "session_id"),
                        debugCode = dto.optString("code"),
                    ),
                )
            }
        } catch (throwable: Throwable) {
            failureFromThrowable(throwable, "request sms code network error")
        }
    }

    override suspend fun verifySmsCode(
        phone: String,
        scene: String,
        code: String,
        consume: Boolean,
    ): ApiResult<Boolean> {
        val body = mapOf(
            "phone" to phone.trim(),
            "scene" to scene.trim(),
            "code" to code.trim(),
        )

        return try {
            val response = if (consume) {
                authApi.verifySmsCode(body)
            } else {
                authApi.verifySmsCodeCheck(body)
            }
            parseBooleanResult(response, fallbackMessage = "verify sms code failed")
        } catch (throwable: Throwable) {
            failureFromThrowable(throwable, "verify sms code network error")
        }
    }

    override suspend fun register(phone: String, nickname: String, password: String): ApiResult<Boolean> {
        val body = mapOf(
            "phone" to phone.trim(),
            "name" to nickname.trim(),
            "password" to password,
        )

        return try {
            val response = authApi.register(body)
            parseBooleanResult(response, fallbackMessage = "register failed")
        } catch (throwable: Throwable) {
            failureFromThrowable(throwable, "register network error")
        }
    }

    override suspend fun setNewPassword(phone: String, code: String, password: String): ApiResult<Boolean> {
        val body = mapOf(
            "phone" to phone.trim(),
            "code" to code.trim(),
            "password" to password,
        )

        return try {
            val response = authApi.setNewPassword(body)
            parseBooleanResult(response, fallbackMessage = "set new password failed")
        } catch (throwable: Throwable) {
            failureFromThrowable(throwable, "set new password network error")
        }
    }

    override suspend fun logout() {
        authSessionStore.clearSession()
    }

    override fun observeSession(): Flow<AuthSession?> {
        return authSessionStore.observeSession()
    }

    private fun parseBooleanResult(
        response: retrofit2.Response<JsonObject>,
        fallbackMessage: String,
    ): ApiResult<Boolean> {
        val dto = response.body()
        if (!response.isSuccessful || dto == null) {
            return failureFromResponse(response, fallbackMessage)
        }

        val success = dto.resolveSuccess(default = true)
        return if (success) {
            ApiResult.Success(true)
        } else {
            ApiResult.Failure(
                code = response.code(),
                message = dto.optString("error", "message") ?: fallbackMessage,
                recoverable = true,
            )
        }
    }

    private fun JsonObject.resolveSuccess(default: Boolean): Boolean {
        return when {
            has("success") && !get("success").isJsonNull -> optBoolean("success")
            has("code") && !get("code").isJsonNull -> {
                val code = optInt("code")
                code == 0 || code == 200
            }
            has("status") && !get("status").isJsonNull -> {
                val status = optInt("status")
                status == 0 || status == 200
            }
            else -> default
        }
    }

    private suspend fun LoginResponseDto.toLoginResult(): ApiResult<LoginResult> {
        val safeToken = token.orEmpty()
        val safeRefreshToken = refreshToken.orEmpty()
        if (!success || safeToken.isBlank() || safeRefreshToken.isBlank()) {
            return ApiResult.Failure(
                code = 400,
                message = error ?: message ?: "login response invalid",
                recoverable = true,
            )
        }

        val userId = user?.id ?: user?.userId ?: user?.phone ?: ""
        if (userId.isBlank()) {
            return ApiResult.Failure(
                code = 400,
                message = "user id missing",
                recoverable = false,
            )
        }

        val session = AuthSession(
            token = safeToken,
            refreshToken = safeRefreshToken,
            expiresAt = System.currentTimeMillis() + (expiresIn ?: 7200L) * 1000L,
            authMode = AuthMode.USER,
        )
        val profile = UserProfile(
            id = userId,
            phone = user?.phone.orEmpty(),
            nickname = user?.nickname ?: user?.name ?: "yuexiang user",
            avatarUrl = user?.avatarUrl,
        )

        authSessionStore.saveSession(session)
        authSessionStore.saveProfile(profile)

        return ApiResult.Success(LoginResult(session, profile))
    }
}
