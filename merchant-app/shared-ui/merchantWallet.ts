import { computed, onMounted, onUnmounted, ref } from 'vue'
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
import {
  getClientPaymentErrorMessage,
  invokeClientPayment,
  isClientPaymentCancelled,
  shouldLaunchClientPayment,
} from '@/shared-ui/client-payment'

function toText(value: any) {
  return String(value ?? '').trim()
}

export function getMerchantWalletIdentity() {
  const profile: any = uni.getStorageSync('merchantProfile') || {}
  const merchantId = toText(profile.id || profile.role_id || profile.userId)
  const merchantPhone = toText(profile.phone)
  return {
    userId: merchantId || merchantPhone,
    merchantName: toText(profile.name || profile.shopName || '商户') || '商户',
    merchantPhone,
  }
}

export function formatWalletFen(value: any) {
  const amount = Number(value || 0)
  if (!Number.isFinite(amount)) return '0.00'
  return (Math.abs(amount) / 100).toFixed(2)
}

export async function fetchMerchantWalletSnapshot() {
  const identity = getMerchantWalletIdentity()
  if (!identity.userId) {
    return {
      ...identity,
      balance: 0,
      frozenBalance: 0,
    }
  }

  const response: any = await fetchWalletBalance(identity.userId, 'merchant')
  return {
    ...identity,
    balance: Number(response?.balance || 0),
    frozenBalance: Number(response?.frozenBalance || 0),
  }
}

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

function normalizeFlowStatus(payload: any, nestedKey: string) {
  return toText(payload?.status || payload?.[nestedKey]?.status || payload?.transactionStatus).toLowerCase()
}

function normalizeArrivalText(payload: any, nestedKey: string) {
  return toText(payload?.arrivalText || payload?.[nestedKey]?.arrivalText)
}

function normalizeWithdrawFailureReason(payload: any, nestedKey: string) {
  return toText(
    payload?.rejectReason ||
      payload?.reason ||
      payload?.transferResult ||
      payload?.[nestedKey]?.rejectReason ||
      payload?.[nestedKey]?.reason ||
      payload?.[nestedKey]?.transferResult ||
      payload?.[nestedKey]?.responseData?.rejectReason ||
      payload?.[nestedKey]?.responseData?.reason ||
      payload?.[nestedKey]?.responseData?.transferResult
  )
}

function sortTransactions(items: any[]) {
  return items.slice().sort((left: any, right: any) => {
    const leftTime = new Date(left?.created_at || left?.createdAt || 0).getTime()
    const rightTime = new Date(right?.created_at || right?.createdAt || 0).getTime()
    return rightTime - leftTime
  })
}

function createIdempotencyKey(prefix: string, walletUserId: string) {
  return `${prefix}_${walletUserId}_${Date.now()}_${Math.floor(Math.random() * 100000)}`
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function pickOption(options: any[], emptyMessage: string): Promise<any | null> {
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

async function promptText(title: string, placeholderText: string): Promise<string | null> {
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
        resolve(toText(res.content))
      },
      fail: () => resolve(null),
    })
  })
}

function optionText(channel: any, key: string, fallback = '') {
  return toText(channel?.[key]) || fallback
}

async function collectWithdrawPayload(channel: any, merchantName: string) {
  const method = toText(channel?.channel)
  const withdrawAccount = await promptText(
    '收款账户',
    optionText(
      channel,
      'accountPlaceholder',
      method === 'bank_card' ? '输入银行卡号' : method === 'alipay' ? '输入支付宝账号' : '输入微信收款账号'
    )
  )
  if (!withdrawAccount) return null

  let withdrawName = merchantName || '商户'
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
    withdrawAccount: toText(withdrawAccount),
    withdrawName: toText(withdrawName),
    bankName: toText(bankName),
    bankBranch: toText(bankBranch),
  }
}

