import { fetchAfterSalesList, fetchGroupbuyVouchers, fetchOrders, fetchVoucherQRCode, recordPhoneContactClick } from '@/shared-ui/api.js'
import { canUseUserRTCContact, loadRTCRuntimeSettings } from '@/shared-ui/rtc-contact.js'
import { mapAfterSalesItem, mapOrderItem } from './order-list-utils'
import ContactModal from '@/components/ContactModal.vue'
import PhoneWarningModal from '@/components/PhoneWarningModal.vue'
import { createOrderListPage } from '../../../../packages/mobile-core/src/order-list-page.js'

export default createOrderListPage({
  fetchAfterSalesList,
  fetchGroupbuyVouchers,
  fetchOrders,
  fetchVoucherQRCode,
  recordPhoneContactClick,
  canUseUserRTCContact,
  loadRTCRuntimeSettings,
  mapAfterSalesItem,
  mapOrderItem,
  ContactModal,
  PhoneWarningModal,
})
