<template>
  <view class="page invite-page">
    <view class="header">
      <view class="back-btn" @tap="goBack">
        <text>&lt;</text>
      </view>
      <text class="title">邀请好友</text>
      <view class="placeholder" />
    </view>

    <scroll-view scroll-y class="content">
      <view class="banner-card">
        <text class="banner-title">邀请码已生成</text>
        <text class="banner-sub">
          好友注册时填写你的邀请码，系统会自动记录邀请关系并按配置发放奖励。
        </text>
      </view>

      <view class="invite-code-card">
        <view class="code-title">我的邀请码</view>
        <view class="code-value">{{ inviteCode }}</view>
        <view class="code-actions">
          <button class="ghost-btn" @tap="copyCode">复制邀请码</button>
          <button class="primary-btn" @tap="shareInvite">复制邀请文案</button>
        </view>
        <view class="code-tip">
          邀请文案会自动带上邀请码；如果后台已配置邀请落地页，还会附带可直接打开的注册链接。
        </view>
      </view>

      <view v-if="inviteLink" class="section">
        <view class="section-title">注册链接</view>
        <view class="message-card">
          <text class="message-body">{{ inviteLink }}</text>
          <button class="ghost-btn full" @tap="copyInviteLink">复制注册链接</button>
        </view>
      </view>

      <view class="section">
        <view class="section-title">邀请文案</view>
        <view class="message-card">
          <text class="message-body">{{ inviteMessage }}</text>
          <button class="ghost-btn full" @tap="copyInviteText">复制邀请文案</button>
        </view>
      </view>

      <view class="section">
        <view class="section-title">说明</view>
        <view class="rule-card">
          <view class="rule-item">邀请码优先从服务端获取，失败时才会回退到本地缓存。</view>
          <view class="rule-item">点击复制邀请文案前，会先写入一条邀请分享记录，方便后台审计。</view>
          <view class="rule-item">好友注册时填写邀请码，奖励结算由服务端统一处理，避免前端伪造。</view>
        </view>
      </view>

      <view class="bottom-space" />
    </scroll-view>
  </view>
</template>

<script>
import {
  fetchInviteCode,
  fetchPublicRuntimeSettings,
  recordInviteShare
} from '@/shared-ui/api.js'

const DEFAULT_INVITER_NAME = '悦享e食用户'

export default {
  data() {
    return {
      inviteCode: 'YX888888',
      inviteLandingURL: '',
      inviterName: DEFAULT_INVITER_NAME
    }
  },
  computed: {
    inviteLink() {
      const base = String(this.inviteLandingURL || '').trim()
      const code = String(this.inviteCode || '').trim()
      if (!base || !code) {
        return ''
      }
      const connector = base.includes('?') ? '&' : '?'
      return `${base}${connector}inviteCode=${encodeURIComponent(code)}`
    },
    inviteMessage() {
      const code = String(this.inviteCode || '').trim()
      const name = String(this.inviterName || DEFAULT_INVITER_NAME).trim() || DEFAULT_INVITER_NAME
      const link = this.inviteLink
      if (link) {
        return `${name}邀请你体验悦享e食，邀请码：${code}。注册时填写邀请码即可绑定邀请关系，注册链接：${link}`
      }
      return `${name}邀请你体验悦享e食，邀请码：${code}。打开应用后，在注册页填写邀请码即可完成绑定。`
    }
  },
  onLoad() {
    this.initializePage()
  },
  onShareAppMessage() {
    return {
      title: '邀请你加入悦享e食',
      path: `/pages/auth/register/index?inviteCode=${encodeURIComponent(this.inviteCode)}`,
      desc: this.inviteMessage
    }
  },
  methods: {
    async initializePage() {
      const profile = this.resolveProfile()
      this.inviterName = profile.name
      await Promise.allSettled([
        this.loadInviteCode(profile),
        this.loadRuntimeSettings()
      ])
    },
    resolveProfile() {
      const profile = uni.getStorageSync('userProfile') || {}
      const userId = profile.id || profile.userId || profile.phone || ''
      const phone = profile.phone || ''
      const name = profile.nickname || profile.name || DEFAULT_INVITER_NAME
      return { userId, phone, name }
    },
    async loadRuntimeSettings() {
      try {
        const res = await fetchPublicRuntimeSettings()
        this.inviteLandingURL = String(res?.invite_landing_url || '').trim()
      } catch (error) {
        this.inviteLandingURL = ''
      }
    },
    async loadInviteCode(profile = this.resolveProfile()) {
      try {
        const res = await fetchInviteCode({ userId: profile.userId, phone: profile.phone })
        if (res && res.code) {
          this.inviteCode = res.code
          uni.setStorageSync('inviteCode', res.code)
          return
        }
      } catch (error) {
        // ignore and fallback to local cache
      }

      const stored = uni.getStorageSync('inviteCode')
      if (stored) {
        this.inviteCode = stored
        return
      }

      const suffix = String(profile.phone || '').slice(-4) || '8888'
      this.inviteCode = `YX${suffix}${Math.floor(Math.random() * 90 + 10)}`
      uni.setStorageSync('inviteCode', this.inviteCode)
    },
    goBack() {
      uni.navigateBack()
    },
    copyText(text, title) {
      uni.setClipboardData({
        data: text,
        success: () => {
          uni.showToast({
            title,
            icon: 'success'
          })
        }
      })
    },
    copyCode() {
      this.copyText(this.inviteCode, '邀请码已复制')
    },
    copyInviteLink() {
      if (!this.inviteLink) {
        uni.showToast({ title: '后台未配置邀请落地页', icon: 'none' })
        return
      }
      this.copyText(this.inviteLink, '注册链接已复制')
    },
    copyInviteText() {
      this.copyText(this.inviteMessage, '邀请文案已复制')
    },
    recordShareAction() {
      const profile = this.resolveProfile()
      return recordInviteShare({
        userId: profile.userId,
        phone: profile.phone,
        code: this.inviteCode
      }).catch(() => null)
    },
    shareInvite() {
      this.recordShareAction().finally(() => {
        this.copyInviteText()
      })
    }
  }
}
</script>

