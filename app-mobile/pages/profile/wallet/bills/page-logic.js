import { buildAuthorizationHeader, request } from '../../../../shared-ui/api.js'
import { createWalletBillsPageLogic } from '../../../../../shared/mobile-common/wallet-bills-page.js'

export default createWalletBillsPageLogic({
  request,
  buildAuthorizationHeader,
})
