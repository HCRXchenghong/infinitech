declare const uni: any
declare const plus: any

function readAppVersion(): string {
  try {
    if (typeof uni !== 'undefined' && typeof uni.getAppBaseInfo === 'function') {
      const info = uni.getAppBaseInfo()
      const version = String(info?.appVersion || info?.version || '').trim()
      if (version) return version
    }
  } catch (_err) {}

  try {
    if (typeof plus !== 'undefined' && plus?.runtime?.version) {
      const version = String(plus.runtime.version || '').trim()
      if (version) return version
    }
  } catch (_err) {}

  try {
    if (typeof uni !== 'undefined' && typeof uni.getSystemInfoSync === 'function') {
      const info = uni.getSystemInfoSync()
      const version = String(info?.appVersion || info?.version || '').trim()
      if (version) return version
    }
  } catch (_err) {}

  return ''
}

export function getAppVersionLabel(): string {
  const version = readAppVersion()
  return version ? `v${version}` : '未识别'
}
