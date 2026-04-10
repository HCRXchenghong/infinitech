<template>
  <view class="wechat-callback-page">
    <view class="callback-card">
      <view class="callback-icon">{{ loading ? '...' : (failed ? '!' : 'OK') }}</view>
      <text class="callback-title">{{ title }}</text>
      <text class="callback-desc">{{ detail }}</text>
      <button v-if="failed" class="callback-btn" @tap="goNext">返回{{ mode === 'register' ? '注册' : '登录' }}页</button>
    </view>
  </view>
</template>

<script>
import { consumeWechatSession } from '@/shared-ui/api.js'
import { normalizeErrorMessage } from '@/shared-ui/foundation/error.js'
import { saveTokenInfo } from '@/shared-ui/request-interceptor'

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

export default {
  data() {
    return {
      loading: true,
      failed: false,
      title: '正在处理微信登录',
      detail: '请稍候...',
      mode: 'login',
      inviteCode: ''
    }
  },
  onLoad(query = {}) {
    this.mode = trimValue(query.mode) === 'register' ? 'register' : 'login'
    this.inviteCode = trimValue(query.inviteCode).toUpperCase()
    this.handleSession(query)
  },
  methods: {
    async handleSession(query = {}) {
      const sessionToken = trimValue(query.wechatSession)
      if (!sessionToken) {
        this.failWith('缺少微信登录会话，请重试')
        return
      }

      try {
        const res = await consumeWechatSession(sessionToken)
        const result = res && res.success !== false ? res.data : null
        if (!result) {
          throw new Error(normalizeErrorMessage(res, '微信登录处理失败'))
        }

        if (result.type === 'login') {
          this.finishLogin(result)
          return
        }

        if (result.type === 'bind_required') {
          this.redirectToBind(result)
          return
        }

        throw new Error(result.message || '微信登录失败')
      } catch (error) {
        this.failWith(normalizeErrorMessage(error, '微信登录失败，请稍后重试'))
      }
    },
    finishLogin(result) {
      saveTokenInfo(result.token, result.refreshToken, result.expiresIn || 7200)
      uni.setStorageSync('userProfile', result.user || { nickname: DEFAULT_NICKNAME })
      uni.setStorageSync('authMode', 'user')
      uni.setStorageSync('hasSeenWelcome', true)

      this.loading = false
      this.failed = false
      this.title = '微信登录成功'
      this.detail = '正在进入首页...'

      uni.showToast({ title: '登录成功', icon: 'success' })
      setTimeout(() => {
        uni.switchTab({ url: '/pages/index/index' })
      }, 400)
    },
    redirectToBind(result) {
      const targetPath = this.mode === 'register' ? '/pages/auth/register/index' : '/pages/auth/login/index'
      const targetUrl = buildPageUrl(targetPath, {
        inviteCode: this.inviteCode,
        wechatBindToken: result.bindToken,
        wechatNickname: result.nickname,
        wechatAvatarUrl: result.avatarUrl
      })

      this.loading = false
      this.failed = false
      this.title = '需要绑定手机号'
      this.detail = result.message || '请继续完成手机号绑定。'

      setTimeout(() => {
        uni.redirectTo({ url: targetUrl })
      }, 250)
    },
    failWith(message) {
      this.loading = false
      this.failed = true
      this.title = '微信登录失败'
      this.detail = trimValue(message) || '请稍后重试'
      uni.showToast({ title: this.detail, icon: 'none' })
    },
    goNext() {
      const path = this.mode === 'register' ? '/pages/auth/register/index' : '/pages/auth/login/index'
      uni.redirectTo({
        url: buildPageUrl(path, {
          inviteCode: this.inviteCode
        })
      })
    }
  }
}
</script>

<style scoped lang="scss">
.wechat-callback-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  box-sizing: border-box;
  background: linear-gradient(180deg, #f5fff7 0%, #ffffff 100%);
}

.callback-card {
  width: 100%;
  max-width: 360px;
  padding: 32px 24px;
  border-radius: 20px;
  background: #fff;
  box-shadow: 0 18px 40px rgba(22, 101, 52, 0.08);
  text-align: center;
}

.callback-icon {
  width: 72px;
  height: 72px;
  margin: 0 auto 20px;
  border-radius: 50%;
  background: #16a34a;
  color: #fff;
  font-size: 24px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}

.callback-title {
  display: block;
  font-size: 20px;
  font-weight: 700;
  color: #111827;
}

.callback-desc {
  display: block;
  margin-top: 10px;
  font-size: 14px;
  line-height: 1.6;
  color: #6b7280;
}

.callback-btn {
  margin-top: 24px;
  width: 100%;
  height: 44px;
  border: none;
  border-radius: 999px;
  background: #16a34a;
  color: #fff;
  font-size: 15px;
  font-weight: 600;
}

.callback-btn::after {
  border: none;
}
</style>
