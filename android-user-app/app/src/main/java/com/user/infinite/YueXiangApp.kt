package com.user.infinite

import android.net.Uri
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.Modifier
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.user.infinite.feature.auth.AuthScreen
import com.user.infinite.feature.auth.AuthViewModel
import com.user.infinite.feature.auth.RegisterScreen
import com.user.infinite.feature.auth.RegisterViewModel
import com.user.infinite.feature.auth.ResetPasswordScreen
import com.user.infinite.feature.auth.ResetPasswordViewModel
import com.user.infinite.feature.auth.SetPasswordScreen
import com.user.infinite.feature.auth.SetPasswordViewModel
private object Routes {
    const val WELCOME = "welcome"
    const val AUTH = "auth"
    const val REGISTER = "register"
    const val RESET_PASSWORD = "reset_password"
    const val SET_PASSWORD = "set_password/{phone}/{code}"

    const val HOME = "home"
    const val ORDER_CONFIRM = "order_confirm"
    const val ORDER_REMARK = "order_remark?initial={initial}"
    const val ORDER_TABLEWARE = "order_tableware?initial={initial}"
    const val SHOP_DETAIL = "shop_detail/{shopId}"
    const val PAY_SUCCESS = "pay_success/{orderId}"
    const val ORDER_DETAIL = "order_detail/{orderId}"
    const val ORDER_REVIEW = "order_review/{orderId}"
    const val ORDER_REFUND = "order_refund/{orderId}"
    const val CART_POPUP = "cart_popup"
    const val CHAT = "chat/{roomId}"
    const val NOTIFICATION_DETAIL = "notification_detail/{notificationId}"
    const val WALLET = "wallet"
    const val WALLET_RECHARGE = "wallet_recharge"
    const val WALLET_WITHDRAW = "wallet_withdraw"
    const val WALLET_BILLS = "wallet_bills"
    const val SEARCH = "search"
    const val CATEGORY_HUB = "category_hub"
    const val CATEGORY_LIST = "category/{categoryKey}"
    const val FEATURED_PRODUCTS = "featured_products"
    const val PRODUCT_DETAIL = "product_detail/{productId}?shopId={shopId}"
    const val PRODUCT_POPUP_DETAIL = "product_popup_detail/{productId}?shopId={shopId}"
    const val FAVORITES = "favorites"
    const val PROFILE_CENTER = "profile_center"
    const val SETTINGS = "settings"
    const val SETTINGS_DETAIL = "settings_detail"
    const val MY_REVIEWS = "my_reviews"
    const val COUPON_LIST = "coupon_list"
    const val VIP_CENTER = "vip_center"
    const val POINTS_MALL = "points_mall"
    const val INVITE_FRIENDS = "invite_friends"
    const val COOPERATION = "cooperation"
    const val PROFILE_EDIT = "profile_edit"
    const val PHONE_CHANGE = "phone_change"
    const val CUSTOMER_SERVICE = "customer_service"
    const val DINING_BUDDY = "dining_buddy"
    const val CHARITY = "charity"
    const val ADDRESS_LIST = "address_list"
    const val ADDRESS_SELECT = "address_select"
    const val ADDRESS_EDIT = "address_edit"
    const val ADDRESS_EDIT_WITH_ID = "address_edit/{addressId}"
    const val LOCATION_SELECT = "location_select"

    const val ERRAND_HOME = "errand_home"
    const val ERRAND_SERVICE = "errand_service/{serviceId}"
    const val ERRAND_BUY = "errand_buy/{serviceId}"
    const val ERRAND_DELIVER = "errand_deliver/{serviceId}"
    const val ERRAND_PICKUP = "errand_pickup/{serviceId}"
    const val ERRAND_DO = "errand_do/{serviceId}"
    const val ERRAND_DETAIL = "errand_detail/{serviceId}"
    const val MEDICINE_HOME = "medicine_home"
    const val MEDICINE_SERVICE = "medicine_service/{serviceId}"
    const val MEDICINE_CHAT = "medicine_chat/{serviceId}"
    const val MEDICINE_ORDER = "medicine_order/{serviceId}"
    const val MEDICINE_TRACKING = "medicine_tracking/{serviceId}"

    fun shopDetail(shopId: String): String = "shop_detail/$shopId"
    fun paySuccess(orderId: String): String = "pay_success/$orderId"
    fun orderRemark(initial: String): String = "order_remark?initial=${Uri.encode(initial)}"
    fun orderTableware(initial: String): String = "order_tableware?initial=${Uri.encode(initial)}"
    fun orderDetail(orderId: String): String = "order_detail/$orderId"
    fun orderReview(orderId: String): String = "order_review/$orderId"
    fun orderRefund(orderId: String): String = "order_refund/$orderId"
    fun chat(roomId: String): String = "chat/$roomId"
    fun notificationDetail(notificationId: String): String = "notification_detail/$notificationId"
    fun categoryList(categoryKey: String): String = "category/${Uri.encode(categoryKey)}"
    fun productDetail(productId: String, shopId: String?): String =
        "product_detail/${Uri.encode(productId)}?shopId=${Uri.encode(shopId.orEmpty())}"

    fun productPopupDetail(productId: String, shopId: String?): String =
        "product_popup_detail/${Uri.encode(productId)}?shopId=${Uri.encode(shopId.orEmpty())}"

    fun errandService(serviceId: String): String = "errand_service/$serviceId"
    fun errandBuy(serviceId: String): String = "errand_buy/$serviceId"
    fun errandDeliver(serviceId: String): String = "errand_deliver/$serviceId"
    fun errandPickup(serviceId: String): String = "errand_pickup/$serviceId"
    fun errandDo(serviceId: String): String = "errand_do/$serviceId"
    fun errandDetail(serviceId: String): String = "errand_detail/$serviceId"
    fun medicineService(serviceId: String): String = "medicine_service/$serviceId"
    fun medicineChat(serviceId: String): String = "medicine_chat/$serviceId"
    fun medicineOrder(serviceId: String): String = "medicine_order/$serviceId"
    fun medicineTracking(serviceId: String): String = "medicine_tracking/$serviceId"
    fun setPassword(phone: String, code: String): String =
        "set_password/${Uri.encode(phone)}/${Uri.encode(code)}"

