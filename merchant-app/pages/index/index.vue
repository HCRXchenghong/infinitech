<template>
  <view class="page">
    <scroll-view scroll-y class="content" refresher-enabled :refresher-triggered="refreshing" @refresherrefresh="refreshAll">
      <view class="hero">
        <view class="hero-left" @tap="selectShop">
          <text class="shop-name">{{ currentShop?.name || '未绑定店铺' }}</text>
          <text class="shop-meta">{{ currentShop?.businessCategory || '请选择店铺' }} · {{ currentShop?.phone || '--' }}</text>
        </view>

        <view class="hero-right">
          <text class="switch-label">{{ currentShop?.isActive ? '营业中' : '暂停营业' }}</text>
          <switch
            :checked="!!currentShop?.isActive"
            color="#009bf5"
            :disabled="switching || !currentShop"
            @change="toggleBusiness"
          />
        </view>
      </view>

      <view class="chat-entry" @tap="openSupportChat">
        <text class="chat-entry-title">{{ supportTitle }}</text>
        <text class="chat-entry-desc">管理端 Web / App 同步服务中</text>
      </view>

      <view class="stats-grid">
        <view class="stat-card revenue">
          <text class="stat-label">今日营业额</text>
          <text class="stat-value">¥{{ stats.todayRevenue }}</text>
        </view>
        <view class="stat-card">
          <text class="stat-label">待处理订单</text>
          <text class="stat-value">{{ stats.todoCount }}</text>
        </view>
        <view class="stat-card">
          <text class="stat-label">配送中</text>
          <text class="stat-value">{{ stats.deliveringCount }}</text>
        </view>
        <view class="stat-card">
          <text class="stat-label">售后申请</text>
          <text class="stat-value">{{ stats.afterSalesCount }}</text>
        </view>
      </view>

      <view class="panel">
        <view class="panel-head">
          <text class="panel-title">最新订单</text>
          <text class="panel-link" @tap="goTab('/pages/orders/list')">全部订单</text>
        </view>

        <view v-if="recentOrders.length === 0" class="empty">暂无订单数据</view>
        <view v-for="item in recentOrders" :key="item.id" class="order-item" @tap="openOrder(item.id)">
          <view class="order-top">
            <text class="order-no">#{{ item.daily_order_id || item.id }}</text>
            <text class="order-status" :class="`status-${item.status}`">{{ orderStatusText(item.status) }}</text>
          </view>
          <text class="order-desc">{{ item.food_request || item.items || '无商品明细' }}</text>
          <view class="order-bottom">
            <text class="order-time">{{ formatTime(item.created_at) }}</text>
            <text class="order-price">¥{{ Number(item.total_price || 0).toFixed(2) }}</text>
          </view>
        </view>
      </view>

      <view class="page-bottom-space" />
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { fetchAfterSales, fetchOrders, fetchProducts, updateShop } from '@/shared-ui/api'
import { getCachedSupportRuntimeSettings, loadSupportRuntimeSettings } from '@/shared-ui/support-runtime'
import { ensureMerchantShops, formatMoney, getCurrentShopId, getMerchantId, orderStatusText, setCurrentShopId } from '@/shared-ui/merchantContext'

const refreshing = ref(false)
const switching = ref(false)
const supportTitle = ref(getCachedSupportRuntimeSettings().title)

const shops = ref<any[]>([])
const currentShop = ref<any>(null)
const orders = ref<any[]>([])
const afterSalesList = ref<any[]>([])
const products = ref<any[]>([])
const noShopPrompted = ref(false)

const stats = computed(() => {
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const todayRevenue = orders.value
    .filter((o) => o.status === 'completed' && new Date(o.created_at).getTime() >= todayStart.getTime())
    .reduce((sum, o) => sum + Number(o.total_price || 0), 0)

  const todoCount = orders.value.filter((o) => ['pending', 'accepted'].includes(o.status)).length
  const deliveringCount = orders.value.filter((o) => o.status === 'delivering').length
  const afterSalesCount = afterSalesList.value.filter((item) => item.status === 'pending').length

  return {
    todayRevenue: formatMoney(todayRevenue),
    todoCount,
    deliveringCount,
    afterSalesCount,
  }
})

