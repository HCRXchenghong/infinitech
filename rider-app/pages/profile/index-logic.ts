import Vue from 'vue'
import riderOrderStore from '../../shared-ui/riderOrderStore'
import { getRiderRank, fetchRiderStats } from '../../shared-ui/api'
import { getCachedSupportRuntimeSettings, loadSupportRuntimeSettings } from '../../shared-ui/support-runtime'
import {
  getCachedPlatformRuntimeSettings,
  loadPlatformRuntimeSettings
} from '../../shared-ui/platform-runtime'
import { readRiderAuthIdentity } from '../../shared-ui/auth-session.js'
import { formatRoleId } from '../../shared-ui/utils'
import { createRiderProfileHomePageLogic } from '../../../packages/mobile-core/src/rider-profile-home-page.js'

export default Vue.extend(createRiderProfileHomePageLogic({
  riderOrderStore,
  getRiderRank,
  fetchRiderStats,
  getCachedSupportRuntimeSettings,
  loadSupportRuntimeSettings,
  getCachedPlatformRuntimeSettings,
  loadPlatformRuntimeSettings,
  readRiderAuthIdentity,
  formatRoleId,
  uniApp: uni
}) as any)
