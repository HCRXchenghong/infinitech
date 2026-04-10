<template>
  <view class="page auth">
    <view class="header">
      <text class="title">{{ portalRuntime.title }}</text>
      <text class="subtitle">{{ headerSubtitle }}</text>
    </view>

    <view v-if="bindRequired" class="bind-banner">
      <image v-if="wechatAvatarUrl" class="bind-avatar" :src="wechatAvatarUrl" mode="aspectFill" />
      <view class="bind-copy">
        <text class="bind-title">检测到待绑定的微信账号</text>
        <text class="bind-desc">{{ bindBannerDesc }}</text>
      </view>
    </view>

    <view class="login-tabs">
      <text class="tab-item" :class="{ active: loginType === 'code' }" @tap="switchLoginType('code')">
        验证码登录
      </text>
      <text class="tab-item" :class="{ active: loginType === 'password' }" @tap="switchLoginType('password')">
        密码登录
      </text>
    </view>

    <view class="form">
      <input v-model="phone" class="input" placeholder="手机号" type="number" maxlength="11" />

      <view v-if="loginType === 'code'" class="code-row">
        <input v-model="code" class="input" placeholder="验证码" type="number" maxlength="6" />
        <text class="code-btn" :class="{ off: codeCooldown > 0 || loading }" @tap="sendCode">
          {{ loading ? '发送中...' : codeCooldown > 0 ? `${codeCooldown}s` : '获取验证码' }}
        </text>
      </view>

      <view v-else>
        <input v-model="password" class="input" placeholder="密码" :password="true" maxlength="20" />
        <view class="password-actions">
          <text class="forgot-password" @tap="goResetPassword">忘记密码？</text>
        </view>
      </view>

      <button class="btn" @tap="submit" :disabled="loading">
        {{
          loading
            ? bindRequired
              ? '绑定中...'
              : '登录中...'
            : bindRequired
              ? '登录并绑定微信'
              : '登录'
        }}
      </button>
    </view>

    <view class="footer">
      <view class="footer-row">
        <text class="txt">还没有账号？</text>
        <text class="link" @tap="goRegister">去注册</text>
      </view>
      <text class="portal-footer">{{ portalRuntime.loginFooter }}</text>
    </view>

    <view v-if="wechatLoginAvailable" class="wechat-login">
      <view class="divider">
        <view class="line"></view>
        <text>或</text>
        <view class="line"></view>
      </view>
      <view class="wechat-btn" @tap="startWechatLogin('login')">
        <image class="wechat-icon" src="/static/icons/wechat.png" mode="aspectFit" />
        <text>微信登录</text>
      </view>
    </view>
  </view>
</template>

<script>
import { login as loginApi, requestSMSCode, wechatBindLogin } from '@/shared-ui/api.js'
import { saveTokenInfo } from '@/shared-ui/request-interceptor'
import { normalizeErrorMessage } from '@/shared-ui/foundation/error.js'
import {
  getCachedConsumerAuthRuntimeSettings,
  loadConsumerAuthRuntimeSettings
} from '@/shared-ui/auth-runtime.js'

const DEFAULT_NICKNAME = '悦享e食用户'

function trimValue(value) {
  return String(value || '').trim()
}

