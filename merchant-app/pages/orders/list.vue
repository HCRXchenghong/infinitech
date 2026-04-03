<template>
  <view class="page">
    <view class="header">
      <view class="shop-area">
        <text class="shop-name">{{ currentShop?.name || '未绑定店铺' }}</text>
        <text class="shop-hint">店铺切换请前往「店铺」页</text>
      </view>
      <input
        v-model="keyword"
        class="search"
        placeholder="搜索订单号/手机号"
        @confirm="handleSearch"
      />
    </view>

    <view class="tabs">
      <view
        v-for="tab in tabs"
        :key="tab.key"
        class="tab"
        :class="{ active: activeTab === tab.key }"
        @tap="activeTab = tab.key"
      >
        {{ tab.label }}
      </view>
    </view>

    <scroll-view scroll-y class="list" refresher-enabled :refresher-triggered="refreshing" @refresherrefresh="refreshAll">
      <view v-if="filteredOrders.length === 0" class="empty">暂无订单</view>

      <view v-for="item in filteredOrders" :key="item.id" class="card" @tap="openDetail(item.id)">
        <view class="card-top">
          <text class="order-no">#{{ item.daily_order_id || item.id }}</text>
          <text class="status" :class="`status-${item.status}`">{{ orderStatusText(item.status, item.bizType || item.biz_type) }}</text>
        </view>

        <text class="line">业务：{{ isGroupbuy(item) ? '团购到店核销' : '外卖配送' }}</text>
        <text class="line">顾客：{{ item.customer_phone || item.customer_name || '-' }}</text>
        <text class="line ellipsis">商品：{{ item.food_request || item.items || '-' }}</text>
        <text class="line">支付：{{ paymentStatusText(item.payment_status) }}</text>

        <view class="card-bottom">
          <text class="time">{{ formatTime(item.created_at) }}</text>
          <text class="amount">¥{{ Number(item.total_price || 0).toFixed(2) }}</text>
        </view>

        <view class="actions" @tap.stop>
          <button
            class="btn chat"
            @tap="openUserChat(item)"
          >
            联系用户
          </button>

          <button
            v-if="!isGroupbuy(item)"
            class="btn chat rider"
            @tap="openRiderChat(item)"
          >
            联系骑手
          </button>

          <button
            v-if="!isGroupbuy(item) && item.status === 'pending'"
            class="btn primary"
            :disabled="item.payment_status !== 'paid' || actionLoading[item.id]"
            @tap="handleDispatch(item)"
          >
            {{ item.payment_status === 'paid' ? '接单并派骑手' : '待支付' }}
          </button>

          <button
            v-if="!isGroupbuy(item) && item.status === 'accepted'"
            class="btn success"
            :disabled="actionLoading[item.id]"
            @tap="handlePickup(item)"
          >
            出餐完成（骑手取货）
          </button>

          <button
            v-if="!isGroupbuy(item) && item.status === 'delivering'"
            class="btn ghost"
            :disabled="actionLoading[item.id]"
            @tap="handleDeliver(item)"
          >
            标记已送达
          </button>
          <button
            v-if="isGroupbuy(item) && item.status === 'paid_unused'"
            class="btn primary"
            :disabled="actionLoading[item.id]"
            @tap="handleRedeem(item)"
          >
            扫码核销
          </button>
          <button
            v-if="isGroupbuy(item) && item.status === 'redeemed'"
            class="btn warning"
            :disabled="actionLoading[item.id]"
            @tap="handleGroupbuyRefund(item)"
          >
            发起退款
          </button>
        </view>
      </view>

      <view class="bottom-space" />
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import {
  createMerchantGroupbuyRefund,
  deliverOrder,
  dispatchOrder,
  fetchOrders,
  pickupOrder,
  redeemGroupbuyVoucherByScan
} from '@/shared-ui/api'
import { ensureMerchantShops, getCurrentShopId, orderStatusText, paymentStatusText } from '@/shared-ui/merchantContext'

const refreshing = ref(false)
const keyword = ref('')
const activeTab = ref('all')
const shops = ref<any[]>([])
const currentShop = ref<any>(null)
const orders = ref<any[]>([])
const actionLoading = ref<Record<string, boolean>>({})

