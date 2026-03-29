function trimValue(value) {
  return String(value || '').trim()
}

function normalizePhoneNumber(value) {
  const text = trimValue(value)
  if (!text) return ''
  const matches = text.match(/\d+/g)
  return matches ? matches.join('') : text
}

function resolvePlatform() {
  try {
    const info = uni.getSystemInfoSync() || {}
    return trimValue(info.uniPlatform || info.platform || '')
  } catch (_err) {
    return ''
  }
}

function buildAuditPayload(payload = {}) {
  const phoneNumber = normalizePhoneNumber(payload.phoneNumber || payload.targetPhone)
  return {
    targetRole: trimValue(payload.targetRole),
    targetId: trimValue(payload.targetId),
    targetPhone: phoneNumber,
    contactChannel: 'system_phone',
    entryPoint: trimValue(payload.entryPoint),
    scene: trimValue(payload.scene),
    orderId: trimValue(payload.orderId),
    roomId: trimValue(payload.roomId),
    pagePath: trimValue(payload.pagePath),
    clientPlatform: trimValue(payload.clientPlatform || resolvePlatform()),
    clientResult: trimValue(payload.clientResult || 'clicked'),
    metadata: payload.metadata && typeof payload.metadata === 'object' ? payload.metadata : undefined,
  }
}

export function createPhoneContactHelper(options = {}) {
  const recordPhoneContactClick =
    typeof options.recordPhoneContactClick === 'function'
      ? options.recordPhoneContactClick
      : null

  async function makePhoneCall(payload = {}) {
    const phoneNumber = normalizePhoneNumber(payload.phoneNumber || payload.targetPhone)
    if (!/^1\d{10}$/.test(phoneNumber)) {
      throw new Error('invalid phone number')
    }

    if (recordPhoneContactClick) {
      try {
        await recordPhoneContactClick(buildAuditPayload({ ...payload, phoneNumber }))
      } catch (err) {
        console.warn('[phone-contact] audit failed:', err)
      }
    }

    return new Promise((resolve, reject) => {
      uni.makePhoneCall({
        phoneNumber,
        success: () => resolve({ success: true, phoneNumber }),
        fail: (err) => reject(err || new Error('makePhoneCall failed')),
      })
    })
  }

  return {
    makePhoneCall,
    normalizePhoneNumber,
  }
}