function encodeQuery(params = {}) {
  return Object.keys(params)
    .filter((key) => trimValue(params[key]) !== '')
    .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(trimValue(params[key]))}`)
    .join('&')
}

function buildPageUrl(path, params = {}) {
  const query = encodeQuery(params)
  return query ? `${path}?${query}` : path
}

function deriveWebRootFromEntryUrl(entryUrl) {
  const value = trimValue(entryUrl)
  if (!value) {
    return ''
  }

  const apiIndex = value.indexOf('/api/')
  if (apiIndex > 0) {
    return value.slice(0, apiIndex)
  }

  const authIndex = value.indexOf('/auth/wechat/start')
  if (authIndex > 0) {
    return value.slice(0, authIndex)
  }

  const match = value.match(/^(https?:\/\/[^/]+)/i)
  return match ? match[1] : ''
}

export default {
  data() {
    return {
      loginType: 'code',
      phone: '',
      code: '',
      password: '',
      codeCooldown: 0,
      loading: false,
      timer: null,
      portalRuntime: getCachedConsumerAuthRuntimeSettings(),
      wechatBindToken: '',
      wechatNickname: '',
      wechatAvatarUrl: ''
    }
  },
  computed: {
    bindRequired() {
      return trimValue(this.wechatBindToken) !== ''
    },
    headerSubtitle() {
      return this.bindRequired ? '请先登录已有账号，再完成微信绑定' : this.portalRuntime.subtitle
    },
    bindBannerDesc() {
      if (this.wechatNickname) {
        return `微信昵称：${this.wechatNickname}`
      }
      return '登录后会自动绑定当前微信账号。'
    },
    wechatLoginAvailable() {
      return Boolean(this.portalRuntime.wechatLoginEnabled && trimValue(this.portalRuntime.wechatLoginEntryUrl))
    }
  },
  onLoad(query = {}) {
    this.applyQueryState(query)
    void this.loadRuntimeSettings()
  },
  onUnload() {
    this.clearTimer()
  },
  methods: {
    applyQueryState(query = {}) {
      const loginType = trimValue(query.loginType)
      if (loginType === 'code' || loginType === 'password') {
        this.loginType = loginType
      }
      this.phone = trimValue(query.phone)
      this.wechatBindToken = trimValue(query.wechatBindToken)
      this.wechatNickname = trimValue(query.wechatNickname)
      this.wechatAvatarUrl = trimValue(query.wechatAvatarUrl)
    },
    async loadRuntimeSettings() {
      this.portalRuntime = await loadConsumerAuthRuntimeSettings()
    },
    clearTimer() {
      if (this.timer) {
        clearInterval(this.timer)
        this.timer = null
      }
    },
    switchLoginType(type) {
      this.loginType = type
      this.code = ''
      this.password = ''
    },
    buildBindParams(extra = {}) {
      return {
        phone: this.phone,
        wechatBindToken: this.wechatBindToken,
        wechatNickname: this.wechatNickname,
        wechatAvatarUrl: this.wechatAvatarUrl,
        ...extra
      }
    },
    buildWechatReturnUrl(mode) {
      const root = deriveWebRootFromEntryUrl(this.portalRuntime.wechatLoginEntryUrl)
      if (!root) {
        return ''
      }
      return buildPageUrl(`${root}/#/pages/auth/wechat-callback/index`, { mode })
    },
    buildWechatStartUrl(mode) {
      const entryUrl = trimValue(this.portalRuntime.wechatLoginEntryUrl)
      const returnUrl = this.buildWechatReturnUrl(mode)
      if (!entryUrl || !returnUrl) {
        return ''
      }
      const connector = entryUrl.includes('?') ? '&' : '?'
      return `${entryUrl}${connector}mode=${encodeURIComponent(mode)}&returnUrl=${encodeURIComponent(returnUrl)}`
    },
    openExternalLink(url) {
      const target = trimValue(url)
      if (!target) {
        uni.showToast({ title: '微信登录入口未配置', icon: 'none' })
        return
      }
      // #ifdef H5
      window.location.href = target
      return
      // #endif
      if (typeof plus !== 'undefined' && plus.runtime && typeof plus.runtime.openURL === 'function') {
        plus.runtime.openURL(target)
        return
      }
      uni.setClipboardData({
        data: target,
        success: () => uni.showToast({ title: '登录链接已复制', icon: 'success' })
      })
    },
    startWechatLogin(mode = 'login') {
      const target = this.buildWechatStartUrl(mode)
      if (!target) {
        uni.showToast({ title: '微信登录入口未配置', icon: 'none' })
        return
      }
      this.openExternalLink(target)
    },
    goRegister() {
      uni.redirectTo({
        url: buildPageUrl('/pages/auth/register/index', this.buildBindParams())
      })
    },
    goResetPassword() {
      uni.navigateTo({ url: '/pages/auth/reset-password/index' })
    },
    validatePhone() {
      const phone = trimValue(this.phone)
      if (!/^1\d{10}$/.test(phone)) {
        uni.showToast({ title: '请输入正确的手机号', icon: 'none' })
        return ''
      }
      return phone
    },
    startCodeCooldown() {
      this.codeCooldown = 60
      this.clearTimer()
      this.timer = setInterval(() => {
        if (this.codeCooldown > 0) {
          this.codeCooldown -= 1
          return
        }
        this.clearTimer()
      }, 1000)
    },
    showNeedRegisterModal() {
      uni.showModal({
        title: '提示',
        content: this.bindRequired
          ? '当前手机号还没有注册，请先注册账号，再自动绑定当前微信。'
          : '该手机号还没有注册，是否前往注册？',
        confirmText: '去注册',
        cancelText: '取消',
        success: (modalRes) => {
          if (modalRes.confirm) {
            this.goRegister()
          }
        }
      })
    },
    persistLoginSuccess(res, fallbackPhone) {
      saveTokenInfo(res.token, res.refreshToken, res.expiresIn || 7200)
      uni.setStorageSync('userProfile', res.user || { phone: fallbackPhone, nickname: DEFAULT_NICKNAME })
      uni.setStorageSync('authMode', 'user')
      uni.setStorageSync('hasSeenWelcome', true)
      uni.showToast({ title: this.bindRequired ? '绑定成功' : '登录成功', icon: 'success' })
      setTimeout(() => uni.switchTab({ url: '/pages/index/index' }), 500)
    },
    async sendCode() {
      if (this.codeCooldown > 0 || this.loading) {
        return
      }

      const phone = this.validatePhone()
      if (!phone) {
        return
      }

      this.loading = true
      try {
        const res = await requestSMSCode(phone, 'login')
        if (res.success === false) {
          uni.showToast({
            title: res.error || res.message || '验证码发送失败',
            icon: 'none'
          })
          return
        }

        uni.showToast({ title: res.message || '验证码已发送', icon: 'success' })
        this.startCodeCooldown()
      } catch (err) {
        uni.showToast({
          title: normalizeErrorMessage(err, '验证码发送失败'),
          icon: 'none'
        })
      } finally {
        this.loading = false
      }
    },
    async submit() {
      const phone = this.validatePhone()
      if (!phone) {
        return
      }

      this.loading = true
      try {
        let res = null

        if (this.loginType === 'code') {
          const code = trimValue(this.code)
          if (!code) {
            uni.showToast({ title: '请输入验证码', icon: 'none' })
            return
          }

          res = this.bindRequired
            ? await wechatBindLogin({ phone, code, bindToken: this.wechatBindToken })
            : await loginApi({ phone, code })
        } else {
          const password = trimValue(this.password)
          if (!password) {
            uni.showToast({ title: '请输入密码', icon: 'none' })
            return
          }

          res = this.bindRequired
            ? await wechatBindLogin({ phone, password, bindToken: this.wechatBindToken })
            : await loginApi({ phone, password })
        }

        if (res && res.success) {
          this.persistLoginSuccess(res, phone)
          return
        }

        if (res && res.needRegister) {
          this.showNeedRegisterModal()
          return
        }

        uni.showToast({ title: normalizeErrorMessage(res, '登录失败'), icon: 'none' })
      } catch (err) {
        if (err.data && err.data.needRegister) {
          this.showNeedRegisterModal()
          return
        }
        uni.showToast({
          title: normalizeErrorMessage(err, '登录失败'),
          icon: 'none'
        })
      } finally {
        this.loading = false
      }
    }
  }
}
</script>

<style scoped lang="scss" src="./index.scss"></style>
