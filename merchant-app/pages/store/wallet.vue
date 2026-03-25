<template>
  <view class="page">
    <view class="header-card">
      <text class="balance-label">商户 IF-Pay 可用余额（元）</text>
      <text class="balance-value">{{ loading ? '--' : fen2yuan(balance) }}</text>
      <text class="balance-sub">冻结金额：¥{{ loading ? '--' : fen2yuan(frozenBalance) }}</text>

      <view class="action-row">
        <button class="action-btn primary" :disabled="loading || !walletUserId" @tap="applyWithdraw">申请提现</button>
        <button class="action-btn" :disabled="loading || !walletUserId" @tap="refreshAll">刷新</button>
      </view>
    </view>

    <view class="filter-row">
      <view
        v-for="item in typeFilters"
        :key="item.value || 'all'"
        class="chip"
        :class="{ active: activeType === item.value }"
        @tap="activeType = item.value"
      >
        {{ item.label }}
      </view>
    </view>

    <scroll-view scroll-y class="list" refresher-enabled :refresher-triggered="refreshing" @refresherrefresh="refreshAll">
      <view v-if="loading && transactions.length === 0" class="state">加载中...</view>
      <view v-else-if="filteredTransactions.length === 0" class="state">暂无资金流水</view>

      <view v-for="tx in filteredTransactions" :key="tx.transaction_id || tx.transactionId || tx.id" class="tx-card">
        <view class="tx-top">
          <text class="tx-title">{{ txTypeText(tx.type) }}</text>
          <text class="tx-amount" :class="amountClass(tx)">
            {{ amountText(tx) }}
          </text>
        </view>

        <view class="tx-bottom">
          <text class="tx-time">{{ formatTime(tx.created_at || tx.createdAt) }}</text>
          <text class="tx-status">{{ txStatusText(tx.status) }}</text>
        </view>

        <text v-if="tx.description" class="tx-desc">{{ tx.description }}</text>
      </view>

      <view class="bottom-space" />
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { createWithdraw, fetchWalletBalance, fetchWalletTransactions } from '@/shared-ui/api'

const loading = ref(false)
const refreshing = ref(false)

const walletUserId = ref('')
const merchantName = ref('')
const merchantPhone = ref('')

const balance = ref(0)
const frozenBalance = ref(0)
const transactions = ref<any[]>([])

const activeType = ref('')

const typeFilters = [
  { label: '全部', value: '' },
  { label: '订单收入', value: 'payment' },
  { label: '退款扣款', value: 'refund' },
  { label: '提现', value: 'withdraw' },
  { label: '充值', value: 'recharge' },
]

const filteredTransactions = computed(() => {
  if (!activeType.value) return transactions.value
  return transactions.value.filter((item: any) => String(item.type || '') === activeType.value)
})

function normalizeArray(payload: any, candidates: string[] = ['items', 'list', 'data']) {
  if (Array.isArray(payload)) return payload
  for (const key of candidates) {
    if (Array.isArray(payload?.[key])) return payload[key]
  }
  if (Array.isArray(payload?.data?.list)) return payload.data.list
  if (Array.isArray(payload?.data?.items)) return payload.data.items
  if (Array.isArray(payload?.data)) return payload.data
  return []
}

function parseMerchantProfile() {
  const profile: any = uni.getStorageSync('merchantProfile') || {}
  const merchantId = String(profile.id || profile.role_id || profile.userId || '').trim()
  const merchantPhone = String(profile.phone || '').trim()
  walletUserId.value = merchantId || merchantPhone
  merchantName.value = String(profile.name || profile.shopName || '商户')
  merchantPhone.value = merchantPhone
}

function fen2yuan(fen: any) {
  const value = Number(fen || 0)
  if (!Number.isFinite(value)) return '0.00'
  return (Math.abs(value) / 100).toFixed(2)
}

function amountText(tx: any) {
  const amount = Number(tx.amount || 0)
  const abs = fen2yuan(amount)
  if (amount > 0) return `+¥${abs}`
  if (amount < 0) return `-¥${abs}`
  return `¥${abs}`
}

function amountClass(tx: any) {
  const amount = Number(tx.amount || 0)
  if (amount > 0) return 'income'
  if (amount < 0) return 'expense'
  return 'flat'
}

function txTypeText(type: string) {
  const map: Record<string, string> = {
    payment: '订单收入',
    refund: '退款扣款',
    recharge: '余额充值',
    withdraw: '提现申请',
    compensation: '赔付',
    admin_add_balance: '系统加款',
    admin_deduct_balance: '系统扣款',
  }
  return map[type] || type || '交易'
}

function txStatusText(status: string) {
  const map: Record<string, string> = {
    pending: '处理中',
    success: '成功',
    completed: '成功',
    failed: '失败',
    cancelled: '已取消',
  }
  return map[status] || status || '--'
}

function formatTime(value: any) {
  if (!value) return '--'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')
  return `${month}-${day} ${hour}:${minute}`
}

