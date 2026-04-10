function readAppVersion() {
  try {
    if (typeof uni !== 'undefined' && typeof uni.getAppBaseInfo === 'function') {
      const info = uni.getAppBaseInfo()
      const version = String((info && (info.appVersion || info.version)) || '').trim()
      if (version) return version
    }
  } catch (_err) {}

  try {
    if (typeof plus !== 'undefined' && plus && plus.runtime && plus.runtime.version) {
      const version = String(plus.runtime.version || '').trim()
      if (version) return version
    }
  } catch (_err) {}

  try {
    if (typeof uni !== 'undefined' && typeof uni.getSystemInfoSync === 'function') {
      const info = uni.getSystemInfoSync()
      const version = String((info && (info.appVersion || info.version)) || '').trim()
      if (version) return version
    }
  } catch (_err) {}

  return ''
}

export function getAppVersionLabel() {
  const version = readAppVersion()
  return version ? `v${version}` : '未识别'
}
