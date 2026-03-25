declare const uni: any
declare const plus: any

export interface LocationResult {
  latitude: number
  longitude: number
  address: string
  city?: string
  district?: string
  province?: string
}

export function getCurrentLocation(): Promise<LocationResult> {
  return new Promise((resolve, reject) => {
    const normalize = (latitude: any, longitude: any, addressInfo: Record<string, any> = {}) => {
      const parsedLatitude = Number(latitude)
      const parsedLongitude = Number(longitude)
      if (!Number.isFinite(parsedLatitude) || !Number.isFinite(parsedLongitude)) {
        reject(new Error('invalid location coordinates'))
        return
      }

      const normalizedAddress = normalizeAddressPayload(addressInfo)
      const addressText = normalizedAddress.address || buildAddressFromParts(normalizedAddress) || ''
      resolve({
        latitude: parsedLatitude,
        longitude: parsedLongitude,
        address: addressText,
        city: normalizedAddress.city,
        district: normalizedAddress.district,
        province: normalizedAddress.province
      })
    }

    const fallback = (originErr?: any) => {
      uni.getLocation({
        type: 'gcj02',
        geocode: true,
        isHighAccuracy: true,
        success: (res: any) => {
          const latitude = Number(res.latitude)
          const longitude = Number(res.longitude)
          if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
            reject(originErr || new Error('invalid location coordinates'))
            return
          }
          normalize(latitude, longitude, normalizeUniLocationResult(res))
        },
        fail: (err: any) => {
          reject(originErr || err)
        }
      })
    }

    ensureLocationPermission()
      .then(() => {
        // #ifdef APP-PLUS
        try {
          if (typeof plus !== 'undefined' && plus?.geolocation) {
            plus.geolocation.getCurrentPosition(
              (pos: any) => {
                const coords = pos.coords || {}
                const latitude = coords.latitude ?? pos.latitude
                const longitude = coords.longitude ?? pos.longitude
                const parsedLatitude = Number(latitude)
                const parsedLongitude = Number(longitude)
                if (!Number.isFinite(parsedLatitude) || !Number.isFinite(parsedLongitude)) {
                  fallback(new Error('invalid location coordinates'))
                  return
                }
                normalize(parsedLatitude, parsedLongitude, {
                  address: pos.addresses,
                  ...(pos.address || {})
                })
              },
              (err: any) => {
                fallback(err)
              },
              {
                provider: 'system',
                coordsType: 'gcj02',
                geocode: true,
                enableHighAccuracy: true,
                timeout: 10000
              }
            )
            return
          }
        } catch (e) {
          // ignore, fallback to uni.getLocation
        }
        // #endif

        fallback()
      })
      .catch((err) => {
        reject(err)
      })
  })
}

function normalizeUniLocationResult(res: Record<string, any> = {}) {
  const addressField = res.address
  const addressObject =
    addressField && typeof addressField === 'object' ? addressField : {}
  return {
    address: typeof addressField === 'string' ? addressField : '',
    addresses: res.addresses,
    city: res.city || addressObject.city,
    district: res.district || addressObject.district,
    province: res.province || addressObject.province,
    street: res.street || addressObject.street,
    streetNum: res.streetNum || addressObject.streetNum,
    poiName: res.poiName || res.name || addressObject.poiName
  }
}

function normalizeAddressPayload(payload: Record<string, any> = {}) {
  const source = payload && typeof payload === 'object' ? payload : {}
  return {
    address: pickText(
      source.address,
      source.addresses,
      source.formattedAddress,
      source.formatted_addresses
    ),
    city: pickText(source.city),
    district: pickText(source.district),
    province: pickText(source.province),
    street: pickText(source.street),
    streetNum: pickText(source.streetNum, source.street_number),
    poiName: pickText(source.poiName, source.name)
  }
}

function pickText(...values: any[]) {
  for (const value of values) {
    if (typeof value !== 'string') continue
    const text = value.trim()
    if (text) return text
  }
  return ''
}

function buildAddressFromParts(address: Record<string, any>) {
  if (!address || typeof address !== 'object') return ''
  const parts = [
    address.province,
    address.city,
    address.district,
    address.street,
    address.streetNum,
    address.poiName
  ].filter(Boolean)
  return parts.join('')
}

function ensureLocationPermission() {
  return new Promise<void>((resolve, reject) => {
    // #ifdef APP-PLUS
    ensureAndroidRuntimePermission()
      .then(() => {
        try {
          const canGetSetting = typeof uni.getSetting === 'function'
          const canAuthorize = typeof uni.authorize === 'function'
          const canOpenSetting = typeof uni.openSetting === 'function'

          const askAuthorize = () => {
            if (!canAuthorize) {
              resolve()
              return
            }
            uni.authorize({
              scope: 'scope.userLocation',
              success: () => resolve(),
              fail: () => {
                if (!canOpenSetting) {
                  reject(new Error('permission denied'))
                  return
                }
                uni.showModal({
                  title: '需要定位权限',
                  content: '请在系统设置中开启定位权限后重试',
                  success: (modalRes: any) => {
                    if (!modalRes.confirm) {
                      reject(new Error('permission denied'))
                      return
                    }
                    uni.openSetting({
                      success: (settingRes: any) => {
                        const granted =
                          settingRes.authSetting &&
                          settingRes.authSetting['scope.userLocation']
                        if (granted) resolve()
                        else reject(new Error('permission denied'))
                      },
                      fail: () => reject(new Error('permission denied'))
                    })
                  }
                })
              }
            })
          }

          if (!canGetSetting) {
            askAuthorize()
            return
          }

          uni.getSetting({
            success: (res: any) => {
              const hasAuth = res.authSetting && res.authSetting['scope.userLocation']
              if (hasAuth) {
                resolve()
                return
              }
              askAuthorize()
            },
            fail: () => {
              askAuthorize()
            }
          })
        } catch (e) {
          reject(e)
          return
        }
      })
      .catch((err) => reject(err))
    return
    // #endif

    resolve()
  })
}

function ensureAndroidRuntimePermission() {
  return new Promise<void>((resolve, reject) => {
    // #ifdef APP-PLUS
    try {
      if (typeof plus === 'undefined' || !plus?.os || plus.os.name !== 'Android') {
        resolve()
        return
      }
      if (!plus.android || typeof plus.android.requestPermissions !== 'function') {
        resolve()
        return
      }
      plus.android.requestPermissions(
        [
          'android.permission.ACCESS_FINE_LOCATION',
          'android.permission.ACCESS_COARSE_LOCATION'
        ],
        (result: any) => {
          const deniedAlways = Array.isArray(result?.deniedAlways) ? result.deniedAlways : []
          const deniedPresent = Array.isArray(result?.deniedPresent) ? result.deniedPresent : []
          if (deniedAlways.length || deniedPresent.length) {
            reject(new Error('android permission denied'))
            return
          }
          resolve()
        },
        (err: any) => reject(err)
      )
      return
    } catch (e) {
      reject(e)
      return
    }
    // #endif

    resolve()
  })
}
