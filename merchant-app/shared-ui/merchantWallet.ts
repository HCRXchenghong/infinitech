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
import { readMerchantAuthIdentity } from '@/shared-ui/auth-session.js'
import {
  buildMerchantRechargePayload,
  buildMerchantWalletRechargeOptionsQuery,
  buildMerchantWalletTransactionQuery,
  buildMerchantWalletWithdrawOptionsQuery,
  buildMerchantWithdrawConfirmText,
  buildMerchantWithdrawPayload,
  buildMerchantWithdrawPreviewPayload,
  createMerchantWalletTypeFilters,
  formatMerchantWalletAmountText,
  formatMerchantWalletFen,
  formatMerchantWalletTime,
  getMerchantWalletTransactionStatusText,
  getMerchantWalletTransactionTypeText,
  parseMerchantWalletAmountToFen,
  pollMerchantRechargeStatus,
  pollMerchantWithdrawStatus,
  resolveMerchantWalletAmountClass,
  resolveMerchantWithdrawFailureReason,
} from '../../packages/mobile-core/src/merchant-wallet.js'
import {
  extractWalletItems,
  isWalletFailureStatus,
  isWalletRechargeSuccessStatus,
  isWalletWithdrawSuccessStatus,
  normalizeWalletArrivalText,
  normalizeWalletFlowStatus,
  normalizeWalletOptions,
  normalizeWalletText,
  sortWalletTransactions,
} from '../../packages/mobile-core/src/wallet-shared.js'

const toText = normalizeWalletText

export function getMerchantWalletIdentity() {
  const auth = readMerchantAuthIdentity({ uniApp: uni })
  const merchantPhone = toText(auth.merchantPhone)
  return {
    userId: toText(auth.userId),
    merchantName: toText(auth.merchantName || '商户') || '商户',
    merchantPhone,
  }
}

export function formatWalletFen(value: any) {
  return formatMerchantWalletFen(value)
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

  const typeFilters = createMerchantWalletTypeFilters()

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
    return formatMerchantWalletAmountText(tx)
  }

  function amountClass(tx: any) {
    return resolveMerchantWalletAmountClass(tx)
  }

  function txTypeText(type: string) {
    return getMerchantWalletTransactionTypeText(type)
  }

  function txStatusText(status: string) {
    return getMerchantWalletTransactionStatusText(status)
  }

  function formatTime(value: any) {
    return formatMerchantWalletTime(value)
  }

  function flowStatusText(status: string) {
    return getMerchantWalletTransactionStatusText(status)
  }

  async function pollRechargeResult(rechargeOrderId: string, transactionId: string) {
    return pollMerchantRechargeStatus({
      userId: walletUserId.value,
      rechargeOrderId,
      transactionId,
      loadStatus: fetchWalletRechargeStatus,
      sleepFn: sleep,
    })
  }

  async function pollWithdrawResult(withdrawRequestId: string, transactionId: string) {
    return pollMerchantWithdrawStatus({
      userId: walletUserId.value,
      withdrawRequestId,
      transactionId,
      loadStatus: fetchWalletWithdrawStatus,
      sleepFn: sleep,
    })
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
        fetchWalletTransactions(buildMerchantWalletTransactionQuery({ userId: walletUserId.value })),
        fetchWalletPaymentOptions(buildMerchantWalletRechargeOptionsQuery({ platform: 'app' })),
        fetchWalletWithdrawOptions(buildMerchantWalletWithdrawOptionsQuery({ platform: 'app' })),
      ])

      balance.value = Number(snapshot?.balance || 0)
      frozenBalance.value = Number(snapshot?.frozenBalance || 0)
      rechargeOptions.value = normalizeWalletOptions(rechargeRes)
      withdrawOptions.value = normalizeWalletOptions(withdrawRes)
      transactions.value = sortWalletTransactions(extractWalletItems(txRes))
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
    const amountFen = parseMerchantWalletAmountToFen(amountTextValue)
    if (!(amountFen > 0)) {
      uni.showToast({ title: '请输入正确金额', icon: 'none' })
      return
    }

    try {
      const result: any = await createRecharge(buildMerchantRechargePayload({
        userId: walletUserId.value,
        amountFen,
        channel: channel.channel,
        platform: 'app',
      }))

      if (shouldLaunchClientPayment(result)) {
        uni.showLoading({ title: '正在拉起支付', mask: true })
        try {
          await invokeClientPayment(result, 'app')
        } finally {
          uni.hideLoading()
        }
      }

      let latest = result
      let status = normalizeWalletFlowStatus(latest, 'recharge')
      if (!isWalletRechargeSuccessStatus(status) && !isWalletFailureStatus(status) && (result?.rechargeOrderId || result?.transactionId)) {
        uni.showLoading({ title: '正在确认充值状态', mask: true })
        try {
          latest = await pollRechargeResult(toText(result?.rechargeOrderId), toText(result?.transactionId))
        } finally {
          uni.hideLoading()
        }
        status = normalizeWalletFlowStatus(latest, 'recharge')
      }

      if (isWalletRechargeSuccessStatus(status)) {
        uni.showToast({ title: '充值成功', icon: 'success' })
      } else if (isWalletFailureStatus(status)) {
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
    const amountFen = parseMerchantWalletAmountToFen(amountTextValue)
    if (!(amountFen > 0)) {
      uni.showToast({ title: '请输入正确金额', icon: 'none' })
      return
    }

    const accountPayload = await collectWithdrawPayload(channel, merchantName.value)
    if (!accountPayload) return

    try {
      const preview: any = await previewWalletWithdrawFee(buildMerchantWithdrawPreviewPayload({
        userId: walletUserId.value,
        amountFen,
        channel: channel.channel,
        platform: 'app',
      }))
      const confirmed = await new Promise<boolean>((resolve) => {
        uni.showModal({
          title: '确认提现',
          content: buildMerchantWithdrawConfirmText(preview, channel),
          success: (res: any) => resolve(!!res.confirm),
          fail: () => resolve(false),
        })
      })
      if (!confirmed) return

      const result: any = await createWithdraw(buildMerchantWithdrawPayload({
        userId: walletUserId.value,
        amountFen,
        platform: 'app',
        channel: channel.channel,
        withdrawAccount: accountPayload.withdrawAccount,
        withdrawName: accountPayload.withdrawName,
        bankName: accountPayload.bankName,
        bankBranch: accountPayload.bankBranch,
      }))

      let latest = result
      let status = normalizeWalletFlowStatus(latest, 'withdraw')
      if (!isWalletWithdrawSuccessStatus(status) && !isWalletFailureStatus(status) && (result?.withdrawRequestId || result?.transactionId)) {
        uni.showLoading({ title: '正在确认提现状态', mask: true })
        try {
          latest = await pollWithdrawResult(toText(result?.withdrawRequestId), toText(result?.transactionId))
        } finally {
          uni.hideLoading()
        }
        status = normalizeWalletFlowStatus(latest, 'withdraw')
      }

      if (isWalletWithdrawSuccessStatus(status)) {
        uni.showToast({ title: '提现成功', icon: 'success' })
      } else if (isWalletFailureStatus(status)) {
        const reason = resolveMerchantWithdrawFailureReason(latest)
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
        const arrivalText = normalizeWalletArrivalText(latest, 'withdraw')
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
