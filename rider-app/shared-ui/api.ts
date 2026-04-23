/**
 * 骑手端 API 接口
 */

import config from './config'
import { buildUniNetworkErrorMessage } from '../../packages/client-sdk/src/uni-request.js'
import { createRiderPreferenceApi } from '../../packages/client-sdk/src/mobile-capabilities.js'
import {
  extractAuthSessionResult,
  extractEnvelopeData,
  extractPaginatedItems,
  extractSMSResult,
} from '../../packages/contracts/src/http.js'
import { UPLOAD_DOMAINS } from '../../packages/contracts/src/upload.js'
import { createRoleApiRuntimeBindings } from '../../packages/mobile-core/src/role-api-shell.js'
import {
  createRoleMessageApi,
  createRoleSMSApi,
} from '../../packages/mobile-core/src/role-message-api.js'
import { readRiderAuthIdentity } from './auth-session.js'

declare const uni: any

const riderApiRuntime = createRoleApiRuntimeBindings({
  role: 'rider',
  config,
  uniApp: uni,
  defaultUploadDomain: UPLOAD_DOMAINS.PROFILE_IMAGE,
  createNetworkError(error: any, { baseUrl }: { baseUrl: string }) {
    const message = buildUniNetworkErrorMessage(
      error,
      { baseUrl },
      {
        defaultMessage: '网络请求失败，请检查网络连接',
        timeoutMessage: '请求超时，请检查后端服务是否运行（端口25500）',
        unreachableMessage: () => `无法连接到服务器，请确认后端服务已启动（${baseUrl}）`,
      },
    )
    return {
      error: message,
      message,
    }
  },
})

export const getBaseUrl = riderApiRuntime.getBaseUrl

export const fetchPublicRuntimeSettings = () => request({
  url: '/api/public/runtime-settings',
  method: 'GET'
})

export const recordPhoneContactClick = (payload: Record<string, any>) => request({
  url: '/api/contact/phone-clicks',
  method: 'POST',
  data: payload
})

export function request(options: any) {
  return riderApiRuntime.request(options)
}

export function uploadImage(
  filePath: string,
  options: { uploadDomain?: string } = {},
) {
  return riderApiRuntime.uploadImage(filePath, options)
}

export function buildAuthorizationHeader(token: string): Record<string, string> {
  return riderApiRuntime.buildAuthorizationHeader(token) as Record<string, string>
}

export function readAuthorizationHeader(): Record<string, string> {
  return riderApiRuntime.readAuthorizationHeader() as Record<string, string>
}

const riderSMSApi = createRoleSMSApi({
  request,
  defaultScene: 'rider_login',
})

const riderMessageApi = createRoleMessageApi({
  request,
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

export const { registerPushDevice, unregisterPushDevice, ackPushMessage } = riderApiRuntime

// 骑手登录
export const riderLogin = (credentials: any) => request({
  url: '/api/auth/rider/login',
  method: 'POST',
  data: credentials
}).then((response: any) => extractAuthSessionResult(response))

// 发送验证码
export const requestSMSCode = (phone: string, scene: string = 'rider_login', extra: Record<string, unknown> = {}) =>
  riderSMSApi.requestSMSCode(phone, scene, extra)

export const verifySMSCodeCheck = (phone: string, scene: string, code: string) =>
  riderSMSApi.verifySMSCodeCheck(phone, scene, code)

export const fetchConversations = () => riderMessageApi.fetchConversations()

export const upsertConversation = (payload: Record<string, any>) =>
  riderMessageApi.upsertConversation(payload)

export const markConversationRead = (chatId: string) =>
  riderMessageApi.markConversationRead(chatId)

export const fetchHistory = (roomId: string) => riderMessageApi.fetchHistory(roomId)

function readRiderPrincipalId(): string {
  return String(readRiderAuthIdentity({ uniApp: uni }).riderId || '')
}

// 获取骑手信息
export const fetchRiderInfo = () => {
  const riderId = readRiderPrincipalId()
  if (!riderId) return Promise.resolve(null)
  return request({ url: `/api/riders/${riderId}` })
}

// 获取订单列表
export const fetchRiderOrders = (status?: string) => {
  const riderId = readRiderPrincipalId()
  if (!riderId) return Promise.resolve([])
  return request({
    url: status === 'available' ? '/api/riders/orders/available' : `/api/riders/${riderId}/orders`,
    method: 'GET',
    data: status && status !== 'available' ? { status } : {}
  })
}

export const { fetchRiderPreferences, saveRiderPreferences } = riderPreferenceApi

const riderPayload = () => {
  const riderId = readRiderPrincipalId()
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
  const riderId = readRiderPrincipalId()
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
  const riderId = readRiderPrincipalId()
  if (!riderId) return Promise.resolve({ todayEarnings: '0', completedCount: 0 })
  return request({ url: `/api/riders/${riderId}/stats` })
}

// 更新骑手在线状态
export const updateRiderStatus = (isOnline: boolean) => {
  const riderId = readRiderPrincipalId()
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
  const riderId = readRiderPrincipalId()
  if (!riderId) return Promise.resolve(null)
  return request({
    url: `/api/riders/${riderId}/heartbeat`,
    method: 'POST'
  })
}

// 更新头像
export const updateAvatar = (avatar: string) => {
  const riderId = readRiderPrincipalId()
  if (!riderId) return Promise.resolve(null)
  return request({
    url: `/api/riders/${riderId}/avatar`,
    method: 'PUT',
    data: { avatar }
  })
}

// 获取骑手资料
export const getRiderProfile = () => {
  const riderId = readRiderPrincipalId()
  if (!riderId) return Promise.resolve(null)
  return request({ url: `/api/riders/${riderId}/profile` })
}

// 更新骑手资料
export const updateRiderProfile = (data: any) => {
  const riderId = readRiderPrincipalId()
  if (!riderId) return Promise.resolve(null)
  return request({
    url: `/api/riders/${riderId}/profile`,
    method: 'PUT',
    data
  })
}

// 修改手机号
export const changePhone = (data: any) => {
  const riderId = readRiderPrincipalId()
  if (!riderId) return Promise.resolve(null)
  return request({
    url: `/api/riders/${riderId}/change-phone`,
    method: 'POST',
    data
  }).then((response: any) => extractAuthSessionResult(response))
}

// 修改密码
export const changePassword = (data: any) => {
  const riderId = readRiderPrincipalId()
  if (!riderId) return Promise.resolve(null)
  return request({
    url: `/api/riders/${riderId}/change-password`,
    method: 'POST',
    data
  })
}

// 获取骑手段位信息
export const getRiderRank = () => {
  const riderId = readRiderPrincipalId()
  if (!riderId) return Promise.resolve(null)
  return request({
    url: `/api/riders/${riderId}/rank`,
    method: 'GET'
  })
}

// 获取骑手评分摘要
export const getRiderRating = () => {
  const riderId = readRiderPrincipalId()
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
