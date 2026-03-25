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
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.user.infinite.core.model.Product
import com.user.infinite.core.model.Shop

private val presetCategoryKeys = listOf(
    "food",
    "dessert",
    "market",
    "fruit",
    "medicine",
    "burger",
    "all",
)

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun CategoryHubScreen(
    state: CatalogUiState,
    onBack: () -> Unit,
    onRefresh: () -> Unit,
    onOpenFeatured: () -> Unit,
    onOpenCategory: (String) -> Unit,
) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.category_hub_title)) },
                navigationIcon = { TextButton(onClick = onBack) { Text(stringResource(R.string.action_back)) } },
                actions = { TextButton(onClick = onRefresh) { Text(stringResource(R.string.action_refresh)) } },
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
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(14.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(stringResource(R.string.featured_products_title), style = MaterialTheme.typography.titleMedium)
                            Text(stringResource(R.string.category_featured_hint), style = MaterialTheme.typography.bodySmall)
                        }
                        FilledTonalButton(onClick = onOpenFeatured) {
                            Text(stringResource(R.string.action_open))
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

            item {
                Text(
                    text = stringResource(R.string.category_quick_entry),
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold,
                )
            }

            item {
                FlowRow(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    presetCategoryKeys.forEach { key ->
                        OutlinedButton(onClick = { onOpenCategory(key) }) {
                            Text(categoryLabel(key))
                        }
                    }
                }
            }

            if (state.categories.isNotEmpty()) {
                item {
                    Text(
                        text = stringResource(R.string.category_server_entry),
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.SemiBold,
                    )
                }

                items(state.categories, key = { it }) { category ->
                    Card(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { onOpenCategory(category) },
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(14.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Text(category, modifier = Modifier.weight(1f), style = MaterialTheme.typography.titleMedium)
                            Text(stringResource(R.string.additional_entry_arrow), style = MaterialTheme.typography.bodySmall)
                        }
                    }
                }
            }

            if (state.loadingCategories && state.categories.isEmpty()) {
                item { CatalogLoading() }
            }
        }
    }
}

@Composable
fun CategoryShopListScreen(
    state: CatalogUiState,
    categoryKey: String,
    onBack: () -> Unit,
    onRefresh: () -> Unit,
    onOpenShop: (String) -> Unit,
) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.category_list_title, categoryLabel(categoryKey))) },
                navigationIcon = { TextButton(onClick = onBack) { Text(stringResource(R.string.action_back)) } },
                actions = { TextButton(onClick = onRefresh) { Text(stringResource(R.string.action_refresh)) } },
            )
        },
    ) { innerPadding ->
        if (state.loadingCategoryShops && state.categoryShops.isEmpty()) {
            CatalogLoading(modifier = Modifier.padding(innerPadding))
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

            if (state.categoryShops.isEmpty()) {
                item { Text(stringResource(R.string.category_empty)) }
            }

            items(state.categoryShops, key = { it.id }) { shop ->
                ShopCategoryCard(
                    shop = shop,
                    onOpenShop = onOpenShop,
                )
            }
        }
    }
}

@Composable
private fun ShopCategoryCard(
    shop: Shop,
    onOpenShop: (String) -> Unit,
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onOpenShop(shop.id) },
    ) {
        Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Text(shop.name, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
            if (shop.category.isNotBlank()) {
                Text(shop.category, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.primary)
            }
            Text(stringResource(R.string.additional_shop_rating_sales, shop.rating, shop.monthlySales), style = MaterialTheme.typography.bodyMedium)
            Text(stringResource(R.string.shops_min_delivery, shop.minPrice, shop.deliveryPrice), style = MaterialTheme.typography.bodySmall)
        }
    }
}

@Composable
fun FeaturedProductsScreen(
    state: CatalogUiState,
    onBack: () -> Unit,
    onRefresh: () -> Unit,
    onOpenProduct: (Product) -> Unit,
    onOpenPopup: (Product) -> Unit,
) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.featured_products_title)) },
                navigationIcon = { TextButton(onClick = onBack) { Text(stringResource(R.string.action_back)) } },
                actions = { TextButton(onClick = onRefresh) { Text(stringResource(R.string.action_refresh)) } },
            )
        },
    ) { innerPadding ->
        if (state.loadingFeatured && state.featuredProducts.isEmpty()) {
            CatalogLoading(modifier = Modifier.padding(innerPadding))
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

            if (state.featuredProducts.isEmpty()) {
                item { Text(stringResource(R.string.featured_products_empty)) }
            }

            items(state.featuredProducts, key = { it.id }) { product ->
                Card(modifier = Modifier.fillMaxWidth()) {
                    Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text(product.name, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                        Text(stringResource(R.string.price_yuan, product.price), style = MaterialTheme.typography.bodyMedium)
                        if (product.description.isNotBlank()) {
                            Text(product.description, style = MaterialTheme.typography.bodySmall)
                        }

                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            Button(onClick = { onOpenProduct(product) }, modifier = Modifier.weight(1f)) {
                                Text(stringResource(R.string.featured_open_detail))
                            }
                            OutlinedButton(onClick = { onOpenPopup(product) }, modifier = Modifier.weight(1f)) {
                                Text(stringResource(R.string.featured_open_popup))
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun ProductDetailScreen(
    title: String,
    loading: Boolean,
    product: Product?,
    error: String?,
    compact: Boolean,
    onBack: () -> Unit,
    onOpenShop: (String) -> Unit,
) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(title) },
                navigationIcon = { TextButton(onClick = onBack) { Text(stringResource(R.string.action_back)) } },
            )
        },
    ) { innerPadding ->
        when {
            loading -> {
                CatalogLoading(modifier = Modifier.padding(innerPadding))
            }

            product == null -> {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(innerPadding)
                        .padding(16.dp),
                    verticalArrangement = Arrangement.Center,
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    Text(error ?: stringResource(R.string.product_detail_empty))
                }
            }

            else -> {
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
                                Text(product.name, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.SemiBold)
                                Text(stringResource(R.string.price_yuan, product.price), style = MaterialTheme.typography.titleMedium)

                                val extra = buildList {
                                    if (product.monthlySales > 0) add(stringResource(R.string.product_monthly_sales, product.monthlySales))
                                    if (product.rating > 0.0) add(stringResource(R.string.product_rating, product.rating))
                                    if (product.stock > 0) add(stringResource(R.string.product_stock, product.stock))
                                }
                                if (extra.isNotEmpty()) {
                                    Text(extra.joinToString(" · "), style = MaterialTheme.typography.bodySmall)
                                }

                                if (product.description.isNotBlank()) {
                                    Text(product.description, style = MaterialTheme.typography.bodyMedium)
                                }
                            }
                        }
                    }

                    if (!compact && product.shopId.isNotBlank()) {
                        item {
                            Button(onClick = { onOpenShop(product.shopId) }, modifier = Modifier.fillMaxWidth()) {
                                Text(stringResource(R.string.product_open_shop))
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun categoryLabel(categoryKey: String): String = when (categoryKey.lowercase()) {
    "food" -> stringResource(R.string.category_food)
    "dessert" -> stringResource(R.string.category_dessert)
    "market" -> stringResource(R.string.category_market)
    "fruit" -> stringResource(R.string.category_fruit)
    "medicine" -> stringResource(R.string.category_medicine)
    "burger" -> stringResource(R.string.category_burger)
    "all" -> stringResource(R.string.category_all)
    else -> categoryKey
}

@Composable
private fun CatalogLoading(modifier: Modifier = Modifier) {
    Column(
        modifier = modifier.fillMaxSize(),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        CircularProgressIndicator()
    }
}
