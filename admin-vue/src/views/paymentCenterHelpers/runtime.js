import { extractPaginatedItems } from '@infinitech/contracts'
import { createPaymentCenterConfigDraft } from '@infinitech/admin-core'

export function createPaymentCenterState() {
  const draft = createPaymentCenterConfigDraft()
  return {
    pay_mode: draft.pay_mode,
    wxpay_config: draft.wxpay_config,
    alipay_config: draft.alipay_config,
    channel_matrix: draft.channel_matrix,
    withdraw_fee_rules: draft.withdraw_fee_rules,
    settlement_subjects: draft.settlement_subjects,
    settlementRulesText: draft.settlementRulesText,
    rider_deposit_policy: draft.rider_deposit_policy,
    bank_card_config: draft.bank_card_config,
    riderDepositRecords: [],
    withdrawRequests: [],
    paymentCallbacks: [],
  }
}

export function extractPaymentCenterListItems(payload) {
  return extractPaginatedItems(payload).items
}

export function openPaymentCenterConfirm(
  ElMessageBox,
  message,
  title,
  options = {},
) {
  return ElMessageBox.confirm(message, title, {
    confirmButtonText: '确认',
    cancelButtonText: '取消',
    type: 'warning',
    ...options,
  }).catch(() => false)
}

export function openPaymentCenterPrompt(
  ElMessageBox,
  message,
  title,
  options = {},
) {
  return ElMessageBox.prompt(message, title, {
    confirmButtonText: '确认',
    cancelButtonText: '取消',
    ...options,
  }).catch(() => null)
}

export function formatFen(value) {
  return (Number(value || 0) / 100).toFixed(2)
}

export function formatFenOrDash(value) {
  if (value === null || value === undefined || value === '') return '-'
  return formatFen(value)
}

export function prettyJson(value) {
  if (value == null || value === '') return '-'
  if (typeof value === 'string') {
    try {
      return JSON.stringify(JSON.parse(value), null, 2)
    } catch (_) {
      return value
    }
  }
  try {
    return JSON.stringify(value, null, 2)
  } catch (_) {
    return String(value)
  }
}

export function addPaymentChannelRow(channelMatrix) {
  channelMatrix.push({
    user_type: 'customer',
    platform: 'app',
    scene: 'order_payment',
    channel: 'wechat',
    enabled: true,
    label: '新渠道',
    description: '',
  })
}

export function addPaymentWithdrawFeeRule(withdrawFeeRules) {
  withdrawFeeRules.push({
    user_type: 'customer',
    withdraw_method: 'wechat',
    min_amount: 0,
    max_amount: 0,
    rate_basis_points: 0,
    min_fee: 0,
    max_fee: 0,
    enabled: true,
    sort_order: withdrawFeeRules.length * 10 + 10,
  })
}

export function addPaymentSettlementSubject(settlementSubjects) {
  settlementSubjects.push({
    uid: `custom-${Date.now()}`,
    name: '新分账对象',
    subject_type: 'custom',
    scope_type: 'global',
    scope_id: '',
    external_account: '',
    external_channel: '',
    account_holder_name: '',
    enabled: true,
    sort_order: settlementSubjects.length * 10 + 10,
    notes: '',
  })
}

export function removePaymentCenterRow(list, index) {
  list.splice(index, 1)
}
