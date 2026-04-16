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

    <view class="form">
      <input v-model="nickname" class="input" placeholder="昵称" maxlength="16" />
      <input v-model="phone" class="input" placeholder="手机号" type="number" maxlength="11" />
      <input v-model="inviteCode" class="input" placeholder="邀请码（选填）" maxlength="20" />

      <view class="code-row">
        <input v-model="code" class="input" placeholder="验证码" type="number" maxlength="6" />
        <text class="code-btn" :class="{ off: codeCooldown > 0 || loading }" @tap.stop="sendCode" @click.stop="sendCode">
          {{ loading ? '发送中...' : codeCooldown > 0 ? `${codeCooldown}s` : '获取验证码' }}
        </text>
      </view>

      <view v-if="needCaptcha" class="captcha-row">
        <view class="captcha-input-row">
          <input v-model="captchaCode" class="input captcha-input" placeholder="图形验证码" maxlength="4" />
          <view class="captcha-image-wrap" @tap="refreshCaptcha">
            <image v-if="captchaImageUrl" class="captcha-image" :src="captchaImageUrl" mode="aspectFit" />
            <text v-else class="captcha-placeholder">点击加载</text>
          </view>
        </view>
      </view>

      <input v-model="password" class="input" placeholder="密码，至少 6 位" :password="true" maxlength="20" />
      <input v-model="confirmPassword" class="input" placeholder="确认密码" :password="true" maxlength="20" />

      <button class="btn" @tap="submit" :disabled="loading">
        {{
          loading
            ? bindRequired
              ? '注册并绑定中...'
              : '注册中...'
            : bindRequired
              ? '注册并绑定微信'
              : '注册'
        }}
      </button>
    </view>

    <view class="footer">
      <view class="footer-row">
        <text class="txt">已有账号？</text>
        <text class="link" @tap="goLogin">去登录</text>
      </view>
      <text class="portal-footer">{{ portalRuntime.loginFooter }}</text>
    </view>

    <view v-if="wechatLoginAvailable" class="wechat-login">
      <view class="divider">
        <view class="line"></view>
        <text>或</text>
        <view class="line"></view>
      </view>
      <view class="wechat-btn" @tap="startWechatLogin('register')">
        <image class="wechat-icon" src="/static/icons/wechat.png" mode="aspectFit" />
        <text>微信注册 / 登录</text>
      </view>
    </view>
  </view>
</template>

<script>
import {
  getBaseUrl,
  login as loginApi,
  register as registerApi,
  requestSMSCode,
  verifySMSCodeCheck
} from '@/shared-ui/api.js'
import { saveTokenInfo } from '@/shared-ui/request-interceptor'
import {
  getCachedConsumerAuthRuntimeSettings,
  loadConsumerAuthRuntimeSettings
} from '@/shared-ui/auth-runtime.js'
import {
  buildAuthPortalPageUrl,
  buildConsumerAuthUserProfile,
  buildConsumerWechatStartUrl,
  normalizeConsumerAuthExternalUrl,
  normalizeConsumerInviteCode,
  shouldRedirectRegisteredConsumerToLogin,
  trimAuthPortalValue
} from '../../../packages/mobile-core/src/auth-portal.js'

