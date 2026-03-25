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
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Switch
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
import com.user.infinite.core.model.OrderSummary
import com.user.infinite.core.model.UserAddress
import com.user.infinite.core.model.UserProfile
import com.user.infinite.core.model.Shop

@Composable
fun SearchScreen(
    state: SearchUiState,
    onBack: () -> Unit,
    onQueryChange: (String) -> Unit,
    onSearch: () -> Unit,
    onOpenShop: (String) -> Unit,
) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.additional_search_title)) },
                navigationIcon = { TextButton(onClick = onBack) { Text(stringResource(R.string.action_back)) } },
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
                Row(verticalAlignment = Alignment.CenterVertically) {
                    OutlinedTextField(
                        value = state.query,
                        onValueChange = onQueryChange,
                        modifier = Modifier.weight(1f),
                        placeholder = { Text(stringResource(R.string.additional_search_hint)) },
                        singleLine = true,
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Button(onClick = onSearch) { Text(stringResource(R.string.additional_search_button)) }
                }
            }

            state.error?.takeIf { it.isNotBlank() }?.let { errorText ->
                item {
                    Text(errorText, color = MaterialTheme.colorScheme.error)
                }
            }

            if (state.loading) {
                item { CenterLoading() }
            }

            if (!state.loading && state.query.isNotBlank() && state.results.isEmpty()) {
                item { Text(stringResource(R.string.additional_search_empty)) }
            }

            items(state.results, key = { it.id }) { shop ->
                ShopResultCard(shop = shop, onOpenShop = onOpenShop)
            }
        }
    }
}

@Composable
private fun ShopResultCard(
    shop: Shop,
    onOpenShop: (String) -> Unit,
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onOpenShop(shop.id) },
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            Text(shop.name, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
            if (shop.category.isNotBlank()) {
                Text(shop.category, style = MaterialTheme.typography.bodySmall)
            }
            Text(stringResource(R.string.additional_shop_rating_sales, shop.rating, shop.monthlySales), style = MaterialTheme.typography.bodyMedium)
        }
    }
}

@Composable
fun FavoritesScreen(
    state: FavoritesUiState,
    onBack: () -> Unit,
    onRefresh: () -> Unit,
    onOpenShop: (String) -> Unit,
    onRemoveFavorite: (String) -> Unit,
) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.additional_favorites_title)) },
                navigationIcon = { TextButton(onClick = onBack) { Text(stringResource(R.string.action_back)) } },
                actions = { TextButton(onClick = onRefresh) { Text(stringResource(R.string.action_refresh)) } },
            )
        },
    ) { innerPadding ->
        if (state.loading && state.favorites.isEmpty()) {
            CenterLoading(modifier = Modifier.padding(innerPadding))
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
                item { Text(errorText, color = MaterialTheme.colorScheme.error) }
            }

            if (state.favorites.isEmpty()) {
                item { Text(stringResource(R.string.additional_favorites_empty)) }
            }

            items(state.favorites, key = { it.id }) { shop ->
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
                                .clickable { onOpenShop(shop.id) },
                        ) {
                            Text(shop.name, style = MaterialTheme.typography.titleMedium)
                            Text(stringResource(R.string.additional_rating, shop.rating), style = MaterialTheme.typography.bodySmall)
                        }
                        OutlinedButton(
                            onClick = { onRemoveFavorite(shop.id) },
                            enabled = !state.operating,
                        ) {
                            Text(stringResource(R.string.additional_unfavorite))
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun ErrandHomeScreen(
    state: ErrandUiState,
    onBack: () -> Unit,
    onRefresh: () -> Unit,
    onOpenService: (String, String, String) -> Unit,
) {
    ServiceHomeScreen(
        title = stringResource(R.string.additional_errand_title),
        loading = state.loading,
        error = state.error,
        services = state.entries.map { Triple(it.id, it.title, it.description) },
        onBack = onBack,
        onRefresh = onRefresh,
        onOpenService = onOpenService,
    )
}

@Composable
fun MedicineHomeScreen(
    state: MedicineUiState,
    onBack: () -> Unit,
    onRefresh: () -> Unit,
    onOpenService: (String, String, String) -> Unit,
) {
    ServiceHomeScreen(
        title = stringResource(R.string.additional_medicine_title),
        loading = state.loading,
        error = state.error,
        services = state.entries.map { Triple(it.id, it.title, it.description) },
        onBack = onBack,
        onRefresh = onRefresh,
        onOpenService = onOpenService,
    )
}

@Composable
private fun ServiceHomeScreen(
    title: String,
    loading: Boolean,
    error: String?,
    services: List<Triple<String, String, String>>,
    onBack: () -> Unit,
    onRefresh: () -> Unit,
    onOpenService: (String, String, String) -> Unit,
) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(title) },
                navigationIcon = { TextButton(onClick = onBack) { Text(stringResource(R.string.action_back)) } },
                actions = { TextButton(onClick = onRefresh) { Text(stringResource(R.string.action_refresh)) } },
            )
        },
    ) { innerPadding ->
        if (loading && services.isEmpty()) {
            CenterLoading(modifier = Modifier.padding(innerPadding))
            return@Scaffold
        }

        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding),
            contentPadding = androidx.compose.foundation.layout.PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            error?.takeIf { it.isNotBlank() }?.let { message ->
                item { Text(message, color = MaterialTheme.colorScheme.error) }
            }

            items(services, key = { it.first }) { item ->
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { onOpenService(item.first, item.second, item.third) },
                ) {
                    Column(modifier = Modifier.padding(14.dp)) {
                        Text(item.second, style = MaterialTheme.typography.titleMedium)
                        if (item.third.isNotBlank()) {
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(item.third, style = MaterialTheme.typography.bodyMedium)
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun ServiceDetailScreen(
    title: String,
    subtitle: String,
    description: String,
    onBack: () -> Unit,
) {
    var note by remember { mutableStateOf("") }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(title) },
                navigationIcon = { TextButton(onClick = onBack) { Text(stringResource(R.string.action_back)) } },
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
                    Column(modifier = Modifier.padding(14.dp)) {
                        Text(subtitle, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.SemiBold)
                        if (description.isNotBlank()) {
                            Spacer(modifier = Modifier.height(8.dp))
                            Text(description, style = MaterialTheme.typography.bodyMedium)
                        }
                    }
                }
            }

            item {
                OutlinedTextField(
                    value = note,
                    onValueChange = { note = it },
                    modifier = Modifier.fillMaxWidth(),
                    label = { Text(stringResource(R.string.additional_service_note_label)) },
                    placeholder = { Text(stringResource(R.string.additional_service_note_placeholder)) },
                )
            }

            item {
                Button(onClick = {}, modifier = Modifier.fillMaxWidth()) {
                    Text(stringResource(R.string.additional_service_submit_placeholder))
                }
            }
        }
    }
}

