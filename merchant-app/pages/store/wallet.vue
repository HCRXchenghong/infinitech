<template>
  <view class="page">
    <view class="header-card">
      <text class="balance-label">商户 IF-Pay 可用余额（元）</text>
      <text class="balance-value">{{ loading ? '--' : fen2yuan(balance) }}</text>
      <text class="balance-sub">冻结金额 ¥{{ loading ? '--' : fen2yuan(frozenBalance) }}</text>

      <view class="action-row">
        <button class="action-btn primary" :disabled="loading || !walletUserId" @tap="applyRecharge">余额充值</button>
        <button class="action-btn" :disabled="loading || !walletUserId" @tap="applyWithdraw">申请提现</button>
        <button class="action-btn minor" :disabled="loading || !walletUserId" @tap="refreshAll">刷新</button>
      </view>
    </view>

    <view class="notice-card">
      <text class="notice-title">资金规则</text>
      <text class="notice-text">
        商户端支持微信提现、支付宝提现和银行卡提现。银行卡提现到账时效为 24 小时 - 48 小时，所有提现渠道都会按后台配置收取手续费，申请提交后金额会先冻结。
      </text>
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
          <text class="tx-amount" :class="amountClass(tx)">{{ amountText(tx) }}</text>
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
import {
  createRecharge,
  createWithdraw,
  fetchWalletBalance,
  fetchWalletPaymentOptions,
  fetchWalletRechargeStatus,
  fetchWalletTransactions,
  fetchWalletWithdrawOptions,
  fetchWalletWithdrawStatus,
  previewWalletWithdrawFee,
} from '@/shared-ui/api'

const loading = ref(false)
const refreshing = ref(false)

const walletUserId = ref('')
const merchantName = ref('')
const merchantPhone = ref('')

const balance = ref(0)
const frozenBalance = ref(0)
const transactions = ref<any[]>([])
const rechargeOptions = ref<any[]>([])
const withdrawOptions = ref<any[]>([])

const activeType = ref('')
const rechargeFinalStatuses = new Set(['success', 'completed', 'paid'])
const flowFailureStatuses = new Set(['failed', 'rejected', 'cancelled', 'closed'])
const withdrawFinalStatuses = new Set(['success', 'completed'])

const typeFilters = [
  { label: '全部', value: '' },
  { label: '订单收入', value: 'payment' },
  { label: '退款扣减', value: 'refund' },
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

function normalizeOptions(payload: any) {
  if (Array.isArray(payload?.options)) return payload.options
  return normalizeArray(payload, ['options', 'items', 'list', 'data'])
}

function parseMerchantProfile() {
  const profile: any = uni.getStorageSync('merchantProfile') || {}
  const merchantId = String(profile.id || profile.role_id || profile.userId || '').trim()
  const phone = String(profile.phone || '').trim()
  walletUserId.value = merchantId || phone
  merchantName.value = String(profile.name || profile.shopName || '商户').trim()
  merchantPhone.value = phone
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
    refund: '退款扣减',
    recharge: '余额充值',
    withdraw: '提现申请',
    compensation: '赔付',
    admin_add_balance: '系统加款',
    admin_deduct_balance: '系统扣款',
  }
  return map[type] || type || '交易'
}

