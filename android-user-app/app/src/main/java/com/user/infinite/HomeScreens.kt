@file:OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)

package com.user.infinite

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.user.infinite.core.model.OrderDetail
import com.user.infinite.core.model.OrderSummary
import com.user.infinite.core.model.Product
import com.user.infinite.core.model.Shop
import com.user.infinite.core.model.UserAddress

private enum class HomeTab {
    SHOPS,
    ORDERS,
    MESSAGES,
    PROFILE,
}

private fun HomeTab.topTitleRes(): Int = when (this) {
    HomeTab.SHOPS -> R.string.home_title_shops
    HomeTab.ORDERS -> R.string.home_title_orders
    HomeTab.MESSAGES -> R.string.home_title_messages
    HomeTab.PROFILE -> R.string.home_title_profile
}

private fun HomeTab.bottomLabelRes(): Int = when (this) {
    HomeTab.SHOPS -> R.string.home_tab_shops
    HomeTab.ORDERS -> R.string.home_tab_orders
    HomeTab.MESSAGES -> R.string.home_tab_messages
    HomeTab.PROFILE -> R.string.home_tab_profile
}
@Composable
fun HomeHubScreen(
    userName: String,
    shopsState: ShopsUiState,
    ordersState: OrdersUiState,
    messagesState: MessagesUiState,
    profileState: ProfileUiState,
    onSelectCategory: (String?) -> Unit,
    onOpenShop: (String) -> Unit,
    onOpenOrder: (String) -> Unit,
    onOpenConversation: (String) -> Unit,
    onOpenNotification: (String) -> Unit,
    onOpenSearch: () -> Unit,
    onOpenCategoryHub: () -> Unit,
    onOpenFeaturedProducts: () -> Unit,
    onOpenFavorites: () -> Unit,
    onOpenErrand: () -> Unit,
    onOpenMedicine: () -> Unit,
    onOpenWallet: () -> Unit,
    onOpenProfileCenter: () -> Unit,
    onOpenCustomerService: () -> Unit,
    onRefreshShops: () -> Unit,
    onRefreshOrders: () -> Unit,
    onRefreshMessages: () -> Unit,
    onRefreshProfile: () -> Unit,
    onLogoutClick: () -> Unit,
) {
    var tab by rememberSaveable { mutableStateOf(HomeTab.SHOPS) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(stringResource(tab.topTitleRes()))
                },
                actions = {
                    when (tab) {
                        HomeTab.SHOPS -> {
                            TextButton(onClick = onOpenCategoryHub) {
                                Text(stringResource(R.string.action_categories))
                            }
                            TextButton(onClick = onOpenFeaturedProducts) {
                                Text(stringResource(R.string.action_featured))
                            }
                            TextButton(onClick = onOpenSearch) {
                                Text(stringResource(R.string.action_search))
                            }
                        }

                        HomeTab.PROFILE -> {
                            TextButton(onClick = onOpenFavorites) {
                                Text(stringResource(R.string.action_favorites))
                            }
                            TextButton(onClick = onLogoutClick) {
                                Text(stringResource(R.string.action_logout))
                            }
                        }

                        else -> Unit
                    }
                },
            )
        },
        bottomBar = {
            NavigationBar {
                HomeTab.entries.forEach { item ->
                    NavigationBarItem(
                        selected = tab == item,
                        onClick = { tab = item },
                        label = { Text(stringResource(item.bottomLabelRes())) },
                        icon = {},
                    )
                }
            }
        },
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding),
        ) {
            when (tab) {
                HomeTab.SHOPS -> ShopsTabScreen(
                    state = shopsState,
                    onSelectCategory = onSelectCategory,
                    onOpenShop = onOpenShop,
                    onRefresh = onRefreshShops,
                )

                HomeTab.ORDERS -> OrdersTabScreen(
                    state = ordersState,
                    onOpenOrder = onOpenOrder,
                    onRefresh = onRefreshOrders,
                )

                HomeTab.MESSAGES -> MessagesTabScreen(
                    state = messagesState,
                    onOpenConversation = onOpenConversation,
                    onOpenNotification = onOpenNotification,
                    onRefresh = onRefreshMessages,
                )

                HomeTab.PROFILE -> ProfileTabScreen(
                    userName = userName,
                    state = profileState,
                    onRefresh = onRefreshProfile,
                    onOpenFavorites = onOpenFavorites,
                    onOpenErrand = onOpenErrand,
                    onOpenMedicine = onOpenMedicine,
                    onOpenWallet = onOpenWallet,
                    onOpenProfileCenter = onOpenProfileCenter,
                    onOpenCustomerService = onOpenCustomerService,
                )
            }
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun ShopsTabScreen(
    state: ShopsUiState,
    onSelectCategory: (String?) -> Unit,
    onOpenShop: (String) -> Unit,
    onRefresh: () -> Unit,
) {
    if (state.loading && state.shops.isEmpty()) {
        BoxLoading()
        return
    }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = androidx.compose.foundation.layout.PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = androidx.compose.material3.CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.primaryContainer,
                ),
            ) {
                Column(
                    modifier = Modifier.padding(14.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    Text(
                        text = stringResource(R.string.shops_today_pick),
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.SemiBold,
                    )
                    Text(
                        text = stringResource(R.string.shops_count, state.shops.size),
                        style = MaterialTheme.typography.bodyMedium,
                    )
                    FilledTonalButton(onClick = onRefresh) {
                        Text(stringResource(R.string.shops_refresh_list))
                    }
                }
            }
        }

        item {
            Card(modifier = Modifier.fillMaxWidth()) {
                Column(
                    modifier = Modifier.padding(14.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    Text(
                        text = stringResource(R.string.shops_category_filter),
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.SemiBold,
                    )
                    FlowRow(
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        CategoryChip(
                            text = stringResource(R.string.shops_all_category),
                            selected = state.selectedCategory == null,
                            onClick = { onSelectCategory(null) },
                        )
                        state.categories.forEach { category ->
                            CategoryChip(
                                text = category,
                                selected = state.selectedCategory == category,
                                onClick = { onSelectCategory(category) },
                            )
                        }
                    }
                }
            }
        }

        state.error?.takeIf { it.isNotBlank() }?.let { errorText ->
            item {
                Text(
                    text = errorText,
                    color = MaterialTheme.colorScheme.error,
                )
            }
        }

        if (state.shops.isEmpty()) {
            item {
                Text(stringResource(R.string.shops_empty), style = MaterialTheme.typography.bodyMedium)
            }
        }

        items(state.shops, key = { it.id }) { shop ->
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { onOpenShop(shop.id) },
            ) {
                Column(
                    modifier = Modifier.padding(14.dp),
                    verticalArrangement = Arrangement.spacedBy(6.dp),
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            text = shop.name,
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.SemiBold,
                            modifier = Modifier.weight(1f),
                        )
                        if (shop.category.isNotBlank()) {
                            Text(
                                text = shop.category,
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.primary,
                            )
                        }
                    }

                    Text(
                        text = stringResource(R.string.shops_rating_sales, shop.rating, shop.monthlySales),
                        style = MaterialTheme.typography.bodyMedium,
                    )
                    Text(
                        text = stringResource(R.string.shops_min_delivery, shop.minPrice, shop.deliveryPrice),
                        style = MaterialTheme.typography.bodyMedium,
                    )

                    val extra = listOfNotNull(
                        shop.deliveryTime.takeIf { it.isNotBlank() }?.let { stringResource(R.string.shops_eta, it) },
                        shop.distance.takeIf { it.isNotBlank() }?.let { stringResource(R.string.shops_distance, it) },
                    ).joinToString(" · ")
                    if (extra.isNotBlank()) {
                        Text(
                            text = extra,
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }
            }
        }
    }
}
@Composable
private fun CategoryChip(
    text: String,
    selected: Boolean,
    onClick: () -> Unit,
) {
    if (selected) {
        Button(onClick = onClick) {
            Text(text)
        }
    } else {
        OutlinedButton(onClick = onClick) {
            Text(text)
        }
    }
}

