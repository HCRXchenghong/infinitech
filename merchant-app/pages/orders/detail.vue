<template>
  <view class="page">
    <scroll-view scroll-y class="content">
      <view class="card top-card">
        <view class="row between">
          <text class="order-no">#{{ detail?.daily_order_id || detail?.id || '--' }}</text>
          <text class="status" :class="`status-${detail?.status || ''}`">{{ orderStatusText(detail?.status || '', detail?.bizType || detail?.biz_type) }}</text>
        </view>
        <text class="meta">业务类型：{{ (detail?.bizType || detail?.biz_type) === 'groupbuy' ? '团购到店核销' : '外卖配送' }}</text>
        <text class="meta">支付状态：{{ paymentStatusText(detail?.payment_status || '') }}</text>
        <text class="meta">创建时间：{{ formatDate(detail?.created_at) }}</text>
      </view>

      <view class="card">
        <text class="title">顾客信息</text>
        <text class="line">姓名：{{ detail?.customer_name || '未填写' }}</text>
        <text class="line">电话：{{ detail?.customer_phone || '未填写' }}</text>
        <text class="line">地址：{{ detail?.address || '未填写' }}</text>
      </view>

      <view class="card action-card">
        <text class="title">在线沟通</text>
        <view class="action-row">
          <button class="chat-btn user" @tap="openUserChat">联系用户</button>
          <button v-if="isTakeoutOrder" class="chat-btn rider" @tap="openRiderChat">联系骑手</button>
          <button class="chat-btn support" @tap="openSupportChat">{{ supportTitle }}</button>
        </view>
      </view>

      <view class="card">
        <text class="title">商品信息</text>
        <view v-if="items.length === 0" class="line">无商品明细</view>
        <view v-for="(item, idx) in items" :key="idx" class="item-row">
          <text class="item-name">{{ item.name }}</text>
          <text class="item-qty">x{{ item.qty }}</text>
        </view>
        <text class="amount">合计：¥{{ Number(detail?.total_price || 0).toFixed(2) }}</text>
      </view>

      <view class="card" v-if="(detail?.bizType || detail?.biz_type) !== 'groupbuy'">
        <text class="title">配送信息</text>
        <text class="line">骑手：{{ detail?.rider_name || '-' }}</text>
        <text class="line">骑手电话：{{ detail?.rider_phone || '-' }}</text>
        <text class="line">接单时间：{{ formatDate(detail?.accepted_at) }}</text>
        <text class="line">完成时间：{{ formatDate(detail?.completed_at) }}</text>
      </view>

      <view class="card" v-else>
        <text class="title">核销信息</text>
        <text class="line">核销状态：{{ orderStatusText(detail?.status || '', 'groupbuy') }}</text>
        <text class="line">核销时间：{{ formatDate(detail?.updated_at) }}</text>
        <text class="line">说明：团购订单仅支持到店验券，不参与骑手配送。</text>
      </view>

      <view class="bottom-space" />
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { fetchOrderDetail } from '@/shared-ui/api'
import { getCachedSupportRuntimeSettings, loadSupportRuntimeSettings } from '@/shared-ui/support-runtime'
import { getMerchantId, orderStatusText, parseOrderItems, paymentStatusText } from '@/shared-ui/merchantContext'

const detail = ref<any>(null)
const supportTitle = ref(getCachedSupportRuntimeSettings().title)

const items = computed(() => {
  const text = detail.value?.food_request || detail.value?.items || ''
  return parseOrderItems(text)
})

const isTakeoutOrder = computed(() => String(detail.value?.bizType || detail.value?.biz_type || '').toLowerCase() !== 'groupbuy')

function safeEncode(value: any) {
  return encodeURIComponent(String(value || ''))
}

function resolveOrderId() {
  const value = detail.value?.id || detail.value?.daily_order_id
  return value === undefined || value === null ? '' : String(value)
}

function openUserChat() {
  const orderId = resolveOrderId()
  if (!orderId) {
    uni.showToast({ title: '订单信息异常', icon: 'none' })
    return
  }
  const name = detail.value?.customer_name || detail.value?.customer_phone || '用户会话'
  const targetId = detail.value?.customer_id || detail.value?.customer_phone || ''
  uni.navigateTo({
    url: `/pages/messages/chat?chatId=${safeEncode(`shop_${orderId}`)}&role=user&name=${safeEncode(name)}&targetId=${safeEncode(targetId)}&orderId=${safeEncode(orderId)}`
  })
}