    fun addressEdit(addressId: String): String = "address_edit/$addressId"
}

internal fun resolveErrandRoute(serviceId: String, title: String): String {
    val normalizedId = serviceId.trim().lowercase()
    val normalizedHint = "$normalizedId ${title.trim().lowercase()}"

    return when {
        normalizedId == "buy" || normalizedHint.contains("buy") -> Routes.errandBuy(serviceId)
        normalizedId == "deliver" || normalizedId == "send" ||
            normalizedHint.contains("deliver") || normalizedHint.contains("send") ->
            Routes.errandDeliver(serviceId)

        normalizedId == "pickup" || normalizedId == "pick" ||
            normalizedHint.contains("pickup") || normalizedHint.contains("pick") ->
            Routes.errandPickup(serviceId)

        normalizedId == "do" || normalizedId == "queue" ||
            normalizedHint.contains("queue") || normalizedHint.contains("do") ->
            Routes.errandDo(serviceId)

        else -> Routes.errandDetail(serviceId)
    }
}

internal fun resolveMedicineRoute(serviceId: String, title: String): String {
    val normalizedId = serviceId.trim().lowercase()
    val normalizedHint = "$normalizedId ${title.trim().lowercase()}"

    return when {
        normalizedId == "consult" || normalizedId == "chat" ||
            normalizedHint.contains("chat") || normalizedHint.contains("consult") ->
            Routes.medicineChat(serviceId)

        normalizedId == "order" || normalizedId == "buy" ||
            normalizedHint.contains("order") || normalizedHint.contains("buy") ->
            Routes.medicineOrder(serviceId)

        normalizedId == "tracking" || normalizedId == "track" || normalizedId == "delivery" ||
            normalizedHint.contains("track") || normalizedHint.contains("tracking") || normalizedHint.contains("delivery") ->
            Routes.medicineTracking(serviceId)

        else -> Routes.medicineChat(serviceId)
    }
}

