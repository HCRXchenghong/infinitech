import { fetchPointsBalance, fetchPointsGoods, fetchPublicVIPSettings } from '@/shared-ui/api.js'
import { createProfileVipCenterPageOptions } from '../../../../shared/mobile-common/profile-vip-center-page-options.js'

export default createProfileVipCenterPageOptions({
  fetchPointsBalance,
  fetchPointsGoods,
  fetchPublicVIPSettings
})
