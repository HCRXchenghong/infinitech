<template>
  <view class="page search-page">
    <view class="search-header">
      <view class="search-box">
        <image
          class="search-icon"
          src="data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%239ca3af%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Ccircle%20cx%3D%2211%22%20cy%3D%2211%22%20r%3D%228%22%2F%3E%3Cpath%20d%3D%22m21%2021-4.3-4.3%22%2F%3E%3C%2Fsvg%3E"
          mode="aspectFit"
        />
        <input
          v-model="keyword"
          class="search-input"
          placeholder="搜索商家、分类、标签"
          :focus="true"
          confirm-type="search"
          @input="onInput"
          @confirm="doSearch"
        />
        <text v-if="keyword" class="clear-btn" @tap="clearKeyword">×</text>
      </view>
      <text class="cancel-btn" @tap="cancel">取消</text>
    </view>

    <scroll-view class="page-body" scroll-y>
      <view v-if="!keyword && !searchResults.length" class="panel">
        <view v-if="searchHistory.length" class="section">
          <view class="section-header">
            <text class="section-title">搜索历史</text>
            <text class="section-action" @tap="clearHistory">清空</text>
          </view>
          <view class="tag-list">
            <view
              v-for="(item, index) in searchHistory"
              :key="item"
              class="tag-item"
              @tap="searchByHistory(item)"
            >
              <text>{{ item }}</text>
            </view>
          </view>
        </view>

        <view class="section">
          <view class="section-header">
            <text class="section-title">热门搜索</text>
          </view>
          <view class="tag-list">
            <view
              v-for="(item, index) in hotKeywords"
              :key="item"
              class="tag-item"
              :class="{ 'tag-item-hot': index < 3 }"
              @tap="searchByHistory(item)"
            >
              <text>{{ item }}</text>
            </view>
          </view>
        </view>
      </view>

      <view v-else-if="searchResults.length" class="panel result-list">
        <view
          v-for="item in searchResults"
          :key="item.id"
          class="result-item"
          @tap="goShopDetail(item.id)"
        >
          <view class="result-logo">
            <text>{{ getShopInitial(item.name) }}</text>
          </view>
          <view class="result-info">
            <text class="result-name">{{ item.name || '未命名商家' }}</text>
            <view class="result-meta">
              <text>{{ formatRating(item.rating) }}</text>
              <text>{{ formatSales(item.monthlySales) }}</text>
              <text>{{ formatDistance(item.distance) }}</text>
            </view>
            <view v-if="normalizeTags(item).length" class="result-tags">
              <text
                v-for="tag in normalizeTags(item)"
                :key="tag"
                class="result-tag"
              >
                {{ tag }}
              </text>
            </view>
          </view>
        </view>
      </view>

      <view v-else-if="searching" class="state-block">
        <text class="state-title">搜索中...</text>
      </view>

      <view v-else class="state-block">
        <text class="state-title">暂无搜索结果</text>
        <text class="state-tip">换个关键词再试一次</text>
      </view>
    </scroll-view>
  </view>
</template>

<script>
import { fetchShops } from '@/shared-ui/api.js'

const HISTORY_KEY = 'searchHistory'
const HOT_KEYWORDS = ['奶茶', '汉堡', '火锅', '咖啡', '烧烤', '水果', '便利店', '药店']

function normalizeShopList(response) {
  if (Array.isArray(response)) {
    return response
  }
  if (response && Array.isArray(response.data)) {
    return response.data
  }
  if (response && Array.isArray(response.shops)) {
    return response.shops
  }
  return []
}

