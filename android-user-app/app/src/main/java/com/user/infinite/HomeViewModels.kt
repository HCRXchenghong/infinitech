package com.user.infinite

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.user.infinite.core.common.ApiResult
import com.user.infinite.core.model.AppNotification
import com.user.infinite.core.model.AppNotificationDetail
import com.user.infinite.core.model.ChatMessage
import com.user.infinite.core.model.Conversation
import com.user.infinite.core.model.CouponSummary
import com.user.infinite.core.model.CreateOrderRequest
import com.user.infinite.core.model.ErrandEntry
import com.user.infinite.core.model.MedicineEntry
import com.user.infinite.core.model.OrderDetail
import com.user.infinite.core.model.OrderSummary
import com.user.infinite.core.model.Product
import com.user.infinite.core.model.Shop
import com.user.infinite.core.model.SyncMessageRequest
import com.user.infinite.core.model.UserAddress
import com.user.infinite.core.model.UserProfile
import com.user.infinite.core.model.WalletBalance
import com.user.infinite.core.model.WalletOperationResult
import com.user.infinite.core.model.WalletRechargeRequest
import com.user.infinite.core.model.WalletTransaction
import com.user.infinite.core.model.WalletWithdrawRequest
import com.user.infinite.core.model.repository.AddressRepository
import com.user.infinite.core.model.repository.ErrandRepository
import com.user.infinite.core.model.repository.FeatureFlagRepository
import com.user.infinite.core.model.repository.MedicineRepository
import com.user.infinite.core.model.repository.MessageRepository
import com.user.infinite.core.model.repository.OrderRepository
import com.user.infinite.core.model.repository.ProfileRepository
import com.user.infinite.core.model.repository.ShopRepository
import com.user.infinite.core.model.repository.WalletRepository
import com.user.infinite.core.model.socket.SocketEvent
import com.user.infinite.core.network.ApiConfig
import com.user.infinite.core.socket.SocketService
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.collect
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import org.json.JSONArray
import org.json.JSONObject

data class ShopsUiState(
    val loading: Boolean = false,
    val categories: List<String> = emptyList(),
    val selectedCategory: String? = null,
    val shops: List<Shop> = emptyList(),
    val selectedShop: Shop? = null,
    val menuLoading: Boolean = false,
    val menu: List<Product> = emptyList(),
    val cart: Map<String, Int> = emptyMap(),
    val creatingOrder: Boolean = false,
    val error: String? = null,
)

