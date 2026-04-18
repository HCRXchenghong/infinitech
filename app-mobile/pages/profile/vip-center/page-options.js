import { fetchPointsBalance, fetchPointsGoods, fetchPublicVIPSettings } from '@/shared-ui/api.js'
import { createProfileVipCenterPageOptions } from '../../../../packages/mobile-core/src/vip-center.js'

export default createProfileVipCenterPageOptions({
  fetchPointsBalance,
  fetchPointsGoods,
  fetchPublicVIPSettings
})
