import { buildAuthorizationHeader, request } from '../../../../shared-ui/api.js'
import { createWalletBillsPageLogic } from '../../../../../packages/mobile-core/src/wallet-bills-page.js'

export default createWalletBillsPageLogic({
  request,
  buildAuthorizationHeader,
})