function openRiderChat() {
  const orderId = resolveOrderId()
  if (!orderId) {
    uni.showToast({ title: '订单信息异常', icon: 'none' })
    return
  }
  const name = detail.value?.rider_name || '骑手会话'
  const targetId = detail.value?.rider_id || detail.value?.rider_phone || ''
  uni.navigateTo({
    url: `/pages/messages/chat?chatId=${safeEncode(`rs_${orderId}`)}&role=rider&name=${safeEncode(name)}&targetId=${safeEncode(targetId)}&orderId=${safeEncode(orderId)}`
  })
}

function openSupportChat() {
  const profile = uni.getStorageSync('merchantProfile') || {}
  const merchantId = getMerchantId() || String(profile.phone || detail.value?.shop_id || detail.value?.shopId || '')
  if (!merchantId) {
    uni.showToast({ title: '商户身份异常', icon: 'none' })
    return
  }
  uni.navigateTo({
    url: `/pages/messages/chat?chatId=${safeEncode(`merchant_${merchantId}`)}&role=admin&targetId=${safeEncode(merchantId)}`
  })
}

function formatDate(value: any) {
  if (!value) return '--'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day} ${hour}:${minute}`
}

onLoad(async (options: any) => {
  void loadSupportRuntimeSettings().then((supportRuntime) => {
    supportTitle.value = supportRuntime.title
  })

  const id = options?.id
  if (!id) {
    uni.showToast({ title: '缺少订单ID', icon: 'none' })
    return
  }

  try {
    detail.value = await fetchOrderDetail(id)
  } catch (err: any) {
    uni.showToast({ title: err?.error || err?.message || '加载失败', icon: 'none' })
  }
})
</script>

<style lang="scss" scoped>
.page {
  height: 100vh;
  background: #f4f7fb;
}

.content {
  height: 100%;
  padding: 20rpx 24rpx;
  box-sizing: border-box;
}

.card {
  background: #fff;
  border: 1rpx solid #e7eef6;
  border-radius: 18rpx;
  padding: 20rpx;
  margin-bottom: 14rpx;
}

.top-card {
  background: linear-gradient(145deg, #eff7ff, #ffffff);
}

.row {
  display: flex;
  align-items: center;
}

.between {
  justify-content: space-between;
}

.order-no {
  font-size: 34rpx;
  font-weight: 700;
  color: #10304d;
}

.status {
  font-size: 22rpx;
  padding: 6rpx 14rpx;
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

  &.status-paid_unused {
    background: #eff6ff;
    color: #2563eb;
  }

  &.status-redeemed {
    background: #ecfdf5;
    color: #16a34a;
  }

  &.status-refunding {
    background: #fff7ed;
    color: #c2410c;
  }

  &.status-refunded,
  &.status-expired,
  &.status-cancelled {
    background: #f3f4f6;
    color: #6b7280;
  }
}

.meta {
  display: block;
  margin-top: 10rpx;
  font-size: 24rpx;
  color: #5c7591;
}

.title {
  display: block;
  font-size: 28rpx;
  font-weight: 700;
  color: #143351;
  margin-bottom: 8rpx;
}

.line {
  display: block;
  margin-top: 10rpx;
  font-size: 24rpx;
  color: #48617e;
}

.action-card {
  background: linear-gradient(145deg, #f6fbff, #ffffff);
}

.action-row {
  display: flex;
  flex-wrap: wrap;
  gap: 14rpx;
  margin-top: 12rpx;
}

.chat-btn {
  min-width: 180rpx;
  height: 64rpx;
  line-height: 64rpx;
  border-radius: 12rpx;
  border: none;
  font-size: 24rpx;
  padding: 0 18rpx;

  &.user {
    background: #e7f4ff;
    color: #0f5fa6;
  }

  &.rider {
    background: #ecfdf5;
    color: #0f766e;
  }

  &.support {
    background: #fff7ed;
    color: #b45309;
  }
}

.item-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 12rpx;
  font-size: 25rpx;
  color: #2f4966;
}

.item-name {
  flex: 1;
  margin-right: 12rpx;
}

.item-qty {
  color: #6d859f;
}

.amount {
  display: block;
  margin-top: 16rpx;
  font-size: 30rpx;
  font-weight: 700;
  color: #102d49;
}

.bottom-space {
  height: calc(40rpx + env(safe-area-inset-bottom));
}
</style>
