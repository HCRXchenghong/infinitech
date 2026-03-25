package com.user.infinite.core.data.repository

import com.user.infinite.core.common.ApiResult
import com.user.infinite.core.model.Shop
import com.user.infinite.core.model.UserProfile
import com.user.infinite.core.model.repository.ProfileRepository
import com.user.infinite.core.network.api.UserApi
import com.user.infinite.core.database.dao.CacheDao

class ProfileRepositoryImpl(
    private val userApi: UserApi,
    private val cacheDao: CacheDao,
) : ProfileRepository {

    override suspend fun fetchProfile(userId: String): ApiResult<UserProfile> {
        return executeWithCache(
            cacheDao = cacheDao,
            cacheKey = "profile:$userId",
            request = { userApi.profile(userId) },
            parse = { payload ->
                parseUserProfile(payload)
                    ?: throw IllegalStateException("profile payload invalid")
            },
            fallbackMessage = "failed to load user profile",
        )
    }

    override suspend fun fetchFavorites(userId: String, page: Int, pageSize: Int): ApiResult<List<Shop>> {
        return executeWithCache(
            cacheDao = cacheDao,
            cacheKey = "profile:favorites:$userId:$page:$pageSize",
            request = { userApi.favorites(userId, page, pageSize) },
            parse = ::parseShopList,
            fallbackMessage = "failed to load favorites",
        )
    }

    override suspend fun fetchFavoriteStatus(userId: String, shopId: String): ApiResult<Boolean> {
        return try {
            val response = userApi.favoriteStatus(userId, shopId)
            val body = response.body()
            if (!response.isSuccessful || body == null) {
                failureFromResponse(response, "failed to fetch favorite status")
            } else {
                ApiResult.Success(parseBooleanResult(body))
            }
        } catch (throwable: Throwable) {
            failureFromThrowable(throwable, "failed to fetch favorite status")
        }
    }

    override suspend fun addFavorite(userId: String, shopId: String): ApiResult<Boolean> {
        return try {
            val response = userApi.addFavorite(userId, mapOf("shopId" to shopId))
            val body = response.body()
            if (!response.isSuccessful || body == null) {
                failureFromResponse(response, "failed to add favorite")
            } else {
                ApiResult.Success(parseBooleanResult(body))
            }
        } catch (throwable: Throwable) {
            failureFromThrowable(throwable, "failed to add favorite")
        }
    }

    override suspend fun removeFavorite(userId: String, shopId: String): ApiResult<Boolean> {
        return try {
            val response = userApi.removeFavorite(userId, shopId)
            val body = response.body()
            if (!response.isSuccessful || body == null) {
                failureFromResponse(response, "failed to remove favorite")
            } else {
                ApiResult.Success(parseBooleanResult(body))
            }
        } catch (throwable: Throwable) {
            failureFromThrowable(throwable, "failed to remove favorite")
        }
    }
}