@Composable
private fun CenterLoading(modifier: Modifier = Modifier) {
    Column(
        modifier = modifier.fillMaxSize(),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        CircularProgressIndicator()
    }
}

@Composable
fun PaySuccessScreen(
    orderId: String,
    onBackHome: () -> Unit,
    onViewOrder: () -> Unit,
) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.additional_pay_result_title)) },
                navigationIcon = { TextButton(onClick = onBackHome) { Text(stringResource(R.string.additional_back_home)) } },
            )
        },
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .padding(20.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp, Alignment.CenterVertically),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Text(stringResource(R.string.additional_pay_success), style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.SemiBold)
            Text(stringResource(R.string.additional_order_id, orderId), style = MaterialTheme.typography.bodyMedium)
            Button(onClick = onViewOrder, modifier = Modifier.fillMaxWidth()) {
                Text(stringResource(R.string.additional_view_order))
            }
            OutlinedButton(onClick = onBackHome, modifier = Modifier.fillMaxWidth()) {
                Text(stringResource(R.string.additional_back_home))
            }
        }
    }
}

@Composable
fun OrderReviewScreen(
    state: OrderReviewUiState,
    orderId: String,
    onBack: () -> Unit,
    onRatingChange: (Int) -> Unit,
    onCommentChange: (String) -> Unit,
    onSubmit: () -> Unit,
) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.additional_order_review_title)) },
                navigationIcon = { TextButton(onClick = onBack) { Text(stringResource(R.string.action_back)) } },
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
                    Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text(stringResource(R.string.additional_order_id, orderId), style = MaterialTheme.typography.titleMedium)
                        Text(stringResource(R.string.additional_review_score), style = MaterialTheme.typography.bodyMedium)
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            (1..5).forEach { score ->
                                if (score == state.rating) {
                                    Button(onClick = { onRatingChange(score) }) { Text(score.toString()) }
                                } else {
                                    OutlinedButton(onClick = { onRatingChange(score) }) { Text(score.toString()) }
                                }
                            }
                        }
                        OutlinedTextField(
                            value = state.comment,
                            onValueChange = onCommentChange,
                            label = { Text(stringResource(R.string.additional_review_content_label)) },
                            placeholder = { Text(stringResource(R.string.additional_review_content_placeholder)) },
                            modifier = Modifier.fillMaxWidth(),
                        )
                    }
                }
            }

            state.resultMessage?.takeIf { it.isNotBlank() }?.let { message ->
                item { Text(message, color = MaterialTheme.colorScheme.primary) }
            }

            state.error?.takeIf { it.isNotBlank() }?.let { errorText ->
                item { Text(errorText, color = MaterialTheme.colorScheme.error) }
            }

            item {
                Button(
                    onClick = onSubmit,
                    enabled = !state.submitting && !state.submitted,
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Text(
                        when {
                            state.submitting -> stringResource(R.string.additional_review_submitting)
                            state.submitted -> stringResource(R.string.additional_review_submitted)
                            else -> stringResource(R.string.additional_review_submit)
                        },
                    )
                }
            }
        }
    }
}

