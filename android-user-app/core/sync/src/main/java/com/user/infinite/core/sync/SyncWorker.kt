package com.user.infinite.core.sync

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.google.gson.JsonElement
import com.user.infinite.core.data.repository.SyncStateRepositoryImpl
import com.user.infinite.core.database.AppDatabase
import com.user.infinite.core.database.entity.CachedPayloadEntity
import com.user.infinite.core.model.sync.SyncState
import com.user.infinite.core.network.AppNetwork
import com.user.infinite.core.storage.AuthSessionStore
import com.user.infinite.core.storage.JsonDataStore
import kotlinx.coroutines.flow.first

class SyncWorker(
    appContext: Context,
    workerParams: WorkerParameters,
) : CoroutineWorker(appContext, workerParams) {

    override suspend fun doWork(): Result {
        val authSessionStore = AuthSessionStore(applicationContext)
        val appNetwork = AppNetwork(authSessionStore)
        val syncStateRepository = SyncStateRepositoryImpl(JsonDataStore(applicationContext))
        val cacheDao = AppDatabase.getInstance(applicationContext).cacheDao()

        val currentState = syncStateRepository.observeState().first()

        return try {
            val stateResponse = appNetwork.syncApi.state()
            val stateBody = stateResponse.body()
            if (!stateResponse.isSuccessful || stateBody == null) {
                val nextState = currentState.copy(
                    retryCount = currentState.retryCount + 1,
                    lastError = "sync state request failed: ${stateResponse.code()}",
                )
                syncStateRepository.updateState(nextState)
                Result.retry()
            } else {
                val serverVersions = parseSyncStateVersions(stateBody)
                val mergedVersions = currentState.datasetVersions.toMutableMap()
                var hasDatasetFailure = false
                var firstFailureReason: String? = null

                serverVersions.forEach { (dataset, serverVersion) ->
                    val localVersion = mergedVersions[dataset] ?: 0L
                    if (serverVersion <= localVersion) return@forEach

                    val datasetResponse = appNetwork.syncApi.dataset(
                        dataset = dataset,
                        since = localVersion.takeIf { it > 0L },
                    )
                    val datasetBody = datasetResponse.body()
                    if (!datasetResponse.isSuccessful || datasetBody == null) {
                        hasDatasetFailure = true
                        if (firstFailureReason == null) {
                            firstFailureReason = "dataset=$dataset code=${datasetResponse.code()}"
                        }
                        return@forEach
                    }

                    cacheDao.upsert(
                        CachedPayloadEntity(
                            key = "sync:$dataset",
                            payload = datasetBody.toString(),
                            updatedAt = System.currentTimeMillis(),
                        ),
                    )

                    val newVersion = parseDatasetVersion(datasetBody) ?: serverVersion
                    mergedVersions[dataset] = maxOf(newVersion, serverVersion)
                }

                val now = System.currentTimeMillis()
                val nextState = if (hasDatasetFailure) {
                    currentState.copy(
                        datasetVersions = mergedVersions,
                        lastSyncedAt = now,
                        retryCount = currentState.retryCount + 1,
                        lastError = firstFailureReason ?: "partial sync failure",
                    )
                } else {
                    currentState.copy(
                        datasetVersions = mergedVersions,
                        lastSyncedAt = now,
                        retryCount = 0,
                        lastError = null,
                    )
                }
                syncStateRepository.updateState(nextState)

                if (hasDatasetFailure) Result.retry() else Result.success()
            }
        } catch (throwable: Throwable) {
            syncStateRepository.updateState(
                currentState.copy(
                    retryCount = currentState.retryCount + 1,
                    lastError = throwable.message ?: "sync worker failed",
                ),
            )
            Result.retry()
        }
    }

    private fun parseSyncStateVersions(root: JsonElement): Map<String, Long> {
        val data = unwrapEnvelope(root)
        if (!data.isJsonObject) return emptyMap()

        val obj = data.asJsonObject
        return buildMap {
            obj.entrySet().forEach { (key, value) ->
                val number = value.asLongOrNull()
                if (number != null) put(key, number)
            }
        }
    }

    private fun parseDatasetVersion(root: JsonElement): Long? {
        val data = unwrapEnvelope(root)
        if (!data.isJsonObject) return null

        val obj = data.asJsonObject
        return obj.get("newVersion")?.asLongOrNull()
            ?: obj.get("version")?.asLongOrNull()
    }

    private fun unwrapEnvelope(element: JsonElement): JsonElement {
        if (!element.isJsonObject) return element
        val obj = element.asJsonObject
        return when {
            obj.has("data") && !obj.get("data").isJsonNull -> obj.get("data")
            obj.has("result") && !obj.get("result").isJsonNull -> obj.get("result")
            else -> obj
        }
    }

    private fun JsonElement.asLongOrNull(): Long? {
        return runCatching {
            if (isJsonPrimitive) {
                asLong
            } else {
                null
            }
        }.getOrNull()
    }

    companion object {
        const val WORK_NAME = "yuexiang_incremental_sync"
    }
}
