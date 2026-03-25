package com.user.infinite.core.data.repository

import com.user.infinite.core.model.FeatureFlag
import com.user.infinite.core.model.repository.FeatureFlagRepository
import com.user.infinite.core.storage.JsonDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.serialization.builtins.ListSerializer

private const val FEATURE_FLAG_KEY = "feature_flags"

class FeatureFlagRepositoryImpl(
    private val dataStore: JsonDataStore,
) : FeatureFlagRepository {

    override suspend fun setFlag(key: String, enabled: Boolean, description: String) {
        val old = observeFlags().first().associateBy { it.key }
        val updated = old.toMutableMap().apply {
            this[key] = FeatureFlag(key = key, enabled = enabled, description = description)
        }.values.toList()

        val json = dataStore.json().encodeToString(ListSerializer(FeatureFlag.serializer()), updated)
        dataStore.saveRaw(FEATURE_FLAG_KEY, json)
    }

    override fun observeFlags(): Flow<List<FeatureFlag>> {
        return dataStore.observe(
            key = FEATURE_FLAG_KEY,
            defaultValue = emptyList(),
            deserialize = { raw ->
                dataStore.json().decodeFromString(ListSerializer(FeatureFlag.serializer()), raw)
            },
        )
    }
}