@Composable
fun OrderRefundScreen(
    orderId: String,
    onBack: () -> Unit,
    onContactService: () -> Unit,
) {
    val defaultReason = stringResource(R.string.additional_refund_reason_timeout)
    var reason by remember(defaultReason) { mutableStateOf(defaultReason) }
    var detail by remember { mutableStateOf("") }
    val reasons = listOf(
        stringResource(R.string.additional_refund_reason_out_of_stock),
        stringResource(R.string.additional_refund_reason_timeout),
        stringResource(R.string.additional_refund_reason_wrong_item),
        stringResource(R.string.additional_refund_reason_other),
    )

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.additional_refund_title)) },
                navigationIcon = { TextButton(onClick = onBack) { Text(stringResource(R.string.action_back)) } },
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
                Text(stringResource(R.string.additional_order_id, orderId), style = MaterialTheme.typography.titleMedium)
            }
            item {
                Text(stringResource(R.string.additional_refund_reason_label), style = MaterialTheme.typography.titleSmall)
            }
            item {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    reasons.forEach { option ->
                        if (option == reason) {
                            Button(onClick = { reason = option }) { Text(option) }
                        } else {
                            OutlinedButton(onClick = { reason = option }) { Text(option) }
                        }
                    }
                }
            }
            item {
                OutlinedTextField(
                    value = detail,
                    onValueChange = { detail = it },
                    modifier = Modifier.fillMaxWidth(),
                    label = { Text(stringResource(R.string.additional_refund_detail_label)) },
                    placeholder = { Text(stringResource(R.string.additional_refund_detail_placeholder)) },
                )
            }
            item {
                Card(modifier = Modifier.fillMaxWidth()) {
                    Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text(stringResource(R.string.additional_refund_tip), style = MaterialTheme.typography.bodyMedium)
                        Text(stringResource(R.string.additional_refund_selected_reason, reason), style = MaterialTheme.typography.bodySmall)
                    }
                }
            }
            item {
                Button(onClick = onContactService, modifier = Modifier.fillMaxWidth()) {
                    Text(stringResource(R.string.additional_contact_service))
                }
            }
        }
    }
}

@Composable
fun OrderRemarkScreen(
    initialRemark: String,
    onBack: () -> Unit,
    onApply: (String) -> Unit,
) {
    var remark by remember(initialRemark) { mutableStateOf(initialRemark) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.order_remark_title)) },
                navigationIcon = { TextButton(onClick = onBack) { Text(stringResource(R.string.action_back)) } },
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
                OutlinedTextField(
                    value = remark,
                    onValueChange = { remark = it.take(60) },
                    modifier = Modifier.fillMaxWidth(),
                    label = { Text(stringResource(R.string.order_remark_label)) },
                    placeholder = { Text(stringResource(R.string.order_remark_placeholder)) },
                )
            }
            item {
                Button(
                    onClick = { onApply(remark.trim()) },
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Text(stringResource(R.string.order_remark_apply))
                }
            }
        }
    }
}

@Composable
fun OrderTablewareScreen(
    initialTableware: String,
    onBack: () -> Unit,
    onApply: (String) -> Unit,
) {
    var tableware by remember(initialTableware) { mutableStateOf(initialTableware) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.order_tableware_title)) },
                navigationIcon = { TextButton(onClick = onBack) { Text(stringResource(R.string.action_back)) } },
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
                OutlinedTextField(
                    value = tableware,
                    onValueChange = { tableware = it.take(30) },
                    modifier = Modifier.fillMaxWidth(),
                    label = { Text(stringResource(R.string.order_tableware_label)) },
                    placeholder = { Text(stringResource(R.string.order_tableware_placeholder)) },
                    singleLine = true,
                )
            }
            item {
                Button(
                    onClick = { onApply(tableware.trim()) },
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Text(stringResource(R.string.order_tableware_apply))
                }
            }
        }
    }
}

