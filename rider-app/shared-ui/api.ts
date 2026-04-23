/**
 * 骑手端 API 接口
 */

import config from './config'
import { buildUniNetworkErrorMessage } from '../../packages/client-sdk/src/uni-request.js'
import { createRiderPreferenceApi } from '../../packages/client-sdk/src/mobile-capabilities.js'
import {
  extractAuthSessionResult,
  extractSMSResult,
} from '../../packages/contracts/src/http.js'
import { UPLOAD_DOMAINS } from '../../packages/contracts/src/upload.js'
import { createRoleApiRuntimeBindings } from '../../packages/mobile-core/src/role-api-shell.js'
import {
  createRoleMessageApi,
  createRoleSMSApi,
} from '../../packages/mobile-core/src/role-message-api.js'
import { createRiderBusinessApi } from '../../packages/mobile-core/src/rider-api.js'
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

const riderBusinessApi = createRiderBusinessApi({
  request,
  readPrincipalId() {
    return String(readRiderAuthIdentity({ uniApp: uni }).riderId || '')
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

export const { fetchRiderPreferences, saveRiderPreferences } = riderPreferenceApi
export const {
  acceptOrder,
  changePassword,
  changePhone,
  deliverOrder,
  fetchEarnings,
  fetchRiderInfo,
  fetchRiderOrders,
  fetchRiderStats,
  getRankList,
  getRiderProfile,
  getRiderRank,
  getRiderRating,
  heartbeatRiderStatus,
  pickupOrder,
  reportOrderException,
  updateAvatar,
  updateRiderProfile,
  updateRiderStatus,
} = riderBusinessApi
