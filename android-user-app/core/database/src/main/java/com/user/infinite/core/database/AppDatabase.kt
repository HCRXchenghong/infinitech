package com.user.infinite.core.database

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import com.user.infinite.core.database.dao.CacheDao
import com.user.infinite.core.database.entity.CachedPayloadEntity

@Database(
    entities = [CachedPayloadEntity::class],
    version = 1,
    exportSchema = true,
)
abstract class AppDatabase : RoomDatabase() {

    abstract fun cacheDao(): CacheDao

    companion object {
        @Volatile
        private var instance: AppDatabase? = null

        fun getInstance(context: Context): AppDatabase {
            return instance ?: synchronized(this) {
                instance ?: Room.databaseBuilder(
                    context.applicationContext,
                    AppDatabase::class.java,
                    "yuexiang_android.db",
                ).fallbackToDestructiveMigration()
                    .build()
                    .also { db ->
                        instance = db
                    }
            }
        }
    }
}
