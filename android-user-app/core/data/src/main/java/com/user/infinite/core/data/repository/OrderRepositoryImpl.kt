package com.user.infinite.core.data.repository

import com.user.infinite.core.common.ApiResult
import com.user.infinite.core.model.CreateOrderRequest
import com.user.infinite.core.model.OrderDetail
import com.user.infinite.core.model.OrderSummary
import com.user.infinite.core.model.repository.OrderRepository
import com.user.infinite.core.network.api.OrderApi
import com.user.infinite.core.database.dao.CacheDao

class OrderRepositoryImpl(
    private val orderApi: OrderApi,
    private val cacheDao: CacheDao,
) : OrderRepository {

    override suspend fun createOrder(request: CreateOrderRequest): ApiResult<OrderSummary> {
        val payload = buildMap<String, Any?> {
            put("shopId", request.shopId)
            put("shopName", request.shopName)
            put("userId", request.userId)
            put("items", request.items)
            put("address", request.address)
            put("totalPrice", request.totalPrice)
            put("price", request.totalPrice)
            request.remark?.takeIf { it.isNotBlank() }?.let { put("remark", it) }
            request.tableware?.takeIf { it.isNotBlank() }?.let { put("tableware", it) }
        }

        return try {
            val response = orderApi.create(payload)
            val body = response.body()
            if (!response.isSuccessful || body == null) {
                failureFromResponse(response, "failed to create order")
            } else {
                val summary = parseOrderSummary(body)
                if (summary == null) {
                    ApiResult.Failure(
                        code = 500,
                        message = "order create response invalid",
                        recoverable = false,
                    )
                } else {
                    ApiResult.Success(summary)
                }
            }
        } catch (throwable: Throwable) {
            failureFromThrowable(throwable, "failed to create order")
        }
    }

    override suspend fun fetchUserOrders(userId: String): ApiResult<List<OrderSummary>> {
        return executeWithCache(
            cacheDao = cacheDao,
            cacheKey = "orders:user:$userId",
            request = { orderApi.userOrders(userId) },
            parse = ::parseOrderSummaryList,
            fallbackMessage = "failed to load user orders",
        )
    }

    override suspend fun fetchOrderDetail(orderId: String): ApiResult<OrderDetail> {
        return executeWithCache(
            cacheDao = cacheDao,
            cacheKey = "orders:detail:$orderId",
            request = { orderApi.detail(orderId) },
            parse = { payload ->
                parseOrderDetail(payload)
                    ?: throw IllegalStateException("order detail missing")
            },
            fallbackMessage = "failed to load order detail",
        )
    }

    override suspend fun markOrderReviewed(orderId: String): ApiResult<Boolean> {
        return try {
            val response = orderApi.markReviewed(orderId)
            val body = response.body()
            if (!response.isSuccessful || body == null) {
                failureFromResponse(response, "failed to mark order reviewed")
            } else {
                ApiResult.Success(parseBooleanResult(body))
            }
        } catch (throwable: Throwable) {
            failureFromThrowable(throwable, "failed to mark order reviewed")
        }
    }
}