function txStatusText(status: string) {
  const normalized = String(status || '').toLowerCase()
  if (normalized === 'transferring') return '转账中'
  const map: Record<string, string> = {
    pending: '处理中',
    pending_review: '待审核',
    pending_transfer: '待打款',
    processing: '处理中',
    success: '成功',
    completed: '成功',
    failed: '失败',
    cancelled: '已取消',
    rejected: '已驳回',
  }
  return map[normalized] || status || '--'
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

function createIdempotencyKey(prefix: string) {
  return `${prefix}_${walletUserId.value}_${Date.now()}_${Math.floor(Math.random() * 100000)}`
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function normalizeFlowStatus(payload: any, nestedKey: string) {
  return String(payload?.status || payload?.[nestedKey]?.status || payload?.transactionStatus || '')
    .trim()
    .toLowerCase()
}

function normalizeArrivalText(payload: any, nestedKey: string) {
  return String(payload?.arrivalText || payload?.[nestedKey]?.arrivalText || '').trim()
}

function flowStatusText(status: string) {
  const normalized = String(status || '').trim().toLowerCase()
  const map: Record<string, string> = {
    awaiting_client_pay: '待支付',
    pending: '处理中',
    pending_review: '待审核',
    pending_transfer: '待打款',
    processing: '处理中',
    transferring: '转账中',
    success: '成功',
    completed: '成功',
    paid: '已支付',
    failed: '失败',
    rejected: '已驳回',
    cancelled: '已取消',
    closed: '已关闭',
  }
  return map[normalized] || normalized || '处理中'
}

async function pollRechargeResult(rechargeOrderId: string, transactionId: string) {
  let latest: any = null
  for (let attempt = 0; attempt < 8; attempt += 1) {
    latest = await fetchWalletRechargeStatus({
      userId: walletUserId.value,
      userType: 'merchant',
      rechargeOrderId,
      transactionId,
    })
    const status = normalizeFlowStatus(latest, 'recharge')
    if (rechargeFinalStatuses.has(status) || flowFailureStatuses.has(status)) {
      return latest
    }
    await sleep(1500)
  }
  return latest
}

async function pollWithdrawResult(withdrawRequestId: string, transactionId: string) {
  let latest: any = null
  for (let attempt = 0; attempt < 5; attempt += 1) {
    latest = await fetchWalletWithdrawStatus({
      userId: walletUserId.value,
      userType: 'merchant',
      requestId: withdrawRequestId,
      transactionId,
    })
    const status = normalizeFlowStatus(latest, 'withdraw')
    if (withdrawFinalStatuses.has(status) || flowFailureStatuses.has(status)) {
      return latest
    }
    await sleep(1500)
  }
  return latest
}

function pickOption(options: any[], emptyMessage: string): Promise<any | null> {
  return new Promise((resolve) => {
    if (!options.length) {
      uni.showToast({ title: emptyMessage, icon: 'none' })
      resolve(null)
      return
    }
    uni.showActionSheet({
      itemList: options.map((item) => item.label || item.channel || '未命名渠道'),
      success: (res: any) => resolve(options[res.tapIndex] || null),
      fail: () => resolve(null),
    })
  })
}

function promptText(title: string, placeholderText: string): Promise<string | null> {
  return new Promise((resolve) => {
    uni.showModal({
      title,
      editable: true,
      placeholderText,
      success: (res: any) => {
        if (!res.confirm) {
          resolve(null)
          return
        }
        resolve(String(res.content || '').trim())
      },
      fail: () => resolve(null),
    })
  })
}

function optionText(channel: any, key: string, fallback = '') {
  const value = channel?.[key]
  if (value === undefined || value === null || value === '') return fallback
  return String(value)
}

async function collectWithdrawPayload(channel: any) {
  const method = String(channel?.channel || '').trim()
  const withdrawAccount = await promptText(
    '收款账户',
    optionText(
      channel,
      'accountPlaceholder',
      method === 'bank_card' ? '输入银行卡号' : method === 'alipay' ? '输入支付宝账号' : '输入微信收款账号'
    )
  )
  if (!withdrawAccount) return null

  let withdrawName = merchantName.value || '商户'
  if (channel?.requiresName) {
    const holderName = await promptText('收款人姓名', optionText(channel, 'namePlaceholder', '输入收款人姓名'))
    if (!holderName) return null
    withdrawName = holderName
  }

  let bankName = ''
  let bankBranch = ''
  if (channel?.requiresBankName) {
    const bankNameInput = await promptText('开户银行', optionText(channel, 'bankNamePlaceholder', '输入开户银行'))
    if (!bankNameInput) return null
    bankName = bankNameInput
  }
  if (channel?.requiresBankBranch) {
    const bankBranchInput = await promptText('开户支行', optionText(channel, 'bankBranchPlaceholder', '输入开户支行'))
    if (!bankBranchInput) return null
    bankBranch = bankBranchInput
  }

  return {
    withdrawAccount: String(withdrawAccount).trim(),
    withdrawName: String(withdrawName).trim(),
    bankName: String(bankName).trim(),
    bankBranch: String(bankBranch).trim(),
  }
}

async function loadData() {
  parseMerchantProfile()
  if (!walletUserId.value) {
    transactions.value = []
    balance.value = 0
    frozenBalance.value = 0
    rechargeOptions.value = []
    withdrawOptions.value = []
    return
  }

  loading.value = true
  try {
    const [balanceRes, txRes, rechargeRes, withdrawRes]: any[] = await Promise.all([
      fetchWalletBalance(walletUserId.value, 'merchant'),
      fetchWalletTransactions({
        userId: walletUserId.value,
        userType: 'merchant',
        limit: 100,
        page: 1,
      }),
      fetchWalletPaymentOptions({
        userType: 'merchant',
        platform: 'app',
        scene: 'wallet_recharge',
      }),
      fetchWalletWithdrawOptions({
        userType: 'merchant',
        platform: 'app',
      }),
    ])

    balance.value = Number(balanceRes?.balance || 0)
    frozenBalance.value = Number(balanceRes?.frozenBalance || 0)
    rechargeOptions.value = normalizeOptions(rechargeRes)
    withdrawOptions.value = normalizeOptions(withdrawRes)
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

async function applyRecharge() {
  if (!walletUserId.value) return
  const channel = await pickOption(rechargeOptions.value, '暂无可用充值渠道')
  if (!channel) return

  const amountText = await promptText('余额充值', '输入充值金额（元）')
  if (amountText == null) return
  const amountFen = Math.round(Number(amountText || 0) * 100)
  if (!(amountFen > 0)) {
    uni.showToast({ title: '请输入正确金额', icon: 'none' })
    return
  }

  try {
    const result: any = await createRecharge({
      userId: walletUserId.value,
      userType: 'merchant',
      amount: amountFen,
      platform: 'app',
      paymentMethod: channel.channel,
      paymentChannel: channel.channel,
      idempotencyKey: createIdempotencyKey('merchant_recharge'),
      description: '商户端余额充值',
    })

    let latest = result
    let status = normalizeFlowStatus(latest, 'recharge')
    if (!rechargeFinalStatuses.has(status) && !flowFailureStatuses.has(status) && (result?.rechargeOrderId || result?.transactionId)) {
      uni.showLoading({ title: '正在确认充值状态', mask: true })
      try {
        latest = await pollRechargeResult(String(result?.rechargeOrderId || ''), String(result?.transactionId || ''))
      } finally {
        uni.hideLoading()
      }
      status = normalizeFlowStatus(latest, 'recharge')
    }

    if (rechargeFinalStatuses.has(status)) {
      uni.showToast({ title: '充值成功', icon: 'success' })
    } else if (flowFailureStatuses.has(status)) {
      uni.showToast({ title: `充值失败：${flowStatusText(status)}`, icon: 'none' })
    } else {
      uni.showToast({ title: '充值请求已提交，可在钱包流水查看状态', icon: 'none' })
    }
    await loadData()
  } catch (err: any) {
    uni.showToast({ title: err?.error || err?.message || '充值失败', icon: 'none' })
  }
}

async function applyWithdraw() {
  if (!walletUserId.value) return
  const channel = await pickOption(withdrawOptions.value, '暂无可用提现渠道')
  if (!channel) return

  const amountText = await promptText('申请提现', '输入提现金额（元）')
  if (amountText == null) return
  const amountFen = Math.round(Number(amountText || 0) * 100)
  if (!(amountFen > 0)) {
    uni.showToast({ title: '请输入正确金额', icon: 'none' })
    return
  }

  const accountPayload = await collectWithdrawPayload(channel)
  if (!accountPayload) return

  try {
    const preview: any = await previewWalletWithdrawFee({
      userId: walletUserId.value,
      userType: 'merchant',
      amount: amountFen,
      withdrawMethod: channel.channel,
      platform: 'app',
    })
    const confirmed = await new Promise<boolean>((resolve) => {
      const notice = optionText(channel, 'reviewNotice', '')
      uni.showModal({
        title: '确认提现',
        content: `${notice ? `${notice}\n` : ''}手续费 ¥${fen2yuan(preview?.fee)}，预计到账 ¥${fen2yuan(preview?.actualAmount)}，到账时效：${preview?.arrivalText || '以通道处理为准'}`,
        success: (res: any) => resolve(!!res.confirm),
        fail: () => resolve(false),
      })
    })
    if (!confirmed) return

    const result: any = await createWithdraw({
      userId: walletUserId.value,
      userType: 'merchant',
      amount: amountFen,
      platform: 'app',
      withdrawMethod: channel.channel,
      withdrawAccount: accountPayload.withdrawAccount,
      withdrawName: accountPayload.withdrawName,
      bankName: accountPayload.bankName,
      bankBranch: accountPayload.bankBranch,
      remark: '商户端提现申请',
      idempotencyKey: createIdempotencyKey('merchant_withdraw'),
    })

    let latest = result
    let status = normalizeFlowStatus(latest, 'withdraw')
    if (!withdrawFinalStatuses.has(status) && !flowFailureStatuses.has(status) && (result?.withdrawRequestId || result?.transactionId)) {
      uni.showLoading({ title: '正在确认提现状态', mask: true })
      try {
        latest = await pollWithdrawResult(String(result?.withdrawRequestId || ''), String(result?.transactionId || ''))
      } finally {
        uni.hideLoading()
      }
      status = normalizeFlowStatus(latest, 'withdraw')
    }

    if (withdrawFinalStatuses.has(status)) {
      uni.showToast({ title: '提现成功', icon: 'success' })
    } else if (flowFailureStatuses.has(status)) {
      uni.showToast({ title: `提现失败：${flowStatusText(status)}`, icon: 'none' })
    } else {
      const arrivalText = normalizeArrivalText(latest, 'withdraw')
      uni.showToast({
        title: arrivalText ? `提现处理中，${arrivalText}` : `提现已提交，当前状态：${flowStatusText(status)}`,
        icon: 'none',
      })
    }
    await loadData()
  } catch (err: any) {
    uni.showToast({ title: err?.error || err?.message || '提现失败', icon: 'none' })
  }
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

  &.minor {
    flex: 0.8;
  }
}

.notice-card {
  margin: 0 24rpx 12rpx;
  padding: 20rpx 24rpx;
  border-radius: 20rpx;
  background: #fff7eb;
  color: #9a5d00;
}

.notice-title {
  display: block;
  font-size: 24rpx;
  font-weight: 700;
}

.notice-text {
  display: block;
  margin-top: 8rpx;
  font-size: 22rpx;
  line-height: 1.7;
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
  background: #ffffff;
  border-radius: 18rpx;
  padding: 22rpx;
  margin-bottom: 14rpx;
  box-shadow: 0 8rpx 20rpx rgba(15, 23, 42, 0.05);
}

.tx-top,
.tx-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.tx-title {
  font-size: 28rpx;
  color: #162033;
  font-weight: 600;
}

.tx-amount {
  font-size: 30rpx;
  font-weight: 700;

  &.income {
    color: #1ea672;
  }

  &.expense {
    color: #e55858;
  }

  &.flat {
    color: #526072;
  }
}

.tx-bottom {
  margin-top: 10rpx;
  font-size: 22rpx;
  color: #7b8794;
}

.tx-desc {
  display: block;
  margin-top: 12rpx;
  font-size: 22rpx;
  color: #526072;
  line-height: 1.6;
}

.bottom-space {
  height: 24rpx;
}
</style>
