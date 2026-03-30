// uni-app Vue2 版本接口封装（可直接在 HBuilder 运行）
// 统一走 Node.js 中后端（BFF），BFF 会转发请求到 Go 后端
import config from './config'

// 从配置文件读取 API 地址（动态读取，支持运行时更新）
export const getBaseUrl = () => config.API_BASE_URL
// 兼容旧引用（如仍有 BASE_URL 使用）
export const BASE_URL = getBaseUrl

export function request(options) {
  const baseUrl = getBaseUrl()
  return new Promise((resolve, reject) => {
    uni.request({
      url: baseUrl + options.url,
      method: options.method || 'GET',
      data: options.data || {},
      header: Object.assign(
        { 'Content-Type': 'application/json' },
        options.header || {}
      ),
      timeout: config.TIMEOUT, // 从配置读取超时时间
      success(res) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data)
        } else {
          // 将错误信息包装成统一格式
          const error = {
            data: res.data,
            error: res.data?.error || `请求失败: ${res.statusCode}`,
            statusCode: res.statusCode
          }
          reject(error)
        }
      },
      fail(err) {
        // 只在开发环境或非网络错误时记录详细日志
        const isNetworkError = err.errMsg?.includes('fail') || err.errMsg?.includes('connect')
        
        if (!isNetworkError || config.isDev) {
          console.error('请求失败:', err)
        }
        
        let errorMessage = '网络请求失败，请检查网络连接'
        
        if (err.errMsg) {
          if (err.errMsg.includes('timeout')) {
            errorMessage = '请求超时，请检查后端服务是否运行（端口25500）'
          } else if (err.errMsg.includes('fail')) {
            errorMessage = `无法连接到服务器，请确认后端服务已启动（${baseUrl}）`
          } else {
            errorMessage = err.errMsg
          }
        }
        
        reject({
          error: errorMessage,
          message: errorMessage
        })
      }
    })
  })
}

// 商家相关 API（集成本地缓存）
import getSyncService from './sync'

const syncService = getSyncService()

const normalizeProductList = (response) => {
  if (Array.isArray(response)) {
    return response
  }
  if (response && Array.isArray(response.products)) {
    return response.products
  }
  if (response && response.data && Array.isArray(response.data.products)) {
    return response.data.products
  }
  if (response && response.data && Array.isArray(response.data)) {
    return response.data
  }
  return []
}

const sortProductsByDisplayOrder = (products = []) =>
  [...products].sort((left, right) => {
    const leftCategory = Number(left.categoryId || left.category_id || 0)
    const rightCategory = Number(right.categoryId || right.category_id || 0)
    if (leftCategory !== rightCategory) {
      return leftCategory - rightCategory
    }

    const leftOrder = Number(left.sortOrder || left.sort_order || 0)
    const rightOrder = Number(right.sortOrder || right.sort_order || 0)
    if (leftOrder !== rightOrder) {
      return leftOrder - rightOrder
    }

    return String(right.id || '').localeCompare(String(left.id || ''))
  })

export const fetchShopCategories = async () => {
  return await request({ url: '/api/shops/categories' })
}

export const fetchShops = async (params) => {
  // 店铺列表使用强制刷新，避免新增店铺被本地旧缓存遮挡
  return await syncService.getData('shops', params, { preferFresh: true })
}

export const fetchShopDetail = async (shopId) => {
  // 详情也优先取新数据，失败再回退本地
  const data = await syncService.getData('shops', { id: shopId }, { preferFresh: true })
  if (Array.isArray(data) && data.length > 0) {
    return data[0]
  }
  if (data && typeof data === 'object') {
    return data
  }
  // 本地没有，请求服务器
  return await request({ 
    url: `/api/shops/${shopId}` 
  })
}

export const fetchShopMenu = async (shopId) => {
  return await fetchProducts(shopId)
}

// 订单相关 API（直接调用后端API，不使用本地缓存）
export const fetchOrders = async (userId) => {
  // 直接请求服务器获取最新订单数据
  return await request({
    url: `/api/orders/user/${userId}`
  })
}

