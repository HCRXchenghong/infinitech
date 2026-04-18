<template>
  <view class="page home">
    <HomeHeader
      :address="currentAddress"
      :weather="weatherText"
      :placeholder="searchPlaceholder"
      @location="showLocationModal"
      @search="goSearch"
      @weather="showWeatherModal"
    />
    <CategoryGrid :categories="categories" @category-tap="goCategory" />
    <FeaturedSection
      :products="featuredProducts"
      @product-tap="goProductDetail"
      @more="goFeatured"
    />
    <view class="shop-list">
      <HomeShopCard
        v-for="shop in shops"
        :key="shop.id"
        :shop="shop"
        @shop-tap="goShopDetail"
      />
    </view>

    <LocationModal
      :show="showLocationModalFlag"
      @close="closeLocationModal"
      @relocated="onLocationRelocated"
    />
    <WeatherModal
      :show="showWeatherModalFlag"
      :weather="weather"
      :address="currentAddress"
      @close="closeWeatherModal"
    />
  </view>
</template>

<script>
import HomeHeader from '@/components/HomeHeader.vue'
import CategoryGrid from '@/components/CategoryGrid.vue'
import FeaturedSection from '@/components/FeaturedSection.vue'
import HomeShopCard from '@/components/HomeShopCard.vue'
import LocationModal from '@/components/LocationModal.vue'
import WeatherModal from '@/components/WeatherModal.vue'
import { fetchWeather, fetchHomeFeed } from '@/shared-ui/api.js'
import { getCurrentLocation } from '@/shared-ui/location.js'
import {
  normalizeFeaturedProductProjection,
  normalizeShopProjection,
} from '@/shared-ui/platform-schema.js'
import { buildHomeCategories } from '@/shared-ui/home-categories.js'
import { buildHomeCategoriesForClient, loadPlatformRuntimeSettings } from '@/shared-ui/platform-runtime.js'
import { createHomeIndexPage } from '../../../packages/mobile-core/src/home-index.js'

export default createHomeIndexPage({
  HomeHeader,
  CategoryGrid,
  FeaturedSection,
  HomeShopCard,
  LocationModal,
  WeatherModal,
  fetchWeather,
  fetchHomeFeed,
  getCurrentLocation,
  normalizeFeaturedProductProjection,
  normalizeShopProjection,
  buildHomeCategories,
  buildHomeCategoriesForClient,
  loadPlatformRuntimeSettings,
})
</script>

<style scoped lang="scss">
.page.home {
  min-height: 100vh;
  background: #f5f6f7;
  padding-bottom: env(safe-area-inset-bottom);
}

.shop-list {
  padding: 12px;
}
</style>