export default {
  data() {
    return {
      nickname: '',
      phone: '',
      inviteCode: '',
      code: '',
      password: '',
      confirmPassword: '',
      codeCooldown: 0,
      loading: false,
      timer: null,
      isDestroyed: false,
      needCaptcha: false,
      captchaSessionId: '',
      captchaCode: '',
      captchaImageUrl: '',
      portalRuntime: getCachedConsumerAuthRuntimeSettings(),
      wechatBindToken: '',
      wechatNickname: '',
      wechatAvatarUrl: ''
    }
  },
  computed: {
    bindRequired() {
      return trimAuthPortalValue(this.wechatBindToken) !== ''
    },
    headerSubtitle() {
      return this.bindRequired ? '注册后会自动绑定当前微信账号' : this.portalRuntime.subtitle
    },
    bindBannerDesc() {
      if (this.wechatNickname) {
        return `微信昵称：${this.wechatNickname}`
      }
      return '完成注册后会自动绑定当前微信账号。'
    },
    wechatLoginAvailable() {
      return Boolean(
        this.portalRuntime.wechatLoginEnabled &&
        trimAuthPortalValue(this.portalRuntime.wechatLoginEntryUrl)
      )
    }
  },
  onLoad(query = {}) {
    this.captchaSessionId = Date.now().toString()
    this.applyQueryState(query)
    void this.loadRuntimeSettings()
  },
  onUnload() {
    this.isDestroyed = true
    this.clearTimer()
    this.loading = false
  },
  onHide() {
    this.clearTimer()
  },
  methods: {
    applyQueryState(query = {}) {
      this.inviteCode = normalizeConsumerInviteCode(query.inviteCode)
      this.phone = trimAuthPortalValue(query.phone)
      this.wechatBindToken = trimAuthPortalValue(query.wechatBindToken)
      this.wechatNickname = trimAuthPortalValue(query.wechatNickname)
      this.wechatAvatarUrl = trimAuthPortalValue(query.wechatAvatarUrl)
      if (!trimAuthPortalValue(this.nickname) && this.wechatNickname) {
        this.nickname = this.wechatNickname
      }
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
    buildQueryParams(extra = {}) {
      return {
        phone: this.phone,
        inviteCode: this.inviteCode,
        wechatBindToken: this.wechatBindToken,
        wechatNickname: this.wechatNickname,
        wechatAvatarUrl: this.wechatAvatarUrl,
        ...extra
      }
    },
    buildWechatStartUrl(mode) {
      return buildConsumerWechatStartUrl(
        this.portalRuntime.wechatLoginEntryUrl,
        mode,
        { inviteCode: this.inviteCode }
      )
    },
    openExternalLink(url) {
      const target = normalizeConsumerAuthExternalUrl(url)
      if (!target) {
        uni.showToast({ title: '微信登录入口未配置', icon: 'none' })
        return false
      }
      // #ifdef H5
      window.location.href = target
      return true
      // #endif
      if (typeof plus !== 'undefined' && plus.runtime && typeof plus.runtime.openURL === 'function') {
        plus.runtime.openURL(target)
        return true
      }
      uni.setClipboardData({
        data: target,
        success: () => uni.showToast({ title: '登录链接已复制', icon: 'success' })
      })
      return true
    },
    startWechatLogin(mode = 'register') {
      const target = this.buildWechatStartUrl(mode)
      if (!target) {
        uni.showToast({ title: '微信登录入口未配置', icon: 'none' })
        return
      }
      void this.openExternalLink(target)
    },
    goLogin() {
      uni.redirectTo({
        url: buildAuthPortalPageUrl('/pages/auth/login/index', this.buildQueryParams())
      })
    },
    async loadCaptcha() {
      if (!this.captchaSessionId) {
        this.captchaSessionId = Date.now().toString()
      }
      this.captchaImageUrl = `${getBaseUrl()}/api/captcha?sessionId=${this.captchaSessionId}&t=${Date.now()}`
    },
    refreshCaptcha() {
      this.captchaSessionId = Date.now().toString()
      this.captchaCode = ''
      void this.loadCaptcha()
    },
    validatePhone() {
      const phone = trimAuthPortalValue(this.phone)
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
        if (this.isDestroyed) {
          this.clearTimer()
          return
        }
        if (this.codeCooldown > 0) {
          this.codeCooldown -= 1
          return
        }
        this.clearTimer()
      }, 1000)
    },
    maybeRedirectToLogin(message) {
      const content = trimAuthPortalValue(message)
      if (!shouldRedirectRegisteredConsumerToLogin(content)) {
        return false
      }
      uni.showModal({
        title: '提示',
        content,
        showCancel: false,
        confirmText: '去登录',
        success: (modalRes) => {
          if (modalRes.confirm) {
            this.goLogin()
          }
        }
      })
      return true
    },
    async sendCode() {
      if (this.isDestroyed || this.codeCooldown > 0 || this.loading) {
        return
      }

      const phone = this.validatePhone()
      if (!phone) {
        return
      }

      if (this.needCaptcha && trimAuthPortalValue(this.captchaCode).length !== 4) {
        uni.showToast({ title: '请输入图形验证码', icon: 'none' })
        return
      }

      this.loading = true
      try {
        const res = await requestSMSCode(phone, 'register', {
          captcha: this.needCaptcha ? trimAuthPortalValue(this.captchaCode) : undefined,
          sessionId: this.captchaSessionId
        })

        if (this.isDestroyed) {
          return
        }

        if (res.needCaptcha) {
          this.needCaptcha = true
          this.captchaSessionId = res.sessionId || Date.now().toString()
          this.captchaCode = ''
          await this.loadCaptcha()
          uni.showToast({ title: '请输入图形验证码', icon: 'none' })
          return
        }

        if (!res.success) {
          if (this.maybeRedirectToLogin(res.message || res.error)) {
            return
          }
          uni.showToast({
            title: res.message || res.error || '验证码发送失败',
            icon: 'none'
          })
          return
        }

        this.needCaptcha = false
        this.captchaCode = ''
        this.captchaImageUrl = ''

        if (res.code) {
          uni.showModal({
            title: '开发调试验证码',
            content: `手机号：${phone}\n验证码：${res.code}`,
            showCancel: false,
            confirmText: '知道了'
          })
        }

        uni.showToast({ title: res.message || '验证码已发送', icon: 'success' })
        this.startCodeCooldown()
      } catch (err) {
        if (this.isDestroyed) {
          return
        }

        const message =
          (err.data && (err.data.message || err.data.error)) ||
          err.error ||
          err.message ||
          '验证码发送失败'

        if (this.maybeRedirectToLogin(message)) {
          return
        }

        if (err.data && err.data.needCaptcha) {
          this.needCaptcha = true
          this.captchaSessionId = err.data.sessionId || Date.now().toString()
          this.captchaCode = ''
          await this.loadCaptcha()
          uni.showToast({ title: message || '请输入图形验证码', icon: 'none' })
          return
        }

        uni.showToast({ title: message, icon: 'none' })
      } finally {
        this.loading = false
      }
    },
    persistLoginSuccess(res, fallbackPhone) {
      saveTokenInfo(res.token, res.refreshToken, res.expiresIn || 7200)
      uni.setStorageSync('userProfile', buildConsumerAuthUserProfile(res.user, fallbackPhone))
      uni.setStorageSync('authMode', 'user')
      uni.setStorageSync('hasSeenWelcome', true)
      uni.showToast({ title: this.bindRequired ? '注册并绑定成功' : '注册成功', icon: 'success' })
      setTimeout(() => uni.switchTab({ url: '/pages/index/index' }), 500)
    },
    async submit() {
      const nickname = trimAuthPortalValue(this.nickname)
      const phone = this.validatePhone()
      const password = trimAuthPortalValue(this.password)
      const confirmPassword = trimAuthPortalValue(this.confirmPassword)
      const code = trimAuthPortalValue(this.code)

      if (!nickname) {
        uni.showToast({ title: '请输入昵称', icon: 'none' })
        return
      }
      if (!phone) {
        return
      }
      if (!password) {
        uni.showToast({ title: '请输入密码', icon: 'none' })
        return
      }
      if (password.length < 6) {
        uni.showToast({ title: '密码至少 6 位', icon: 'none' })
        return
      }
      if (password !== confirmPassword) {
        uni.showToast({ title: '两次输入的密码不一致', icon: 'none' })
        return
      }
      if (!code) {
        uni.showToast({ title: '请输入验证码', icon: 'none' })
        return
      }

      this.loading = true
      try {
        const verifyRes = await verifySMSCodeCheck(phone, 'register', code)
        if (!verifyRes.success) {
          throw new Error(verifyRes.error || verifyRes.message || '验证码校验失败')
        }

        const res = await registerApi({
          phone,
          name: nickname,
          password,
          inviteCode: normalizeConsumerInviteCode(this.inviteCode),
          wechatBindToken: this.wechatBindToken || undefined
        })

        if (!res.success) {
          if (this.maybeRedirectToLogin(res.error || res.message)) {
            return
          }
          uni.showToast({ title: res.error || res.message || '注册失败', icon: 'none' })
          return
        }

        try {
          const loginRes = await loginApi({ phone, password })
          if (loginRes && loginRes.success) {
            this.persistLoginSuccess(loginRes, phone)
            return
          }
        } catch (_error) {
          // 自动登录失败时回退到登录入口
        }

        uni.showToast({
          title: this.bindRequired ? '注册成功，请重新登录完成绑定' : '注册成功',
          icon: 'success'
        })
        setTimeout(() => {
          uni.redirectTo({
            url: buildAuthPortalPageUrl('/pages/auth/login/index', this.buildQueryParams({ phone }))
          })
        }, 800)
      } catch (err) {
        const message =
          (err.data && (err.data.error || err.data.message)) ||
          err.error ||
          err.message ||
          '注册失败'
        if (this.maybeRedirectToLogin(message)) {
          return
        }
        uni.showToast({ title: message, icon: 'none' })
      } finally {
        this.loading = false
      }
    }
  }
}
</script>

<style scoped lang="scss" src="./index.scss"></style>
