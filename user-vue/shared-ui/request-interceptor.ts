// @ts-nocheck
/**
 * API 请求拦截器
 * 参考美团的实现：
 * 1. 自动添加 Authorization header
 * 2. 检测 token 即将过期，自动刷新
 * 3. 处理 401 错误，尝试刷新 token
 * 4. 刷新失败后强制登出
 */

import config from './config'
import { clearSQLiteCache } from './cache-cleaner'

const rawRequest = uni.request

function requestWithPromise(
  requestFn: typeof uni.request,
  options: UniApp.RequestOptions
): Promise<UniApp.RequestSuccessCallbackResult> {
  return new Promise((resolve, reject) => {
    requestFn({
      ...options,
      success: (res) => resolve(res),
      fail: (err) => reject(err)
    })
  })
}

// Token 过期时间管理
interface TokenInfo {
  accessToken: string
  refreshToken: string
  expiresAt: number // 过期时间戳（毫秒）
}

let isRefreshing = false // 是否正在刷新 token
let refreshSubscribers: Array<(token: string) => void> = [] // 等待刷新完成的请求队列
let refreshPromise: Promise<string | null> | null = null // 刷新Promise缓存

/**
 * 获取当前 token 信息
 */
function getTokenInfo(): TokenInfo | null {
  const accessToken = uni.getStorageSync('token')
  const refreshToken = uni.getStorageSync('refreshToken')
  const expiresAt = uni.getStorageSync('tokenExpiresAt')

  if (!accessToken || !refreshToken) {
    return null
  }

  return {
    accessToken,
    refreshToken,
    expiresAt: expiresAt || 0
  }
}

/**
 * 保存 token 信息
 */
function saveTokenInfo(token: string, refreshToken: string, expiresIn: number) {
  const expiresAt = Date.now() + expiresIn * 1000
  uni.setStorageSync('token', token)
  uni.setStorageSync('refreshToken', refreshToken)
  uni.setStorageSync('tokenExpiresAt', expiresAt)
}

/**
 * 检查 token 是否即将过期（提前 5 分钟刷新）
 */
function isTokenExpiringSoon(expiresAt: number): boolean {
  const now = Date.now()
  const fiveMinutes = 5 * 60 * 1000
  return expiresAt - now < fiveMinutes
}

/**
 * 刷新 Access Token
 */
async function refreshAccessToken(): Promise<string | null> {
  const tokenInfo = getTokenInfo()
  if (!tokenInfo || !tokenInfo.refreshToken) {
    return null
  }

  try {
    const res = await requestWithPromise(rawRequest, {
      url: config.API_BASE_URL + '/api/auth/refresh',
      method: 'POST',
      data: {
        refreshToken: tokenInfo.refreshToken
      }
    })

    const data = res.data as any
    if (res.statusCode === 200 && data.success && data.token) {
      // 保存新的 token
      saveTokenInfo(data.token, data.refreshToken, data.expiresIn || 7200)
      return data.token
    } else {
      console.error('❌ Token 刷新失败:', data.error)
      return null
    }
  } catch (err) {
    console.error('❌ Token 刷新请求失败:', err)
    return null
  }
}

/**
 * 订阅 token 刷新完成事件
 */
function subscribeTokenRefresh(callback: (token: string) => void) {
  refreshSubscribers.push(callback)
}

/**
 * 通知所有等待的请求
 */
function onTokenRefreshed(token: string) {
  refreshSubscribers.forEach(callback => callback(token))
  refreshSubscribers = []
}

/**
 * 强制登出
 */
function forceLogout() {
  // 清除登录信息
  uni.removeStorageSync('token')
  uni.removeStorageSync('refreshToken')
  uni.removeStorageSync('tokenExpiresAt')
  uni.removeStorageSync('userProfile')
  uni.removeStorageSync('authMode')
  uni.removeStorageSync('user_vue_push_registration')

  // 清除本地缓存数据
  try {
    clearSQLiteCache()
  } catch (err) {
    console.error('清除数据库失败:', err)
  }

  // 跳转到登录页
  uni.reLaunch({
    url: '/pages/welcome/welcome/index'
  })
}

/**
 * 请求拦截器
 */