async function loadData() {
  parseMerchantProfile()
  if (!walletUserId.value) {
    transactions.value = []
    balance.value = 0
    frozenBalance.value = 0
    return
  }

  loading.value = true
  try {
    const [balanceRes, txRes]: any[] = await Promise.all([
      fetchWalletBalance(walletUserId.value, 'merchant'),
      fetchWalletTransactions({
        userId: walletUserId.value,
        userType: 'merchant',
        limit: 100,
        page: 1,
      }),
    ])

    balance.value = Number(balanceRes?.balance || 0)
    frozenBalance.value = Number(balanceRes?.frozenBalance || 0)

    transactions.value = normalizeArray(txRes).sort(
      (a: any, b: any) => new Date(b.created_at || b.createdAt).getTime() - new Date(a.created_at || a.createdAt).getTime()
    )
  } catch (err: any) {
    uni.showToast({ title: err?.error || err?.message || '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

async function refreshAll() {
  refreshing.value = true
  try {
    await loadData()
  } finally {
    refreshing.value = false
  }
}

function applyWithdraw() {
  if (!walletUserId.value) return
  uni.showModal({
    title: '申请提现',
    editable: true,
    placeholderText: '输入提现金额（元）',
    success: async (res: any) => {
      if (!res.confirm) return
      const amountYuan = Number(res.content || 0)
      if (!(amountYuan > 0)) {
        uni.showToast({ title: '请输入正确金额', icon: 'none' })
        return
      }

      const amountFen = Math.round(amountYuan * 100)
      try {
        await createWithdraw({
          userId: walletUserId.value,
          userType: 'merchant',
          amount: amountFen,
          withdrawMethod: 'ifpay',
          withdrawAccount: merchantPhone.value || walletUserId.value,
          withdrawName: merchantName.value || '商户',
          remark: '商户端提现申请',
        })
        uni.showToast({ title: '提现申请已提交', icon: 'success' })
        await loadData()
      } catch (err: any) {
        uni.showToast({ title: err?.error || err?.message || '提现失败', icon: 'none' })
      }
    },
  })
}

onShow(async () => {
  await loadData()
})
</script>

<style scoped lang="scss">
.page {
  height: 100vh;
  background: #f2f7fd;
  display: flex;
  flex-direction: column;
}

.header-card {
  margin: 14rpx 24rpx 10rpx;
  border-radius: 22rpx;
  background: linear-gradient(135deg, #009bf5, #0081cc);
  color: #ffffff;
  padding: 24rpx;
  box-shadow: 0 16rpx 28rpx rgba(0, 137, 214, 0.25);
}

.balance-label {
  display: block;
  font-size: 22rpx;
  opacity: 0.92;
}

.balance-value {
  display: block;
  margin-top: 10rpx;
  font-size: 58rpx;
  font-weight: 700;
}

.balance-sub {
  display: block;
  margin-top: 6rpx;
  font-size: 22rpx;
  opacity: 0.9;
}

.action-row {
  margin-top: 18rpx;
  display: flex;
  gap: 10rpx;
}

.action-btn {
  flex: 1;
  height: 66rpx;
  line-height: 66rpx;
  border-radius: 999rpx;
  font-size: 24rpx;
  border: 1rpx solid rgba(255, 255, 255, 0.34);
  background: rgba(255, 255, 255, 0.14);
  color: #ffffff;

  &.primary {
    background: #ffffff;
    color: #0c5b95;
    border-color: #ffffff;
  }
}

.filter-row {
  display: flex;
  gap: 10rpx;
  padding: 0 24rpx 10rpx;
  overflow-x: auto;
  white-space: nowrap;
}

.chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 110rpx;
  height: 56rpx;
  padding: 0 16rpx;
  border-radius: 999rpx;
  background: #e9f1fa;
  color: #67819b;
  font-size: 22rpx;

  &.active {
    background: #dff0ff;
    color: #007fd0;
    font-weight: 600;
  }
}

.list {
  flex: 1;
  min-height: 0;
  padding: 0 24rpx;
  box-sizing: border-box;
}

.state {
  text-align: center;
  font-size: 24rpx;
  color: #8da3b9;
  padding: 120rpx 0;
}

.tx-card {
  border-radius: 14rpx;
  border: 1rpx solid #e4edf8;
  background: #ffffff;
  padding: 14rpx;
  margin-bottom: 10rpx;
}

.tx-top,
.tx-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.tx-title {
  font-size: 24rpx;
  color: #1d446a;
  font-weight: 600;
}

.tx-amount {
  font-size: 25rpx;
  font-weight: 700;

  &.income {
    color: #17a35c;
  }

  &.expense {
    color: #d34b4b;
  }

  &.flat {
    color: #52708d;
  }
}

.tx-bottom {
  margin-top: 8rpx;
}

.tx-time,
.tx-status,
.tx-desc {
  font-size: 21rpx;
  color: #7e96ae;
}

.tx-desc {
  display: block;
  margin-top: 6rpx;
}

.bottom-space {
  height: calc(20rpx + env(safe-area-inset-bottom));
}
</style>
