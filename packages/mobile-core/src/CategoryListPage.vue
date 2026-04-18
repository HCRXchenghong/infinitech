<template>
  <view class="page category-page">
    <PageHeader :title="pageTitle" :showSearch="true" @search="goSearch" />
    <FilterBar :filters="filters" :activeFilter="activeFilter" @change="setFilter" />
    <scroll-view scroll-y class="shop-list">
      <ShopCard
        v-for="shop in filteredShops"
        :key="shop.id"
        :shop="shop"
        @shop-tap="goShopDetail"
      />
      <EmptyState
        v-if="filteredShops.length === 0"
        icon="📭"
        text="暂无商家"
        desc="换个分类试试吧"
      />
    </scroll-view>
  </view>
</template>

<script>
import { fetchShops } from "@/shared-ui/api.js";
import EmptyState from "./EmptyState.vue";
import FilterBar from "./FilterBar.vue";
import PageHeader from "./PageHeader.vue";
import ShopCard from "./ShopCard.vue";
import { createCategoryPage } from "./category-pages.js";

export default createCategoryPage({
  fetchShops,
  components: {
    EmptyState,
    FilterBar,
    PageHeader,
    ShopCard,
  },
  resolveCategoryConfig(_query, instance) {
    return instance?.$options?.categoryPageConfig || {};
  },
});
</script>

<style scoped lang="scss" src="./category-page.scss"></style>