const recentOrders = computed(() => {
  return [...orders.value]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5)
})

function formatTime(timeText: string) {
  if (!timeText) return '--'
  const date = new Date(timeText)
  if (Number.isNaN(date.getTime())) return String(timeText)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')
  return `${month}-${day} ${hour}:${minute}`
}

async function loadData(force = false) {
  const context = await ensureMerchantShops(force)
  shops.value = context.shops || []

  const currentShopId = getCurrentShopId()
  const activeShop = (shops.value || []).find((shop: any) => String(shop.id) === String(currentShopId)) || context.currentShop
  currentShop.value = activeShop || null

  if (!currentShop.value) {
    orders.value = []
    products.value = []
    afterSalesList.value = []
    maybePromptCreateShop()
    return
  }
  noShopPrompted.value = false

  const shopId = String(currentShop.value.id)
  const [orderRes, productRes, afterSalesRes]: any[] = await Promise.all([
    fetchOrders({ page: 1, limit: 200 }),
    fetchProducts({ shopId }),
    fetchAfterSales({ page: 1, limit: 200 }),
  ])

  const allOrders = Array.isArray(orderRes?.orders) ? orderRes.orders : []
  orders.value = allOrders.filter((item: any) => String(item.shop_id || item.shopId) === shopId)

  products.value = Array.isArray(productRes) ? productRes : []

  const allAfterSales = Array.isArray(afterSalesRes?.list) ? afterSalesRes.list : []
  afterSalesList.value = allAfterSales.filter((item: any) => String(item.shopId || item.shop_id) === shopId)
}

async function loadSupportRuntimeConfig() {
  const supportRuntime = await loadSupportRuntimeSettings()
  supportTitle.value = supportRuntime.title
}

async function refreshAll() {
  refreshing.value = true
  try {
    await loadData(true)
  } catch (err: any) {
    uni.showToast({ title: err?.error || err?.message || '刷新失败', icon: 'none' })
  } finally {
    refreshing.value = false
  }
}

async function toggleBusiness(e: any) {
  if (!currentShop.value || switching.value) return
  const target = !!e.detail.value
  switching.value = true
  try {
    await updateShop(currentShop.value.id, { isActive: target })
    currentShop.value = { ...currentShop.value, isActive: target }
    uni.showToast({ title: target ? '已恢复营业' : '已暂停营业', icon: 'success' })
  } catch (err: any) {
    uni.showToast({ title: err?.error || err?.message || '更新失败', icon: 'none' })
  } finally {
    switching.value = false
  }
}

function selectShop() {
  if (!shops.value.length) {
    maybePromptCreateShop()
    return
  }
  uni.showActionSheet({
    itemList: shops.value.map((shop: any) => `${shop.name}`),
    success: async (res: any) => {
      const selected = shops.value[res.tapIndex]
      if (!selected) return
      setCurrentShopId(selected.id)
      await refreshAll()
    },
  })
}

function goTab(url: string) {
  uni.switchTab({ url })
}

function openSupportChat() {
  const profile = uni.getStorageSync('merchantProfile') || {}
  const merchantId = getMerchantId() || String(profile.phone || '')
  if (!merchantId) {
    uni.showToast({ title: '商户身份异常', icon: 'none' })
    return
  }
  uni.navigateTo({
    url: `/pages/messages/chat?chatId=${encodeURIComponent(`merchant_${merchantId}`)}&role=admin&targetId=${encodeURIComponent(String(merchantId))}`
  })
}

function openOrder(id: string | number) {
  uni.navigateTo({ url: `/pages/orders/detail?id=${id}` })
}

function maybePromptCreateShop() {
  if (noShopPrompted.value) return
  noShopPrompted.value = true
  uni.showModal({
    title: '还没有店铺',
    content: '检测到当前账号还没有店铺，是否现在去创建？',
    confirmText: '去创建',
    cancelText: '稍后',
    success: (res: any) => {
      if (!res.confirm) return
      uni.navigateTo({ url: '/pages/store/create' })
    },
  })
}

