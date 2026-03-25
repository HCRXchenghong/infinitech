<template>
  <view class="page category-page">
    <PageHeader title="甜点饮品" :showSearch="true" @search="goSearch" />
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
import PageHeader from '@/components/PageHeader.vue'
import FilterBar from '@/components/FilterBar.vue'
import ShopCard from '@/components/ShopCard.vue'
import EmptyState from '@/components/EmptyState.vue'
import { fetchShops } from '@/shared-ui/api.js'

export default {
  components: {
    PageHeader,
    FilterBar,
    ShopCard,
    EmptyState
  },
  data() {
    return {
      allShops: [],
      activeFilter: 'default',
      filters: [
        { key: 'default', label: '综合排序' },
        { key: 'sales', label: '销量最高', sortable: true },
        { key: 'rating', label: '评分最高', sortable: true },
        { key: 'distance', label: '距离最近', sortable: true }
      ],
      loading: false
    }
  },
  onLoad() {
    this.loadShops()
  },
  computed: {
    filteredShops() {
      let shops = [...this.allShops]
      shops = shops.filter(shop => this.matchCategory(shop))
      switch (this.activeFilter) {
        case 'sales':
          shops.sort((a, b) => b.monthlySales - a.monthlySales)
          break
        case 'rating':
          shops.sort((a, b) => b.rating - a.rating)
          break
        case 'distance':
          shops.sort((a, b) => {
            const distA = parseFloat(a.distance)
            const distB = parseFloat(b.distance)
            return distA - distB
          })
          break
      }
      return shops
    }
  },
  methods: {
    matchCategory(shop) {
      const tags = Array.isArray(shop.tags) ? shop.tags : []
      const category = shop.businessCategory || shop.category || ''
      if (category.includes('甜点') || category.includes('饮品') || category.includes('甜点饮品')) {
        return true
      }
      return tags.some(tag => tag.includes('甜点') || tag.includes('饮品') || '甜点饮品'.includes(tag))
    },
    async loadShops() {
      if (this.loading) return
      this.loading = true
      try {
        const data = await fetchShops()
        if (Array.isArray(data)) {
          this.allShops = data
        } else {
          this.allShops = []
        }
      } catch (err) {
        console.error('加载商家列表失败:', err)
        this.allShops = []
      } finally {
        this.loading = false
      }
    },
    goSearch() {
      uni.navigateTo({ url: '/pages/search/index/index' })
    },
    setFilter(key) {
      this.activeFilter = key
    },
    goShopDetail(id) {
      uni.navigateTo({ url: '/pages/shop/detail/index?id=' + id })
    }
  }
}
</script>

<style scoped lang="scss">
.category-page {
  min-height: 100vh;
  background: #f5f7fa;
}

.shop-list {
  margin-top: 0;
  padding-top: calc(env(safe-area-inset-top, 0px) + 60px);
  padding-left: 12px;
  padding-right: 12px;
  padding-bottom: 12px;
  min-height: 100vh;
  box-sizing: border-box;
}
</style>
