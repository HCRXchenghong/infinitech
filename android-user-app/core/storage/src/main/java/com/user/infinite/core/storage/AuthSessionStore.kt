package com.user.infinite.core.storage

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.longPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.user.infinite.core.model.AuthMode
import com.user.infinite.core.model.AuthSession
import com.user.infinite.core.model.UserProfile
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map

private val Context.authDataStore by preferencesDataStore(name = "auth_store")

class AuthSessionStore(private val context: Context) {

    private val tokenKey = stringPreferencesKey(StorageKeys.SESSION_TOKEN)
    private val refreshTokenKey = stringPreferencesKey(StorageKeys.SESSION_REFRESH_TOKEN)
    private val expiresAtKey = longPreferencesKey(StorageKeys.SESSION_EXPIRES_AT)
    private val authModeKey = stringPreferencesKey(StorageKeys.SESSION_AUTH_MODE)

    private val userIdKey = stringPreferencesKey(StorageKeys.USER_ID)
    private val userPhoneKey = stringPreferencesKey(StorageKeys.USER_PHONE)
    private val userNicknameKey = stringPreferencesKey(StorageKeys.USER_NICKNAME)
    private val userAvatarKey = stringPreferencesKey(StorageKeys.USER_AVATAR)

    fun observeSession(): Flow<AuthSession?> {
        return context.authDataStore.data.map { preferences ->
            val token = preferences[tokenKey].orEmpty()
            val refreshToken = preferences[refreshTokenKey].orEmpty()
            if (token.isBlank() || refreshToken.isBlank()) {
                null
            } else {
                AuthSession(
                    token = token,
                    refreshToken = refreshToken,
                    expiresAt = preferences[expiresAtKey] ?: 0L,
                    authMode = AuthMode.valueOf(preferences[authModeKey] ?: AuthMode.USER.name),
                )
            }
        }
    }

    fun observeProfile(): Flow<UserProfile?> {
        return context.authDataStore.data.map { preferences ->
            val id = preferences[userIdKey].orEmpty()
            val phone = preferences[userPhoneKey].orEmpty()
            val nickname = preferences[userNicknameKey].orEmpty()
            if (id.isBlank()) {
                null
            } else {
                UserProfile(
                    id = id,
                    phone = phone,
                    nickname = nickname,
                    avatarUrl = preferences[userAvatarKey],
                )
            }
        }
    }

    suspend fun saveSession(session: AuthSession) {
        context.authDataStore.edit { preferences ->
            preferences[tokenKey] = session.token
            preferences[refreshTokenKey] = session.refreshToken
            preferences[expiresAtKey] = session.expiresAt
            preferences[authModeKey] = session.authMode.name
        }
    }

    suspend fun saveProfile(profile: UserProfile) {
        context.authDataStore.edit { preferences ->
            preferences[userIdKey] = profile.id
            preferences[userPhoneKey] = profile.phone
            preferences[userNicknameKey] = profile.nickname
            profile.avatarUrl?.let { avatar ->
                preferences[userAvatarKey] = avatar
            }
        }
    }

    suspend fun clearSession() {
        context.authDataStore.edit { preferences ->
            preferences.remove(tokenKey)
            preferences.remove(refreshTokenKey)
            preferences.remove(expiresAtKey)
            preferences.remove(authModeKey)
            preferences.remove(userIdKey)
            preferences.remove(userPhoneKey)
            preferences.remove(userNicknameKey)
            preferences.remove(userAvatarKey)
        }
    }

    suspend fun peekSessionToken(): String? {
        return context.authDataStore.data.first()[tokenKey]
    }

    suspend fun peekRefreshToken(): String? {
        return context.authDataStore.data.first()[refreshTokenKey]
    }
}
