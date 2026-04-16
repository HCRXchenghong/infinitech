<template>
  <view class="page favorites-page">
    <view class="summary-card">
      <text class="summary-title">我的收藏</text>
      <text class="summary-value">{{ total }} 家店铺</text>
    </view>

    <scroll-view scroll-y class="list-scroll" @scrolltolower="loadMore">
      <view v-if="loading && !items.length" class="state-wrap">
        <text class="state-text">加载中...</text>
      </view>

      <view v-else-if="!items.length" class="state-wrap">
        <text class="state-title">还没有收藏店铺</text>
        <text class="state-text">去首页逛逛，把喜欢的店收藏起来吧</text>
      </view>

      <view v-else class="shop-list">
        <view
          v-for="item in items"
          :key="item.favKey"
          class="shop-card"
        >
          <view class="shop-main" @tap="goShop(item.id)">
            <image
              class="shop-logo"
              :src="item.logo || item.coverImage || '/static/images/default-shop.svg'"
              mode="aspectFill"
            />
            <view class="shop-info">
              <text class="shop-name">{{ item.name || '未知商家' }}</text>
              <view class="meta-row">
                <text class="rating">★ {{ formatRating(item.rating) }}</text>
                <text class="meta-text">月售 {{ item.monthlySales || 0 }}</text>
              </view>
              <view class="meta-row">
                <text class="meta-text">起送 ¥{{ formatMoney(item.minPrice) }}</text>
                <text class="meta-text">配送 ¥{{ formatMoney(item.deliveryPrice) }}</text>
              </view>
            </view>
          </view>

          <view class="actions-row">
            <button class="ghost-btn" size="mini" @tap.stop="removeFavorite(item)">取消收藏</button>
            <button class="primary-btn" size="mini" @tap.stop="goShop(item.id)">去逛逛</button>
          </view>
        </view>

        <view class="footer-tip">
          <text v-if="loadingMore">加载中...</text>
          <text v-else-if="finished">没有更多了</text>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script>
import { fetchUserFavorites, deleteUserFavorite } from '@/shared-ui/api.js'
import { createProfileFavoritesPage } from '../../../../shared/mobile-common/profile-favorites-page.js'

export default createProfileFavoritesPage({
  deleteUserFavorite,
  fetchUserFavorites
})
</script>

<style scoped lang="scss">
.favorites-page {
  min-height: 100vh;
  background: #f5f7fa;
  padding: 16px;
  box-sizing: border-box;
}

.summary-card {
  background: linear-gradient(135deg, #ffd76f, #ffb84d);
  border-radius: 14px;
  padding: 16px;
  margin-bottom: 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.summary-title {
  font-size: 16px;
  font-weight: 700;
  color: #6a4300;
}

.summary-value {
  font-size: 14px;
  color: #6a4300;
  font-weight: 600;
}

.list-scroll {
  height: calc(100vh - 140px);
}

.shop-list {
  padding-bottom: 24px;
}

.shop-card {
  background: #fff;
  border-radius: 14px;
  padding: 14px;
  margin-bottom: 12px;
  box-shadow: 0 2px 10px rgba(15, 23, 42, 0.04);
}

.shop-main {
  display: flex;
  align-items: center;
}

.shop-logo {
  width: 62px;
  height: 62px;
  border-radius: 12px;
  border: 1px solid #f0f2f5;
  flex-shrink: 0;
}

.shop-info {
  margin-left: 12px;
  flex: 1;
  min-width: 0;
}

.shop-name {
  display: block;
  font-size: 16px;
  font-weight: 700;
  color: #111827;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.meta-row {
  margin-top: 6px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.rating {
  font-size: 12px;
  color: #f59e0b;
  font-weight: 600;
}

.meta-text {
  font-size: 12px;
  color: #6b7280;
}

.actions-row {
  margin-top: 12px;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.ghost-btn,
.primary-btn {
  line-height: 28px;
  height: 28px;
  border-radius: 16px;
  padding: 0 12px;
  font-size: 12px;
}

.ghost-btn {
  color: #6b7280;
  background: #f3f4f6;
}

.primary-btn {
  color: #fff;
  background: #0095ff;
}

.state-wrap {
  margin-top: 80px;
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.state-title {
  font-size: 16px;
  font-weight: 600;
  color: #111827;
}

.state-text {
  font-size: 13px;
  color: #9ca3af;
}

.footer-tip {
  text-align: center;
  font-size: 12px;
  color: #9ca3af;
  padding: 8px 0;
}
</style>