@Composable
private fun OrdersTabScreen(
    state: OrdersUiState,
    onOpenOrder: (String) -> Unit,
    onRefresh: () -> Unit,
) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = androidx.compose.foundation.layout.PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        item {
            Card(modifier = Modifier.fillMaxWidth()) {
                Row(
                    modifier = Modifier.padding(14.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text(stringResource(R.string.orders_overview), style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                        Text(stringResource(R.string.orders_total_count, state.orders.size), style = MaterialTheme.typography.bodyMedium)
                    }
                    FilledTonalButton(onClick = onRefresh) {
                        Text(stringResource(R.string.action_refresh))
                    }
                }
            }
        }

        state.error?.takeIf { it.isNotBlank() }?.let { errorText ->
            item { Text(text = errorText, color = MaterialTheme.colorScheme.error) }
        }

        if (state.loading && state.orders.isEmpty()) {
            item { BoxLoading() }
        }

        if (!state.loading && state.orders.isEmpty()) {
            item { Text(stringResource(R.string.orders_empty)) }
        }

        items(state.orders, key = { it.id }) { order ->
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { onOpenOrder(order.id) },
            ) {
                Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text(text = order.shopName, style = MaterialTheme.typography.titleMedium)
                    Text(
                        text = stringResource(R.string.orders_status, order.statusText.ifBlank { order.status }),
                        style = MaterialTheme.typography.bodyMedium,
                    )
                    Text(
                        text = stringResource(R.string.orders_amount, order.price),
                        style = MaterialTheme.typography.bodyMedium,
                    )
                    Text(
                        text = order.createdAt,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
        }
    }
}
@Composable
private fun MessagesTabScreen(
    state: MessagesUiState,
    onOpenConversation: (String) -> Unit,
    onOpenNotification: (String) -> Unit,
    onRefresh: () -> Unit,
) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = androidx.compose.foundation.layout.PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        item {
            Card(modifier = Modifier.fillMaxWidth()) {
                Row(
                    modifier = Modifier.padding(14.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text(stringResource(R.string.messages_overview), style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                        Text(
                            stringResource(R.string.messages_overview_count, state.conversations.size, state.notifications.size),
                            style = MaterialTheme.typography.bodyMedium,
                        )
                    }
                    FilledTonalButton(onClick = onRefresh) {
                        Text(stringResource(R.string.action_refresh))
                    }
                }
            }
        }

        state.error?.takeIf { it.isNotBlank() }?.let { errorText ->
            item { Text(text = errorText, color = MaterialTheme.colorScheme.error) }
        }

        item {
            Text(
                text = stringResource(R.string.messages_conversations),
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold,
            )
        }

        if (state.conversations.isEmpty()) {
            item { Text(stringResource(R.string.messages_empty)) }
        }

        items(state.conversations, key = { it.id }) { conversation ->
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { onOpenConversation(conversation.id) },
            ) {
                Column(modifier = Modifier.padding(14.dp)) {
                    Text(conversation.name, style = MaterialTheme.typography.titleMedium)
                    Text(
                        text = conversation.lastMessage.ifBlank { stringResource(R.string.messages_no_message) },
                        style = MaterialTheme.typography.bodyMedium,
                    )
                }
            }
        }

        item {
            Text(
                text = stringResource(R.string.messages_notifications),
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold,
            )
        }

        if (state.notifications.isEmpty()) {
            item { Text(stringResource(R.string.messages_notifications_empty)) }
        }

        items(state.notifications, key = { it.id }) { item ->
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { onOpenNotification(item.id) },
            ) {
                Column(modifier = Modifier.padding(14.dp)) {
                    Text(item.title, style = MaterialTheme.typography.titleMedium)
                    Text(item.summary, style = MaterialTheme.typography.bodyMedium)
                }
            }
        }
    }
}
@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun ProfileTabScreen(
    userName: String,
    state: ProfileUiState,
    onRefresh: () -> Unit,
    onOpenFavorites: () -> Unit,
    onOpenErrand: () -> Unit,
    onOpenMedicine: () -> Unit,
    onOpenWallet: () -> Unit,
    onOpenProfileCenter: () -> Unit,
    onOpenCustomerService: () -> Unit,
) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = androidx.compose.foundation.layout.PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = androidx.compose.material3.CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.secondaryContainer,
                ),
            ) {
                Column(
                    modifier = Modifier.padding(14.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    Text(
                        text = stringResource(R.string.profile_greeting, userName),
                        style = MaterialTheme.typography.headlineSmall,
                        fontWeight = FontWeight.SemiBold,
                    )
                    Text(
                        text = stringResource(R.string.profile_wallet_balance, state.walletBalance?.balance ?: 0),
                        style = MaterialTheme.typography.bodyMedium,
                    )
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        FilledTonalButton(onClick = onRefresh) { Text(stringResource(R.string.profile_refresh_profile)) }
                        Button(onClick = onOpenWallet) { Text(stringResource(R.string.profile_wallet_details)) }
                    }
                }
            }
        }

        item {
            FlowRow(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                OutlinedButton(onClick = onOpenFavorites) { Text(stringResource(R.string.action_favorites)) }
                OutlinedButton(onClick = onOpenErrand) { Text(stringResource(R.string.profile_errand)) }
                OutlinedButton(onClick = onOpenMedicine) { Text(stringResource(R.string.profile_medicine)) }
                OutlinedButton(onClick = onOpenCustomerService) { Text(stringResource(R.string.profile_support)) }
                OutlinedButton(onClick = onOpenProfileCenter) { Text(stringResource(R.string.profile_more_services)) }
            }
        }

        state.error?.takeIf { it.isNotBlank() }?.let { errorText ->
            item { Text(text = errorText, color = MaterialTheme.colorScheme.error) }
        }

        item {
            Card(modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text(stringResource(R.string.profile_user_info), style = MaterialTheme.typography.titleMedium)
                    Text(stringResource(R.string.profile_id, state.profile?.id.orEmpty()))
                    Text(stringResource(R.string.profile_phone, state.profile?.phone.orEmpty()))
                    Text(stringResource(R.string.profile_nickname, state.profile?.nickname.orEmpty()))
                }
            }
        }

        item {
            Card(modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text(stringResource(R.string.profile_assets), style = MaterialTheme.typography.titleMedium)
                    Text(stringResource(R.string.profile_available_balance, state.walletBalance?.balance ?: 0))
                    Text(stringResource(R.string.profile_frozen_balance, state.walletBalance?.frozenBalance ?: 0))
                    Text(stringResource(R.string.profile_favorite_shops, state.favorites.size))
                }
            }
        }
    }
}
@Composable
fun ShopDetailScreen(
    state: ShopsUiState,
    onBack: () -> Unit,
    onAddToCart: (String) -> Unit,
    onRemoveFromCart: (String) -> Unit,
    onOpenProductDetail: (Product) -> Unit,
    onOpenCartPopup: () -> Unit,
    onCheckout: () -> Unit,
) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(state.selectedShop?.name ?: stringResource(R.string.shop_default_title)) },
                navigationIcon = {
                    TextButton(onClick = onBack) { Text(stringResource(R.string.action_back)) }
                },
            )
        },
        bottomBar = {
            val total = state.menu.sumOf { product ->
                val count = state.cart[product.id] ?: 0
                product.price * count
            }
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(12.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(stringResource(R.string.cart_total, total))
                Spacer(modifier = Modifier.width(8.dp))
                OutlinedButton(onClick = onOpenCartPopup) {
                    Text(stringResource(R.string.cart_popup_title))
                }
                Spacer(modifier = Modifier.weight(1f))
                Button(
                    onClick = onCheckout,
                    enabled = total > 0 && !state.creatingOrder,
                ) {
                    if (state.creatingOrder) {
                        CircularProgressIndicator(modifier = Modifier.height(18.dp), strokeWidth = 2.dp)
                    } else {
                        Text(stringResource(R.string.checkout))
                    }
                }
            }
        },
    ) { innerPadding ->
        if (state.menuLoading && state.menu.isEmpty()) {
            BoxLoading(modifier = Modifier.padding(innerPadding))
            return@Scaffold
        }

        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding),
            contentPadding = androidx.compose.foundation.layout.PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            state.error?.takeIf { it.isNotBlank() }?.let { errorText ->
                item {
                    Text(
                        text = errorText,
                        color = MaterialTheme.colorScheme.error,
                    )
                }
            }

            items(state.menu, key = { it.id }) { product ->
                Card(modifier = Modifier.fillMaxWidth()) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(14.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Column(
                            modifier = Modifier
                                .weight(1f)
                                .clickable { onOpenProductDetail(product) },
                        ) {
                            Text(product.name, style = MaterialTheme.typography.titleMedium)
                            Text(stringResource(R.string.price_yuan, product.price), style = MaterialTheme.typography.bodyMedium)
                            if (product.description.isNotBlank()) {
                                Text(product.description, style = MaterialTheme.typography.bodySmall)
                            }
                        }
                        val cartCount = state.cart[product.id] ?: 0
                        val removeActionDesc = stringResource(R.string.cart_remove_item, product.name)
                        val addActionDesc = stringResource(R.string.cart_add_item, product.name)
                        val quantityDesc = stringResource(R.string.cart_item_quantity, cartCount)

                        Row(verticalAlignment = Alignment.CenterVertically) {
                            OutlinedButton(
                                onClick = { onRemoveFromCart(product.id) },
                                enabled = cartCount > 0,
                                modifier = Modifier.semantics { contentDescription = removeActionDesc },
                            ) {
                                Text(stringResource(R.string.cart_decrease_symbol))
                            }
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                text = cartCount.toString(),
                                modifier = Modifier.semantics { contentDescription = quantityDesc },
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Button(
                                onClick = { onAddToCart(product.id) },
                                modifier = Modifier.semantics { contentDescription = addActionDesc },
                            ) {
                                Text(stringResource(R.string.cart_increase_symbol))
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun CartPopupScreen(
    shopName: String,
    menu: List<Product>,
    cart: Map<String, Int>,
    creatingOrder: Boolean,
    onBack: () -> Unit,
    onAddToCart: (String) -> Unit,
    onRemoveFromCart: (String) -> Unit,
    onCheckout: () -> Unit,
) {
    val cartItems = menu.mapNotNull { product ->
        val count = cart[product.id] ?: 0
        if (count <= 0) null else product to count
    }
    val total = cartItems.sumOf { (product, count) -> product.price * count }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.cart_popup_title)) },
                navigationIcon = {
                    TextButton(onClick = onBack) { Text(stringResource(R.string.action_back)) }
                },
            )
        },
    ) { innerPadding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding),
            contentPadding = androidx.compose.foundation.layout.PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            item {
                Card(modifier = Modifier.fillMaxWidth()) {
                    Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        Text(shopName, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                        Text(stringResource(R.string.cart_popup_item_count, cartItems.size), style = MaterialTheme.typography.bodyMedium)
                    }
                }
            }

            if (cartItems.isEmpty()) {
                item { Text(stringResource(R.string.cart_popup_empty)) }
            }

            items(cartItems, key = { it.first.id }) { (product, count) ->
                Card(modifier = Modifier.fillMaxWidth()) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(14.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(product.name, style = MaterialTheme.typography.titleMedium)
                            Text(stringResource(R.string.price_yuan, product.price), style = MaterialTheme.typography.bodySmall)
                        }
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            OutlinedButton(
                                onClick = { onRemoveFromCart(product.id) },
                                enabled = count > 0,
                            ) {
                                Text(stringResource(R.string.cart_decrease_symbol))
                            }
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(count.toString())
                            Spacer(modifier = Modifier.width(6.dp))
                            Button(onClick = { onAddToCart(product.id) }) {
                                Text(stringResource(R.string.cart_increase_symbol))
                            }
                        }
                    }
                }
            }

            item {
                Card(modifier = Modifier.fillMaxWidth()) {
                    Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text(stringResource(R.string.cart_total, total), style = MaterialTheme.typography.titleMedium)
                        Button(
                            onClick = onCheckout,
                            enabled = cartItems.isNotEmpty() && !creatingOrder,
                            modifier = Modifier.fillMaxWidth(),
                        ) {
                            Text(stringResource(R.string.checkout))
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun OrderConfirmScreen(
    state: ShopsUiState,
    products: List<Pair<Product, Int>>,
    totalPrice: Double,
    selectedAddress: UserAddress?,
    onBack: () -> Unit,
    onOpenAddressSelector: () -> Unit,
    onOpenAddressEditor: () -> Unit,
    initialRemark: String = "",
    initialTableware: String = "",
    onOpenRemarkEditor: () -> Unit = {},
    onOpenTablewareEditor: () -> Unit = {},
    onSubmit: (address: String, remark: String, tableware: String) -> Unit,
) {
    var address by rememberSaveable(selectedAddress?.id, selectedAddress?.fullAddress()) {
        mutableStateOf(selectedAddress?.fullAddress().orEmpty())
    }
    var remark by rememberSaveable(initialRemark) { mutableStateOf(initialRemark) }
    var tableware by rememberSaveable(initialTableware) { mutableStateOf(initialTableware) }
    var showAddressValidation by rememberSaveable { mutableStateOf(false) }

    val trimmedAddress = address.trim()
    val isAddressValid = trimmedAddress.isNotEmpty()
    val submitActionDesc = if (state.creatingOrder) {
        stringResource(R.string.order_submit_busy_desc)
    } else {
        stringResource(R.string.submit_order)
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.order_confirm_title)) },
                navigationIcon = {
                    TextButton(onClick = onBack) { Text(stringResource(R.string.action_back)) }
                },
            )
        },
    ) { innerPadding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding),
            contentPadding = androidx.compose.foundation.layout.PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            item {
                Text(
                    text = state.selectedShop?.name.orEmpty(),
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.SemiBold,
                )
            }

            items(products, key = { it.first.id }) { (product, count) ->
                Card(modifier = Modifier.fillMaxWidth()) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(14.dp),
                    ) {
                        Text(product.name, modifier = Modifier.weight(1f))
                        Text(stringResource(R.string.product_count, count))
                        Spacer(modifier = Modifier.width(12.dp))
                        Text(stringResource(R.string.price_yuan, product.price * count))
                    }
                }
            }

            item {
                Card(modifier = Modifier.fillMaxWidth()) {
                    Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text(stringResource(R.string.delivery_address), style = MaterialTheme.typography.titleMedium)
                        if (selectedAddress == null) {
                            Text(stringResource(R.string.no_address_selected), style = MaterialTheme.typography.bodyMedium)
                        } else {
                            Text(stringResource(R.string.address_summary, selectedAddress.tag, selectedAddress.name, selectedAddress.phone))
                            Text(selectedAddress.fullAddress(), style = MaterialTheme.typography.bodyMedium)
                        }
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            OutlinedButton(onClick = onOpenAddressSelector, modifier = Modifier.weight(1f)) {
                                Text(stringResource(R.string.choose_address))
                            }
                            OutlinedButton(onClick = onOpenAddressEditor, modifier = Modifier.weight(1f)) {
                                Text(stringResource(R.string.add_address))
                            }
                        }
                    }
                }
            }

            item {
                OutlinedTextField(
                    value = address,
                    onValueChange = { address = it },
                    label = { Text(stringResource(R.string.delivery_address_editable)) },
                    isError = showAddressValidation && !isAddressValid,
                    supportingText = {
                        if (showAddressValidation && !isAddressValid) {
                            Text(stringResource(R.string.order_confirm_address_required))
                        }
                    },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Text),
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                )
            }

            item {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedButton(
                        onClick = onOpenRemarkEditor,
                        modifier = Modifier.weight(1f),
                    ) {
                        Text(stringResource(R.string.order_open_remark_page))
                    }
                    OutlinedButton(
                        onClick = onOpenTablewareEditor,
                        modifier = Modifier.weight(1f),
                    ) {
                        Text(stringResource(R.string.order_open_tableware_page))
                    }
                }
            }

            item {
                OutlinedTextField(
                    value = remark,
                    onValueChange = { remark = it.take(60) },
                    label = { Text(stringResource(R.string.remark)) },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Text),
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                )
            }

            item {
                OutlinedTextField(
                    value = tableware,
                    onValueChange = { tableware = it.take(30) },
                    label = { Text(stringResource(R.string.tableware)) },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Text),
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                )
            }

            state.error?.takeIf { it.isNotBlank() }?.let { errorText ->
                item {
                    Text(
                        text = errorText,
                        color = MaterialTheme.colorScheme.error,
                    )
                }
            }

            item {
                Text(
                    text = stringResource(R.string.pay_total, totalPrice),
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold,
                )
                Spacer(modifier = Modifier.height(8.dp))
                Button(
                    onClick = {
                        if (!isAddressValid) {
                            showAddressValidation = true
                            return@Button
                        }
                        onSubmit(trimmedAddress, remark.trim(), tableware.trim())
                    },
                    enabled = !state.creatingOrder && products.isNotEmpty(),
                    modifier = Modifier
                        .fillMaxWidth()
                        .semantics { contentDescription = submitActionDesc },
                ) {
                    if (state.creatingOrder) {
                        CircularProgressIndicator(modifier = Modifier.height(18.dp), strokeWidth = 2.dp)
                    } else {
                        Text(stringResource(R.string.submit_order))
                    }
                }
            }
        }
    }
}
@Composable
fun OrderDetailScreen(
    detail: OrderDetail?,
    loading: Boolean,
    error: String?,
    onBack: () -> Unit,
    onOpenReview: (String) -> Unit,
    onOpenRefund: (String) -> Unit,
) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.order_detail_title)) },
                navigationIcon = {
                    TextButton(onClick = onBack) { Text(stringResource(R.string.action_back)) }
                },
            )
        },
    ) { innerPadding ->
        when {
            loading -> BoxLoading(modifier = Modifier.padding(innerPadding))
            detail == null -> {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(innerPadding)
                        .padding(16.dp),
                    verticalArrangement = Arrangement.Center,
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    Text(text = error ?: stringResource(R.string.order_detail_empty))
                }
            }

            else -> {
                val order = detail.order
                LazyColumn(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(innerPadding),
                    contentPadding = androidx.compose.foundation.layout.PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    item {
                        Card(modifier = Modifier.fillMaxWidth()) {
                            Column(modifier = Modifier.padding(14.dp)) {
                                Text(order.shopName, style = MaterialTheme.typography.titleLarge)
                                Text(stringResource(R.string.order_id, order.id))
                                Text(stringResource(R.string.order_status, order.statusText.ifBlank { order.status }))
                                Text(stringResource(R.string.order_amount, order.price))
                                Text(stringResource(R.string.order_created_at, order.createdAt))
                            }
                        }
                    }

                    item {
                        val reviewActionDesc = stringResource(R.string.order_action_review_desc, order.id)
                        val refundActionDesc = stringResource(R.string.order_action_refund_desc, order.id)

                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            if (!order.isReviewed) {
                                OutlinedButton(
                                    onClick = { onOpenReview(order.id) },
                                    modifier = Modifier.semantics { contentDescription = reviewActionDesc },
                                ) {
                                    Text(stringResource(R.string.write_review))
                                }
                            }
                            OutlinedButton(
                                onClick = { onOpenRefund(order.id) },
                                modifier = Modifier.semantics { contentDescription = refundActionDesc },
                            ) {
                                Text(stringResource(R.string.request_refund))
                            }
                        }
                    }

                    item {
                        Card(modifier = Modifier.fillMaxWidth()) {
                            Column(modifier = Modifier.padding(14.dp)) {
                                Text(stringResource(R.string.delivery_info), style = MaterialTheme.typography.titleMedium)
                                Text(stringResource(R.string.address_with_value, detail.address))
                                Text(stringResource(R.string.rider_with_value, detail.riderName))
                                Text(stringResource(R.string.phone_with_value, detail.riderPhone))
                                if (detail.errandRequest.isNotBlank()) {
                                    Text(stringResource(R.string.request_with_value, detail.errandRequest))
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun ChatScreen(
    state: ChatUiState,
    onBack: () -> Unit,
    onRefresh: () -> Unit,
    onSend: (String) -> Unit,
) {
    var input by rememberSaveable { mutableStateOf("") }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(if (state.roomName.isBlank()) stringResource(R.string.conversation_default_title) else state.roomName) },
                navigationIcon = {
                    TextButton(onClick = onBack) { Text(stringResource(R.string.action_back)) }
                },
                actions = {
                    TextButton(onClick = onRefresh) { Text(stringResource(R.string.action_refresh)) }
                },
            )
        },
    ) { innerPadding ->
        if (state.loading && state.messages.isEmpty()) {
            BoxLoading(modifier = Modifier.padding(innerPadding))
            return@Scaffold
        }

        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding),
        ) {
            state.error?.takeIf { it.isNotBlank() }?.let { errorText ->
                Text(
                    text = errorText,
                    color = MaterialTheme.colorScheme.error,
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
                )
            }

            LazyColumn(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxWidth(),
                contentPadding = androidx.compose.foundation.layout.PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                items(state.messages, key = { it.id + it.time }) { message ->
                    val isMine = message.senderRole == "customer"
                    val senderName = message.senderName.ifBlank { if (isMine) stringResource(R.string.sender_me) else stringResource(R.string.sender_support) }
                    val messageDesc = stringResource(R.string.chat_message_desc, senderName, message.content)
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = if (isMine) Arrangement.End else Arrangement.Start,
                    ) {
                        Card(modifier = Modifier.fillMaxWidth(0.82f).semantics { contentDescription = messageDesc }) {
                            Column(modifier = Modifier.padding(12.dp)) {
                                Text(
                                    text = senderName,
                                    style = MaterialTheme.typography.labelMedium,
                                )
                                Spacer(modifier = Modifier.height(4.dp))
                                Text(message.content)
                            }
                        }
                    }
                }
            }

            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(12.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                OutlinedTextField(
                    value = input,
                    onValueChange = { input = it },
                    modifier = Modifier.weight(1f),
                    label = { Text(stringResource(R.string.chat_input_label)) },
                    placeholder = { Text(stringResource(R.string.input_message_hint)) },
                    singleLine = true,
                )
                Spacer(modifier = Modifier.width(8.dp))
                val sendActionDesc = if (state.sending) stringResource(R.string.chat_send_busy_desc) else stringResource(R.string.chat_send_ready_desc)
                Button(
                    onClick = {
                        val text = input.trim()
                        if (text.isNotBlank()) {
                            input = ""
                            onSend(text)
                        }
                    },
                    enabled = input.isNotBlank() && !state.sending,
                    modifier = Modifier.semantics { contentDescription = sendActionDesc },
                ) {
                    Text(if (state.sending) stringResource(R.string.sending) else stringResource(R.string.send))
                }
            }
        }
    }
}