class ShopsViewModel(
    private val shopRepository: ShopRepository,
    private val orderRepository: OrderRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(ShopsUiState())
    val uiState: StateFlow<ShopsUiState> = _uiState.asStateFlow()

    fun loadHome(forceReload: Boolean = false) {
        if (_uiState.value.loading && !forceReload) return

        viewModelScope.launch {
            _uiState.update { it.copy(loading = true, error = null) }

            val categoriesResult = shopRepository.fetchShopCategories()
            val categories = when (categoriesResult) {
                is ApiResult.Success -> categoriesResult.data
                is ApiResult.Failure -> emptyList()
            }

            val category = _uiState.value.selectedCategory
            when (val shopsResult = shopRepository.fetchShops(category)) {
                is ApiResult.Success -> {
                    _uiState.update {
                        it.copy(
                            loading = false,
                            categories = categories,
                            shops = shopsResult.data,
                            error = null,
                        )
                    }
                }

                is ApiResult.Failure -> {
                    _uiState.update {
                        it.copy(
                            loading = false,
                            categories = categories,
                            error = shopsResult.message,
                        )
                    }
                }
            }
        }
    }

    fun selectCategory(category: String?) {
        if (_uiState.value.selectedCategory == category) return
        _uiState.update { it.copy(selectedCategory = category) }
        loadHome(forceReload = true)
    }

    fun openShop(shopId: String) {
        val currentShop = _uiState.value.selectedShop
        if (currentShop != null && currentShop.id == shopId && _uiState.value.menu.isNotEmpty()) {
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(menuLoading = true, error = null) }

            val detailResult = shopRepository.fetchShopDetail(shopId)
            val menuResult = shopRepository.fetchShopMenu(shopId)

            val shop = (detailResult as? ApiResult.Success)?.data
            val menu = (menuResult as? ApiResult.Success)?.data.orEmpty()
            val error = (detailResult as? ApiResult.Failure)?.message
                ?: (menuResult as? ApiResult.Failure)?.message

            _uiState.update {
                it.copy(
                    menuLoading = false,
                    selectedShop = shop,
                    menu = menu,
                    error = error,
                )
            }
        }
    }

    fun clearShopSelection() {
        _uiState.update {
            it.copy(
                selectedShop = null,
                menu = emptyList(),
                cart = emptyMap(),
                error = null,
            )
        }
    }

    fun addToCart(productId: String) {
        _uiState.update {
            val next = it.cart.toMutableMap()
            next[productId] = (next[productId] ?: 0) + 1
            it.copy(cart = next)
        }
    }

    fun removeFromCart(productId: String) {
        _uiState.update {
            val next = it.cart.toMutableMap()
            val current = next[productId] ?: 0
            when {
                current <= 1 -> next.remove(productId)
                else -> next[productId] = current - 1
            }
            it.copy(cart = next)
        }
    }

    fun cartTotalAmount(): Double {
        val state = _uiState.value
        val menuMap = state.menu.associateBy { it.id }
        return state.cart.entries.sumOf { (productId, count) ->
            (menuMap[productId]?.price ?: 0.0) * count
        }
    }

    fun createOrder(
        userId: String,
        address: String,
        remark: String,
        tableware: String,
        onSuccess: (OrderSummary) -> Unit,
    ) {
        val snapshot = _uiState.value
        val shop = snapshot.selectedShop ?: return
        if (snapshot.creatingOrder || snapshot.cart.isEmpty()) return

        val menuMap = snapshot.menu.associateBy { it.id }
        val itemsArray = JSONArray()
        snapshot.cart.forEach { (productId, count) ->
            val product = menuMap[productId] ?: return@forEach
            itemsArray.put(
                JSONObject()
                    .put("productId", product.id)
                    .put("name", product.name)
                    .put("price", product.price)
                    .put("quantity", count),
            )
        }

        viewModelScope.launch {
            _uiState.update { it.copy(creatingOrder = true, error = null) }
            when (
                val result = orderRepository.createOrder(
                    CreateOrderRequest(
                        shopId = shop.id,
                        shopName = shop.name,
                        userId = userId,
                        items = itemsArray.toString(),
                        address = address,
                        totalPrice = cartTotalAmount(),
                        remark = remark.takeIf { it.isNotBlank() },
                        tableware = tableware.takeIf { it.isNotBlank() },
                    ),
                )
            ) {
                is ApiResult.Success -> {
                    _uiState.update {
                        it.copy(
                            creatingOrder = false,
                            cart = emptyMap(),
                            error = null,
                        )
                    }
                    onSuccess(result.data)
                }

                is ApiResult.Failure -> {
                    _uiState.update {
                        it.copy(
                            creatingOrder = false,
                            error = result.message,
                        )
                    }
                }
            }
        }
    }
}

data class OrdersUiState(
    val loading: Boolean = false,
    val orders: List<OrderSummary> = emptyList(),
    val detailLoading: Boolean = false,
    val detail: OrderDetail? = null,
    val error: String? = null,
)

class OrdersViewModel(
    private val orderRepository: OrderRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(OrdersUiState())
    val uiState: StateFlow<OrdersUiState> = _uiState.asStateFlow()

    fun loadOrders(userId: String) {
        if (userId.isBlank()) return
        viewModelScope.launch {
            _uiState.update { it.copy(loading = true, error = null) }
            when (val result = orderRepository.fetchUserOrders(userId)) {
                is ApiResult.Success -> {
                    _uiState.update {
                        it.copy(
                            loading = false,
                            orders = result.data,
                            error = null,
                        )
                    }
                }

                is ApiResult.Failure -> {
                    _uiState.update {
                        it.copy(
                            loading = false,
                            error = result.message,
                        )
                    }
                }
            }
        }
    }

    fun loadDetail(orderId: String) {
        if (orderId.isBlank()) return
        viewModelScope.launch {
            _uiState.update { it.copy(detailLoading = true, error = null) }
            when (val result = orderRepository.fetchOrderDetail(orderId)) {
                is ApiResult.Success -> {
                    _uiState.update {
                        it.copy(
                            detailLoading = false,
                            detail = result.data,
                            error = null,
                        )
                    }
                }

                is ApiResult.Failure -> {
                    _uiState.update {
                        it.copy(
                            detailLoading = false,
                            error = result.message,
                        )
                    }
                }
            }
        }
    }

    fun clearDetail() {
        _uiState.update { it.copy(detail = null, error = null) }
    }
}

