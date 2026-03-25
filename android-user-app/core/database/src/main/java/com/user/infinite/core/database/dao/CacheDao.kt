package com.user.infinite.core.database.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.user.infinite.core.database.entity.CachedPayloadEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface CacheDao {

    @Query("SELECT * FROM cached_payloads WHERE `key` = :key LIMIT 1")
    suspend fun getByKey(key: String): CachedPayloadEntity?

    @Query("SELECT * FROM cached_payloads WHERE `key` = :key LIMIT 1")
    fun observeByKey(key: String): Flow<CachedPayloadEntity?>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(entity: CachedPayloadEntity)

    @Query("DELETE FROM cached_payloads WHERE `key` = :key")
    suspend fun deleteByKey(key: String)

    @Query("DELETE FROM cached_payloads")
    suspend fun clearAll()
}