@Composable
fun NotificationDetailScreen(
    loading: Boolean,
    detail: com.user.infinite.core.model.AppNotificationDetail?,
    error: String?,
    onBack: () -> Unit,
) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.notification_detail_title)) },
                navigationIcon = {
                    TextButton(onClick = onBack) { Text(stringResource(R.string.action_back)) }
                },
            )
        },
    ) { innerPadding ->
        when {
            loading -> BoxLoading(modifier = Modifier.padding(innerPadding))
            detail == null -> {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(innerPadding)
                        .padding(16.dp),
                    verticalArrangement = Arrangement.Center,
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    Text(error ?: stringResource(R.string.notification_detail_empty))
                }
            }

            else -> {
                val sourceText = if (detail.source.isBlank()) stringResource(R.string.notification_source_unknown) else detail.source
                val createdAtText = if (detail.createdAt.isBlank()) stringResource(R.string.notification_time_unknown) else detail.createdAt
                val notificationSummaryDesc = stringResource(R.string.notification_summary_desc, detail.title, sourceText, createdAtText)
                val notificationContentDesc = stringResource(R.string.notification_content_desc, detail.contentText)

                LazyColumn(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(innerPadding),
                    contentPadding = androidx.compose.foundation.layout.PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    item {
                        Card(modifier = Modifier.fillMaxWidth().semantics { contentDescription = notificationSummaryDesc }) {
                            Column(modifier = Modifier.padding(14.dp)) {
                                Text(
                                    text = detail.title,
                                    style = MaterialTheme.typography.titleLarge,
                                    fontWeight = FontWeight.SemiBold,
                                )
                                if (detail.source.isNotBlank()) {
                                    Text(
                                        text = detail.source,
                                        style = MaterialTheme.typography.bodySmall,
                                    )
                                }
                                if (detail.createdAt.isNotBlank()) {
                                    Text(
                                        text = detail.createdAt,
                                        style = MaterialTheme.typography.bodySmall,
                                    )
                                }
                            }
                        }
                    }

                    item {
                        Card(modifier = Modifier.fillMaxWidth().semantics { contentDescription = notificationContentDesc }) {
                            Column(modifier = Modifier.padding(14.dp)) {
                                Text(
                                    text = detail.contentText,
                                    style = MaterialTheme.typography.bodyLarge,
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun WalletDetailScreen(
    state: WalletUiState,
    onBack: () -> Unit,
    onRefresh: () -> Unit,
    onOpenRecharge: () -> Unit,
    onOpenWithdraw: () -> Unit,
    onOpenBills: () -> Unit,
    onRecharge: (Long) -> Unit,
    onWithdraw: (Long, String) -> Unit,
) {
    var rechargeAmount by rememberSaveable { mutableStateOf("") }
    var withdrawAmount by rememberSaveable { mutableStateOf("") }
    var withdrawAccount by rememberSaveable { mutableStateOf("") }

    val balanceDesc = stringResource(
        R.string.wallet_balance_desc,
        state.balance?.balance ?: 0,
        state.balance?.frozenBalance ?: 0,
        state.balance?.totalBalance ?: 0,
    )
    val rechargeActionDesc = if (state.recharging) stringResource(R.string.wallet_recharge_action_busy_desc) else stringResource(R.string.wallet_recharge_action_desc)
    val withdrawActionDesc = if (state.withdrawing) stringResource(R.string.wallet_withdraw_action_busy_desc) else stringResource(R.string.wallet_withdraw_action_desc)
    val rechargeValue = rechargeAmount.toLongOrNull() ?: 0L
    val isRechargeValid = rechargeValue > 0L
    val withdrawValue = withdrawAmount.toLongOrNull() ?: 0L
    val hasWithdrawAccount = withdrawAccount.trim().isNotEmpty()
    val isWithdrawValid = withdrawValue > 0L && hasWithdrawAccount

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.wallet_title)) },
                navigationIcon = {
                    TextButton(onClick = onBack) { Text(stringResource(R.string.action_back)) }
                },
                actions = {
                    TextButton(onClick = onRefresh) { Text(stringResource(R.string.action_refresh)) }
                },
            )
        },
    ) { innerPadding ->
        if (state.loading && state.balance == null && state.transactions.isEmpty()) {
            BoxLoading(modifier = Modifier.padding(innerPadding))
            return@Scaffold
        }

        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding),
            contentPadding = androidx.compose.foundation.layout.PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            item {
                Card(modifier = Modifier.fillMaxWidth().semantics { contentDescription = balanceDesc }) {
                    Column(modifier = Modifier.padding(14.dp)) {
                        Text(stringResource(R.string.wallet_balance_title), style = MaterialTheme.typography.titleMedium)
                        Text(stringResource(R.string.wallet_available, state.balance?.balance ?: 0))
                        Text(stringResource(R.string.wallet_frozen, state.balance?.frozenBalance ?: 0))
                        Text(stringResource(R.string.wallet_total, state.balance?.totalBalance ?: 0))
                    }
                }
            }

            item {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedButton(onClick = onOpenRecharge, modifier = Modifier.weight(1f)) {
                        Text(stringResource(R.string.wallet_recharge_title))
                    }
                    OutlinedButton(onClick = onOpenWithdraw, modifier = Modifier.weight(1f)) {
                        Text(stringResource(R.string.wallet_withdraw_title))
                    }
                    OutlinedButton(onClick = onOpenBills, modifier = Modifier.weight(1f)) {
                        Text(stringResource(R.string.wallet_transactions))
                    }
                }
            }

            item {
                Card(modifier = Modifier.fillMaxWidth()) {
                    Column(
                        modifier = Modifier.padding(14.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        Text(stringResource(R.string.wallet_recharge_title), style = MaterialTheme.typography.titleMedium)
                        OutlinedTextField(
                            value = rechargeAmount,
                            onValueChange = { rechargeAmount = it.filter { ch -> ch.isDigit() } },
                            label = { Text(stringResource(R.string.wallet_recharge_amount)) },
                            isError = rechargeAmount.isNotEmpty() && !isRechargeValid,
                            supportingText = {
                                if (rechargeAmount.isNotEmpty() && !isRechargeValid) {
                                    Text(stringResource(R.string.wallet_amount_invalid))
                                }
                            },
                            modifier = Modifier.fillMaxWidth(),
                            singleLine = true,
                        )
                        Button(
                            onClick = { onRecharge(rechargeValue) },
                            enabled = isRechargeValid && !state.recharging,
                            modifier = Modifier.fillMaxWidth().semantics { contentDescription = rechargeActionDesc },
                        ) {
                            Text(if (state.recharging) stringResource(R.string.wallet_recharging) else stringResource(R.string.wallet_submit_recharge))
                        }
                    }
                }
            }

            item {
                Card(modifier = Modifier.fillMaxWidth()) {
                    Column(
                        modifier = Modifier.padding(14.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        Text(stringResource(R.string.wallet_withdraw_title), style = MaterialTheme.typography.titleMedium)
                        OutlinedTextField(
                            value = withdrawAmount,
                            onValueChange = { withdrawAmount = it.filter { ch -> ch.isDigit() } },
                            label = { Text(stringResource(R.string.wallet_withdraw_amount)) },
                            isError = withdrawAmount.isNotEmpty() && withdrawValue <= 0L,
                            supportingText = {
                                if (withdrawAmount.isNotEmpty() && withdrawValue <= 0L) {
                                    Text(stringResource(R.string.wallet_amount_invalid))
                                }
                            },
                            modifier = Modifier.fillMaxWidth(),
                            singleLine = true,
                        )
                        OutlinedTextField(
                            value = withdrawAccount,
                            onValueChange = { withdrawAccount = it },
                            label = { Text(stringResource(R.string.wallet_withdraw_account)) },
                            isError = withdrawAccount.isNotEmpty() && !hasWithdrawAccount,
                            supportingText = {
                                if (withdrawAccount.isNotEmpty() && !hasWithdrawAccount) {
                                    Text(stringResource(R.string.wallet_account_required))
                                }
                            },
                            modifier = Modifier.fillMaxWidth(),
                            singleLine = true,
                        )
                        Button(
                            onClick = { onWithdraw(withdrawValue, withdrawAccount.trim()) },
                            enabled = isWithdrawValid && !state.withdrawing,
                            modifier = Modifier.fillMaxWidth().semantics { contentDescription = withdrawActionDesc },
                        ) {
                            Text(if (state.withdrawing) stringResource(R.string.wallet_withdrawing) else stringResource(R.string.wallet_submit_withdraw))
                        }
                    }
                }
            }

            state.lastOperation?.takeIf { it.isNotBlank() }?.let { operationText ->
                item {
                    Text(
                        text = operationText,
                        color = MaterialTheme.colorScheme.primary,
                    )
                }
            }

            state.error?.takeIf { it.isNotBlank() }?.let { errorText ->
                item {
                    Text(
                        text = errorText,
                        color = MaterialTheme.colorScheme.error,
                    )
                }
            }

            item {
                Text(
                    text = stringResource(R.string.wallet_transactions),
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold,
                )
            }

            if (state.transactions.isEmpty()) {
                item {
                    Text(
                        text = stringResource(R.string.wallet_transactions_empty),
                        style = MaterialTheme.typography.bodyMedium,
                    )
                }
            }

            items(state.transactions, key = { it.transactionId }) { tx ->
                val transactionDesc = stringResource(R.string.wallet_transaction_desc, tx.type, tx.amount, tx.createdAt)
                Card(modifier = Modifier.fillMaxWidth().semantics { contentDescription = transactionDesc }) {
                    Column(modifier = Modifier.padding(14.dp)) {
                        Text(stringResource(R.string.wallet_transaction_type_status, tx.type, tx.status), style = MaterialTheme.typography.titleMedium)
                        Text(stringResource(R.string.wallet_transaction_amount, tx.amount))
                        Text(stringResource(R.string.wallet_transaction_time, tx.createdAt), style = MaterialTheme.typography.bodySmall)
                        if (tx.description.isNotBlank()) {
                            Text(tx.description, style = MaterialTheme.typography.bodySmall)
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun WalletRechargeScreen(
    recharging: Boolean,
    lastOperation: String?,
    error: String?,
    onBack: () -> Unit,
    onSubmit: (Long) -> Unit,
) {
    var amount by rememberSaveable { mutableStateOf("") }
    val value = amount.toLongOrNull() ?: 0L
    val valid = value > 0L

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.wallet_recharge_title)) },
                navigationIcon = { TextButton(onClick = onBack) { Text(stringResource(R.string.action_back)) } },
            )
        },
    ) { innerPadding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding),
            contentPadding = androidx.compose.foundation.layout.PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            item {
                OutlinedTextField(
                    value = amount,
                    onValueChange = { amount = it.filter(Char::isDigit) },
                    label = { Text(stringResource(R.string.wallet_recharge_amount)) },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                )
            }
            item {
                Button(
                    onClick = { onSubmit(value) },
                    enabled = valid && !recharging,
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Text(if (recharging) stringResource(R.string.wallet_recharging) else stringResource(R.string.wallet_submit_recharge))
                }
            }
            lastOperation?.takeIf { it.isNotBlank() }?.let { op ->
                item { Text(op, color = MaterialTheme.colorScheme.primary) }
            }
            error?.takeIf { it.isNotBlank() }?.let { message ->
                item { Text(message, color = MaterialTheme.colorScheme.error) }
            }
        }
    }
}