data class MessagesUiState(
    val loading: Boolean = false,
    val conversations: List<Conversation> = emptyList(),
    val notifications: List<AppNotification> = emptyList(),
    val notificationDetailLoading: Boolean = false,
    val notificationDetail: AppNotificationDetail? = null,
    val notificationDetailError: String? = null,
    val error: String? = null,
)

class MessagesViewModel(
    private val messageRepository: MessageRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(MessagesUiState())
    val uiState: StateFlow<MessagesUiState> = _uiState.asStateFlow()

    fun loadHome() {
        viewModelScope.launch {
            _uiState.update { it.copy(loading = true, error = null) }

            val conversationsResult = messageRepository.fetchConversations()
            val notificationsResult = messageRepository.fetchNotifications(page = 1, pageSize = 20)

            val conversations = (conversationsResult as? ApiResult.Success)?.data.orEmpty()
            val notifications = (notificationsResult as? ApiResult.Success)?.data.orEmpty()
            val error = (conversationsResult as? ApiResult.Failure)?.message
                ?: (notificationsResult as? ApiResult.Failure)?.message

            _uiState.update {
                it.copy(
                    loading = false,
                    conversations = conversations,
                    notifications = notifications,
                    error = error,
                )
            }
        }
    }

    fun loadNotificationDetail(id: String) {
        if (id.isBlank()) return
        viewModelScope.launch {
            _uiState.update {
                it.copy(
                    notificationDetailLoading = true,
                    notificationDetailError = null,
                )
            }

            when (val result = messageRepository.fetchNotificationDetail(id)) {
                is ApiResult.Success -> {
                    _uiState.update {
                        it.copy(
                            notificationDetailLoading = false,
                            notificationDetail = result.data,
                            notificationDetailError = null,
                        )
                    }
                }

                is ApiResult.Failure -> {
                    _uiState.update {
                        it.copy(
                            notificationDetailLoading = false,
                            notificationDetail = null,
                            notificationDetailError = result.message,
                        )
                    }
                }
            }
        }
    }

    fun clearNotificationDetail() {
        _uiState.update {
            it.copy(
                notificationDetail = null,
                notificationDetailError = null,
            )
        }
    }
}

data class ChatUiState(
    val loading: Boolean = false,
    val roomId: String = "",
    val roomName: String = "",
    val connected: Boolean = false,
    val sending: Boolean = false,
    val messages: List<ChatMessage> = emptyList(),
    val error: String? = null,
)