const tabs = computed(() => [
  { key: 'all', label: '全部' },
  { key: 'pending', label: `待接单(${countByStatus('pending')})` },
  { key: 'accepted', label: `待出餐(${countByStatus('accepted')})` },
  { key: 'delivering', label: `配送中(${countByStatus('delivering')})` },
  { key: 'paid_unused', label: `待核销(${countByStatus('paid_unused')})` },
  { key: 'redeemed', label: `已核销(${countByStatus('redeemed')})` },
  { key: 'completed', label: `已完成(${countByStatus('completed')})` },
])

const filteredOrders = computed(() => {
  return orders.value.filter((item: any) => {
    const matchStatus = activeTab.value === 'all' || item.status === activeTab.value
    return matchStatus
  })
})

function countByStatus(status: string) {
  return orders.value.filter((item: any) => item.status === status).length
}

function resolveBizType(item: any): string {
  const raw = String(item?.bizType || item?.biz_type || '').trim().toLowerCase()
  if (raw === 'groupbuy') return 'groupbuy'
  return 'takeout'
}

function isGroupbuy(item: any) {
  return resolveBizType(item) === 'groupbuy'
}

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

async function loadOrders(force = false) {
  const ctx = await ensureMerchantShops(force)
  shops.value = ctx.shops || []

  const currentShopId = getCurrentShopId()
  currentShop.value = shops.value.find((shop: any) => String(shop.id) === String(currentShopId)) || ctx.currentShop || null

  if (!currentShop.value) {
    orders.value = []
    return
  }

  const shopId = String(currentShop.value.id)
  const searchText = String(keyword.value || '').trim()
  const res: any = await fetchOrders({ page: 1, limit: 500, search: searchText })
  const source = Array.isArray(res?.orders) ? res.orders : []
  orders.value = source
    .map((item: any) => ({
      ...item,
      bizType: resolveBizType(item)
    }))
    .filter((item: any) => String(item.shop_id || item.shopId) === shopId)
    .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
}

async function handleSearch() {
  try {
    await loadOrders()
  } catch (err: any) {
    uni.showToast({ title: err?.error || err?.message || '搜索失败', icon: 'none' })
  }
}

async function refreshAll() {
  refreshing.value = true
  try {
    await loadOrders(true)
  } catch (err: any) {
    uni.showToast({ title: err?.error || err?.message || '刷新失败', icon: 'none' })
  } finally {
    refreshing.value = false
  }
}

async function handleDispatch(order: any) {
  const id = String(order.id)
  actionLoading.value = { ...actionLoading.value, [id]: true }
  try {
    await dispatchOrder(id)
    uni.showToast({ title: '接单成功，已派骑手', icon: 'success' })
    await loadOrders()
  } catch (err: any) {
    uni.showToast({ title: err?.error || err?.message || '接单失败', icon: 'none' })
  } finally {
    actionLoading.value = { ...actionLoading.value, [id]: false }
  }
}

async function handlePickup(order: any) {
  const id = String(order.id)
  actionLoading.value = { ...actionLoading.value, [id]: true }
  try {
    await pickupOrder(id)
    uni.showToast({ title: '已通知骑手取货', icon: 'success' })
    await loadOrders()
  } catch (err: any) {
    uni.showToast({ title: err?.error || err?.message || '操作失败', icon: 'none' })
  } finally {
    actionLoading.value = { ...actionLoading.value, [id]: false }
  }
}

async function handleDeliver(order: any) {
  const id = String(order.id)
  actionLoading.value = { ...actionLoading.value, [id]: true }
  try {
    await deliverOrder(id)
    uni.showToast({ title: '订单已完成', icon: 'success' })
    await loadOrders()
  } catch (err: any) {
    uni.showToast({ title: err?.error || err?.message || '操作失败', icon: 'none' })
  } finally {
    actionLoading.value = { ...actionLoading.value, [id]: false }
  }
}

function promptRedeemCode(): Promise<string> {
  return new Promise((resolve) => {
    uni.showModal({
      title: '手动输入券码',
      content: '无法扫码时可粘贴二维码内容',
      editable: true,
      placeholderText: '请输入券码或二维码内容',
      success: (modalRes: any) => {
        if (!modalRes?.confirm) {
          resolve('')
          return
        }
        resolve(String(modalRes.content || '').trim())
      },
      fail: () => resolve('')
    })
  })
}

function scanRedeemCode(): Promise<string> {
  return new Promise((resolve) => {
    if (typeof uni.scanCode !== 'function') {
      resolve('')
      return
    }
    uni.scanCode({
      onlyFromCamera: true,
      scanType: ['qrCode', 'barCode'],
      success: (res: any) => resolve(String(res?.result || '').trim()),
      fail: () => resolve('')
    })
  })
}