<style scoped lang="scss">
.invite-page {
  min-height: 100vh;
  background: #f5f7fa;
}

.header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  padding-top: calc(env(safe-area-inset-top, 0px) + 12px);
  background: #fff;
  border-bottom: 1px solid #f1f2f4;
  box-sizing: border-box;
}

.back-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  color: #111827;
}

.title {
  font-size: 18px;
  font-weight: 700;
  color: #111827;
}

.placeholder {
  width: 36px;
  height: 36px;
}

.content {
  min-height: 100vh;
  padding: calc(env(safe-area-inset-top, 0px) + 76px) 20px 24px;
  box-sizing: border-box;
}

.banner-card {
  margin-bottom: 20px;
  padding: 20px;
  border-radius: 18px;
  background: linear-gradient(135deg, #f97316, #fb923c);
  box-shadow: 0 12px 24px rgba(249, 115, 22, 0.2);
}

.banner-title {
  display: block;
  font-size: 20px;
  font-weight: 700;
  color: #fff;
}

.banner-sub {
  display: block;
  margin-top: 8px;
  font-size: 13px;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.92);
}

.invite-code-card,
.message-card,
.rule-card {
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 6px 16px rgba(15, 23, 42, 0.04);
}

.invite-code-card {
  margin-bottom: 20px;
  padding: 20px;
  text-align: center;
}

.code-title {
  font-size: 13px;
  color: #6b7280;
}

.code-value {
  margin: 12px 0;
  font-size: 30px;
  font-weight: 700;
  color: #111827;
  letter-spacing: 2px;
}

.code-actions {
  display: flex;
  justify-content: center;
  gap: 12px;
}

.code-tip {
  margin-top: 12px;
  font-size: 12px;
  line-height: 1.6;
  color: #6b7280;
}

.section {
  margin-bottom: 20px;
}

.section-title {
  margin-bottom: 10px;
  padding-left: 4px;
  font-size: 14px;
  font-weight: 600;
  color: #374151;
}

.message-card,
.rule-card {
  padding: 16px;
}

.message-body {
  display: block;
  font-size: 14px;
  line-height: 1.8;
  color: #111827;
  word-break: break-all;
}

.rule-item {
  position: relative;
  padding-left: 14px;
  margin-bottom: 10px;
  font-size: 13px;
  line-height: 1.7;
  color: #4b5563;
}

.rule-item:last-child {
  margin-bottom: 0;
}

.rule-item::before {
  content: '';
  position: absolute;
  left: 0;
  top: 9px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #f97316;
}

.ghost-btn,
.primary-btn {
  padding: 0 16px;
  height: 38px;
  line-height: 38px;
  border-radius: 12px;
  font-size: 13px;
}

.ghost-btn {
  background: #fff;
  border: 1px solid #e5e7eb;
  color: #111827;
}

.primary-btn {
  background: #f97316;
  color: #fff;
  border: 0;
}

.full {
  width: 100%;
  margin-top: 14px;
}

.bottom-space {
  height: calc(env(safe-area-inset-bottom, 0px) + 16px);
}
</style>
