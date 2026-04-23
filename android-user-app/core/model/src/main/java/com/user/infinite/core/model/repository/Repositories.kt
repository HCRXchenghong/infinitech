package com.user.infinite.core.model.repository

import com.user.infinite.core.common.ApiResult
import com.user.infinite.core.model.AppNotification
import com.user.infinite.core.model.AppNotificationDetail
import com.user.infinite.core.model.AuthSession
import com.user.infinite.core.model.Banner
import com.user.infinite.core.model.Category
import com.user.infinite.core.model.ChatMessage
import com.user.infinite.core.model.Conversation
import com.user.infinite.core.model.CouponSummary
import com.user.infinite.core.model.CreateOrderRequest
import com.user.infinite.core.model.ErrandEntry
import com.user.infinite.core.model.FeatureFlag
import com.user.infinite.core.model.LoginPayload
import com.user.infinite.core.model.LoginResult
import com.user.infinite.core.model.MedicineEntry
import com.user.infinite.core.model.OrderDetail
import com.user.infinite.core.model.OrderSummary
import com.user.infinite.core.model.Product
import com.user.infinite.core.model.Shop
import com.user.infinite.core.model.SmsCodeResult
import com.user.infinite.core.model.SyncMessageRequest
import com.user.infinite.core.model.UserAddress
import com.user.infinite.core.model.UserProfile
import com.user.infinite.core.model.WalletBalance
import com.user.infinite.core.model.WalletOperationResult
import com.user.infinite.core.model.WalletPayRequest
import com.user.infinite.core.model.WalletRechargeRequest
import com.user.infinite.core.model.WalletTransaction
import com.user.infinite.core.model.WalletWithdrawRequest
import com.user.infinite.core.model.sync.SyncState
import kotlinx.coroutines.flow.Flow

interface AuthRepository {
    suspend fun login(payload: LoginPayload): ApiResult<LoginResult>
    suspend fun refreshToken(refreshToken: String): ApiResult<AuthSession>
    suspend fun requestSmsCode(
        phone: String,
        scene: String,
        captcha: String? = null,
        sessionId: String? = null,
    ): ApiResult<SmsCodeResult>

    suspend fun verifySmsCode(
        phone: String,
        scene: String,
        code: String,
        consume: Boolean = true,
    ): ApiResult<Boolean>

    suspend fun register(phone: String, nickname: String, password: String): ApiResult<Boolean>
    suspend fun setNewPassword(phone: String, code: String, nextPassword: String): ApiResult<Boolean>
    suspend fun logout()
    fun observeSession(): Flow<AuthSession?>
}

interface ShopRepository {
    suspend fun fetchShopCategories(): ApiResult<List<String>>
    suspend fun fetchShops(category: String? = null): ApiResult<List<Shop>>
    suspend fun fetchTodayRecommendedShops(): ApiResult<List<Shop>>
    suspend fun fetchShopDetail(shopId: String): ApiResult<Shop>
    suspend fun fetchShopMenu(shopId: String): ApiResult<List<Product>>
    suspend fun fetchCategories(shopId: String? = null): ApiResult<List<Category>>
    suspend fun fetchProducts(shopId: String, categoryId: String? = null): ApiResult<List<Product>>
    suspend fun fetchBanners(shopId: String? = null): ApiResult<List<Banner>>
    suspend fun fetchFeaturedProducts(): ApiResult<List<Product>>
    suspend fun fetchShopCoupons(shopId: String): ApiResult<List<CouponSummary>>
}

interface OrderRepository {
    suspend fun createOrder(request: CreateOrderRequest): ApiResult<OrderSummary>
    suspend fun fetchUserOrders(userId: String): ApiResult<List<OrderSummary>>
    suspend fun fetchOrderDetail(orderId: String): ApiResult<OrderDetail>
    suspend fun markOrderReviewed(orderId: String): ApiResult<Boolean>
}

interface MessageRepository {
    suspend fun fetchConversations(): ApiResult<List<Conversation>>
    suspend fun fetchHistory(roomId: String): ApiResult<List<ChatMessage>>
    suspend fun upsertConversation(
        targetType: String,
        targetId: String,
        targetName: String? = null,
        targetPhone: String? = null,
    ): ApiResult<Conversation>

    suspend fun syncMessage(request: SyncMessageRequest): ApiResult<ChatMessage>
    suspend fun fetchNotifications(page: Int = 1, pageSize: Int = 20): ApiResult<List<AppNotification>>
    suspend fun fetchNotificationDetail(id: String): ApiResult<AppNotificationDetail>
    suspend fun generateSocketToken(userId: String, role: String): ApiResult<String>
}

interface ProfileRepository {
    suspend fun fetchProfile(userId: String): ApiResult<UserProfile>
    suspend fun fetchFavorites(userId: String, page: Int = 1, pageSize: Int = 20): ApiResult<List<Shop>>
    suspend fun fetchFavoriteStatus(userId: String, shopId: String): ApiResult<Boolean>
    suspend fun addFavorite(userId: String, shopId: String): ApiResult<Boolean>
    suspend fun removeFavorite(userId: String, shopId: String): ApiResult<Boolean>
}

interface AddressRepository {
    fun observeAddresses(): Flow<List<UserAddress>>
    fun observeSelectedAddress(): Flow<UserAddress?>
    suspend fun upsertAddress(address: UserAddress): ApiResult<UserAddress>
    suspend fun deleteAddress(addressId: String): ApiResult<Boolean>
    suspend fun selectAddress(addressId: String): ApiResult<Boolean>
}

interface WalletRepository {
    suspend fun fetchBalance(userId: String, userType: String = "customer"): ApiResult<WalletBalance>
    suspend fun fetchTransactions(
        userId: String,
        userType: String = "customer",
        page: Int = 1,
        limit: Int = 20,
    ): ApiResult<List<WalletTransaction>>

    suspend fun recharge(request: WalletRechargeRequest): ApiResult<WalletOperationResult>
    suspend fun pay(request: WalletPayRequest): ApiResult<WalletOperationResult>
    suspend fun withdraw(request: WalletWithdrawRequest): ApiResult<WalletOperationResult>
}

interface ErrandRepository {
    suspend fun fetchHomeEntries(): ApiResult<List<ErrandEntry>>
}

interface MedicineRepository {
    suspend fun fetchHomeEntries(): ApiResult<List<MedicineEntry>>
}

interface FeatureFlagRepository {
    suspend fun setFlag(key: String, enabled: Boolean, description: String = "")
    fun observeFlags(): Flow<List<FeatureFlag>>
}

interface SyncStateRepository {
    suspend fun updateState(state: SyncState)
    fun observeState(): Flow<SyncState>
}
