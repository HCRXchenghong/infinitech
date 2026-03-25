package com.user.infinite.core.data.repository

import com.user.infinite.core.common.ApiResult
import com.user.infinite.core.model.Banner
import com.user.infinite.core.model.Category
import com.user.infinite.core.model.CouponSummary
import com.user.infinite.core.model.Product
import com.user.infinite.core.model.Shop
import com.user.infinite.core.model.repository.ShopRepository
import com.user.infinite.core.network.api.ProductApi
import com.user.infinite.core.network.api.ShopApi
import com.user.infinite.core.database.dao.CacheDao

class ShopRepositoryImpl(
    private val shopApi: ShopApi,
    private val productApi: ProductApi,
    private val cacheDao: CacheDao,
) : ShopRepository {

    override suspend fun fetchShopCategories(): ApiResult<List<String>> {
        return executeWithCache(
            cacheDao = cacheDao,
            cacheKey = "shops:categories",
            request = { shopApi.categories() },
            parse = ::parseShopCategoryNames,
            fallbackMessage = "failed to load shop categories",
        )
    }

    override suspend fun fetchShops(category: String?): ApiResult<List<Shop>> {
        return executeWithCache(
            cacheDao = cacheDao,
            cacheKey = "shops:list:${category.orEmpty()}",
            request = { shopApi.shops(category) },
            parse = ::parseShopList,
            fallbackMessage = "failed to load shops",
        )
    }

    override suspend fun fetchTodayRecommendedShops(): ApiResult<List<Shop>> {
        return executeWithCache(
            cacheDao = cacheDao,
            cacheKey = "shops:today_recommended",
            request = { shopApi.todayRecommended() },
            parse = ::parseShopList,
            fallbackMessage = "failed to load today recommended shops",
        )
    }

    override suspend fun fetchShopDetail(shopId: String): ApiResult<Shop> {
        return executeWithCache(
            cacheDao = cacheDao,
            cacheKey = "shops:detail:$shopId",
            request = { shopApi.detail(shopId) },
            parse = { payload ->
                parseShopList(payload).firstOrNull()
                    ?: throw IllegalStateException("shop detail missing")
            },
            fallbackMessage = "failed to load shop detail",
        )
    }

    override suspend fun fetchShopMenu(shopId: String): ApiResult<List<Product>> {
        return executeWithCache(
            cacheDao = cacheDao,
            cacheKey = "shops:menu:$shopId",
            request = { shopApi.menu(shopId) },
            parse = ::parseProductList,
            fallbackMessage = "failed to load shop menu",
        )
    }

    override suspend fun fetchCategories(shopId: String?): ApiResult<List<Category>> {
        return executeWithCache(
            cacheDao = cacheDao,
            cacheKey = "products:categories:${shopId.orEmpty()}",
            request = { productApi.categories(shopId) },
            parse = ::parseCategoryList,
            fallbackMessage = "failed to load categories",
        )
    }

    override suspend fun fetchProducts(shopId: String, categoryId: String?): ApiResult<List<Product>> {
        return executeWithCache(
            cacheDao = cacheDao,
            cacheKey = "products:list:$shopId:${categoryId.orEmpty()}",
            request = { productApi.products(shopId, categoryId) },
            parse = ::parseProductList,
            fallbackMessage = "failed to load products",
        )
    }

    override suspend fun fetchBanners(shopId: String?): ApiResult<List<Banner>> {
        return executeWithCache(
            cacheDao = cacheDao,
            cacheKey = "products:banners:${shopId.orEmpty()}",
            request = { productApi.banners(shopId) },
            parse = ::parseBannerList,
            fallbackMessage = "failed to load banners",
        )
    }

    override suspend fun fetchFeaturedProducts(): ApiResult<List<Product>> {
        return executeWithCache(
            cacheDao = cacheDao,
            cacheKey = "products:featured",
            request = { productApi.featuredProducts() },
            parse = ::parseProductList,
            fallbackMessage = "failed to load featured products",
        )
    }

    override suspend fun fetchShopCoupons(shopId: String): ApiResult<List<CouponSummary>> {
        return executeWithCache(
            cacheDao = cacheDao,
            cacheKey = "shops:coupons:$shopId",
            request = { shopApi.activeCoupons(shopId) },
            parse = ::parseCouponList,
            fallbackMessage = "failed to load shop coupons",
        )
    }
}