export function setupRequestInterceptor() {
  // 保存原始的 request 方法
  const originalRequest = uni.request

  const waitForTokenRefresh = () =>
    new Promise<string>((resolve) => {
      subscribeTokenRefresh(resolve)
    })

  const withAuthHeader = (options: UniApp.RequestOptions, token: string): UniApp.RequestOptions => ({
    ...options,
    header: {
      ...(options.header || {}),
      Authorization: `Bearer ${token}`
    }
  })

  const requestOnce = (options: UniApp.RequestOptions) => requestWithPromise(originalRequest, options)

  const normalizeCompleteResult = (
    res: unknown,
    fallbackMsg: string
  ): UniApp.GeneralCallbackResult => {
    if (res && typeof res === 'object') {
      const record = res as Record<string, any>
      const errMsg = typeof record.errMsg === 'string' ? record.errMsg : fallbackMsg
      return { errMsg, ...record }
    }
    return { errMsg: fallbackMsg }
  }

  const normalizeFailResult = (err: unknown): UniApp.GeneralCallbackResult => {
    if (err && typeof err === 'object') {
      const record = err as Record<string, any>
      const errMsg =
        typeof record.errMsg === 'string'
          ? record.errMsg
          : typeof record.message === 'string'
            ? record.message
            : 'request:fail'
      return { errMsg, ...record }
    }
    if (typeof err === 'string') {
      return { errMsg: err }
    }
    return { errMsg: 'request:fail' }
  }

  const handle401 = async (options: UniApp.RequestOptions) => {
    if (isRefreshing) {
      const newToken = await waitForTokenRefresh()
      return requestOnce(withAuthHeader(options, newToken))
    }

    isRefreshing = true
    const newToken = await refreshAccessToken()
    isRefreshing = false

    if (newToken) {
      onTokenRefreshed(newToken)
      return requestOnce(withAuthHeader(options, newToken))
    }

    forceLogout()
    throw new Error('Token refresh failed')
  }

  // 重写 uni.request
  // @ts-ignore
  uni.request = async function(options: UniApp.RequestOptions) {
    const {
      success: originSuccess,
      fail: originFail,
      complete: originComplete,
      ...requestOptions
    } = options || {}
    const tokenInfo = getTokenInfo()
    const headers = { ...(requestOptions.header || {}) }

    try {
      // 如果有 token，添加到 header
      if (tokenInfo && tokenInfo.accessToken) {
        headers['Authorization'] = `Bearer ${tokenInfo.accessToken}`

        // 检查 token 是否即将过期
        if (isTokenExpiringSoon(tokenInfo.expiresAt)) {
          // 如果正在刷新，等待刷新完成
          if (isRefreshing) {
            const newToken = await waitForTokenRefresh()
            headers['Authorization'] = `Bearer ${newToken}`
          } else {
            // 开始刷新
            isRefreshing = true
            const newToken = await refreshAccessToken()
            isRefreshing = false

            if (newToken) {
              // 刷新成功，更新 header
              headers['Authorization'] = `Bearer ${newToken}`
              onTokenRefreshed(newToken)
            } else {
              // 刷新失败，强制登出
              forceLogout()
              throw new Error('Token refresh failed')
            }
          }
        }
      }

      const finalOptions = { ...requestOptions, header: headers }
      const res = await requestOnce(finalOptions)

      if (res.statusCode === 401) {
        const retryRes = await handle401(finalOptions)
        if (typeof originSuccess === 'function') originSuccess(retryRes)
        if (typeof originComplete === 'function') {
          originComplete(normalizeCompleteResult(retryRes, 'request:ok'))
        }
        return retryRes
      }

      if (typeof originSuccess === 'function') originSuccess(res)
      if (typeof originComplete === 'function') {
        originComplete(normalizeCompleteResult(res, 'request:ok'))
      }
      return res
    } catch (err) {
      const failResult = normalizeFailResult(err)
      if (typeof originFail === 'function') originFail(failResult)
      if (typeof originComplete === 'function') originComplete(failResult)
      throw err
    }
  }
}

/**
 * 手动刷新 token（用于 App 启动时）
 */
export async function manualRefreshToken(): Promise<boolean> {
  const tokenInfo = getTokenInfo()
  if (!tokenInfo) {
    return false
  }

  // 如果 token 还有效且不即将过期，不需要刷新
  if (!isTokenExpiringSoon(tokenInfo.expiresAt)) {
    return true
  }

  const newToken = await refreshAccessToken()
  return newToken !== null
}

/**
 * 导出强制登出方法
 */
export { forceLogout, saveTokenInfo }