@Composable
fun WalletWithdrawScreen(
    withdrawing: Boolean,
    lastOperation: String?,
    error: String?,
    onBack: () -> Unit,
    onSubmit: (Long, String) -> Unit,
) {
    var amount by rememberSaveable { mutableStateOf("") }
    var account by rememberSaveable { mutableStateOf("") }
    val value = amount.toLongOrNull() ?: 0L
    val valid = value > 0L && account.trim().isNotEmpty()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.wallet_withdraw_title)) },
                navigationIcon = { TextButton(onClick = onBack) { Text(stringResource(R.string.action_back)) } },
            )
        },
    ) { innerPadding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding),
            contentPadding = androidx.compose.foundation.layout.PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            item {
                OutlinedTextField(
                    value = amount,
                    onValueChange = { amount = it.filter(Char::isDigit) },
                    label = { Text(stringResource(R.string.wallet_withdraw_amount)) },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                )
            }
            item {
                OutlinedTextField(
                    value = account,
                    onValueChange = { account = it },
                    label = { Text(stringResource(R.string.wallet_withdraw_account)) },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                )
            }
            item {
                Button(
                    onClick = { onSubmit(value, account.trim()) },
                    enabled = valid && !withdrawing,
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Text(if (withdrawing) stringResource(R.string.wallet_withdrawing) else stringResource(R.string.wallet_submit_withdraw))
                }
            }
            lastOperation?.takeIf { it.isNotBlank() }?.let { op ->
                item { Text(op, color = MaterialTheme.colorScheme.primary) }
            }
            error?.takeIf { it.isNotBlank() }?.let { message ->
                item { Text(message, color = MaterialTheme.colorScheme.error) }
            }
        }
    }
}

