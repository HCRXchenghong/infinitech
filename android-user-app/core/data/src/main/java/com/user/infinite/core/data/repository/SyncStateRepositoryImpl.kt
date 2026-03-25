package com.user.infinite.core.data.repository

import com.user.infinite.core.model.repository.SyncStateRepository
import com.user.infinite.core.model.sync.SyncState
import com.user.infinite.core.storage.JsonDataStore
import com.user.infinite.core.storage.StorageKeys
import kotlinx.coroutines.flow.Flow

class SyncStateRepositoryImpl(
    private val dataStore: JsonDataStore,
) : SyncStateRepository {

    override suspend fun updateState(state: SyncState) {
        val raw = dataStore.json().encodeToString(SyncState.serializer(), state)
        dataStore.saveRaw(StorageKeys.SYNC_STATE, raw)
    }

    override fun observeState(): Flow<SyncState> {
        return dataStore.observe(
            key = StorageKeys.SYNC_STATE,
            defaultValue = SyncState(),
            deserialize = { raw ->
                dataStore.json().decodeFromString(SyncState.serializer(), raw)
            },
        )
    }
}
