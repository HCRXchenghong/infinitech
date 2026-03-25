package com.user.infinite.core.model.sync

import kotlinx.serialization.Serializable

@Serializable
data class SyncState(
    val datasetVersions: Map<String, Long> = emptyMap(),
    val lastSyncedAt: Long = 0L,
    val retryCount: Int = 0,
    val lastError: String? = null,
)