@Composable
fun ProfileCenterScreen(
    onBack: () -> Unit,
    onOpenSettings: () -> Unit,
    onOpenMyReviews: () -> Unit,
    onOpenAddresses: () -> Unit,
    onOpenCoupons: () -> Unit,
    onOpenVip: () -> Unit,
    onOpenPoints: () -> Unit,
    onOpenInvite: () -> Unit,
    onOpenCooperation: () -> Unit,
    onOpenEditProfile: () -> Unit,
    onOpenPhoneChange: () -> Unit,
    onOpenCustomerService: () -> Unit,
    onOpenDiningBuddy: () -> Unit,
    onOpenCharity: () -> Unit,
) {
    val entries = listOf(
        stringResource(R.string.additional_profile_entry_settings) to onOpenSettings,
        stringResource(R.string.additional_profile_entry_my_reviews) to onOpenMyReviews,
        stringResource(R.string.additional_profile_entry_addresses) to onOpenAddresses,
        stringResource(R.string.additional_profile_entry_coupons) to onOpenCoupons,
        stringResource(R.string.additional_profile_entry_vip) to onOpenVip,
        stringResource(R.string.additional_profile_entry_points) to onOpenPoints,
        stringResource(R.string.additional_profile_entry_invite) to onOpenInvite,
        stringResource(R.string.additional_profile_entry_cooperation) to onOpenCooperation,
        stringResource(R.string.additional_profile_entry_edit_profile) to onOpenEditProfile,
        stringResource(R.string.additional_profile_entry_phone_change) to onOpenPhoneChange,
        stringResource(R.string.additional_profile_entry_customer_service) to onOpenCustomerService,
        stringResource(R.string.additional_profile_entry_dining_buddy) to onOpenDiningBuddy,
        stringResource(R.string.additional_profile_entry_charity) to onOpenCharity,
    )

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.additional_profile_center_title)) },
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
            items(entries, key = { it.first }) { entry ->
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { entry.second() },
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(14.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Text(entry.first, modifier = Modifier.weight(1f), style = MaterialTheme.typography.titleMedium)
                        Text(stringResource(R.string.additional_entry_arrow), style = MaterialTheme.typography.bodySmall)
                    }
                }
            }
        }
    }
}

@Composable
fun SettingsScreen(
    state: SettingsUiState,
    onBack: () -> Unit,
    onOpenDetail: () -> Unit,
    onToggle: (String, Boolean) -> Unit,
) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.additional_settings_title)) },
                navigationIcon = { TextButton(onClick = onBack) { Text(stringResource(R.string.action_back)) } },
                actions = {
                    TextButton(onClick = onOpenDetail) { Text(stringResource(R.string.additional_entry_arrow)) }
                },
            )
        },
    ) { innerPadding ->
        if (state.loading) {
            CenterLoading(modifier = Modifier.padding(innerPadding))
            return@Scaffold
        }

        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding),
            contentPadding = androidx.compose.foundation.layout.PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            state.error?.takeIf { it.isNotBlank() }?.let { errorText ->
                item { Text(errorText, color = MaterialTheme.colorScheme.error) }
            }

            items(state.toggles, key = { it.key }) { setting ->
                Card(modifier = Modifier.fillMaxWidth()) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(14.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(setting.title, style = MaterialTheme.typography.titleMedium)
                            Text(setting.description, style = MaterialTheme.typography.bodySmall)
                        }
                        Switch(
                            checked = setting.enabled,
                            onCheckedChange = { checked -> onToggle(setting.key, checked) },
                            enabled = state.savingKey == null || state.savingKey == setting.key,
                            modifier = Modifier.semantics { contentDescription = setting.title },
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun SettingsDetailScreen(
    state: SettingsUiState,
    onBack: () -> Unit,
    onToggle: (String, Boolean) -> Unit,
) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.settings_detail_title)) },
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
                Text(stringResource(R.string.settings_detail_desc), style = MaterialTheme.typography.bodyMedium)
            }

            items(state.toggles, key = { it.key }) { setting ->
                Card(modifier = Modifier.fillMaxWidth()) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(14.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(setting.title, style = MaterialTheme.typography.titleMedium)
                            Text(setting.description, style = MaterialTheme.typography.bodySmall)
                        }
                        Switch(
                            checked = setting.enabled,
                            onCheckedChange = { checked -> onToggle(setting.key, checked) },
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun CouponListScreen(
    state: CouponCenterUiState,
    onBack: () -> Unit,
    onRefresh: () -> Unit,
) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.coupon_list_title)) },
                navigationIcon = { TextButton(onClick = onBack) { Text(stringResource(R.string.action_back)) } },
                actions = { TextButton(onClick = onRefresh) { Text(stringResource(R.string.action_refresh)) } },
            )
        },
    ) { innerPadding ->
        if (state.loading && state.coupons.isEmpty()) {
            CenterLoading(modifier = Modifier.padding(innerPadding))
            return@Scaffold
        }

        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding),
            contentPadding = androidx.compose.foundation.layout.PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            if (state.sourceShopName.isNotBlank()) {
                item {
                    Card(modifier = Modifier.fillMaxWidth()) {
                        Column(modifier = Modifier.padding(14.dp)) {
                            Text(stringResource(R.string.coupon_source_shop), style = MaterialTheme.typography.bodySmall)
                            Text(state.sourceShopName, style = MaterialTheme.typography.titleMedium)
                        }
                    }
                }
            }

            state.error?.takeIf { it.isNotBlank() }?.let { errorText ->
                item { Text(errorText, color = MaterialTheme.colorScheme.error) }
            }

            state.emptyMessage?.takeIf { it.isNotBlank() }?.let { emptyText ->
                item { Text(emptyText) }
            }

            items(state.coupons, key = { it.id }) { coupon ->
                Card(modifier = Modifier.fillMaxWidth()) {
                    Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        Text(coupon.title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                        if (coupon.discountText.isNotBlank()) {
                            Text(coupon.discountText, style = MaterialTheme.typography.bodyMedium)
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun VipCenterScreen(
    onBack: () -> Unit,
) {
    val benefits = listOf(
        stringResource(R.string.vip_benefit_delivery),
        stringResource(R.string.vip_benefit_coupon),
        stringResource(R.string.vip_benefit_service),
    )

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.vip_center_title)) },
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
                Card(modifier = Modifier.fillMaxWidth()) {
                    Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text(stringResource(R.string.vip_center_desc), style = MaterialTheme.typography.bodyMedium)
                        benefits.forEach { benefit ->
                            Text("• $benefit", style = MaterialTheme.typography.bodyMedium)
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun PointsMallScreen(
    onBack: () -> Unit,
) {
    val goods = listOf(
        stringResource(R.string.points_item_a),
        stringResource(R.string.points_item_b),
        stringResource(R.string.points_item_c),
    )

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.points_mall_title)) },
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
                Text(stringResource(R.string.points_mall_desc), style = MaterialTheme.typography.bodyMedium)
            }
            items(goods) { name ->
                Card(modifier = Modifier.fillMaxWidth()) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(14.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Text(name, modifier = Modifier.weight(1f), style = MaterialTheme.typography.titleMedium)
                        OutlinedButton(onClick = {}) { Text(stringResource(R.string.points_exchange)) }
                    }
                }
            }
        }
    }
}

