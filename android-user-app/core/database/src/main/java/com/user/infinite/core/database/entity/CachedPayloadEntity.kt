package com.user.infinite.core.database.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "cached_payloads")
data class CachedPayloadEntity(
    @PrimaryKey val key: String,
    val payload: String,
    val updatedAt: Long,
)
