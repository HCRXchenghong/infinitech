import config from '../config'
import { forceLogout, manualRefreshToken } from '../request-interceptor'

export interface UserSessionSnapshot {
  token: string
  refreshToken: string
  authMode: string
}

export function getUserSessionSnapshot(): UserSessionSnapshot {
  return {
    token: String(uni.getStorageSync('token') || '').trim(),
    refreshToken: String(uni.getStorageSync('refreshToken') || '').trim(),
    authMode: String(uni.getStorageSync('authMode') || '').trim()
  }
}

export function hasActiveUserSession(snapshot: UserSessionSnapshot = getUserSessionSnapshot()): boolean {
  return Boolean(snapshot.token && snapshot.refreshToken && snapshot.authMode === 'user')
}

export function clearStoredUserSession(): void {
  uni.removeStorageSync('token')
  uni.removeStorageSync('refreshToken')
  uni.removeStorageSync('tokenExpiresAt')
  uni.removeStorageSync('userProfile')
  uni.removeStorageSync('authMode')
}

export async function verifyUserSession(): Promise<boolean> {
  const snapshot = getUserSessionSnapshot()
  if (!hasActiveUserSession(snapshot)) {
    clearStoredUserSession()
    return false
  }

  const refreshed = await manualRefreshToken()
  if (!refreshed) {
    forceLogout()
    return false
  }

  try {
    const currentToken = String(uni.getStorageSync('token') || '').trim()
    const response: any = await uni.request({
      url: config.API_BASE_URL + '/api/auth/verify',
      method: 'POST',
      header: {
        Authorization: `Bearer ${currentToken}`
      }
    })

    const data = response && response.data ? response.data : null
    if (response.statusCode !== 200 || !data || !data.valid) {
      forceLogout()
      return false
    }
    return true
  } catch (error) {
    console.error('[App] Token verify request failed:', error)
    return true
  }
}
