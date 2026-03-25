package com.user.infinite.core.data.repository

import com.user.infinite.core.common.ApiResult
import com.user.infinite.core.model.WalletBalance
import com.user.infinite.core.model.WalletOperationResult
import com.user.infinite.core.model.WalletPayRequest
import com.user.infinite.core.model.WalletRechargeRequest
import com.user.infinite.core.model.WalletTransaction
import com.user.infinite.core.model.WalletWithdrawRequest
import com.user.infinite.core.model.repository.WalletRepository
import com.user.infinite.core.network.api.WalletApi
import com.user.infinite.core.database.dao.CacheDao

class WalletRepositoryImpl(
    private val walletApi: WalletApi,
    private val cacheDao: CacheDao,
) : WalletRepository {

    override suspend fun fetchBalance(userId: String, userType: String): ApiResult<WalletBalance> {
        return executeWithCache(
            cacheDao = cacheDao,
            cacheKey = "wallet:balance:$userType:$userId",
            request = { walletApi.balance(userId, userType) },
            parse = { payload ->
                parseWalletBalance(payload)
                    ?: throw IllegalStateException("wallet balance payload invalid")
            },
            fallbackMessage = "failed to load wallet balance",
        )
    }

    override suspend fun fetchTransactions(
        userId: String,
        userType: String,
        page: Int,
        limit: Int,
    ): ApiResult<List<WalletTransaction>> {
        return executeWithCache(
            cacheDao = cacheDao,
            cacheKey = "wallet:transactions:$userType:$userId:$page:$limit",
            request = { walletApi.transactions(userId, userType, page, limit) },
            parse = ::parseWalletTransactionList,
            fallbackMessage = "failed to load wallet transactions",
        )
    }

    override suspend fun recharge(request: WalletRechargeRequest): ApiResult<WalletOperationResult> {
        val payload = buildMap<String, Any?> {
            put("userId", request.userId)
            put("userType", request.userType)
            put("amount", request.amount)
            put("paymentMethod", request.paymentMethod)
        }

        return executeWalletMutation(
            fallbackMessage = "failed to recharge wallet",
            request = { walletApi.recharge(payload) },
        )
    }

    override suspend fun pay(request: WalletPayRequest): ApiResult<WalletOperationResult> {
        val payload = buildMap<String, Any?> {
            put("userId", request.userId)
            put("userType", request.userType)
            put("amount", request.amount)
            put("orderId", request.orderId)
            put("paymentMethod", request.paymentMethod)
        }

        return executeWalletMutation(
            fallbackMessage = "failed to pay with wallet",
            request = { walletApi.payment(payload) },
        )
    }

    override suspend fun withdraw(request: WalletWithdrawRequest): ApiResult<WalletOperationResult> {
        val payload = buildMap<String, Any?> {
            put("userId", request.userId)
            put("userType", request.userType)
            put("amount", request.amount)
            put("withdrawMethod", request.withdrawMethod)
            put("withdrawAccount", request.withdrawAccount)
        }

        return executeWalletMutation(
            fallbackMessage = "failed to withdraw wallet balance",
            request = { walletApi.withdraw(payload) },
        )
    }

    private suspend fun executeWalletMutation(
        fallbackMessage: String,
        request: suspend () -> retrofit2.Response<com.google.gson.JsonElement>,
    ): ApiResult<WalletOperationResult> {
        return try {
            val response = request()
            val body = response.body()
            if (!response.isSuccessful || body == null) {
                failureFromResponse(response, fallbackMessage)
            } else {
                ApiResult.Success(parseWalletOperationResult(body))
            }
        } catch (throwable: Throwable) {
            failureFromThrowable(throwable, fallbackMessage)
        }
    }
}