class ChatViewModel(
    private val messageRepository: MessageRepository,
    private val socketService: SocketService,
) : ViewModel() {

    private val _uiState = MutableStateFlow(ChatUiState())
    val uiState: StateFlow<ChatUiState> = _uiState.asStateFlow()

    private var connectedUserId: String? = null
    private var connectedRole: String? = null

    init {
        observeSocketEvents()
    }

    fun openRoom(
        roomId: String,
        roomName: String,
        userId: String,
        userName: String,
        userRole: String = "customer",
    ) {
        if (roomId.isBlank() || userId.isBlank()) return

        _uiState.update {
            it.copy(
                roomId = roomId,
                roomName = roomName,
                loading = true,
                error = null,
            )
        }

        viewModelScope.launch {
            loadHistory(roomId)
            ensureSocketConnected(
                roomId = roomId,
                userId = userId,
                userName = userName,
                userRole = userRole,
            )
        }
    }

    fun refreshHistory() {
        val roomId = _uiState.value.roomId
        if (roomId.isBlank()) return
        viewModelScope.launch {
            loadHistory(roomId)
        }
    }

    fun sendMessage(
        content: String,
        userId: String,
        userName: String,
        userRole: String = "customer",
    ) {
        val text = content.trim()
        val roomId = _uiState.value.roomId
        if (text.isBlank() || roomId.isBlank() || userId.isBlank()) return

        val tempMessage = ChatMessage(
            id = "local-${System.currentTimeMillis()}",
            roomId = roomId,
            senderId = userId,
            senderRole = userRole,
            senderName = userName,
            content = text,
            messageType = "text",
            time = "just now",
        )

        _uiState.update {
            it.copy(
                sending = true,
                error = null,
                messages = it.messages + tempMessage,
            )
        }

        viewModelScope.launch {
            socketService.sendMessage(
                roomId = roomId,
                sender = userName,
                senderId = userId,
                senderRole = userRole,
                content = text,
                messageType = "text",
            )

            when (
                val result = messageRepository.syncMessage(
                    SyncMessageRequest(
                        roomId = roomId,
                        senderId = userId,
                        senderRole = userRole,
                        senderName = userName,
                        content = text,
                        messageType = "text",
                    ),
                )
            ) {
                is ApiResult.Success -> {
                    _uiState.update { state ->
                        state.copy(
                            sending = false,
                            messages = state.messages.filterNot { it.id == tempMessage.id } + result.data,
                            error = null,
                        )
                    }
                }

                is ApiResult.Failure -> {
                    _uiState.update {
                        it.copy(
                            sending = false,
                            error = result.message,
                        )
                    }
                }
            }
        }
    }

    private suspend fun loadHistory(roomId: String) {
        when (val result = messageRepository.fetchHistory(roomId)) {
            is ApiResult.Success -> {
                _uiState.update {
                    it.copy(
                        loading = false,
                        messages = result.data,
                        error = null,
                    )
                }
            }

            is ApiResult.Failure -> {
                _uiState.update {
                    it.copy(
                        loading = false,
                        error = result.message,
                    )
                }
            }
        }
    }

    private suspend fun ensureSocketConnected(
        roomId: String,
        userId: String,
        userName: String,
        userRole: String,
    ) {
        if (connectedUserId != userId || connectedRole != userRole) {
            when (val tokenResult = messageRepository.generateSocketToken(userId, userRole)) {
                is ApiResult.Success -> {
                    socketService.connect(
                        baseUrl = ApiConfig.SOCKET_URL,
                        namespace = "/support",
                        token = tokenResult.data,
                    )
                    connectedUserId = userId
                    connectedRole = userRole
                }

                is ApiResult.Failure -> {
                    _uiState.update {
                        it.copy(
                            error = tokenResult.message,
                            loading = false,
                        )
                    }
                    return
                }
            }
        }

        socketService.joinRoom(roomId = roomId, userId = userId, role = userRole)

        // Sync sender metadata for first message if backend creates conversation lazily.
        messageRepository.upsertConversation(
            targetType = "support",
            targetId = roomId,
            targetName = userName,
        )
    }

    private fun observeSocketEvents() {
        viewModelScope.launch {
            socketService.observeEvents().collect { event ->
                when (event) {
                    SocketEvent.Connected -> {
                        _uiState.update { it.copy(connected = true) }
                    }

                    SocketEvent.Disconnected -> {
                        _uiState.update { it.copy(connected = false) }
                    }

                    is SocketEvent.AuthError -> {
                        _uiState.update { it.copy(error = event.reason.ifBlank { "socket auth error" }) }
                    }

                    is SocketEvent.NewMessage -> {
                        val currentRoom = _uiState.value.roomId
                        if (currentRoom.isBlank() || currentRoom != event.roomId) return@collect

                        val message = ChatMessage(
                            id = "socket-${System.currentTimeMillis()}",
                            roomId = event.roomId,
                            senderId = "remote",
                            senderRole = "support",
                            senderName = "客服",
                            content = event.payload,
                            messageType = event.messageType,
                            time = "just now",
                        )

                        _uiState.update { state ->
                            if (state.messages.lastOrNull()?.content == message.content &&
                                state.messages.lastOrNull()?.senderRole == message.senderRole
                            ) {
                                state
                            } else {
                                state.copy(messages = state.messages + message)
                            }
                        }
                    }

                    is SocketEvent.MessageSent -> Unit
                    is SocketEvent.MessagesLoaded -> Unit
                }
            }
        }
    }

    override fun onCleared() {
        super.onCleared()
        socketService.disconnect(clearSession = false)
    }
}

data class ProfileUiState(
    val loading: Boolean = false,
    val profile: UserProfile? = null,
    val favorites: List<Shop> = emptyList(),
    val walletBalance: WalletBalance? = null,
    val error: String? = null,
)