@Composable
fun WalletBillsScreen(
    loading: Boolean,
    transactions: List<com.user.infinite.core.model.WalletTransaction>,
    error: String?,
    onBack: () -> Unit,
    onRefresh: () -> Unit,
) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.wallet_transactions)) },
                navigationIcon = { TextButton(onClick = onBack) { Text(stringResource(R.string.action_back)) } },
                actions = { TextButton(onClick = onRefresh) { Text(stringResource(R.string.action_refresh)) } },
            )
        },
    ) { innerPadding ->
        if (loading && transactions.isEmpty()) {
            BoxLoading(modifier = Modifier.padding(innerPadding))
            return@Scaffold
        }

        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding),
            contentPadding = androidx.compose.foundation.layout.PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            error?.takeIf { it.isNotBlank() }?.let { message ->
                item { Text(message, color = MaterialTheme.colorScheme.error) }
            }

            if (transactions.isEmpty()) {
                item { Text(stringResource(R.string.wallet_transactions_empty)) }
            }

            items(transactions, key = { it.transactionId }) { tx ->
                Card(modifier = Modifier.fillMaxWidth()) {
                    Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        Text(stringResource(R.string.wallet_transaction_type_status, tx.type, tx.status), style = MaterialTheme.typography.titleMedium)
                        Text(stringResource(R.string.wallet_transaction_amount, tx.amount))
                        Text(stringResource(R.string.wallet_transaction_time, tx.createdAt), style = MaterialTheme.typography.bodySmall)
                        if (tx.description.isNotBlank()) {
                            Text(tx.description, style = MaterialTheme.typography.bodySmall)
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun BoxLoading(modifier: Modifier = Modifier) {
    Column(
        modifier = modifier
            .fillMaxSize(),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        CircularProgressIndicator()
    }
}



