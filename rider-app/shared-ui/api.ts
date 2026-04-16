/**
 * 骑手端 API 接口
 */

import config from './config'
import { buildAuthorizationHeaders } from '../../packages/client-sdk/src/auth.js'
import {
  createMobilePushApi,
  createRiderPreferenceApi,
} from '../../packages/client-sdk/src/mobile-capabilities.js'
import {
  extractEnvelopeData,
  extractPaginatedItems,
  extractSMSResult,
} from '../../packages/contracts/src/http.js'
import {
  readStoredBearerToken,
  uploadAuthenticatedAsset,
} from '../../packages/mobile-core/src/upload.js'

declare const uni: any

export const getBaseUrl = () => config.API_BASE_URL

export const fetchPublicRuntimeSettings = () => request({
  url: '/api/public/runtime-settings',
  method: 'GET'
})

export const recordPhoneContactClick = (payload: Record<string, any>) => request({
  url: '/api/contact/phone-clicks',
  method: 'POST',
  data: payload
})

function readAuthToken(): string {
  return readStoredBearerToken(uni, ['token', 'access_token'])
}

export function request(options: any) {
  const baseUrl = getBaseUrl()
  const token = readAuthToken()
  const headers: Record<string, string> = Object.assign(
    { 'Content-Type': 'application/json' },
    options.header || {}
  )
  if (token && !headers.Authorization && !headers.authorization) {
    headers.Authorization = token
  }

  return new Promise((resolve, reject) => {
    uni.request({
      url: baseUrl + options.url,
      method: options.method || 'GET',
      data: options.data || {},
      header: headers,
      timeout: config.TIMEOUT,
      success(res: any) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data)
        } else {
          const error = {
            data: res.data,
            error: res.data?.error || `请求失败: ${res.statusCode}`,
            statusCode: res.statusCode
          }
          reject(error)
        }
      },
      fail(err: any) {
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

export function uploadImage(filePath: string) {
  return uploadAuthenticatedAsset({
    uniApp: uni,
    baseUrl: getBaseUrl(),
    filePath,
    token: readAuthToken(),
  })
}

export function buildAuthorizationHeader(token: string): Record<string, string> {
  return buildAuthorizationHeaders(token)
}

export function readAuthorizationHeader(): Record<string, string> {
  const token = readAuthToken()
  return buildAuthorizationHeader(token)
}

const mobilePushApi = createMobilePushApi({
  post(url: string, data?: Record<string, any>) {
    return request({
      url,
      method: 'POST',
      data,
    })
  },
})

const riderPreferenceApi = createRiderPreferenceApi({
  get(url: string) {
    return request({
      url,
      method: 'GET',
    })
  },
  post(url: string, data?: Record<string, any>) {
    return request({
      url,
      method: 'POST',
      data,
    })
  },
})

export const { registerPushDevice, unregisterPushDevice, ackPushMessage } = mobilePushApi

// 骑手登录
export const riderLogin = (credentials: any) => request({
  url: '/api/auth/rider/login',
  method: 'POST',
  data: credentials
})

// 发送验证码
export const requestSMSCode = (phone: string, scene: string = 'rider_login', extra: Record<string, unknown> = {}) => request({
  url: '/api/request-sms-code',
  method: 'POST',
  data: { phone, scene, ...extra }
}).then((response: any) => extractSMSResult(response))

export const verifySMSCodeCheck = (phone: string, scene: string, code: string) => request({
  url: '/api/verify-sms-code-check',
  method: 'POST',
  data: { phone, scene, code }
}).then((response: any) => extractSMSResult(response))

export const fetchConversations = () => request({
  url: '/api/messages/conversations',
  method: 'GET'
}).then((payload: any) => extractPaginatedItems(payload, {
  listKeys: ['conversations', 'items', 'records', 'list'],
}).items)

export const upsertConversation = (payload: Record<string, any>) => request({
  url: '/api/messages/conversations/upsert',
  method: 'POST',
  data: payload
}).then((response: any) => extractEnvelopeData(response) || {})

export const markConversationRead = (chatId: string) => request({
  url: `/api/messages/conversations/${encodeURIComponent(chatId)}/read`,
  method: 'POST'
})

export const fetchHistory = (roomId: string) => request({
  url: `/api/messages/${encodeURIComponent(roomId)}`,
  method: 'GET'
}).then((payload: any) => extractPaginatedItems(payload, {
  listKeys: ['messages', 'items', 'records', 'list'],
}).items)

// 获取骑手信息
export const fetchRiderInfo = () => {
  const riderId = uni.getStorageSync('riderId')
  if (!riderId) return Promise.resolve(null)
  return request({ url: `/api/riders/${riderId}` })
}

// 获取订单列表
export const fetchRiderOrders = (status?: string) => {
  const riderId = uni.getStorageSync('riderId')
  if (!riderId) return Promise.resolve([])
  return request({
    url: status === 'available' ? '/api/riders/orders/available' : `/api/riders/${riderId}/orders`,
    method: 'GET',
    data: status && status !== 'available' ? { status } : {}
  })
}

export const { fetchRiderPreferences, saveRiderPreferences } = riderPreferenceApi

const riderPayload = () => {
  const riderId = uni.getStorageSync('riderId')
  if (!riderId) return {}
  return { rider_id: String(riderId) }
}

// 接单
export const acceptOrder = (orderId: string) => request({
  url: `/api/orders/${orderId}/accept`,
  method: 'POST',
  data: riderPayload()
})

// 取货
export const pickupOrder = (orderId: string) => request({
  url: `/api/orders/${orderId}/pickup`,
  method: 'POST',
  data: riderPayload()
})

// 送达
export const deliverOrder = (orderId: string) => request({
  url: `/api/orders/${orderId}/deliver`,
  method: 'POST',
  data: riderPayload()
})

export const reportOrderException = (orderId: string, data: any) => request({
  url: `/api/orders/${orderId}/exception-report`,
  method: 'POST',
  data
})

// 获取收入明细
export const fetchEarnings = (params?: any) => {
  const riderId = uni.getStorageSync('riderId')
  if (!riderId) {
    return Promise.resolve({
      success: true,
      summary: { totalIncome: 0, settledIncome: 0, pendingIncome: 0, orderCount: 0 },
      items: []
    })
  }
  return request({ url: `/api/riders/${riderId}/earnings`, data: params })
}

// 获取数据统计
export const fetchRiderStats = () => {
  const riderId = uni.getStorageSync('riderId')
  if (!riderId) return Promise.resolve({ todayEarnings: '0', completedCount: 0 })
  return request({ url: `/api/riders/${riderId}/stats` })
}

// 更新骑手在线状态
export const updateRiderStatus = (isOnline: boolean) => {
  const riderId = uni.getStorageSync('riderId')
  if (!riderId) {
    return Promise.resolve(null)
  }
  return request({
    url: `/api/riders/${riderId}/online-status`,
    method: 'PUT',
    data: { is_online: isOnline }
  })
}

// 骑手在线心跳
export const heartbeatRiderStatus = () => {
  const riderId = uni.getStorageSync('riderId')
  if (!riderId) return Promise.resolve(null)
  return request({
    url: `/api/riders/${riderId}/heartbeat`,
    method: 'POST'
  })
}

// 更新头像
export const updateAvatar = (avatar: string) => {
  const riderId = uni.getStorageSync('riderId')
  if (!riderId) return Promise.resolve(null)
  return request({
    url: `/api/riders/${riderId}/avatar`,
    method: 'PUT',
    data: { avatar }
  })
}

// 获取骑手资料
export const getRiderProfile = () => {
  const riderId = uni.getStorageSync('riderId')
  if (!riderId) return Promise.resolve(null)
  return request({ url: `/api/riders/${riderId}/profile` })
}

// 更新骑手资料
export const updateRiderProfile = (data: any) => {
  const riderId = uni.getStorageSync('riderId')
  if (!riderId) return Promise.resolve(null)
  return request({
    url: `/api/riders/${riderId}/profile`,
    method: 'PUT',
    data
  })
}

// 修改手机号
export const changePhone = (data: any) => {
  const riderId = uni.getStorageSync('riderId')
  if (!riderId) return Promise.resolve(null)
  return request({
    url: `/api/riders/${riderId}/change-phone`,
    method: 'POST',
    data
  })
}

// 修改密码
export const changePassword = (data: any) => {
  const riderId = uni.getStorageSync('riderId')
  if (!riderId) return Promise.resolve(null)
  return request({
    url: `/api/riders/${riderId}/change-password`,
    method: 'POST',
    data
  })
}

// 获取骑手段位信息
export const getRiderRank = () => {
  const riderId = uni.getStorageSync('riderId')
  if (!riderId) return Promise.resolve(null)
  return request({
    url: `/api/riders/${riderId}/rank`,
    method: 'GET'
  })
}

// 获取骑手评分摘要
export const getRiderRating = () => {
  const riderId = uni.getStorageSync('riderId')
  if (!riderId) return Promise.resolve(null)
  return request({
    url: `/api/riders/${riderId}/rating`,
    method: 'GET'
  })
}

// 获取排行榜
export const getRankList = (type: string) => {
  return request({
    url: `/api/riders/rank-list?type=${type}`,
    method: 'GET'
  })
}