class ProfileViewModel(
    private val profileRepository: ProfileRepository,
    private val walletRepository: WalletRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(ProfileUiState())
    val uiState: StateFlow<ProfileUiState> = _uiState.asStateFlow()

    fun loadAll(userId: String) {
        if (userId.isBlank()) return

        viewModelScope.launch {
            _uiState.update { it.copy(loading = true, error = null) }

            val profileResult = profileRepository.fetchProfile(userId)
            val favoritesResult = profileRepository.fetchFavorites(userId, page = 1, pageSize = 20)
            val walletResult = walletRepository.fetchBalance(userId)

            val profile = (profileResult as? ApiResult.Success)?.data
            val favorites = (favoritesResult as? ApiResult.Success)?.data.orEmpty()
            val wallet = (walletResult as? ApiResult.Success)?.data
            val error = (profileResult as? ApiResult.Failure)?.message
                ?: (favoritesResult as? ApiResult.Failure)?.message
                ?: (walletResult as? ApiResult.Failure)?.message

            _uiState.update {
                it.copy(
                    loading = false,
                    profile = profile,
                    favorites = favorites,
                    walletBalance = wallet,
                    error = error,
                )
            }
        }
    }
}

data class WalletUiState(
    val loading: Boolean = false,
    val recharging: Boolean = false,
    val withdrawing: Boolean = false,
    val balance: WalletBalance? = null,
    val transactions: List<WalletTransaction> = emptyList(),
    val lastOperation: String? = null,
    val error: String? = null,
)

class WalletViewModel(
    private val walletRepository: WalletRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(WalletUiState())
    val uiState: StateFlow<WalletUiState> = _uiState.asStateFlow()

    fun load(userId: String) {
        if (userId.isBlank()) return
        viewModelScope.launch {
            _uiState.update { it.copy(loading = true, error = null) }

            val balanceResult = walletRepository.fetchBalance(userId)
            val txResult = walletRepository.fetchTransactions(userId = userId, page = 1, limit = 20)

            val balance = (balanceResult as? ApiResult.Success)?.data
            val transactions = (txResult as? ApiResult.Success)?.data.orEmpty()
            val error = (balanceResult as? ApiResult.Failure)?.message
                ?: (txResult as? ApiResult.Failure)?.message

            _uiState.update {
                it.copy(
                    loading = false,
                    balance = balance,
                    transactions = transactions,
                    error = error,
                )
            }
        }
    }

    fun recharge(userId: String, amount: Long) {
        if (userId.isBlank() || amount <= 0L) {
            _uiState.update { it.copy(error = "invalid recharge amount") }
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(recharging = true, error = null, lastOperation = null) }
            val result = walletRepository.recharge(
                WalletRechargeRequest(
                    userId = userId,
                    amount = amount,
                ),
            )
            handleOperationResult(
                result = result,
                onSuccess = "recharge submitted",
                clearFlag = { it.copy(recharging = false) },
                userId = userId,
            )
        }
    }

    fun withdraw(userId: String, amount: Long, account: String) {
        if (userId.isBlank() || amount <= 0L || account.isBlank()) {
            _uiState.update { it.copy(error = "invalid withdraw request") }
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(withdrawing = true, error = null, lastOperation = null) }
            val result = walletRepository.withdraw(
                WalletWithdrawRequest(
                    userId = userId,
                    amount = amount,
                    withdrawAccount = account,
                ),
            )
            handleOperationResult(
                result = result,
                onSuccess = "withdraw request submitted",
                clearFlag = { it.copy(withdrawing = false) },
                userId = userId,
            )
        }
    }

    private fun handleOperationResult(
        result: ApiResult<WalletOperationResult>,
        onSuccess: String,
        clearFlag: (WalletUiState) -> WalletUiState,
        userId: String,
    ) {
        when (result) {
            is ApiResult.Success -> {
                _uiState.update { state ->
                    clearFlag(
                        state.copy(
                            lastOperation = "$onSuccess: ${result.data.status.ifBlank { "ok" }}",
                            error = null,
                        ),
                    )
                }
                load(userId)
            }

            is ApiResult.Failure -> {
                _uiState.update { state ->
                    clearFlag(
                        state.copy(
                            error = result.message,
                        ),
                    )
                }
            }
        }
    }
}

data class SearchUiState(
    val loading: Boolean = false,
    val query: String = "",
    val results: List<Shop> = emptyList(),
    val error: String? = null,
)