export const fetchOrderDetail = async (orderId) => {
  // 详情优先请求服务器，确保拿到骑手评分等最新字段；失败时再回退本地缓存
  try {
    return await request({
      url: `/api/orders/${orderId}`
    })
  } catch (error) {
    const localData = await syncService.getData('orders', { id: orderId })
    if (localData && localData.length > 0) {
      return localData[0]
    }
    throw error
  }
}

export const createOrder = (payload) => request({ 
  url: '/api/orders', 
  method: 'POST', 
  data: payload 
})

export const consultMedicineAssistant = (payload) => request({
  url: '/api/medicine/consult',
  method: 'POST',
  data: payload
})

export const listDiningBuddyParties = (params = {}) => request({
  url: '/api/dining-buddy/parties',
  method: 'GET',
  data: params
})

export const createDiningBuddyParty = (payload) => request({
  url: '/api/dining-buddy/parties',
  method: 'POST',
  data: payload
})

export const joinDiningBuddyParty = (partyId) => request({
  url: `/api/dining-buddy/parties/${encodeURIComponent(partyId)}/join`,
  method: 'POST'
})

export const fetchDiningBuddyMessages = (partyId) => request({
  url: `/api/dining-buddy/parties/${encodeURIComponent(partyId)}/messages`,
  method: 'GET'
})

export const sendDiningBuddyMessage = (partyId, payload) => request({
  url: `/api/dining-buddy/parties/${encodeURIComponent(partyId)}/messages`,
  method: 'POST',
  data: payload
})

export const createAfterSales = (payload) => request({
  url: '/api/after-sales',
  method: 'POST',
  data: payload
})

export const fetchAfterSalesList = (userId) => request({
  url: `/api/after-sales/user/${encodeURIComponent(userId)}`
})

export const fetchGroupbuyVouchers = (params = {}) => request({
  url: '/api/groupbuy/vouchers',
  method: 'GET',
  data: params
})

export const fetchVoucherQRCode = (voucherId) => request({
  url: `/api/groupbuy/vouchers/${encodeURIComponent(voucherId)}/qrcode`,
  method: 'GET'
})

export const fetchUserCoupons = (params = {}) => request({
  url: '/api/coupons/user',
  method: 'GET',
  data: params
})

export const uploadAfterSalesEvidence = (filePath) => {
  const baseUrl = getBaseUrl()
  return new Promise((resolve, reject) => {
    uni.uploadFile({
      url: `${baseUrl}/api/upload`,
      filePath,
      name: 'file',
      success(res) {
        let parsed = null
        try {
          parsed = typeof res.data === 'string' ? JSON.parse(res.data) : res.data
        } catch (error) {
          reject({ error: '上传响应解析失败', raw: res.data })
          return
        }

        if (res.statusCode >= 200 && res.statusCode < 300 && parsed && parsed.url) {
          resolve(parsed)
          return
        }

        reject({
          statusCode: res.statusCode,
          data: parsed,
          error: parsed?.error || '上传失败'
        })
      },
      fail(err) {
        reject({
          error: err?.errMsg || '上传失败'
        })
      }
    })
  })
}

export const uploadCommonImage = (filePath) => uploadAfterSalesEvidence(filePath)

// 用户相关 API
export const fetchUser = (userId) => request({ 
  url: `/api/user/${userId}` 
})

export const fetchUserFavorites = (userId, params = {}) => request({
  url: `/api/user/${userId}/favorites`,
  method: 'GET',
  data: params
})

export const addUserFavorite = (userId, shopId) => request({
  url: `/api/user/${userId}/favorites`,
  method: 'POST',
  data: { shopId }
})

export const deleteUserFavorite = (userId, shopId) => request({
  url: `/api/user/${userId}/favorites/${shopId}`,
  method: 'DELETE'
})

export const fetchUserFavoriteStatus = (userId, shopId) => request({
  url: `/api/user/${userId}/favorites/${shopId}/status`,
  method: 'GET'
})