@Composable
fun YueXiangApp(
    modifier: Modifier = Modifier,
    factory: YueXiangViewModelFactory,
) {
    val navController = rememberNavController()

    val mainViewModel: MainViewModel = viewModel(factory = factory)
    val authViewModel: AuthViewModel = viewModel(factory = factory)
    val registerViewModel: RegisterViewModel = viewModel(factory = factory)
    val resetPasswordViewModel: ResetPasswordViewModel = viewModel(factory = factory)
    val setPasswordViewModel: SetPasswordViewModel = viewModel(factory = factory)
    val shopsViewModel: ShopsViewModel = viewModel(factory = factory)
    val searchViewModel: SearchViewModel = viewModel(factory = factory)
    val couponViewModel: CouponViewModel = viewModel(factory = factory)
    val catalogViewModel: CatalogViewModel = viewModel(factory = factory)
    val ordersViewModel: OrdersViewModel = viewModel(factory = factory)
    val orderReviewViewModel: OrderReviewViewModel = viewModel(factory = factory)
    val messagesViewModel: MessagesViewModel = viewModel(factory = factory)
    val chatViewModel: ChatViewModel = viewModel(factory = factory)
    val profileViewModel: ProfileViewModel = viewModel(factory = factory)
    val favoritesViewModel: FavoritesViewModel = viewModel(factory = factory)
    val addressViewModel: AddressViewModel = viewModel(factory = factory)
    val walletViewModel: WalletViewModel = viewModel(factory = factory)
    val settingsViewModel: SettingsViewModel = viewModel(factory = factory)
    val errandViewModel: ErrandViewModel = viewModel(factory = factory)
    val medicineViewModel: MedicineViewModel = viewModel(factory = factory)

    val session by mainViewModel.session.collectAsStateWithLifecycle()
    val profile by mainViewModel.profile.collectAsStateWithLifecycle()
    val authState by authViewModel.uiState.collectAsStateWithLifecycle()
    val registerState by registerViewModel.uiState.collectAsStateWithLifecycle()
    val resetPasswordState by resetPasswordViewModel.uiState.collectAsStateWithLifecycle()
    val setPasswordState by setPasswordViewModel.uiState.collectAsStateWithLifecycle()
    val shopsState by shopsViewModel.uiState.collectAsStateWithLifecycle()
    val searchState by searchViewModel.uiState.collectAsStateWithLifecycle()
    val couponState by couponViewModel.uiState.collectAsStateWithLifecycle()
    val catalogState by catalogViewModel.uiState.collectAsStateWithLifecycle()
    val ordersState by ordersViewModel.uiState.collectAsStateWithLifecycle()
    val orderReviewState by orderReviewViewModel.uiState.collectAsStateWithLifecycle()
    val messagesState by messagesViewModel.uiState.collectAsStateWithLifecycle()
    val chatState by chatViewModel.uiState.collectAsStateWithLifecycle()
    val profileState by profileViewModel.uiState.collectAsStateWithLifecycle()
    val favoritesState by favoritesViewModel.uiState.collectAsStateWithLifecycle()
    val addressState by addressViewModel.uiState.collectAsStateWithLifecycle()
    val walletState by walletViewModel.uiState.collectAsStateWithLifecycle()
    val settingsState by settingsViewModel.uiState.collectAsStateWithLifecycle()
    val errandState by errandViewModel.uiState.collectAsStateWithLifecycle()
    val medicineState by medicineViewModel.uiState.collectAsStateWithLifecycle()

    val userId = profile?.id.orEmpty()
    val defaultUserName = stringResource(R.string.profile_default_name)
    val userName = profile?.nickname?.ifBlank { defaultUserName } ?: defaultUserName
    val supportRoomId = if (userId.isNotBlank()) "support-$userId" else "support-lobby"
    val startDestination = if (session == null) Routes.WELCOME else Routes.HOME

    LaunchedEffect(session?.token, userId) {
        if (session != null && userId.isNotBlank()) {
            shopsViewModel.loadHome(forceReload = true)
            ordersViewModel.loadOrders(userId)
            messagesViewModel.loadHome()
            profileViewModel.loadAll(userId)
        }
    }

    NavHost(
        navController = navController,
        startDestination = startDestination,
        modifier = modifier,
    ) {
        composable(Routes.WELCOME) {
            ProfileInfoScreen(
                title = stringResource(R.string.welcome_title),
                description = stringResource(R.string.welcome_subtitle),
                onBack = {
                    navController.navigate(Routes.AUTH) {
                        popUpTo(Routes.WELCOME) { inclusive = true }
                    }
                },
            )
        }

        composable(Routes.AUTH) {
            AuthScreen(
                state = authState,
                onPhoneChange = authViewModel::updatePhone,
                onPasswordChange = authViewModel::updatePassword,
                onLoginClick = {
                    authViewModel.login {
                        navController.navigate(Routes.HOME) {
                            popUpTo(Routes.AUTH) { inclusive = true }
                        }
                    }
                },
                onOpenRegister = {
                    registerViewModel.reset()
                    navController.navigate(Routes.REGISTER)
                },
                onOpenResetPassword = {
                    resetPasswordViewModel.reset()
                    navController.navigate(Routes.RESET_PASSWORD)
                },
            )
        }

        composable(Routes.REGISTER) {
            RegisterScreen(
                state = registerState,
                onBack = { navController.popBackStack() },
                onNicknameChange = registerViewModel::updateNickname,
                onPhoneChange = registerViewModel::updatePhone,
                onCodeChange = registerViewModel::updateCode,
                onPasswordChange = registerViewModel::updatePassword,
                onConfirmPasswordChange = registerViewModel::updateConfirmPassword,
                onSendCode = registerViewModel::sendCode,
                onSubmit = {
                    registerViewModel.submit {
                        navController.navigate(Routes.AUTH) {
                            popUpTo(Routes.REGISTER) { inclusive = true }
                        }
                    }
                },
            )
        }

        composable(Routes.RESET_PASSWORD) {
            ResetPasswordScreen(
                state = resetPasswordState,
                onBack = { navController.popBackStack() },
                onPhoneChange = resetPasswordViewModel::updatePhone,
                onCodeChange = resetPasswordViewModel::updateCode,
                onSendCode = resetPasswordViewModel::sendCode,
                onNext = {
                    resetPasswordViewModel.verify { phone, code ->
                        navController.navigate(Routes.setPassword(phone, code))
                    }
                },
            )
        }

        composable(
            route = Routes.SET_PASSWORD,
            arguments = listOf(
                navArgument("phone") { type = NavType.StringType },
                navArgument("code") { type = NavType.StringType },
            ),
        ) { entry ->
            val phone = Uri.decode(entry.arguments?.getString("phone").orEmpty())
            val code = Uri.decode(entry.arguments?.getString("code").orEmpty())
            LaunchedEffect(phone, code) {
                setPasswordViewModel.initialize(phone = phone, code = code)
            }

            SetPasswordScreen(
                state = setPasswordState,
                onBack = { navController.popBackStack() },
                onPasswordChange = setPasswordViewModel::updatePassword,
                onConfirmPasswordChange = setPasswordViewModel::updateConfirmPassword,
                onSubmit = {
                    setPasswordViewModel.submit {
                        navController.navigate(Routes.AUTH) {
                            popUpTo(Routes.RESET_PASSWORD) { inclusive = true }
                        }
                    }
                },
            )
        }

        composable(Routes.HOME) {
            HomeHubScreen(
                userName = userName,
                shopsState = shopsState,
                ordersState = ordersState,
                messagesState = messagesState,
                profileState = profileState,
                onSelectCategory = shopsViewModel::selectCategory,
                onOpenShop = { shopId -> navController.navigate(Routes.shopDetail(shopId)) },
                onOpenOrder = { orderId -> navController.navigate(Routes.orderDetail(orderId)) },
                onOpenConversation = { roomId -> navController.navigate(Routes.chat(roomId)) },
                onOpenNotification = { id -> navController.navigate(Routes.notificationDetail(id)) },
                onOpenSearch = { navController.navigate(Routes.SEARCH) },
                onOpenCategoryHub = { navController.navigate(Routes.CATEGORY_HUB) },
                onOpenFeaturedProducts = { navController.navigate(Routes.FEATURED_PRODUCTS) },
                onOpenFavorites = { navController.navigate(Routes.FAVORITES) },
                onOpenErrand = { navController.navigate(Routes.ERRAND_HOME) },
                onOpenMedicine = { navController.navigate(Routes.MEDICINE_HOME) },
                onOpenWallet = { navController.navigate(Routes.WALLET) },
                onOpenProfileCenter = { navController.navigate(Routes.PROFILE_CENTER) },
                onOpenCustomerService = { navController.navigate(Routes.chat(supportRoomId)) },
                onRefreshShops = { shopsViewModel.loadHome(forceReload = true) },
                onRefreshOrders = { if (userId.isNotBlank()) ordersViewModel.loadOrders(userId) },
                onRefreshMessages = messagesViewModel::loadHome,
                onRefreshProfile = { if (userId.isNotBlank()) profileViewModel.loadAll(userId) },
                onLogoutClick = {
                    mainViewModel.logout()
                    navController.navigate(Routes.AUTH) {
                        popUpTo(Routes.HOME) { inclusive = true }
                    }
                },
            )
        }

        composable(Routes.SEARCH) {
            SearchScreen(
                state = searchState,
                onBack = { navController.popBackStack() },
                onQueryChange = searchViewModel::updateQuery,
                onSearch = searchViewModel::searchCurrent,
                onOpenShop = { shopId -> navController.navigate(Routes.shopDetail(shopId)) },
            )
        }

        composable(Routes.CATEGORY_HUB) {
            LaunchedEffect(Unit) {
                catalogViewModel.loadCategoryHub()
            }

            CategoryHubScreen(
                state = catalogState,
                onBack = { navController.popBackStack() },
                onRefresh = catalogViewModel::loadCategoryHub,
                onOpenFeatured = { navController.navigate(Routes.FEATURED_PRODUCTS) },
                onOpenCategory = { key -> navController.navigate(Routes.categoryList(key)) },
            )
        }

        composable(
            route = Routes.CATEGORY_LIST,
            arguments = listOf(navArgument("categoryKey") { type = NavType.StringType }),
        ) { entry ->
            val categoryKey = Uri.decode(entry.arguments?.getString("categoryKey").orEmpty())
            LaunchedEffect(categoryKey) {
                catalogViewModel.loadCategoryShops(categoryKey)
            }

            CategoryShopListScreen(
                state = catalogState,
                categoryKey = categoryKey,
                onBack = { navController.popBackStack() },
                onRefresh = { catalogViewModel.loadCategoryShops(categoryKey) },
                onOpenShop = { shopId -> navController.navigate(Routes.shopDetail(shopId)) },
            )
        }

        composable(Routes.FEATURED_PRODUCTS) {
            LaunchedEffect(Unit) {
                catalogViewModel.loadFeaturedProducts()
            }

            FeaturedProductsScreen(
                state = catalogState,
                onBack = { navController.popBackStack() },
                onRefresh = catalogViewModel::loadFeaturedProducts,
                onOpenProduct = { product ->
                    navController.navigate(Routes.productDetail(product.id, product.shopId))
                },
                onOpenPopup = { product ->
                    navController.navigate(Routes.productPopupDetail(product.id, product.shopId))
                },
            )
        }

        composable(
            route = Routes.PRODUCT_DETAIL,
            arguments = listOf(
                navArgument("productId") { type = NavType.StringType },
                navArgument("shopId") {
                    type = NavType.StringType
                    nullable = true
                    defaultValue = ""
                },
            ),
        ) { entry ->
            val productId = Uri.decode(entry.arguments?.getString("productId").orEmpty())
            val shopId = Uri.decode(entry.arguments?.getString("shopId").orEmpty()).ifBlank { null }
            LaunchedEffect(productId, shopId) {
                catalogViewModel.loadProductDetail(productId, shopId)
            }

            ProductDetailScreen(
                title = stringResource(R.string.product_detail_title),
                loading = catalogState.loadingProductDetail,
                product = catalogState.productDetail,
                error = catalogState.error,
                compact = false,
                onBack = { navController.popBackStack() },
                onOpenShop = { shop -> navController.navigate(Routes.shopDetail(shop)) },
            )
        }

        composable(
            route = Routes.PRODUCT_POPUP_DETAIL,
            arguments = listOf(
                navArgument("productId") { type = NavType.StringType },
                navArgument("shopId") {
                    type = NavType.StringType
                    nullable = true
                    defaultValue = ""
                },
            ),
        ) { entry ->
            val productId = Uri.decode(entry.arguments?.getString("productId").orEmpty())
            val shopId = Uri.decode(entry.arguments?.getString("shopId").orEmpty()).ifBlank { null }
            LaunchedEffect(productId, shopId) {
                catalogViewModel.loadProductDetail(productId, shopId)
            }

            ProductDetailScreen(
                title = stringResource(R.string.product_popup_title),
                loading = catalogState.loadingProductDetail,
                product = catalogState.productDetail,
                error = catalogState.error,
                compact = true,
                onBack = { navController.popBackStack() },
                onOpenShop = { shop -> navController.navigate(Routes.shopDetail(shop)) },
            )
        }

        composable(Routes.FAVORITES) {
            LaunchedEffect(userId) {
                if (userId.isNotBlank()) {
                    favoritesViewModel.load(userId)
                }
            }

            FavoritesScreen(
                state = favoritesState,
                onBack = { navController.popBackStack() },
                onRefresh = { if (userId.isNotBlank()) favoritesViewModel.load(userId) },
                onOpenShop = { shopId -> navController.navigate(Routes.shopDetail(shopId)) },
                onRemoveFavorite = { shopId ->
                    if (userId.isNotBlank()) {
                        favoritesViewModel.removeFavorite(userId, shopId)
                    }
                },
            )
        }

        composable(Routes.PROFILE_CENTER) {
            ProfileCenterScreen(
                onBack = { navController.popBackStack() },
                onOpenSettings = { navController.navigate(Routes.SETTINGS) },
                onOpenMyReviews = { navController.navigate(Routes.MY_REVIEWS) },
                onOpenAddresses = { navController.navigate(Routes.ADDRESS_LIST) },
                onOpenCoupons = { navController.navigate(Routes.COUPON_LIST) },
                onOpenVip = { navController.navigate(Routes.VIP_CENTER) },
                onOpenPoints = { navController.navigate(Routes.POINTS_MALL) },
                onOpenInvite = { navController.navigate(Routes.INVITE_FRIENDS) },
                onOpenCooperation = { navController.navigate(Routes.COOPERATION) },
                onOpenEditProfile = { navController.navigate(Routes.PROFILE_EDIT) },
                onOpenPhoneChange = { navController.navigate(Routes.PHONE_CHANGE) },
                onOpenCustomerService = { navController.navigate(Routes.CUSTOMER_SERVICE) },
                onOpenDiningBuddy = { navController.navigate(Routes.DINING_BUDDY) },
                onOpenCharity = { navController.navigate(Routes.CHARITY) },
            )
        }

        composable(Routes.SETTINGS) {
            SettingsScreen(
                state = settingsState,
                onBack = { navController.popBackStack() },
                onOpenDetail = { navController.navigate(Routes.SETTINGS_DETAIL) },
                onToggle = settingsViewModel::toggle,
            )
        }

        composable(Routes.SETTINGS_DETAIL) {
            SettingsDetailScreen(
                state = settingsState,
                onBack = { navController.popBackStack() },
                onToggle = settingsViewModel::toggle,
            )
        }

        composable(Routes.MY_REVIEWS) {
            LaunchedEffect(userId) {
                if (userId.isNotBlank()) {
                    ordersViewModel.loadOrders(userId)
                }
            }

            MyReviewsScreen(
                orders = ordersState.orders.filter { it.isReviewed },
                onBack = { navController.popBackStack() },
                onOpenOrder = { orderId -> navController.navigate(Routes.orderDetail(orderId)) },
            )
        }

        composable(Routes.COUPON_LIST) {
            val preferredShop = shopsState.selectedShop
                ?: favoritesState.favorites.firstOrNull()
                ?: shopsState.shops.firstOrNull()
            LaunchedEffect(preferredShop?.id, preferredShop?.name) {
                couponViewModel.load(
                    shopId = preferredShop?.id.orEmpty(),
                    shopName = preferredShop?.name.orEmpty(),
                )
            }

            CouponListScreen(
                state = couponState,
                onBack = { navController.popBackStack() },
                onRefresh = {
                    couponViewModel.load(
                        shopId = preferredShop?.id.orEmpty(),
                        shopName = preferredShop?.name.orEmpty(),
                    )
                },
            )
        }

        composable(Routes.VIP_CENTER) {
            VipCenterScreen(
                onBack = { navController.popBackStack() },
            )
        }

        composable(Routes.POINTS_MALL) {
            PointsMallScreen(
                onBack = { navController.popBackStack() },
            )
        }

        composable(Routes.INVITE_FRIENDS) {
            InviteFriendsScreen(
                inviteCode = "YUEXIANG-${userId.ifBlank { "GUEST" }}",
                onBack = { navController.popBackStack() },
            )
        }

        composable(Routes.COOPERATION) {
            CooperationScreen(
                onBack = { navController.popBackStack() },
            )
        }

        composable(Routes.PROFILE_EDIT) {
            EditProfileScreen(
                profile = profileState.profile,
                onBack = { navController.popBackStack() },
            )
        }

        composable(Routes.PHONE_CHANGE) {
            PhoneChangeScreen(
                currentPhone = profileState.profile?.phone.orEmpty(),
                onBack = { navController.popBackStack() },
            )
        }

        composable(Routes.CUSTOMER_SERVICE) {
            CustomerServiceEntryScreen(
                onBack = { navController.popBackStack() },
                onOpenChat = { navController.navigate(Routes.chat(supportRoomId)) },
            )
        }

        composable(Routes.DINING_BUDDY) {
            ProfileInfoScreen(
                title = stringResource(R.string.dining_buddy_title),
                description = stringResource(R.string.dining_buddy_desc),
                onBack = { navController.popBackStack() },
            )
        }

        composable(Routes.CHARITY) {
            ProfileInfoScreen(
                title = stringResource(R.string.charity_title),
                description = stringResource(R.string.charity_desc),
                onBack = { navController.popBackStack() },
            )
        }

        composable(Routes.ADDRESS_LIST) {
            AddressListScreen(
                state = addressState,
                selectionMode = false,
                onBack = { navController.popBackStack() },
                onAdd = { navController.navigate(Routes.ADDRESS_EDIT) },
                onEdit = { addressId -> navController.navigate(Routes.addressEdit(addressId)) },
                onDelete = addressViewModel::deleteAddress,
                onSelect = addressViewModel::selectAddress,
            )
        }

        composable(Routes.ADDRESS_SELECT) {
            AddressListScreen(
                state = addressState,
                selectionMode = true,
                onBack = { navController.popBackStack() },
                onAdd = { navController.navigate(Routes.ADDRESS_EDIT) },
                onEdit = { addressId -> navController.navigate(Routes.addressEdit(addressId)) },
                onDelete = addressViewModel::deleteAddress,
                onSelect = { addressId ->
                    addressViewModel.selectAddress(addressId) {
                        navController.popBackStack()
                    }
                },
            )
        }

        composable(Routes.LOCATION_SELECT) {
            AddressListScreen(
                state = addressState,
                selectionMode = true,
                onBack = { navController.popBackStack() },
                onAdd = { navController.navigate(Routes.ADDRESS_EDIT) },
                onEdit = { addressId -> navController.navigate(Routes.addressEdit(addressId)) },
                onDelete = addressViewModel::deleteAddress,
                onSelect = { addressId ->
                    addressViewModel.selectAddress(addressId) {
                        navController.popBackStack()
                    }
                },
            )
        }

        composable(Routes.ADDRESS_EDIT) {
            AddressEditScreen(
                initialAddress = null,
                saving = addressState.saving,
                error = addressState.error,
                onBack = { navController.popBackStack() },
                onSave = { address ->
                    addressViewModel.upsertAddress(address) {
                        navController.popBackStack()
                    }
                },
            )
        }

        composable(
            route = Routes.ADDRESS_EDIT_WITH_ID,
            arguments = listOf(navArgument("addressId") { type = NavType.StringType }),
        ) { entry ->
            val addressId = entry.arguments?.getString("addressId").orEmpty()
            val currentAddress = addressState.addresses.firstOrNull { it.id == addressId }
            AddressEditScreen(
                initialAddress = currentAddress,
                saving = addressState.saving,
                error = addressState.error,
                onBack = { navController.popBackStack() },
                onSave = { address ->
                    addressViewModel.upsertAddress(address) {
                        navController.popBackStack()
                    }
                },
            )
        }
        composable(Routes.ERRAND_HOME) {
            LaunchedEffect(Unit) {
                errandViewModel.load()
            }

            ErrandHomeScreen(
                state = errandState,
                onBack = { navController.popBackStack() },
                onRefresh = errandViewModel::load,
                onOpenService = { serviceId, title, _ ->
                    navController.navigate(resolveErrandRoute(serviceId, title))
                },
            )
        }

        composable(
            route = Routes.ERRAND_SERVICE,
            arguments = listOf(navArgument("serviceId") { type = NavType.StringType }),
        ) { entry ->
            val serviceId = entry.arguments?.getString("serviceId").orEmpty()
            val service = errandState.entries.firstOrNull { it.id == serviceId }
            ServiceDetailScreen(
                title = stringResource(R.string.errand_service_title),
                subtitle = service?.title ?: stringResource(R.string.errand_service_subtitle),
                description = service?.description ?: stringResource(R.string.errand_service_desc),
                onBack = { navController.popBackStack() },
            )
        }

        composable(
            route = Routes.ERRAND_BUY,
            arguments = listOf(navArgument("serviceId") { type = NavType.StringType }),
        ) { entry ->
            val serviceId = entry.arguments?.getString("serviceId").orEmpty()
            val service = errandState.entries.firstOrNull { it.id == serviceId }
            ServiceDetailScreen(
                title = stringResource(R.string.errand_buy_title),
                subtitle = service?.title ?: stringResource(R.string.errand_buy_title),
                description = service?.description ?: stringResource(R.string.errand_buy_desc),
                onBack = { navController.popBackStack() },
            )
        }

        composable(
            route = Routes.ERRAND_DELIVER,
            arguments = listOf(navArgument("serviceId") { type = NavType.StringType }),
        ) { entry ->
            val serviceId = entry.arguments?.getString("serviceId").orEmpty()
            val service = errandState.entries.firstOrNull { it.id == serviceId }
            ServiceDetailScreen(
                title = stringResource(R.string.errand_deliver_title),
                subtitle = service?.title ?: stringResource(R.string.errand_deliver_title),
                description = service?.description ?: stringResource(R.string.errand_deliver_desc),
                onBack = { navController.popBackStack() },
            )
        }

        composable(
            route = Routes.ERRAND_PICKUP,
            arguments = listOf(navArgument("serviceId") { type = NavType.StringType }),
        ) { entry ->
            val serviceId = entry.arguments?.getString("serviceId").orEmpty()
            val service = errandState.entries.firstOrNull { it.id == serviceId }
            ServiceDetailScreen(
                title = stringResource(R.string.errand_pickup_title),
                subtitle = service?.title ?: stringResource(R.string.errand_pickup_title),
                description = service?.description ?: stringResource(R.string.errand_pickup_desc),
                onBack = { navController.popBackStack() },
            )
        }

        composable(
            route = Routes.ERRAND_DO,
            arguments = listOf(navArgument("serviceId") { type = NavType.StringType }),
        ) { entry ->
            val serviceId = entry.arguments?.getString("serviceId").orEmpty()
            val service = errandState.entries.firstOrNull { it.id == serviceId }
            ServiceDetailScreen(
                title = stringResource(R.string.errand_do_title),
                subtitle = service?.title ?: stringResource(R.string.errand_do_title),
                description = service?.description ?: stringResource(R.string.errand_do_desc),
                onBack = { navController.popBackStack() },
            )
        }

        composable(
            route = Routes.ERRAND_DETAIL,
            arguments = listOf(navArgument("serviceId") { type = NavType.StringType }),
        ) { entry ->
            val serviceId = entry.arguments?.getString("serviceId").orEmpty()
            val service = errandState.entries.firstOrNull { it.id == serviceId }
            ServiceDetailScreen(
                title = stringResource(R.string.errand_detail_title),
                subtitle = service?.title ?: stringResource(R.string.errand_detail_title),
                description = service?.description ?: stringResource(R.string.errand_detail_desc),
                onBack = { navController.popBackStack() },
            )
        }

        composable(Routes.MEDICINE_HOME) {
            LaunchedEffect(Unit) {
                medicineViewModel.load()
            }

            MedicineHomeScreen(
                state = medicineState,
                onBack = { navController.popBackStack() },
                onRefresh = medicineViewModel::load,
                onOpenService = { serviceId, title, _ ->
                    navController.navigate(resolveMedicineRoute(serviceId, title))
                },
            )
        }

        composable(
            route = Routes.MEDICINE_SERVICE,
            arguments = listOf(navArgument("serviceId") { type = NavType.StringType }),
        ) { entry ->
            val serviceId = entry.arguments?.getString("serviceId").orEmpty()
            val service = medicineState.entries.firstOrNull { it.id == serviceId }
            ServiceDetailScreen(
                title = stringResource(R.string.medicine_service_title),
                subtitle = service?.title ?: stringResource(R.string.medicine_service_subtitle),
                description = service?.description ?: stringResource(R.string.medicine_service_desc),
                onBack = { navController.popBackStack() },
            )
        }

        composable(
            route = Routes.MEDICINE_CHAT,
            arguments = listOf(navArgument("serviceId") { type = NavType.StringType }),
        ) { entry ->
            val serviceId = entry.arguments?.getString("serviceId").orEmpty()
            val service = medicineState.entries.firstOrNull { it.id == serviceId }
            ServiceDetailScreen(
                title = stringResource(R.string.medicine_chat_title),
                subtitle = service?.title ?: stringResource(R.string.medicine_chat_title),
                description = service?.description ?: stringResource(R.string.medicine_chat_desc),
                onBack = { navController.popBackStack() },
            )
        }

        composable(
            route = Routes.MEDICINE_ORDER,
            arguments = listOf(navArgument("serviceId") { type = NavType.StringType }),
        ) { entry ->
            val serviceId = entry.arguments?.getString("serviceId").orEmpty()
            val service = medicineState.entries.firstOrNull { it.id == serviceId }
            ServiceDetailScreen(
                title = stringResource(R.string.medicine_order_title),
                subtitle = service?.title ?: stringResource(R.string.medicine_order_title),
                description = service?.description ?: stringResource(R.string.medicine_order_desc),
                onBack = { navController.popBackStack() },
            )
        }

        composable(
            route = Routes.MEDICINE_TRACKING,
            arguments = listOf(navArgument("serviceId") { type = NavType.StringType }),
        ) { entry ->
            val serviceId = entry.arguments?.getString("serviceId").orEmpty()
            val service = medicineState.entries.firstOrNull { it.id == serviceId }
            ServiceDetailScreen(
                title = stringResource(R.string.medicine_tracking_title),
                subtitle = service?.title ?: stringResource(R.string.medicine_tracking_title),
                description = service?.description ?: stringResource(R.string.medicine_tracking_desc),
                onBack = { navController.popBackStack() },
            )
        }

        composable(
            route = Routes.SHOP_DETAIL,
            arguments = listOf(navArgument("shopId") { type = NavType.StringType }),
        ) { entry ->
            val shopId = entry.arguments?.getString("shopId").orEmpty()
            LaunchedEffect(shopId) {
                if (shopId.isNotBlank()) {
                    shopsViewModel.openShop(shopId)
                }
            }

            ShopDetailScreen(
                state = shopsState,
                onBack = {
                    shopsViewModel.clearShopSelection()
                    navController.popBackStack()
                },
                onAddToCart = shopsViewModel::addToCart,
                onRemoveFromCart = shopsViewModel::removeFromCart,
                onOpenProductDetail = { product ->
                    val resolvedShopId = product.shopId.ifBlank { shopId }
                    navController.navigate(Routes.productDetail(product.id, resolvedShopId))
                },
                onOpenCartPopup = { navController.navigate(Routes.CART_POPUP) },
                onCheckout = {
                    if (shopsState.cart.isNotEmpty()) {
                        navController.navigate(Routes.ORDER_CONFIRM)
                    }
                },
            )
        }

        composable(Routes.CART_POPUP) {
            CartPopupScreen(
                shopName = shopsState.selectedShop?.name.orEmpty(),
                menu = shopsState.menu,
                cart = shopsState.cart,
                creatingOrder = shopsState.creatingOrder,
                onBack = { navController.popBackStack() },
                onAddToCart = shopsViewModel::addToCart,
                onRemoveFromCart = shopsViewModel::removeFromCart,
                onCheckout = {
                    navController.popBackStack()
                    if (shopsState.cart.isNotEmpty()) {
                        navController.navigate(Routes.ORDER_CONFIRM)
                    }
                },
            )
        }

        composable(Routes.ORDER_CONFIRM) {
            val menuMap = shopsState.menu.associateBy { it.id }
            val products = shopsState.cart.entries.mapNotNull { (productId, count) ->
                val product = menuMap[productId] ?: return@mapNotNull null
                product to count
            }
            val orderConfirmEntry = navController.getBackStackEntry(Routes.ORDER_CONFIRM)
            val remarkDraft by orderConfirmEntry
                .savedStateHandle
                .getStateFlow("order_remark_result", "")
                .collectAsStateWithLifecycle()
            val tablewareDraft by orderConfirmEntry
                .savedStateHandle
                .getStateFlow("order_tableware_result", "")
                .collectAsStateWithLifecycle()

            OrderConfirmScreen(
                state = shopsState,
                products = products,
                totalPrice = shopsViewModel.cartTotalAmount(),
                selectedAddress = addressState.selectedAddress,
                onBack = { navController.popBackStack() },
                onOpenAddressSelector = { navController.navigate(Routes.LOCATION_SELECT) },
                onOpenAddressEditor = { navController.navigate(Routes.ADDRESS_EDIT) },
                initialRemark = remarkDraft,
                initialTableware = tablewareDraft,
                onOpenRemarkEditor = { navController.navigate(Routes.orderRemark(remarkDraft)) },
                onOpenTablewareEditor = { navController.navigate(Routes.orderTableware(tablewareDraft)) },
                onSubmit = { address, remark, tableware ->
                    shopsViewModel.createOrder(
                        userId = userId,
                        address = address,
                        remark = remark,
                        tableware = tableware,
                    ) { summary ->
                        if (userId.isNotBlank()) {
                            ordersViewModel.loadOrders(userId)
                        }
                        navController.navigate(Routes.paySuccess(summary.id)) {
                            popUpTo(Routes.ORDER_CONFIRM) { inclusive = true }
                        }
                    }
                },
            )
        }

        composable(
            route = Routes.ORDER_REMARK,
            arguments = listOf(
                navArgument("initial") {
                    type = NavType.StringType
                    nullable = true
                    defaultValue = ""
                },
            ),
        ) { entry ->
            val initial = Uri.decode(entry.arguments?.getString("initial").orEmpty())
            OrderRemarkScreen(
                initialRemark = initial,
                onBack = { navController.popBackStack() },
                onApply = { remark ->
                    navController.previousBackStackEntry
                        ?.savedStateHandle
                        ?.set("order_remark_result", remark)
                    navController.popBackStack()
                },
            )
        }

        composable(
            route = Routes.ORDER_TABLEWARE,
            arguments = listOf(
                navArgument("initial") {
                    type = NavType.StringType
                    nullable = true
                    defaultValue = ""
                },
            ),
        ) { entry ->
            val initial = Uri.decode(entry.arguments?.getString("initial").orEmpty())
            OrderTablewareScreen(
                initialTableware = initial,
                onBack = { navController.popBackStack() },
                onApply = { tableware ->
                    navController.previousBackStackEntry
                        ?.savedStateHandle
                        ?.set("order_tableware_result", tableware)
                    navController.popBackStack()
                },
            )
        }

        composable(
            route = Routes.PAY_SUCCESS,
            arguments = listOf(navArgument("orderId") { type = NavType.StringType }),
        ) { entry ->
            val orderId = entry.arguments?.getString("orderId").orEmpty()
            PaySuccessScreen(
                orderId = orderId,
                onBackHome = {
                    navController.navigate(Routes.HOME) {
                        popUpTo(Routes.HOME) { inclusive = true }
                    }
                },
                onViewOrder = {
                    if (orderId.isNotBlank()) {
                        navController.navigate(Routes.orderDetail(orderId)) {
                            popUpTo(Routes.PAY_SUCCESS) { inclusive = true }
                        }
                    }
                },
            )
        }

        composable(
            route = Routes.ORDER_DETAIL,
            arguments = listOf(navArgument("orderId") { type = NavType.StringType }),
        ) { entry ->
            val orderId = entry.arguments?.getString("orderId").orEmpty()
            LaunchedEffect(orderId) {
                if (orderId.isNotBlank()) {
                    ordersViewModel.loadDetail(orderId)
                }
            }

            OrderDetailScreen(
                detail = ordersState.detail,
                loading = ordersState.detailLoading,
                error = ordersState.error,
                onBack = {
                    ordersViewModel.clearDetail()
                    navController.popBackStack()
                },
                onOpenReview = { targetOrderId ->
                    navController.navigate(Routes.orderReview(targetOrderId))
                },
                onOpenRefund = { targetOrderId ->
                    navController.navigate(Routes.orderRefund(targetOrderId))
                },
            )
        }

        composable(
            route = Routes.ORDER_REVIEW,
            arguments = listOf(navArgument("orderId") { type = NavType.StringType }),
        ) { entry ->
            val orderId = entry.arguments?.getString("orderId").orEmpty()
            LaunchedEffect(orderId) {
                if (orderId.isNotBlank()) {
                    orderReviewViewModel.open(orderId)
                }
            }

            OrderReviewScreen(
                state = orderReviewState,
                orderId = orderId,
                onBack = { navController.popBackStack() },
                onRatingChange = orderReviewViewModel::updateRating,
                onCommentChange = orderReviewViewModel::updateComment,
                onSubmit = {
                    orderReviewViewModel.submit {
                        if (userId.isNotBlank()) {
                            ordersViewModel.loadOrders(userId)
                        }
                        if (orderId.isNotBlank()) {
                            ordersViewModel.loadDetail(orderId)
                        }
                    }
                },
            )
        }

        composable(
            route = Routes.ORDER_REFUND,
            arguments = listOf(navArgument("orderId") { type = NavType.StringType }),
        ) { entry ->
            val orderId = entry.arguments?.getString("orderId").orEmpty()
            OrderRefundScreen(
                orderId = orderId,
                onBack = { navController.popBackStack() },
                onContactService = { navController.navigate(Routes.chat(supportRoomId)) },
            )
        }

        composable(
            route = Routes.CHAT,
            arguments = listOf(navArgument("roomId") { type = NavType.StringType }),
        ) { entry ->
            val roomId = entry.arguments?.getString("roomId").orEmpty()
            val roomName = messagesState.conversations
                .firstOrNull { it.id == roomId }
                ?.name
                ?: "在线对话"

            LaunchedEffect(roomId, userId, userName) {
                if (roomId.isNotBlank() && userId.isNotBlank()) {
                    chatViewModel.openRoom(
                        roomId = roomId,
                        roomName = roomName,
                        userId = userId,
                        userName = userName,
                    )
                }
            }

            ChatScreen(
                state = chatState,
                onBack = { navController.popBackStack() },
                onRefresh = chatViewModel::refreshHistory,
                onSend = { text ->
                    if (userId.isNotBlank()) {
                        chatViewModel.sendMessage(
                            content = text,
                            userId = userId,
                            userName = userName,
                        )
                    }
                },
            )
        }

        composable(
            route = Routes.NOTIFICATION_DETAIL,
            arguments = listOf(navArgument("notificationId") { type = NavType.StringType }),
        ) { entry ->
            val notificationId = entry.arguments?.getString("notificationId").orEmpty()
            LaunchedEffect(notificationId) {
                if (notificationId.isNotBlank()) {
                    messagesViewModel.loadNotificationDetail(notificationId)
                }
            }

            NotificationDetailScreen(
                loading = messagesState.notificationDetailLoading,
                detail = messagesState.notificationDetail,
                error = messagesState.notificationDetailError,
                onBack = {
                    messagesViewModel.clearNotificationDetail()
                    navController.popBackStack()
                },
            )
        }

        composable(Routes.WALLET) {
            LaunchedEffect(userId) {
                if (userId.isNotBlank()) {
                    walletViewModel.load(userId)
                }
            }

            WalletDetailScreen(
                state = walletState,
                onBack = { navController.popBackStack() },
                onRefresh = { if (userId.isNotBlank()) walletViewModel.load(userId) },
                onOpenRecharge = { navController.navigate(Routes.WALLET_RECHARGE) },
                onOpenWithdraw = { navController.navigate(Routes.WALLET_WITHDRAW) },
                onOpenBills = { navController.navigate(Routes.WALLET_BILLS) },
                onRecharge = { amount ->
                    if (userId.isNotBlank()) {
                        walletViewModel.recharge(userId, amount)
                    }
                },
                onWithdraw = { amount, account ->
                    if (userId.isNotBlank()) {
                        walletViewModel.withdraw(userId, amount, account)
                    }
                },
            )
        }

        composable(Routes.WALLET_RECHARGE) {
            WalletRechargeScreen(
                recharging = walletState.recharging,
                lastOperation = walletState.lastOperation,
                error = walletState.error,
                onBack = { navController.popBackStack() },
                onSubmit = { amount ->
                    if (userId.isNotBlank()) {
                        walletViewModel.recharge(userId, amount)
                    }
                },
            )
        }

        composable(Routes.WALLET_WITHDRAW) {
            WalletWithdrawScreen(
                withdrawing = walletState.withdrawing,
                lastOperation = walletState.lastOperation,
                error = walletState.error,
                onBack = { navController.popBackStack() },
                onSubmit = { amount, account ->
                    if (userId.isNotBlank()) {
                        walletViewModel.withdraw(userId, amount, account)
                    }
                },
            )
        }

        composable(Routes.WALLET_BILLS) {
            WalletBillsScreen(
                loading = walletState.loading,
                transactions = walletState.transactions,
                error = walletState.error,
                onBack = { navController.popBackStack() },
                onRefresh = { if (userId.isNotBlank()) walletViewModel.load(userId) },
            )
        }
    }
}