class SearchViewModel(
    private val shopRepository: ShopRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(SearchUiState())
    val uiState: StateFlow<SearchUiState> = _uiState.asStateFlow()

    fun updateQuery(query: String) {
        _uiState.update { it.copy(query = query) }
    }

    fun searchCurrent() {
        search(_uiState.value.query)
    }

    fun search(query: String) {
        val q = query.trim()
        _uiState.update { it.copy(query = q) }

        if (q.isBlank()) {
            _uiState.update { it.copy(results = emptyList(), loading = false, error = null) }
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(loading = true, error = null) }
            when (val result = shopRepository.fetchShops()) {
                is ApiResult.Success -> {
                    val filtered = result.data.filter { shop ->
                        shop.name.contains(q, ignoreCase = true) ||
                            shop.category.contains(q, ignoreCase = true)
                    }
                    _uiState.update {
                        it.copy(
                            loading = false,
                            results = filtered,
                            error = null,
                        )
                    }
                }

                is ApiResult.Failure -> {
                    _uiState.update {
                        it.copy(
                            loading = false,
                            results = emptyList(),
                            error = result.message,
                        )
                    }
                }
            }
        }
    }

    fun clear() {
        _uiState.update { SearchUiState() }
    }
}

data class FavoritesUiState(
    val loading: Boolean = false,
    val operating: Boolean = false,
    val favorites: List<Shop> = emptyList(),
    val error: String? = null,
)


data class CouponCenterUiState(
    val loading: Boolean = false,
    val sourceShopId: String = "",
    val sourceShopName: String = "",
    val coupons: List<CouponSummary> = emptyList(),
    val emptyMessage: String? = null,
    val error: String? = null,
)

class CouponViewModel(
    private val shopRepository: ShopRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(CouponCenterUiState())
    val uiState: StateFlow<CouponCenterUiState> = _uiState.asStateFlow()

    fun load(shopId: String, shopName: String = "") {
        val normalizedShopId = shopId.trim()
        if (normalizedShopId.isBlank()) {
            _uiState.update {
                it.copy(
                    loading = false,
                    sourceShopId = "",
                    sourceShopName = "",
                    coupons = emptyList(),
                    emptyMessage = "No available shop source for coupon loading",
                    error = null,
                )
            }
            return
        }

        viewModelScope.launch {
            _uiState.update {
                it.copy(
                    loading = true,
                    sourceShopId = normalizedShopId,
                    sourceShopName = shopName,
                    error = null,
                )
            }

            when (val result = shopRepository.fetchShopCoupons(normalizedShopId)) {
                is ApiResult.Success -> {
                    _uiState.update {
                        it.copy(
                            loading = false,
                            coupons = result.data,
                            emptyMessage = if (result.data.isEmpty()) "No active coupons in current shop" else null,
                            error = null,
                        )
                    }
                }

                is ApiResult.Failure -> {
                    _uiState.update {
                        it.copy(
                            loading = false,
                            coupons = emptyList(),
                            emptyMessage = null,
                            error = result.message,
                        )
                    }
                }
            }
        }
    }
}

class FavoritesViewModel(
    private val profileRepository: ProfileRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(FavoritesUiState())
    val uiState: StateFlow<FavoritesUiState> = _uiState.asStateFlow()

    fun load(userId: String) {
        if (userId.isBlank()) return
        viewModelScope.launch {
            _uiState.update { it.copy(loading = true, error = null) }
            when (val result = profileRepository.fetchFavorites(userId = userId, page = 1, pageSize = 50)) {
                is ApiResult.Success -> {
                    _uiState.update {
                        it.copy(
                            loading = false,
                            favorites = result.data,
                            error = null,
                        )
                    }
                }

                is ApiResult.Failure -> {
                    _uiState.update {
                        it.copy(
                            loading = false,
                            error = result.message,
                        )
                    }
                }
            }
        }
    }

    fun removeFavorite(userId: String, shopId: String) {
        if (userId.isBlank() || shopId.isBlank()) return
        viewModelScope.launch {
            _uiState.update { it.copy(operating = true, error = null) }
            when (val result = profileRepository.removeFavorite(userId, shopId)) {
                is ApiResult.Success -> {
                    val removed = result.data
                    _uiState.update { state ->
                        state.copy(
                            operating = false,
                            favorites = if (removed) state.favorites.filterNot { it.id == shopId } else state.favorites,
                            error = if (removed) null else "移除收藏失败",
                        )
                    }
                }

                is ApiResult.Failure -> {
                    _uiState.update { it.copy(operating = false, error = result.message) }
                }
            }
        }
    }
}