export const fetchUserReviews = (userId, params = {}) => request({
  url: `/api/user/${userId}/reviews`,
  method: 'GET',
  data: params
})

export const login = (credentials) => request({ 
  url: '/api/auth/login', 
  method: 'POST', 
  data: credentials 
})

export const register = (userData) => request({ 
  url: '/api/auth/register', 
  method: 'POST', 
  data: userData 
})

export const consumeWechatSession = (token) => request({
  url: '/api/auth/wechat/session',
  method: 'GET',
  data: { token }
})

export const wechatBindLogin = (payload) => request({
  url: '/api/auth/wechat/bind-login',
  method: 'POST',
  data: payload
})

export const requestSMSCode = (phone, scene, extra = {}) => request({
  url: '/api/request-sms-code',
  method: 'POST',
  data: {
    phone,
    scene,
    ...extra
  }
})

export const verifySMSCodeCheck = (phone, scene, code) => request({
  url: '/api/verify-sms-code-check',
  method: 'POST',
  data: {
    phone,
    scene,
    code
  }
})

export const changeUserPhone = (userId, payload) => request({
  url: `/api/user/${encodeURIComponent(userId)}/change-phone`,
  method: 'POST',
  data: payload
})

export const updateUserProfile = (userId, payload) => request({
  url: `/api/user/${encodeURIComponent(userId)}`,
  method: 'PUT',
  data: payload
})

export const fetchUserAddresses = async (userId) => {
  const res = await request({
    url: `/api/user/${encodeURIComponent(userId)}/addresses`,
    method: 'GET'
  })
  return Array.isArray(res?.data) ? res.data : []
}

export const fetchDefaultUserAddress = async (userId) => {
  const res = await request({
    url: `/api/user/${encodeURIComponent(userId)}/addresses/default`,
    method: 'GET'
  })
  return res?.data || null
}

export const registerPushDevice = (payload) => request({
  url: '/api/mobile/push/devices/register',
  method: 'POST',
  data: payload
})

export const unregisterPushDevice = (payload) => request({
  url: '/api/mobile/push/devices/unregister',
  method: 'POST',
  data: payload
})

export const ackPushMessage = (payload) => request({
  url: '/api/mobile/push/ack',
  method: 'POST',
  data: payload
})

export const recordPhoneContactClick = (payload) => request({
  url: '/api/contact/phone-clicks',
  method: 'POST',
  data: payload
})

export const createRTCCall = (payload) => request({
  url: '/api/rtc/calls',
  method: 'POST',
  data: payload
})

export const getRTCCall = (callId) => request({
  url: `/api/rtc/calls/${encodeURIComponent(callId)}`,
  method: 'GET'
})

export const listRTCCallHistory = (params = {}) => request({
  url: '/api/rtc/calls/history',
  method: 'GET',
  data: params
})

export const updateRTCCallStatus = (callId, payload) => request({
  url: `/api/rtc/calls/${encodeURIComponent(callId)}/status`,
  method: 'POST',
  data: payload
})

export const createUserAddress = (userId, payload) => request({
  url: `/api/user/${encodeURIComponent(userId)}/addresses`,
  method: 'POST',
  data: payload
})

export const updateUserAddress = (userId, addressId, payload) => request({
  url: `/api/user/${encodeURIComponent(userId)}/addresses/${encodeURIComponent(addressId)}`,
  method: 'PUT',
  data: payload
})

export const deleteUserAddress = (userId, addressId) => request({
  url: `/api/user/${encodeURIComponent(userId)}/addresses/${encodeURIComponent(addressId)}`,
  method: 'DELETE'
})

export const setDefaultUserAddress = (userId, addressId) => request({
  url: `/api/user/${encodeURIComponent(userId)}/addresses/${encodeURIComponent(addressId)}/default`,
  method: 'POST'
})

// 积分/邀请/合作相关
export const fetchPointsBalance = (userId) => request({
  url: '/api/points/balance',
  method: 'GET',
  data: { userId }
})

export const fetchPointsGoods = (params = {}) => request({
  url: '/api/points/goods',
  method: 'GET',
  data: params
})

