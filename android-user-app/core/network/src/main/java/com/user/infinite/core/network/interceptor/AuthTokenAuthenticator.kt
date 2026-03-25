package com.user.infinite.core.network.interceptor

import com.user.infinite.core.model.AuthMode
import com.user.infinite.core.model.AuthSession
import com.user.infinite.core.network.api.AuthApi
import com.user.infinite.core.storage.AuthSessionStore
import kotlinx.coroutines.runBlocking
import okhttp3.Authenticator
import okhttp3.Request
import okhttp3.Response
import okhttp3.Route

class AuthTokenAuthenticator(
    private val authSessionStore: AuthSessionStore,
    private val refreshApi: AuthApi,
) : Authenticator {

    private val refreshLock = Any()

    override fun authenticate(route: Route?, response: Response): Request? {
        if (responseCount(response) >= 2) return null
        if (response.request.url.encodedPath.endsWith("/api/auth/refresh")) return null

        val requestToken = response.request.header("Authorization")
            ?.removePrefix("Bearer ")
            ?.trim()

        synchronized(refreshLock) {
            val latestToken = runBlocking { authSessionStore.peekSessionToken() }
            if (!latestToken.isNullOrBlank() && latestToken != requestToken) {
                return response.request.newBuilder()
                    .header("Authorization", "Bearer $latestToken")
                    .build()
            }

            val refreshToken = runBlocking { authSessionStore.peekRefreshToken() }
            if (refreshToken.isNullOrBlank()) {
                runBlocking { authSessionStore.clearSession() }
                return null
            }

            val refreshResponse = runBlocking {
                runCatching {
                    refreshApi.refresh(mapOf("refreshToken" to refreshToken))
                }.getOrNull()
            } ?: return null

            val body = refreshResponse.body()
            if (!refreshResponse.isSuccessful || body == null || !body.success || body.token.isNullOrBlank()) {
                runBlocking { authSessionStore.clearSession() }
                return null
            }

            val session = AuthSession(
                token = body.token.orEmpty(),
                refreshToken = body.refreshToken ?: refreshToken,
                expiresAt = System.currentTimeMillis() + (body.expiresIn ?: 7200L) * 1000L,
                authMode = AuthMode.USER,
            )
            runBlocking {
                authSessionStore.saveSession(session)
            }

            return response.request.newBuilder()
                .header("Authorization", "Bearer ${session.token}")
                .build()
        }
    }

    private fun responseCount(response: Response): Int {
        var result = 1
        var prior = response.priorResponse
        while (prior != null) {
            result++
            prior = prior.priorResponse
        }
        return result
    }
}
