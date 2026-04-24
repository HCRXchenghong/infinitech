import Vue from 'vue'
import riderOrderStore, {
  toggleOnlineStatus,
  grabOrder,
  loadAvailableOrders,
  loadRiderData
} from '../../shared-ui/riderOrderStore'
import { getCurrentLocation } from '../../shared-ui/location'
import IconHeadphones from '../../components/svg-icons/icon-headphones.vue'
import IconBell from '../../components/svg-icons/icon-bell.vue'
import { createRiderHallPageLogic } from '../../../packages/mobile-core/src/rider-hall-page.js'

export default Vue.extend(createRiderHallPageLogic({
  riderOrderStore,
  toggleOnlineStatus,
  grabOrder,
  loadAvailableOrders,
  loadRiderData,
  getCurrentLocation,
  uniApp: uni,
  components: {
    IconHeadphones,
    IconBell
  }
}))