onShow(async () => {
  try {
    void loadSupportRuntimeConfig()
    await loadData()
  } catch (err: any) {
    uni.showToast({ title: err?.error || err?.message || '加载失败', icon: 'none' })
  }
})
</script>

<style lang="scss" scoped>
.page {
  height: 100vh;
  background: linear-gradient(180deg, #f2f8ff 0%, #f7fbff 40%, #f5f7fa 100%);
  overflow: hidden;
}

.content {
  height: 100%;
  padding: calc(var(--status-bar-height) + 16rpx) 24rpx 24rpx;
  box-sizing: border-box;
}

.hero {
  display: flex;
  justify-content: space-between;
  gap: 18rpx;
  background: linear-gradient(135deg, #009bf5, #0079c8);
  border-radius: 24rpx;
  padding: 28rpx;
  color: #fff;
  box-shadow: 0 14rpx 30rpx rgba(0, 123, 201, 0.28);
}

.chat-entry {
  margin-top: 16rpx;
  background: linear-gradient(145deg, #fff7ed, #ffffff);
  border: 1rpx solid #fde6cc;
  border-radius: 18rpx;
  padding: 18rpx 22rpx;
}

.chat-entry-title {
  display: block;
  font-size: 28rpx;
  color: #9a3412;
  font-weight: 700;
}

.chat-entry-desc {
  display: block;
  margin-top: 6rpx;
  font-size: 22rpx;
  color: #c26018;
}

.hero-left {
  flex: 1;
  min-width: 0;
}

.shop-name {
  display: block;
  font-size: 34rpx;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.shop-meta {
  display: block;
  margin-top: 8rpx;
  font-size: 22rpx;
  opacity: 0.9;
}

.hero-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  justify-content: space-between;
}

.switch-label {
  font-size: 22rpx;
  margin-bottom: 8rpx;
}

.stats-grid {
  margin-top: 20rpx;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 14rpx;
}

.stat-card {
  background: #fff;
  border: 1rpx solid #e5eef8;
  border-radius: 18rpx;
  padding: 20rpx;

  &.revenue {
    background: linear-gradient(150deg, #fff7ec, #fff);
    border-color: #ffe0b8;
  }
}

.stat-label {
  display: block;
  font-size: 22rpx;
  color: #6a819b;
}

.stat-value {
  display: block;
  margin-top: 8rpx;
  font-size: 38rpx;
  font-weight: 700;
  color: #0f2942;
}

.panel {
  margin-top: 20rpx;
  background: #fff;
  border: 1rpx solid #e6eef7;
  border-radius: 20rpx;
  padding: 22rpx;
}

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16rpx;
}

.panel-title {
  font-size: 30rpx;
  font-weight: 700;
  color: #112e4a;
}

.panel-link {
  font-size: 24rpx;
  color: #007ecf;
}

.empty {
  text-align: center;
  font-size: 24rpx;
  color: #8da0b5;
  padding: 32rpx 0;
}

.order-item {
  padding: 16rpx 0;
  border-bottom: 1rpx solid #f1f5f9;

  &:last-child {
    border-bottom: none;
    padding-bottom: 0;
  }
}

.order-top,
.order-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.order-no {
  font-size: 26rpx;
  font-weight: 600;
  color: #12324f;
}

.order-status {
  font-size: 22rpx;
  padding: 4rpx 12rpx;
  border-radius: 999rpx;
  background: #edf2f7;
  color: #4d647d;

  &.status-pending {
    background: #fff1f2;
    color: #dc2626;
  }

  &.status-accepted {
    background: #fff7ed;
    color: #ea580c;
  }

  &.status-delivering {
    background: #eff6ff;
    color: #2563eb;
  }

  &.status-completed {
    background: #ecfdf5;
    color: #16a34a;
  }
}

.order-desc {
  display: block;
  margin: 8rpx 0;
  font-size: 24rpx;
  color: #4a607a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.order-time {
  font-size: 22rpx;
  color: #7a90a8;
}

.order-price {
  font-size: 28rpx;
  font-weight: 700;
  color: #0f2942;
}

.page-bottom-space {
  height: calc(140rpx + env(safe-area-inset-bottom));
}
</style>