@Composable
fun InviteFriendsScreen(
    inviteCode: String,
    onBack: () -> Unit,
) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.invite_friends_title)) },
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
                Card(modifier = Modifier.fillMaxWidth()) {
                    Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text(stringResource(R.string.invite_friends_desc), style = MaterialTheme.typography.bodyMedium)
                        Text(stringResource(R.string.invite_code_label, inviteCode), style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                    }
                }
            }
        }
    }
}

@Composable
fun CooperationScreen(
    onBack: () -> Unit,
) {
    var company by rememberSaveable { mutableStateOf("") }
    var contact by rememberSaveable { mutableStateOf("") }
    var phone by rememberSaveable { mutableStateOf("") }
    var intention by rememberSaveable { mutableStateOf("") }
    var submitted by rememberSaveable { mutableStateOf(false) }
    val canSubmit = company.trim().isNotEmpty() && contact.trim().isNotEmpty() && phone.length >= 6

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.cooperation_title)) },
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
                    value = company,
                    onValueChange = { company = it.take(50) },
                    label = { Text(stringResource(R.string.cooperation_company)) },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                )
            }
            item {
                OutlinedTextField(
                    value = contact,
                    onValueChange = { contact = it.take(20) },
                    label = { Text(stringResource(R.string.cooperation_contact)) },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                )
            }
            item {
                OutlinedTextField(
                    value = phone,
                    onValueChange = { phone = it.filter(Char::isDigit).take(15) },
                    label = { Text(stringResource(R.string.cooperation_phone)) },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
                )
            }
            item {
                OutlinedTextField(
                    value = intention,
                    onValueChange = { intention = it.take(200) },
                    label = { Text(stringResource(R.string.cooperation_intention)) },
                    modifier = Modifier.fillMaxWidth(),
                )
            }
            item {
                Button(
                    onClick = { submitted = true },
                    enabled = canSubmit,
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Text(stringResource(R.string.cooperation_submit))
                }
            }
            if (submitted) {
                item {
                    Text(stringResource(R.string.cooperation_submitted), color = MaterialTheme.colorScheme.primary)
                }
            }
        }
    }
}

