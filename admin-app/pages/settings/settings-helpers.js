export function parseBoolean(raw, fallback = false) {
  if (typeof raw === 'boolean') return raw
  if (typeof raw === 'number') return raw !== 0
  const text = String(raw || '').trim().toLowerCase()
  if (['1', 'true', 'yes', 'y'].includes(text)) return true
  if (['0', 'false', 'no', 'n'].includes(text)) return false
  if (text === '') return fallback
  return fallback
}

export function resolveSettingValue(payload, keys) {
  if (!payload || typeof payload !== 'object') return undefined
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(payload, key)) {
      return payload[key]
    }
  }
  return undefined
}

export function getErrorMessage(err, fallback = '操作失败') {
  const message = String(err?.message || '').trim()
  return message || fallback
}

export function formatCacheSize(sizeKB) {
  if (!Number.isFinite(sizeKB) || sizeKB < 0) return '--'
  if (sizeKB >= 1024) return `${(sizeKB / 1024).toFixed(2)} MB`
  return `${Math.round(sizeKB)} KB`
}

export function confirmAction(title, content) {
  return new Promise((resolve) => {
    uni.showModal({
      title,
      content,
      success: (res) => resolve(Boolean(res.confirm)),
      fail: () => resolve(false)
    })
  })
}