data class ErrandUiState(
    val loading: Boolean = false,
    val entries: List<ErrandEntry> = emptyList(),
    val error: String? = null,
)

class ErrandViewModel(
    private val errandRepository: ErrandRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(ErrandUiState())
    val uiState: StateFlow<ErrandUiState> = _uiState.asStateFlow()

    fun load() {
        viewModelScope.launch {
            _uiState.update { it.copy(loading = true, error = null) }
            when (val result = errandRepository.fetchHomeEntries()) {
                is ApiResult.Success -> {
                    _uiState.update { it.copy(loading = false, entries = result.data, error = null) }
                }

                is ApiResult.Failure -> {
                    _uiState.update { it.copy(loading = false, error = result.message) }
                }
            }
        }
    }
}

data class MedicineUiState(
    val loading: Boolean = false,
    val entries: List<MedicineEntry> = emptyList(),
    val error: String? = null,
)

class MedicineViewModel(
    private val medicineRepository: MedicineRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(MedicineUiState())
    val uiState: StateFlow<MedicineUiState> = _uiState.asStateFlow()

    fun load() {
        viewModelScope.launch {
            _uiState.update { it.copy(loading = true, error = null) }
            when (val result = medicineRepository.fetchHomeEntries()) {
                is ApiResult.Success -> {
                    _uiState.update { it.copy(loading = false, entries = result.data, error = null) }
                }

                is ApiResult.Failure -> {
                    _uiState.update { it.copy(loading = false, error = result.message) }
                }
            }
        }
    }
}


data class OrderReviewUiState(
    val orderId: String = "",
    val rating: Int = 5,
    val comment: String = "",
    val submitting: Boolean = false,
    val submitted: Boolean = false,
    val resultMessage: String? = null,
    val error: String? = null,
)

class OrderReviewViewModel(
    private val orderRepository: OrderRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(OrderReviewUiState())
    val uiState: StateFlow<OrderReviewUiState> = _uiState.asStateFlow()

    fun open(orderId: String) {
        if (orderId.isBlank()) return
        _uiState.update {
            OrderReviewUiState(
                orderId = orderId,
                rating = it.rating,
                comment = it.comment,
            )
        }
    }

    fun updateRating(value: Int) {
        val clamped = value.coerceIn(1, 5)
        _uiState.update { it.copy(rating = clamped) }
    }

    fun updateComment(value: String) {
        _uiState.update { it.copy(comment = value) }
    }

    fun submit(onSuccess: () -> Unit = {}) {
        val snapshot = _uiState.value
        if (snapshot.orderId.isBlank() || snapshot.submitting || snapshot.submitted) return

        viewModelScope.launch {
            _uiState.update { it.copy(submitting = true, error = null, resultMessage = null) }
            when (val result = orderRepository.markOrderReviewed(snapshot.orderId)) {
                is ApiResult.Success -> {
                    if (result.data) {
                        _uiState.update {
                            it.copy(
                                submitting = false,
                                submitted = true,
                                resultMessage = "评价已提交，感谢反馈",
                                error = null,
                            )
                        }
                        onSuccess()
                    } else {
                        _uiState.update {
                            it.copy(
                                submitting = false,
                                error = "评价提交失败，请稍后重试",
                            )
                        }
                    }
                }

                is ApiResult.Failure -> {
                    _uiState.update {
                        it.copy(
                            submitting = false,
                            error = result.message,
                        )
                    }
                }
            }
        }
    }
}

data class SettingsToggleItem(
    val key: String,
    val title: String,
    val description: String,
    val enabled: Boolean,
)

data class SettingsUiState(
    val loading: Boolean = true,
    val savingKey: String? = null,
    val toggles: List<SettingsToggleItem> = emptyList(),
    val error: String? = null,
)