@Composable
fun EditProfileScreen(
    profile: UserProfile?,
    onBack: () -> Unit,
) {
    var nickname by rememberSaveable(profile?.id) { mutableStateOf(profile?.nickname.orEmpty()) }
    var signature by rememberSaveable(profile?.id) { mutableStateOf("") }
    var saved by rememberSaveable { mutableStateOf(false) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.profile_edit_title)) },
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
                    value = nickname,
                    onValueChange = { nickname = it.take(20) },
                    label = { Text(stringResource(R.string.profile_edit_nickname)) },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                )
            }
            item {
                OutlinedTextField(
                    value = signature,
                    onValueChange = { signature = it.take(80) },
                    label = { Text(stringResource(R.string.profile_edit_signature)) },
                    modifier = Modifier.fillMaxWidth(),
                )
            }
            item {
                Button(
                    onClick = { saved = true },
                    enabled = nickname.trim().isNotEmpty(),
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Text(stringResource(R.string.profile_edit_save))
                }
            }
            if (saved) {
                item {
                    Text(stringResource(R.string.profile_edit_saved_tip), color = MaterialTheme.colorScheme.primary)
                }
            }
        }
    }
}

@Composable
fun PhoneChangeScreen(
    currentPhone: String,
    onBack: () -> Unit,
) {
    var newPhone by rememberSaveable { mutableStateOf("") }
    var smsCode by rememberSaveable { mutableStateOf("") }
    var submitted by rememberSaveable { mutableStateOf(false) }
    val canSubmit = newPhone.length == 11 && smsCode.length >= 4

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.phone_change_title)) },
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
                Text(
                    stringResource(
                        R.string.phone_change_current,
                        currentPhone.ifBlank { stringResource(R.string.phone_change_unknown) },
                    ),
                )
            }
            item {
                OutlinedTextField(
                    value = newPhone,
                    onValueChange = { newPhone = it.filter(Char::isDigit).take(11) },
                    label = { Text(stringResource(R.string.phone_change_new)) },
                    modifier = Modifier.fillMaxWidth(),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
                    singleLine = true,
                )
            }
            item {
                OutlinedTextField(
                    value = smsCode,
                    onValueChange = { smsCode = it.filter(Char::isDigit).take(6) },
                    label = { Text(stringResource(R.string.phone_change_code)) },
                    modifier = Modifier.fillMaxWidth(),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    singleLine = true,
                )
            }
            item {
                Button(
                    onClick = { submitted = true },
                    enabled = canSubmit,
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Text(stringResource(R.string.phone_change_submit))
                }
            }
            if (submitted) {
                item { Text(stringResource(R.string.phone_change_submitted), color = MaterialTheme.colorScheme.primary) }
            }
        }
    }
}

@Composable
fun CustomerServiceEntryScreen(
    onBack: () -> Unit,
    onOpenChat: () -> Unit,
) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.customer_service_title)) },
                navigationIcon = { TextButton(onClick = onBack) { Text(stringResource(R.string.action_back)) } },
            )
        },
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Card(modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(stringResource(R.string.customer_service_desc), style = MaterialTheme.typography.bodyMedium)
                    Button(onClick = onOpenChat, modifier = Modifier.fillMaxWidth()) {
                        Text(stringResource(R.string.customer_service_open_chat))
                    }
                }
            }
        }
    }
}

@Composable
fun MyReviewsScreen(
    orders: List<OrderSummary>,
    onBack: () -> Unit,
    onOpenOrder: (String) -> Unit,
) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.additional_my_reviews_title)) },
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
            if (orders.isEmpty()) {
                item { Text(stringResource(R.string.additional_my_reviews_empty)) }
            }

            items(orders, key = { it.id }) { order ->
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { onOpenOrder(order.id) },
                ) {
                    Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        Text(order.shopName, style = MaterialTheme.typography.titleMedium)
                        Text(stringResource(R.string.additional_order_id, order.id), style = MaterialTheme.typography.bodySmall)
                        Text(stringResource(R.string.additional_amount, order.price), style = MaterialTheme.typography.bodySmall)
                    }
                }
            }
        }
    }
}

@Composable
fun ProfileInfoScreen(
    title: String,
    description: String,
    onBack: () -> Unit,
) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(title) },
                navigationIcon = { TextButton(onClick = onBack) { Text(stringResource(R.string.action_back)) } },
            )
        },
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Card(modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(title, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.SemiBold)
                    Text(description, style = MaterialTheme.typography.bodyMedium)
                }
            }
        }
    }
}



