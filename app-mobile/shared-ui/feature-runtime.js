import { isRuntimeRouteEnabled, loadPlatformRuntimeSettings } from './platform-runtime.js'

export async function ensureRuntimeFeatureOpen(featureKey, clientScope = 'app-mobile') {
  const runtime = await loadPlatformRuntimeSettings()
  const enabled = isRuntimeRouteEnabled(runtime, 'feature', featureKey, clientScope)
  if (!enabled) {
    uni.showToast({ title: '当前服务暂未开放', icon: 'none' })
    setTimeout(() => {
      uni.navigateBack({
        fail: () => {
          uni.switchTab({ url: '/pages/index/index' })
        }
      })
    }, 500)
  }
  return enabled
}