export const redeemPoints = (payload) => request({
  url: '/api/points/redeem',
  method: 'POST',
  data: payload
})

export const earnPoints = (payload) => request({
  url: '/api/points/earn',
  method: 'POST',
  data: payload
})

export const refundPoints = (payload) => request({
  url: '/api/points/refund',
  method: 'POST',
  data: payload
})

export const submitCooperation = (payload) => request({
  url: '/api/cooperations',
  method: 'POST',
  data: payload
})

export const fetchInviteCode = (params) => request({
  url: '/api/invite/code',
  method: 'GET',
  data: params
})

export const recordInviteShare = (payload) => request({
  url: '/api/invite/share',
  method: 'POST',
  data: payload
})

// 商品相关 API（集成本地缓存）
export const fetchPublicRuntimeSettings = () => request({
  url: '/api/public/runtime-settings',
  method: 'GET'
})

export const fetchPublicCharitySettings = () => request({
  url: '/api/public/charity-settings',
  method: 'GET'
})

export const fetchPublicVIPSettings = () => request({
  url: '/api/public/vip-settings',
  method: 'GET'
})

export const fetchCategories = (shopId) => request({
  url: `/api/categories?shopId=${shopId}`
})

export const fetchProducts = async (shopId, categoryId) => {
  const response = await syncService.getData(
    'products',
    { shop_id: shopId },
    { preferFresh: true }
  )

  const products = sortProductsByDisplayOrder(normalizeProductList(response))
  if (!categoryId) {
    return products
  }

  const normalizedCategoryId = String(categoryId)
  return products.filter((item) => {
    const currentCategoryId = item.categoryId || item.category_id
    return String(currentCategoryId) === normalizedCategoryId
  })
}

export const fetchBanners = (shopId) => request({
  url: `/api/banners?shopId=${shopId}`
})

export const fetchProductDetail = async (productId) => {
  // 优先从本地缓存读取
  const localData = await syncService.getData('products', { id: productId })
  if (localData && localData.length > 0) {
    return localData[0]
  }
  // 本地没有，请求服务器
  return await request({
    url: `/api/products/${productId}`
  })
}

export const fetchHomeFeed = async (params = {}) => {
  const response = await request({
    url: '/api/home/feed',
    method: 'GET',
    data: params
  })

  if (response && typeof response === 'object') {
    return {
      shops: Array.isArray(response.shops) ? response.shops : [],
      products: Array.isArray(response.products) ? response.products : [],
      campaigns: Number(response.campaigns || 0)
    }
  }

  return {
    shops: [],
    products: [],
    campaigns: 0
  }
}

function buildWeatherTips(weatherData = {}) {
  const indices = weatherData?.life_indices || {}
  const umbrellaAdvice = indices?.umbrella?.advice
  const uvAdvice = indices?.uv?.advice
  const travelAdvice = indices?.travel?.advice
  if (umbrellaAdvice) return umbrellaAdvice
  if (uvAdvice) return uvAdvice
  if (travelAdvice) return travelAdvice

  const condition = String(weatherData?.weather || weatherData?.weather_main || '')
  if (condition.includes('雨')) return '外出建议带伞，注意路面湿滑'
  if (condition.includes('雪')) return '天气寒冷，注意防滑保暖'
  if (condition.includes('霾') || condition.includes('雾')) return '空气一般，建议佩戴口罩出行'
  return '天气平稳，出门前记得补充水分'
}

function getAirQualityText(weatherData = {}) {
  if (weatherData?.aqi_category) return weatherData.aqi_category
  if (weatherData?.air_quality) return weatherData.air_quality

  const aqi = Number(weatherData?.aqi)
  if (!Number.isFinite(aqi)) return '良好'
  if (aqi <= 50) return '优'
  if (aqi <= 100) return '良'
  if (aqi <= 150) return '轻度污染'
  if (aqi <= 200) return '中度污染'
  return '重度污染'
}