@Composable
fun AddressListScreen(
    state: AddressUiState,
    selectionMode: Boolean,
    onBack: () -> Unit,
    onAdd: () -> Unit,
    onEdit: (String) -> Unit,
    onDelete: (String) -> Unit,
    onSelect: (String) -> Unit,
) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(if (selectionMode) stringResource(R.string.additional_address_select_title) else stringResource(R.string.additional_address_manage_title)) },
                navigationIcon = { TextButton(onClick = onBack) { Text(stringResource(R.string.action_back)) } },
                actions = { TextButton(onClick = onAdd) { Text(stringResource(R.string.additional_add)) } },
            )
        },
    ) { innerPadding ->
        if (state.loading) {
            CenterLoading(modifier = Modifier.padding(innerPadding))
            return@Scaffold
        }

        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding),
            contentPadding = androidx.compose.foundation.layout.PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            item {
                Card(modifier = Modifier.fillMaxWidth()) {
                    Column(
                        modifier = Modifier.padding(14.dp),
                        verticalArrangement = Arrangement.spacedBy(6.dp),
                    ) {
                        Text(
                            text = if (selectionMode) stringResource(R.string.additional_address_choose_tip) else stringResource(R.string.additional_address_default_title),
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.SemiBold,
                        )
                        val selected = state.selectedAddress
                        if (selected == null) {
                            Text(stringResource(R.string.additional_address_default_empty), style = MaterialTheme.typography.bodyMedium)
                        } else {
                            Text(
                                stringResource(R.string.additional_address_selected_summary, selected.tag, selected.name, selected.phone),
                                style = MaterialTheme.typography.bodyMedium,
                            )
                            Text(
                                selected.fullAddress(),
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                    }
                }
            }

            state.message?.takeIf { it.isNotBlank() }?.let { message ->
                item { Text(message, color = MaterialTheme.colorScheme.primary) }
            }

            state.error?.takeIf { it.isNotBlank() }?.let { errorText ->
                item { Text(errorText, color = MaterialTheme.colorScheme.error) }
            }

            if (state.addresses.isEmpty()) {
                item { Text(stringResource(R.string.additional_address_empty)) }
            }

            items(state.addresses, key = { it.id }) { address ->
                val isSelected = state.selectedAddress?.id == address.id
                Card(modifier = Modifier.fillMaxWidth()) {
                    Column(
                        modifier = Modifier.padding(14.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(
                                text = stringResource(R.string.additional_address_item_title, address.tag, address.name),
                                style = MaterialTheme.typography.titleMedium,
                                modifier = Modifier.weight(1f),
                            )
                            if (isSelected) {
                                Text(
                                    stringResource(R.string.additional_address_badge_default),
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.primary,
                                )
                            }
                        }

                        Text(address.fullAddress(), style = MaterialTheme.typography.bodyMedium)
                        Text(
                            stringResource(R.string.additional_contact_phone, address.phone),
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )

                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            if (selectionMode) {
                                Button(
                                    onClick = { onSelect(address.id) },
                                    modifier = Modifier.weight(1f),
                                ) {
                                    Text(if (isSelected) stringResource(R.string.additional_address_current) else stringResource(R.string.additional_address_choose_this))
                                }
                            } else {
                                OutlinedButton(onClick = { onEdit(address.id) }, modifier = Modifier.weight(1f)) {
                                    Text(stringResource(R.string.additional_edit))
                                }
                                OutlinedButton(
                                    onClick = { onDelete(address.id) },
                                    enabled = state.deletingId != address.id,
                                    modifier = Modifier.weight(1f),
                                ) {
                                    Text(if (state.deletingId == address.id) stringResource(R.string.additional_deleting) else stringResource(R.string.additional_delete))
                                }
                                Button(onClick = { onSelect(address.id) }, modifier = Modifier.weight(1f)) {
                                    Text(stringResource(R.string.additional_set_default))
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
@OptIn(ExperimentalLayoutApi::class)
@Composable
fun AddressEditScreen(
    initialAddress: UserAddress?,
    saving: Boolean,
    error: String?,
    onBack: () -> Unit,
    onSave: (UserAddress) -> Unit,
) {
    val defaultTag = stringResource(R.string.additional_tag_home)
    var name by remember(initialAddress?.id) { mutableStateOf(initialAddress?.name.orEmpty()) }
    var phone by remember(initialAddress?.id) { mutableStateOf(initialAddress?.phone.orEmpty()) }
    var address by remember(initialAddress?.id) { mutableStateOf(initialAddress?.address.orEmpty()) }
    var detail by remember(initialAddress?.id) { mutableStateOf(initialAddress?.detail.orEmpty()) }
    var tag by remember(initialAddress?.id, defaultTag) { mutableStateOf(initialAddress?.tag ?: defaultTag) }
    var showValidation by rememberSaveable(initialAddress?.id) { mutableStateOf(false) }

    val trimmedName = name.trim()
    val trimmedAddress = address.trim()
    val isNameValid = trimmedName.isNotEmpty()
    val isPhoneValid = phone.length == 11
    val isAddressValid = trimmedAddress.isNotEmpty()
    val canSave = isNameValid && isPhoneValid && isAddressValid && !saving
    val saveActionDesc = if (saving) {
        stringResource(R.string.additional_address_save_action_busy_desc)
    } else {
        stringResource(R.string.additional_address_save_action_desc)
    }

    val tags = listOf(
        defaultTag,
        stringResource(R.string.additional_tag_company),
        stringResource(R.string.additional_tag_school),
    )

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(if (initialAddress == null) stringResource(R.string.additional_address_create_title) else stringResource(R.string.additional_address_edit_title)) },
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
                Card(modifier = Modifier.fillMaxWidth()) {
                    Column(
                        modifier = Modifier.padding(14.dp),
                        verticalArrangement = Arrangement.spacedBy(10.dp),
                    ) {
                        Text(stringResource(R.string.additional_contact_info_title), style = MaterialTheme.typography.titleMedium)
                        OutlinedTextField(
                            value = name,
                            onValueChange = { name = it.take(20) },
                            label = { Text(stringResource(R.string.additional_contact_name)) },
                            isError = showValidation && !isNameValid,
                            supportingText = {
                                if (showValidation && !isNameValid) {
                                    Text(stringResource(R.string.additional_name_required))
                                }
                            },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Text),
                            singleLine = true,
                            modifier = Modifier.fillMaxWidth(),
                        )
                        OutlinedTextField(
                            value = phone,
                            onValueChange = { phone = it.filter(Char::isDigit).take(11) },
                            label = { Text(stringResource(R.string.additional_contact_phone_label)) },
                            isError = (showValidation && !isPhoneValid) || (phone.isNotEmpty() && !isPhoneValid),
                            supportingText = {
                                if ((showValidation && !isPhoneValid) || (phone.isNotEmpty() && !isPhoneValid)) {
                                    Text(stringResource(R.string.additional_phone_invalid))
                                }
                            },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
                            singleLine = true,
                            modifier = Modifier.fillMaxWidth(),
                        )
                    }
                }
            }

            item {
                Card(modifier = Modifier.fillMaxWidth()) {
                    Column(
                        modifier = Modifier.padding(14.dp),
                        verticalArrangement = Arrangement.spacedBy(10.dp),
                    ) {
                        Text(stringResource(R.string.additional_address_info_title), style = MaterialTheme.typography.titleMedium)
                        OutlinedTextField(
                            value = address,
                            onValueChange = { address = it },
                            label = { Text(stringResource(R.string.additional_address_label)) },
                            isError = showValidation && !isAddressValid,
                            supportingText = {
                                if (showValidation && !isAddressValid) {
                                    Text(stringResource(R.string.additional_address_required))
                                }
                            },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Text),
                            singleLine = true,
                            modifier = Modifier.fillMaxWidth(),
                        )
                        OutlinedTextField(
                            value = detail,
                            onValueChange = { detail = it },
                            label = { Text(stringResource(R.string.additional_address_doorplate)) },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Text),
                            singleLine = true,
                            modifier = Modifier.fillMaxWidth(),
                        )
                    }
                }
            }

            item {
                Card(modifier = Modifier.fillMaxWidth()) {
                    Column(
                        modifier = Modifier.padding(14.dp),
                        verticalArrangement = Arrangement.spacedBy(10.dp),
                    ) {
                        Text(stringResource(R.string.additional_address_tag_title), style = MaterialTheme.typography.titleMedium)
                        FlowRow(
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            verticalArrangement = Arrangement.spacedBy(8.dp),
                        ) {
                            tags.forEach { option ->
                                if (option == tag) {
                                    Button(onClick = { tag = option }) { Text(option) }
                                } else {
                                    OutlinedButton(onClick = { tag = option }) { Text(option) }
                                }
                            }
                        }
                    }
                }
            }

            error?.takeIf { it.isNotBlank() }?.let { err ->
                item { Text(err, color = MaterialTheme.colorScheme.error) }
            }

            item {
                Button(
                    onClick = {
                        showValidation = true
                        if (!canSave) return@Button
                        onSave(
                            UserAddress(
                                id = initialAddress?.id.orEmpty(),
                                tag = tag,
                                name = trimmedName,
                                phone = phone,
                                address = trimmedAddress,
                                detail = detail.trim(),
                                lat = initialAddress?.lat,
                                lng = initialAddress?.lng,
                            ),
                        )
                    },
                    enabled = !saving,
                    modifier = Modifier
                        .fillMaxWidth()
                        .semantics { contentDescription = saveActionDesc },
                ) {
                    Text(if (saving) stringResource(R.string.additional_saving) else stringResource(R.string.additional_save_address))
                }
            }
        }
    }
}