export default {
  data() {
    return {
      keyword: '',
      searchHistory: [],
      hotKeywords: HOT_KEYWORDS,
      searchResults: [],
      searching: false,
      allShops: []
    }
  },

  onLoad() {
    const history = uni.getStorageSync(HISTORY_KEY)
    if (Array.isArray(history)) {
      this.searchHistory = history.filter(Boolean).slice(0, 10)
    }
    this.loadShops()
  },

  methods: {
    async loadShops() {
      try {
        const response = await fetchShops()
        this.allShops = normalizeShopList(response)
        if (this.keyword.trim()) {
          this.doSearch()
        }
      } catch (error) {
        console.error('加载商家列表失败:', error)
        this.allShops = []
      }
    },

    onInput(event) {
      const detail = event && typeof event === 'object' ? event.detail : null
      this.keyword = (detail && detail.value) || ''
      if (this.keyword.trim()) {
        this.doSearch()
      } else {
        this.searchResults = []
        this.searching = false
      }
    },

    doSearch() {
      const keyword = this.keyword.trim()
      if (!keyword) {
        this.searchResults = []
        this.searching = false
        return
      }

      const needle = keyword.toLowerCase()
      this.searching = true
      this.searchResults = this.allShops.filter((shop) => {
        const safeShop = shop && typeof shop === 'object' ? shop : {}
        const tags = this.normalizeTags(shop).join(' ')
        const source = [
          safeShop.name || '',
          safeShop.category || '',
          safeShop.description || '',
          tags
        ].join(' ').toLowerCase()
        return source.includes(needle)
      })
      this.searching = false
      this.persistHistory(keyword)
    },

    persistHistory(keyword) {
      if (!keyword) return
      const nextHistory = [keyword, ...this.searchHistory.filter((item) => item !== keyword)].slice(0, 10)
      this.searchHistory = nextHistory
      uni.setStorageSync(HISTORY_KEY, nextHistory)
    },

    clearKeyword() {
      this.keyword = ''
      this.searchResults = []
      this.searching = false
    },

    cancel() {
      uni.navigateBack()
    },

    clearHistory() {
      this.searchHistory = []
      uni.removeStorageSync(HISTORY_KEY)
    },

    searchByHistory(keyword) {
      this.keyword = keyword
      this.doSearch()
    },

    goShopDetail(id) {
      if (!id) {
        uni.showToast({ title: '商家信息异常', icon: 'none' })
        return
      }
      uni.navigateTo({ url: `/pages/shop/detail/index?id=${id}` })
    },

    normalizeTags(shop) {
      const safeShop = shop && typeof shop === 'object' ? shop : {}
      if (Array.isArray(safeShop.tags)) {
        return safeShop.tags.filter(Boolean).slice(0, 3)
      }
      if (typeof safeShop.tags === 'string' && safeShop.tags.trim()) {
        return safeShop.tags.split(/[、，,]/).map((item) => item.trim()).filter(Boolean).slice(0, 3)
      }
      return []
    },

    getShopInitial(name) {
      const text = String(name || '').trim()
      if (!text) return '店铺'
      return text.slice(0, 2)
    },

    formatRating(value) {
      const rating = Number(value)
      if (!Number.isFinite(rating) || rating <= 0) {
        return '暂无评分'
      }
      return `评分 ${rating.toFixed(1)}`
    },

    formatSales(value) {
      const sales = Number(value)
      if (!Number.isFinite(sales) || sales < 0) {
        return '暂无销量'
      }
      return `月售 ${sales}`
    },

    formatDistance(value) {
      const text = String(value || '').trim()
      return text || '距离未知'
    }
  }
}
</script>

<style scoped lang="scss">
.search-page {
  min-height: 100vh;
  background: #f3f6fb;
}

.search-header {
  position: sticky;
  top: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: calc(var(--status-bar-height, 0px) + 20px) 16px 12px;
  padding-top: calc(env(safe-area-inset-top, 0px) + 20px);
  padding-top: calc(constant(safe-area-inset-top, 0px) + 20px);
  background: linear-gradient(135deg, #0f9dff 0%, #39c5ff 100%);
}

.search-box {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  height: 40px;
  padding: 0 12px;
  border-radius: 22px;
  background: #fff;
}

.search-icon {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}

.search-input {
  flex: 1;
  font-size: 14px;
  color: #1f2937;
}

.clear-btn,
.cancel-btn {
  font-size: 14px;
  color: #fff;
}

.clear-btn {
  color: #9ca3af;
  font-size: 20px;
  line-height: 1;
}

.page-body {
  height: calc(100vh - 92px - var(--status-bar-height, 0px));
}

.panel,
.state-block {
  padding: 16px;
}

.section {
  margin-bottom: 20px;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #111827;
}

.section-action {
  font-size: 13px;
  color: #6b7280;
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.tag-item {
  padding: 8px 14px;
  border-radius: 999px;
  background: #fff;
  color: #374151;
  font-size: 13px;
}

.tag-item-hot {
  background: rgba(15, 157, 255, 0.12);
  color: #0f9dff;
}

.result-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.result-item {
  display: flex;
  gap: 12px;
  padding: 14px;
  border-radius: 18px;
  background: #fff;
}

.result-logo {
  width: 52px;
  height: 52px;
  border-radius: 16px;
  background: linear-gradient(135deg, #ffb86c 0%, #ff7a59 100%);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: 600;
  flex-shrink: 0;
}

.result-info {
  flex: 1;
  min-width: 0;
}

.result-name {
  font-size: 15px;
  font-weight: 600;
  color: #111827;
}

.result-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 6px;
  font-size: 12px;
  color: #6b7280;
}

.result-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}

.result-tag {
  padding: 4px 8px;
  border-radius: 999px;
  background: #eff6ff;
  color: #2563eb;
  font-size: 11px;
}

.state-block {
  padding-top: 80px;
  text-align: center;
  color: #6b7280;
}

.state-title {
  display: block;
  font-size: 15px;
  color: #111827;
}

.state-tip {
  display: block;
  margin-top: 8px;
  font-size: 13px;
}
</style>
