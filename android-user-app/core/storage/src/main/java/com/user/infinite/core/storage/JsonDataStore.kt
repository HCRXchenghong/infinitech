package com.user.infinite.core.storage

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import kotlinx.serialization.json.Json

private val Context.syncDataStore by preferencesDataStore(name = "sync_store")

class JsonDataStore(private val context: Context) {

    private val json = Json {
        ignoreUnknownKeys = true
        encodeDefaults = true
    }

    fun <T> observe(key: String, defaultValue: T, deserialize: (String) -> T): Flow<T> {
        val preferencesKey = stringPreferencesKey(key)
        return context.syncDataStore.data.map { preferences ->
            val raw = preferences[preferencesKey]
            if (raw.isNullOrBlank()) {
                defaultValue
            } else {
                runCatching { deserialize(raw) }.getOrElse { defaultValue }
            }
        }
    }

    suspend fun saveRaw(key: String, raw: String) {
        val preferencesKey = stringPreferencesKey(key)
        context.syncDataStore.edit { preferences ->
            preferences[preferencesKey] = raw
        }
    }

    fun json(): Json = json
}