// 天气 API
export const fetchWeather = async (lat, lng, options = {}) => {
  void lat
  void lng
  const fallback = {
    temp: 26,
    condition: '多云',
    icon: 'cloud'
  }

  const params = {
    lang: String(options.lang || 'zh'),
    extended: true,
    forecast: true,
    hourly: true,
    minutely: true,
    indices: true
  }

  try {
    const weatherData = await request({
      url: '/api/public/weather',
      method: 'GET',
      data: params
    })

    if (!weatherData || weatherData.available === false) {
      return fallback
    }

    const parsedTemp = Number(weatherData.temperature)
    const parsedFeelsLike = Number(weatherData.feels_like)

    return {
      temp: Number.isFinite(parsedTemp) ? Math.round(parsedTemp) : fallback.temp,
      condition: weatherData.weather || weatherData.weather_main || fallback.condition,
      icon: weatherData.weather_icon || fallback.icon,
      feelsLike: Number.isFinite(parsedFeelsLike) ? Math.round(parsedFeelsLike) : (Number.isFinite(parsedTemp) ? Math.round(parsedTemp) : fallback.temp),
      airQuality: getAirQualityText(weatherData),
      tips: buildWeatherTips(weatherData),
      city: weatherData.city_name || weatherData.city || '',
      province: weatherData.province || '',
      humidity: weatherData.humidity,
      windDirection: weatherData.wind_direction,
      windPower: weatherData.wind_power,
      reportTime: weatherData.report_time,
      refreshIntervalMinutes: weatherData.refresh_interval_minutes || 10,
      raw: weatherData
    }
  } catch (error) {
    return fallback
  }
}

// 逆地理编码 API（后续对接真实接口）
export const reverseGeocode = async (lat, lng) => {
  const parsedLat = Number(lat)
  const parsedLng = Number(lng)
  const fallbackAddress =
    Number.isFinite(parsedLat) && Number.isFinite(parsedLng)
      ? `${parsedLat.toFixed(6)},${parsedLng.toFixed(6)}`
      : ''
  if (!Number.isFinite(parsedLat) || !Number.isFinite(parsedLng)) {
    return {
      address: fallbackAddress,
      district: '',
      city: ''
    }
  }
  try {
    const res = await request({
      url: '/api/mobile/maps/reverse-geocode',
      method: 'GET',
      data: {
        lat: parsedLat,
        lng: parsedLng
      }
    })
    const address = res && typeof res.address === 'object' ? res.address : {}
    return {
      address: res.displayName || fallbackAddress,
      district: address.city_district || address.suburb || address.town || address.county || '',
      city: address.city || address.county || address.state || ''
    }
  } catch (error) {
    return {
      address: fallbackAddress,
      district: '',
      city: ''
    }
  }
}

// 消息相关 API（实时通讯通过 Socket.IO，这里只获取历史记录）
export const fetchConversations = () => request({ 
  url: '/api/messages/conversations' 
})

export const upsertConversation = (payload) => request({
  url: '/api/messages/conversations/upsert',
  method: 'POST',
  data: payload
})

export const markConversationRead = (chatId) => request({
  url: `/api/messages/conversations/${encodeURIComponent(chatId)}/read`,
  method: 'POST'
})

export const markAllConversationsRead = () => request({
  url: '/api/messages/conversations/read-all',
  method: 'POST'
})

export const fetchHistory = (roomId) => request({ 
  url: `/api/messages/${roomId}` 
})

// 通知相关 API
export const fetchNotificationList = (params = {}, legacyPageSize) => {
  const normalized =
    typeof params === 'number'
      ? { page: params, pageSize: legacyPageSize }
      : (params && typeof params === 'object' ? params : {})
  const { page = 1, pageSize = 20 } = normalized
  return request({
    url: `/api/notifications?page=${page}&pageSize=${pageSize}`
  })
}

export const fetchNotificationDetail = (id) => request({
  url: `/api/notifications/${id}`
})

export const markNotificationRead = (id) => request({
  url: `/api/notifications/${id}/read`,
  method: 'POST'
})

export const markAllNotificationsRead = () => request({
  url: '/api/notifications/read-all',
  method: 'POST'
})