class SettingsViewModel(
    private val featureFlagRepository: FeatureFlagRepository,
) : ViewModel() {

    private val defaults = listOf(
        SettingsToggleItem(
            key = "notify_orders",
            title = "订单通知",
            description = "接收订单状态更新",
            enabled = true,
        ),
        SettingsToggleItem(
            key = "notify_marketing",
            title = "营销通知",
            description = "接收优惠活动信息",
            enabled = true,
        ),
        SettingsToggleItem(
            key = "show_wallet_amount",
            title = "钱包隐私显示",
            description = "首页展示钱包余额",
            enabled = true,
        ),
        SettingsToggleItem(
            key = "auto_reconnect_chat",
            title = "客服自动重连",
            description = "断线后自动恢复客服连接",
            enabled = true,
        ),
    )

    private val _uiState = MutableStateFlow(SettingsUiState(toggles = defaults))
    val uiState: StateFlow<SettingsUiState> = _uiState.asStateFlow()

    init {
        observeFlags()
    }

    fun toggle(key: String, enabled: Boolean) {
        val default = defaults.firstOrNull { it.key == key } ?: return
        _uiState.update { state ->
            state.copy(
                savingKey = key,
                error = null,
                toggles = state.toggles.map { item ->
                    if (item.key == key) item.copy(enabled = enabled) else item
                },
            )
        }

        viewModelScope.launch {
            runCatching {
                featureFlagRepository.setFlag(
                    key = key,
                    enabled = enabled,
                    description = default.description,
                )
            }.onFailure { throwable ->
                _uiState.update {
                    it.copy(
                        savingKey = null,
                        error = throwable.message ?: "设置更新失败",
                    )
                }
            }
        }
    }

    private fun observeFlags() {
        viewModelScope.launch {
            featureFlagRepository.observeFlags().collect { flags ->
                val flagMap = flags.associateBy { it.key }
                val merged = defaults.map { item ->
                    val flag = flagMap[item.key]
                    if (flag == null) {
                        item
                    } else {
                        item.copy(
                            enabled = flag.enabled,
                            description = flag.description.ifBlank { item.description },
                        )
                    }
                }

                _uiState.update {
                    it.copy(
                        loading = false,
                        savingKey = null,
                        toggles = merged,
                        error = null,
                    )
                }
            }
        }
    }
}



data class AddressUiState(
    val loading: Boolean = true,
    val addresses: List<UserAddress> = emptyList(),
    val selectedAddress: UserAddress? = null,
    val saving: Boolean = false,
    val deletingId: String? = null,
    val message: String? = null,
    val error: String? = null,
)

class AddressViewModel(
    private val addressRepository: AddressRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(AddressUiState())
    val uiState: StateFlow<AddressUiState> = _uiState.asStateFlow()

    init {
        observeAddresses()
    }

    fun selectAddress(addressId: String, onSuccess: () -> Unit = {}) {
        if (addressId.isBlank()) return
        viewModelScope.launch {
            when (val result = addressRepository.selectAddress(addressId)) {
                is ApiResult.Success -> {
                    _uiState.update { it.copy(error = null, message = "地址已切换") }
                    onSuccess()
                }

                is ApiResult.Failure -> {
                    _uiState.update { it.copy(error = result.message, message = null) }
                }
            }
        }
    }

    fun upsertAddress(address: UserAddress, onSuccess: () -> Unit = {}) {
        viewModelScope.launch {
            _uiState.update { it.copy(saving = true, error = null, message = null) }
            when (val result = addressRepository.upsertAddress(address)) {
                is ApiResult.Success -> {
                    _uiState.update {
                        it.copy(
                            saving = false,
                            error = null,
                            message = "地址已保存",
                        )
                    }
                    onSuccess()
                }

                is ApiResult.Failure -> {
                    _uiState.update {
                        it.copy(
                            saving = false,
                            error = result.message,
                            message = null,
                        )
                    }
                }
            }
        }
    }

    fun deleteAddress(addressId: String) {
        if (addressId.isBlank()) return

        viewModelScope.launch {
            _uiState.update { it.copy(deletingId = addressId, error = null, message = null) }
            when (val result = addressRepository.deleteAddress(addressId)) {
                is ApiResult.Success -> {
                    _uiState.update {
                        it.copy(
                            deletingId = null,
                            error = null,
                            message = "地址已删除",
                        )
                    }
                }

                is ApiResult.Failure -> {
                    _uiState.update {
                        it.copy(
                            deletingId = null,
                            error = result.message,
                            message = null,
                        )
                    }
                }
            }
        }
    }

    private fun observeAddresses() {
        viewModelScope.launch {
            combine(
                addressRepository.observeAddresses(),
                addressRepository.observeSelectedAddress(),
            ) { addresses, selectedAddress ->
                addresses to selectedAddress
            }.collect { (addresses, selectedAddress) ->
                _uiState.update {
                    it.copy(
                        loading = false,
                        addresses = addresses,
                        selectedAddress = selectedAddress,
                    )
                }
            }
        }
    }
}

