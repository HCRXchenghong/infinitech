package com.user.infinite.core.common

sealed interface ApiResult<out T> {
    data class Success<T>(val data: T) : ApiResult<T>

    data class Failure(
        val code: Int,
        val message: String,
        val recoverable: Boolean = true,
        val throwable: Throwable? = null,
    ) : ApiResult<Nothing>
}

inline fun <T> ApiResult<T>.onSuccess(block: (T) -> Unit): ApiResult<T> {
    if (this is ApiResult.Success) {
        block(data)
    }
    return this
}

inline fun <T> ApiResult<T>.onFailure(block: (ApiResult.Failure) -> Unit): ApiResult<T> {
    if (this is ApiResult.Failure) {
        block(this)
    }
    return this
}
