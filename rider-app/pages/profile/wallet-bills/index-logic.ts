import { buildAuthorizationHeader, request } from '../../../shared-ui/api'
import { readRiderAuthIdentity } from '../../../shared-ui/auth-session.js'
import {
  createWalletBillsPageLogic,
  DEFAULT_WALLET_BILLS_FILTER_OPTIONS,
  DEFAULT_WALLET_BILLS_TX_TYPE_ICONS,
  DEFAULT_WALLET_BILLS_TX_TYPE_LABELS,
} from '../../../../packages/mobile-core/src/wallet-bills-page.js'

const createRiderWalletBillsPageLogic: any = createWalletBillsPageLogic

const riderFilterOptions = [
  { ...DEFAULT_WALLET_BILLS_FILTER_OPTIONS[0] },
  { label: '订单收入', value: 'income' },
  ...DEFAULT_WALLET_BILLS_FILTER_OPTIONS
    .filter((item) => item.value)
    .map((item) => ({ ...item })),
  { label: '系统加款', value: 'admin_add_balance' },
  { label: '系统扣款', value: 'admin_deduct_balance' }
]

const riderTxTypeLabels = {
  income: '订单收入',
  ...DEFAULT_WALLET_BILLS_TX_TYPE_LABELS
}

const riderTxTypeIcons = {
  income: '收',
  ...DEFAULT_WALLET_BILLS_TX_TYPE_ICONS
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
