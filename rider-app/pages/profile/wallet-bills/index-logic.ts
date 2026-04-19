import { buildAuthorizationHeader, request } from '../../../shared-ui/api'
import { readRiderAuthIdentity } from '../../../shared-ui/auth-session.js'
import { createWalletBillsPageLogic } from '../../../../packages/mobile-core/src/wallet-bills-page.js'

const createRiderWalletBillsPageLogic: any = createWalletBillsPageLogic

const riderFilterOptions = [
  { label: '全部', value: '' },
  { label: '订单收入', value: 'income' },
  { label: '支付', value: 'payment' },
  { label: '充值', value: 'recharge' },
  { label: '退款', value: 'refund' },
  { label: '提现', value: 'withdraw' },
  { label: '系统加款', value: 'admin_add_balance' },
  { label: '系统扣款', value: 'admin_deduct_balance' }
]

const riderTxTypeLabels = {
  income: '订单收入',
  payment: '订单支付',
  refund: '订单退款',
  recharge: '余额充值',
  withdraw: '余额提现',
  compensation: '平台赔付',
  admin_add_balance: '系统加款',
  admin_deduct_balance: '系统扣款'
}

const riderTxTypeIcons = {
  income: '收',
  payment: '支',
  refund: '退',
  recharge: '充',
  withdraw: '提',
  compensation: '赔',
  admin_add_balance: '加',
  admin_deduct_balance: '扣'
}

function getRiderWalletAuth() {
  const auth = readRiderAuthIdentity({ uniApp: uni })
  const userId = this.normalizeText(auth.userId)
  const token = this.normalizeText(auth.token)
  return { userId, token }
}

function formatRiderBillStatus(status, type) {
  const statusText = String(status || '').toLowerCase()
  if (statusText === 'pending' && String(type || '').toLowerCase() === 'income') {
    return '冻结中'
  }
  return ''
}

export default createRiderWalletBillsPageLogic({
  request,
  buildAuthorizationHeader,
  getAuth: getRiderWalletAuth,
  userType: 'rider',
  filterOptions: riderFilterOptions,
  txTypeLabels: riderTxTypeLabels,
  txTypeIcons: riderTxTypeIcons,
  formatStatusLabel: formatRiderBillStatus,
})
