package com.user.infinite

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.user.infinite.core.common.ApiResult
import com.user.infinite.core.model.Product
import com.user.infinite.core.model.Shop
import com.user.infinite.core.model.repository.ShopRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class CatalogUiState(
    val loadingCategories: Boolean = false,
    val loadingCategoryShops: Boolean = false,
    val loadingFeatured: Boolean = false,
    val loadingProductDetail: Boolean = false,
    val categories: List<String> = emptyList(),
    val currentCategoryKey: String = "all",
    val categoryShops: List<Shop> = emptyList(),
    val featuredProducts: List<Product> = emptyList(),
    val productDetail: Product? = null,
    val error: String? = null,
)

class CatalogViewModel(
    private val shopRepository: ShopRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(CatalogUiState())
    val uiState: StateFlow<CatalogUiState> = _uiState.asStateFlow()

    fun loadCategoryHub() {
        viewModelScope.launch {
            _uiState.update { it.copy(loadingCategories = true, error = null) }
            when (val result = shopRepository.fetchShopCategories()) {
                is ApiResult.Success -> {
                    _uiState.update {
                        it.copy(
                            loadingCategories = false,
                            categories = result.data,
                            error = null,
                        )
                    }
                }

                is ApiResult.Failure -> {
                    _uiState.update {
                        it.copy(
                            loadingCategories = false,
                            error = result.message,
                        )
                    }
                }
            }
        }
    }

    fun loadCategoryShops(categoryKey: String) {
        val normalizedKey = categoryKey.trim().ifBlank { "all" }
        val remoteCategory = normalizedKey.takeIf { it != "all" }

        viewModelScope.launch {
            _uiState.update {
                it.copy(
                    loadingCategoryShops = true,
                    currentCategoryKey = normalizedKey,
                    error = null,
                )
            }

            when (val result = shopRepository.fetchShops(remoteCategory)) {
                is ApiResult.Success -> {
                    val direct = result.data
                    if (direct.isNotEmpty() || remoteCategory == null) {
                        _uiState.update {
                            it.copy(
                                loadingCategoryShops = false,
                                categoryShops = direct,
                                error = null,
                            )
                        }
                        return@launch
                    }

                    when (val fallback = shopRepository.fetchShops(category = null)) {
                        is ApiResult.Success -> {
                            _uiState.update {
                                it.copy(
                                    loadingCategoryShops = false,
                                    categoryShops = filterShopsByCategoryKey(fallback.data, normalizedKey),
                                    error = null,
                                )
                            }
                        }

                        is ApiResult.Failure -> {
                            _uiState.update {
                                it.copy(
                                    loadingCategoryShops = false,
                                    categoryShops = emptyList(),
                                    error = fallback.message,
                                )
                            }
                        }
                    }
                }

                is ApiResult.Failure -> {
                    when (val fallback = shopRepository.fetchShops(category = null)) {
                        is ApiResult.Success -> {
                            _uiState.update {
                                it.copy(
                                    loadingCategoryShops = false,
                                    categoryShops = filterShopsByCategoryKey(fallback.data, normalizedKey),
                                    error = null,
                                )
                            }
                        }

                        is ApiResult.Failure -> {
                            _uiState.update {
                                it.copy(
                                    loadingCategoryShops = false,
                                    categoryShops = emptyList(),
                                    error = result.message,
                                )
                            }
                        }
                    }
                }
            }
        }
    }

    fun loadFeaturedProducts() {
        viewModelScope.launch {
            _uiState.update { it.copy(loadingFeatured = true, error = null) }
            when (val result = shopRepository.fetchFeaturedProducts()) {
                is ApiResult.Success -> {
                    _uiState.update {
                        it.copy(
                            loadingFeatured = false,
                            featuredProducts = result.data,
                            error = null,
                        )
                    }
                }

                is ApiResult.Failure -> {
                    _uiState.update {
                        it.copy(
                            loadingFeatured = false,
                            error = result.message,
                        )
                    }
                }
            }
        }
    }

    fun loadProductDetail(productId: String, shopId: String?) {
        val targetProductId = productId.trim()
        if (targetProductId.isBlank()) return

        viewModelScope.launch {
            _uiState.update { it.copy(loadingProductDetail = true, productDetail = null, error = null) }

            val fromShop = shopId
                ?.trim()
                ?.takeIf { it.isNotBlank() }
                ?.let { safeLoadProductByShop(targetProductId, it) }

            if (fromShop != null) {
                _uiState.update {
                    it.copy(
                        loadingProductDetail = false,
                        productDetail = fromShop,
                        error = null,
                    )
                }
                return@launch
            }

            val fromFeatured = when (val featuredResult = shopRepository.fetchFeaturedProducts()) {
                is ApiResult.Success -> featuredResult.data.firstOrNull { it.id == targetProductId }
                is ApiResult.Failure -> null
            }

            if (fromFeatured != null) {
                _uiState.update {
                    it.copy(
                        loadingProductDetail = false,
                        productDetail = fromFeatured,
                        error = null,
                    )
                }
            } else {
                _uiState.update {
                    it.copy(
                        loadingProductDetail = false,
                        productDetail = null,
                        error = "商品详情不存在或已下架",
                    )
                }
            }
        }
    }

    private suspend fun safeLoadProductByShop(productId: String, shopId: String): Product? {
        return when (val result = shopRepository.fetchProducts(shopId = shopId, categoryId = null)) {
            is ApiResult.Success -> result.data.firstOrNull { it.id == productId }
            is ApiResult.Failure -> null
        }
    }

    private fun filterShopsByCategoryKey(shops: List<Shop>, categoryKey: String): List<Shop> {
        if (categoryKey == "all") return shops
        val keywords = categoryKeywords(categoryKey)
        if (keywords.isEmpty()) return shops

        return shops.filter { shop ->
            val category = shop.category.lowercase()
            val name = shop.name.lowercase()
            keywords.any { keyword -> category.contains(keyword) || name.contains(keyword) }
        }
    }

    private fun categoryKeywords(categoryKey: String): List<String> = when (categoryKey.lowercase()) {
        "food" -> listOf("food", "美食", "饭", "餐", "快餐")
        "dessert" -> listOf("dessert", "甜", "奶茶", "饮品", "coffee", "咖啡")
        "market" -> listOf("market", "超市", "便利", "日用")
        "fruit" -> listOf("fruit", "水果", "生鲜")
        "medicine" -> listOf("medicine", "药", "医疗")
        "burger" -> listOf("burger", "汉堡", "炸鸡")
        else -> emptyList()
    }
}

