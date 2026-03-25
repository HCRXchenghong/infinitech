import { fetchPublicRuntimeSettings } from './api'

export interface RiderPortalRuntimeSettings {
  title: string
  subtitle: string
  loginFooter: string
}

export const DEFAULT_RIDER_PORTAL_RUNTIME_SETTINGS: RiderPortalRuntimeSettings = {
  title: '骑手登录',
  subtitle: '悦享e食 · 骑手端',
  loginFooter: '骑手账号由平台邀约开通',
}

let cachedRiderPortalRuntimeSettings: RiderPortalRuntimeSettings = {
  ...DEFAULT_RIDER_PORTAL_RUNTIME_SETTINGS,
}
let hasLoadedRiderPortalRuntimeSettings = false
let riderPortalRuntimePromise: Promise<RiderPortalRuntimeSettings> | null = null

function normalizeRiderPortalRuntimeSettings(payload: any = {}): RiderPortalRuntimeSettings {
  return {
    title:
      String(payload?.rider_portal_title || '').trim() ||
      DEFAULT_RIDER_PORTAL_RUNTIME_SETTINGS.title,
    subtitle:
      String(payload?.rider_portal_subtitle || '').trim() ||
      DEFAULT_RIDER_PORTAL_RUNTIME_SETTINGS.subtitle,
    loginFooter:
      String(payload?.rider_portal_login_footer || '').trim() ||
      DEFAULT_RIDER_PORTAL_RUNTIME_SETTINGS.loginFooter,
  }
}

export function getCachedRiderPortalRuntimeSettings(): RiderPortalRuntimeSettings {
  return { ...cachedRiderPortalRuntimeSettings }
}

export async function loadRiderPortalRuntimeSettings(
  force = false
): Promise<RiderPortalRuntimeSettings> {
  if (hasLoadedRiderPortalRuntimeSettings && !force) {
    return getCachedRiderPortalRuntimeSettings()
  }
  if (riderPortalRuntimePromise && !force) {
    return riderPortalRuntimePromise
  }

  riderPortalRuntimePromise = fetchPublicRuntimeSettings()
    .then((payload: any) => {
      cachedRiderPortalRuntimeSettings = normalizeRiderPortalRuntimeSettings(payload)
      hasLoadedRiderPortalRuntimeSettings = true
      return getCachedRiderPortalRuntimeSettings()
    })
    .catch(() => getCachedRiderPortalRuntimeSettings())
    .finally(() => {
      riderPortalRuntimePromise = null
    })

  return riderPortalRuntimePromise
}