export function useMerchantWalletPage() {
  const loading = ref(false)
  const refreshing = ref(false)

  const walletUserId = ref('')
  const merchantName = ref('商户')

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
    return transactions.value.filter((item: any) => toText(item?.type) === activeType.value)
  })

  function syncMerchantIdentity() {
    const identity = getMerchantWalletIdentity()
    walletUserId.value = identity.userId
    merchantName.value = identity.merchantName
  }

  function amountText(tx: any) {
    const amount = Number(tx?.amount || 0)
    const abs = formatWalletFen(amount)
    if (amount > 0) return `+¥${abs}`
    if (amount < 0) return `-¥${abs}`
    return `¥${abs}`
  }

  function amountClass(tx: any) {
    const amount = Number(tx?.amount || 0)
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
    const normalized = toText(status).toLowerCase()
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

  function flowStatusText(status: string) {
    const normalized = toText(status).toLowerCase()
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

  async function loadData() {
    syncMerchantIdentity()
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
      const [snapshot, txRes, rechargeRes, withdrawRes]: any[] = await Promise.all([
        fetchMerchantWalletSnapshot(),
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

      balance.value = Number(snapshot?.balance || 0)
      frozenBalance.value = Number(snapshot?.frozenBalance || 0)
      rechargeOptions.value = normalizeOptions(rechargeRes)
      withdrawOptions.value = normalizeOptions(withdrawRes)
      transactions.value = sortTransactions(normalizeArray(txRes))
    } catch (error: any) {
      uni.showToast({ title: error?.error || error?.message || '加载失败', icon: 'none' })
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

    const amountTextValue = await promptText('余额充值', '输入充值金额（元）')
    if (amountTextValue == null) return
    const amountFen = Math.round(Number(amountTextValue || 0) * 100)
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
        idempotencyKey: createIdempotencyKey('merchant_recharge', walletUserId.value),
        description: '商户端余额充值',
      })

      if (shouldLaunchClientPayment(result)) {
        uni.showLoading({ title: '正在拉起支付', mask: true })
        try {
          await invokeClientPayment(result, 'app')
        } finally {
          uni.hideLoading()
        }
      }

      let latest = result
      let status = normalizeFlowStatus(latest, 'recharge')
      if (!rechargeFinalStatuses.has(status) && !flowFailureStatuses.has(status) && (result?.rechargeOrderId || result?.transactionId)) {
        uni.showLoading({ title: '正在确认充值状态', mask: true })
        try {
          latest = await pollRechargeResult(toText(result?.rechargeOrderId), toText(result?.transactionId))
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
    } catch (error: any) {
      uni.showToast({
        title: isClientPaymentCancelled(error) ? '已取消支付' : (error?.error || getClientPaymentErrorMessage(error, '充值失败')),
        icon: 'none',
      })
    }
  }

  async function applyWithdraw() {
    if (!walletUserId.value) return
    const channel = await pickOption(withdrawOptions.value, '暂无可用提现渠道')
    if (!channel) return

    const amountTextValue = await promptText('申请提现', '输入提现金额（元）')
    if (amountTextValue == null) return
    const amountFen = Math.round(Number(amountTextValue || 0) * 100)
    if (!(amountFen > 0)) {
      uni.showToast({ title: '请输入正确金额', icon: 'none' })
      return
    }

    const accountPayload = await collectWithdrawPayload(channel, merchantName.value)
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
        const notice = optionText(channel, 'reviewNotice')
        uni.showModal({
          title: '确认提现',
          content: `${notice ? `${notice}\n` : ''}手续费 ¥${formatWalletFen(preview?.fee)}，预计到账 ¥${formatWalletFen(preview?.actualAmount)}，到账时效：${preview?.arrivalText || '以通道处理为准'}`,
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
        idempotencyKey: createIdempotencyKey('merchant_withdraw', walletUserId.value),
      })

      let latest = result
      let status = normalizeFlowStatus(latest, 'withdraw')
      if (!withdrawFinalStatuses.has(status) && !flowFailureStatuses.has(status) && (result?.withdrawRequestId || result?.transactionId)) {
        uni.showLoading({ title: '正在确认提现状态', mask: true })
        try {
          latest = await pollWithdrawResult(toText(result?.withdrawRequestId), toText(result?.transactionId))
        } finally {
          uni.hideLoading()
        }
        status = normalizeFlowStatus(latest, 'withdraw')
      }

      if (withdrawFinalStatuses.has(status)) {
        uni.showToast({ title: '提现成功', icon: 'success' })
      } else if (flowFailureStatuses.has(status)) {
        const reason = normalizeWithdrawFailureReason(latest, 'withdraw')
        if (status === 'rejected') {
          await new Promise<boolean>((resolve) => {
            uni.showModal({
              title: '提现已驳回',
              content: reason || '可重新申请或联系平台处理',
              showCancel: false,
              success: () => resolve(true),
              fail: () => resolve(true),
            })
          })
        } else {
          uni.showToast({ title: reason ? `提现失败：${reason}` : `提现失败：${flowStatusText(status)}`, icon: 'none' })
        }
      } else {
        const arrivalText = normalizeArrivalText(latest, 'withdraw')
        uni.showToast({
          title: arrivalText ? `提现处理中，${arrivalText}` : `提现已提交，当前状态：${flowStatusText(status)}`,
          icon: 'none',
        })
      }
      await loadData()
    } catch (error: any) {
      uni.showToast({ title: error?.error || error?.message || '提现失败', icon: 'none' })
    }
  }

  function handleRealtimeWalletRefresh() {
    void loadData().catch(() => {})
  }

  onShow(async () => {
    await loadData()
  })

  onMounted(() => {
    uni.$off('realtime:refresh:wallet', handleRealtimeWalletRefresh)
    uni.$off('realtime:refresh:withdraw', handleRealtimeWalletRefresh)
    uni.$off('realtime:refresh:recharge', handleRealtimeWalletRefresh)
    uni.$on('realtime:refresh:wallet', handleRealtimeWalletRefresh)
    uni.$on('realtime:refresh:withdraw', handleRealtimeWalletRefresh)
    uni.$on('realtime:refresh:recharge', handleRealtimeWalletRefresh)
  })

  onUnmounted(() => {
    uni.$off('realtime:refresh:wallet', handleRealtimeWalletRefresh)
    uni.$off('realtime:refresh:withdraw', handleRealtimeWalletRefresh)
    uni.$off('realtime:refresh:recharge', handleRealtimeWalletRefresh)
  })

  return {
    loading,
    refreshing,
    walletUserId,
    balance,
    frozenBalance,
    transactions,
    activeType,
    typeFilters,
    filteredTransactions,
    fen2yuan: formatWalletFen,
    amountText,
    amountClass,
    txTypeText,
    txStatusText,
    formatTime,
    refreshAll,
    applyRecharge,
    applyWithdraw,
  }
}