async function handleRedeem(order: any) {
  const id = String(order.id)
  actionLoading.value = { ...actionLoading.value, [id]: true }
  try {
    let qrCode = await scanRedeemCode()
    if (!qrCode) {
      qrCode = await promptRedeemCode()
    }
    if (!qrCode) {
      uni.showToast({ title: '未获取到扫码内容', icon: 'none' })
      return
    }
    await redeemGroupbuyVoucherByScan({
      qrCode,
      deviceId: 'merchant-app',
      idempotencyKey: `redeem_${id}_${Date.now()}`
    })
    uni.showToast({ title: '核销成功', icon: 'success' })
    await loadOrders()
  } catch (err: any) {
    uni.showToast({ title: err?.error || err?.message || '核销失败', icon: 'none' })
  } finally {
    actionLoading.value = { ...actionLoading.value, [id]: false }
  }
}

async function handleGroupbuyRefund(order: any) {
  const id = String(order.id)
  uni.showModal({
    title: '发起已核销退款',
    content: '将创建一条商户退款申请，确认继续？',
    success: async (modalRes: any) => {
      if (!modalRes.confirm) return
      actionLoading.value = { ...actionLoading.value, [id]: true }
      try {
        await createMerchantGroupbuyRefund({
          orderId: id,
          refundReason: '商户发起已核销退款',
          requestedRefundAmount: Math.round(Number(order.total_price || order.totalPrice || 0) * 100)
        })
        uni.showToast({ title: '退款申请已提交', icon: 'success' })
        await loadOrders()
      } catch (err: any) {
        uni.showToast({ title: err?.error || err?.message || '提交失败', icon: 'none' })
      } finally {
        actionLoading.value = { ...actionLoading.value, [id]: false }
      }
    }
  })
}

function openDetail(id: string | number) {
  uni.navigateTo({ url: `/pages/orders/detail?id=${id}` })
}

function safeEncode(value: any) {
  return encodeURIComponent(String(value || ''))
}

function resolveOrderId(order: any) {
  const value = order?.id || order?.daily_order_id
  return value === undefined || value === null ? '' : String(value)
}

function openUserChat(order: any) {
  const orderId = resolveOrderId(order)
  if (!orderId) {
    uni.showToast({ title: '订单信息异常', icon: 'none' })
    return
  }
  const name = order?.customer_name || order?.customer_phone || '用户会话'
  const targetId = order?.customer_id || order?.customer_phone || ''
  uni.navigateTo({
    url: `/pages/messages/chat?chatId=${safeEncode(`shop_${orderId}`)}&role=user&name=${safeEncode(name)}&targetId=${safeEncode(targetId)}&orderId=${safeEncode(orderId)}`
  })
}

function openRiderChat(order: any) {
  const orderId = resolveOrderId(order)
  if (!orderId) {
    uni.showToast({ title: '订单信息异常', icon: 'none' })
    return
  }
  const name = order?.rider_name || '骑手会话'
  const targetId = order?.rider_id || order?.rider_phone || ''
  uni.navigateTo({
    url: `/pages/messages/chat?chatId=${safeEncode(`rs_${orderId}`)}&role=rider&name=${safeEncode(name)}&targetId=${safeEncode(targetId)}&orderId=${safeEncode(orderId)}`
  })
}

onShow(async () => {
  try {
    await loadOrders()
  } catch (err: any) {
    uni.showToast({ title: err?.error || err?.message || '加载失败', icon: 'none' })
  }
})

function handleRealtimeOrdersRefresh() {
  void loadOrders().catch(() => {})
}

onMounted(() => {
  uni.$off('realtime:refresh:orders', handleRealtimeOrdersRefresh)
  uni.$off('realtime:refresh:after_sales', handleRealtimeOrdersRefresh)
  uni.$on('realtime:refresh:orders', handleRealtimeOrdersRefresh)
  uni.$on('realtime:refresh:after_sales', handleRealtimeOrdersRefresh)
})

onUnmounted(() => {
  uni.$off('realtime:refresh:orders', handleRealtimeOrdersRefresh)
  uni.$off('realtime:refresh:after_sales', handleRealtimeOrdersRefresh)
})
</script>

<style scoped lang="scss" src="./list.scss"></style>
