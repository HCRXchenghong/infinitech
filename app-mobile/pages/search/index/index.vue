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
              :key="'history-' + index"
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
              :key="'hot-' + index"
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
import { createSearchPage } from '../../../../packages/mobile-core/src/search-page.js'

export default createSearchPage({
  fetchShops
})
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
