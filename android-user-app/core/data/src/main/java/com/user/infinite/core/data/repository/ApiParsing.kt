package com.user.infinite.core.data.repository

import com.google.gson.JsonArray
import com.google.gson.JsonElement
import com.google.gson.JsonNull
import com.google.gson.JsonObject
import com.google.gson.JsonParser
import com.user.infinite.core.common.ApiResult
import retrofit2.Response

internal fun failureFromResponse(response: Response<*>, fallbackMessage: String): ApiResult.Failure {
    val rawError = runCatching { response.errorBody()?.string() }.getOrNull()
    val message = parseErrorMessage(rawError) ?: fallbackMessage
    return ApiResult.Failure(
        code = response.code(),
        message = message,
        recoverable = response.code() >= 500,
    )
}

internal fun failureFromThrowable(throwable: Throwable, fallbackMessage: String): ApiResult.Failure {
    return ApiResult.Failure(
        code = -1,
        message = throwable.message ?: fallbackMessage,
        recoverable = true,
        throwable = throwable,
    )
}

internal fun unwrapData(element: JsonElement?): JsonElement {
    if (element == null || element is JsonNull) return JsonNull.INSTANCE
    if (!element.isJsonObject) return element

    val obj = element.asJsonObject
    if (obj.has("data") && !obj.get("data").isJsonNull) {
        return obj.get("data")
    }
    if (obj.has("result") && !obj.get("result").isJsonNull) {
        return obj.get("result")
    }
    return obj
}

internal fun extractArray(root: JsonElement, vararg keys: String): List<JsonObject> {
    val target = unwrapData(root)
    if (target.isJsonArray) {
        return target.asJsonArray.toJsonObjectList()
    }

    if (target.isJsonObject) {
        val obj = target.asJsonObject
        for (key in keys) {
            val candidate = obj.get(key)
            if (candidate != null && candidate.isJsonArray) {
                return candidate.asJsonArray.toJsonObjectList()
            }
        }
    }

    return emptyList()
}

internal fun parseErrorMessage(rawBody: String?): String? {
    if (rawBody.isNullOrBlank()) return null
    val parsed = runCatching { JsonParser.parseString(rawBody) }.getOrNull() ?: return rawBody
    if (!parsed.isJsonObject) return rawBody

    val obj = parsed.asJsonObject
    return obj.optString("error") ?: obj.optString("message") ?: rawBody
}

internal fun JsonArray.toJsonObjectList(): List<JsonObject> {
    return asSequence()
        .filter { it != null && it.isJsonObject }
        .map { it.asJsonObject }
        .toList()
}

internal fun JsonObject.optString(vararg keys: String): String? {
    for (key in keys) {
        val value = get(key) ?: continue
        if (!value.isJsonNull) {
            val text = value.asString
            if (text.isNotBlank()) return text
        }
    }
    return null
}

internal fun JsonObject.optDouble(vararg keys: String): Double {
    for (key in keys) {
        val value = get(key) ?: continue
        if (!value.isJsonNull) {
            return runCatching { value.asDouble }.getOrDefault(0.0)
        }
    }
    return 0.0
}

internal fun JsonObject.optInt(vararg keys: String): Int {
    for (key in keys) {
        val value = get(key) ?: continue
        if (!value.isJsonNull) {
            return runCatching { value.asInt }.getOrDefault(0)
        }
    }
    return 0
}

internal fun JsonObject.optLong(vararg keys: String): Long {
    for (key in keys) {
        val value = get(key) ?: continue
        if (!value.isJsonNull) {
            return runCatching { value.asLong }.getOrDefault(0L)
        }
    }
    return 0L
}

internal fun JsonObject.optBoolean(vararg keys: String): Boolean {
    for (key in keys) {
        val value = get(key) ?: continue
        if (!value.isJsonNull) {
            return runCatching { value.asBoolean }.getOrDefault(false)
        }
    }
    return false
}

internal fun JsonObject.optArray(vararg keys: String): JsonArray? {
    for (key in keys) {
        val value = get(key) ?: continue
        if (value.isJsonArray) return value.asJsonArray
    }
    return null
}

internal fun JsonObject.optObject(vararg keys: String): JsonObject? {
    for (key in keys) {
        val value = get(key) ?: continue
        if (value.isJsonObject) return value.asJsonObject
    }
    return null
}
