import { buildAuthorizationHeader, fetchGroupbuyVouchers, fetchOrderDetail, fetchVoucherQRCode, recordPhoneContactClick, request } from '@/shared-ui/api.js'
import { canUseUserRTCContact, loadRTCRuntimeSettings } from '@/shared-ui/rtc-contact.js'
import {
  getClientPaymentErrorMessage,
  invokeClientPayment,
  isClientPaymentCancelled,
  shouldLaunchClientPayment
} from '@/shared-ui/client-payment.js'
import { normalizeErrorMessage } from '@/shared-ui/foundation/error.js'
import ContactModal from '@/components/ContactModal.vue'
import PhoneWarningModal from '@/components/PhoneWarningModal.vue'
import { createOrderDetailPage } from '../../../../shared/mobile-common/order-detail-page.js'

export default createOrderDetailPage({
  platform: 'mini_program',
  buildAuthorizationHeader,
  fetchGroupbuyVouchers,
  fetchOrderDetail,
  fetchVoucherQRCode,
  recordPhoneContactClick,
  request,
  canUseUserRTCContact,
  loadRTCRuntimeSettings,
  getClientPaymentErrorMessage,
  invokeClientPayment,
  isClientPaymentCancelled,
  shouldLaunchClientPayment,
  normalizeErrorMessage,
  ContactModal,
  PhoneWarningModal,
})
