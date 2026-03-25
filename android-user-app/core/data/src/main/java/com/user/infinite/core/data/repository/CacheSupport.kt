package com.user.infinite.core.data.repository

import com.google.gson.JsonElement
import com.google.gson.JsonParser
import com.user.infinite.core.common.ApiResult
import com.user.infinite.core.database.dao.CacheDao
import com.user.infinite.core.database.entity.CachedPayloadEntity
import retrofit2.Response

internal suspend fun <T> executeWithCache(
    cacheDao: CacheDao,
    cacheKey: String,
    request: suspend () -> Response<JsonElement>,
    parse: (JsonElement) -> T,
    fallbackMessage: String,
): ApiResult<T> {
    return try {
        val response = request()
        val body = response.body()
        if (response.isSuccessful && body != null) {
            parseAndCache(cacheDao, cacheKey, body, parse, fallbackMessage)
        } else {
            loadFromCache(cacheDao, cacheKey, parse, fallbackMessage)
                ?: failureFromResponse(response, fallbackMessage)
        }
    } catch (throwable: Throwable) {
        loadFromCache(cacheDao, cacheKey, parse, fallbackMessage)
            ?: failureFromThrowable(throwable, fallbackMessage)
    }
}

internal suspend fun <T> parseAndCache(
    cacheDao: CacheDao,
    cacheKey: String,
    payload: JsonElement,
    parse: (JsonElement) -> T,
    fallbackMessage: String,
): ApiResult<T> {
    return runCatching {
        val parsed = parse(payload)
        cacheDao.upsert(
            CachedPayloadEntity(
                key = cacheKey,
                payload = payload.toString(),
                updatedAt = System.currentTimeMillis(),
            ),
        )
        ApiResult.Success(parsed)
    }.getOrElse { throwable ->
        loadFromCache(cacheDao, cacheKey, parse, fallbackMessage)
            ?: failureFromThrowable(throwable, fallbackMessage)
    }
}

internal suspend fun <T> loadFromCache(
    cacheDao: CacheDao,
    cacheKey: String,
    parse: (JsonElement) -> T,
    fallbackMessage: String,
): ApiResult.Success<T>? {
    val cached = cacheDao.getByKey(cacheKey) ?: return null
    return runCatching {
        val payload = JsonParser.parseString(cached.payload)
        ApiResult.Success(parse(payload))
    }.getOrElse {
        null
    }
}
