<template>
  <view class="page med-home">
    <view class="status-spacer" />

    <view class="main">
      <view class="title-block">
        <text class="h1">您哪里不舒服？</text>
        <text class="h1-sub">全天候医疗守护</text>
      </view>

      <view class="card ai-card" @tap="goChat">
        <view class="ai-badge">
          <image class="ai-svg" src="/static/icons/ai-doctor.svg" mode="aspectFit" />
        </view>
        <view class="ai-main">
          <text class="card-title">AI 智能问诊</text>
          <text class="card-desc">描述症状，快速获取用药建议</text>
          <view class="cta">
            <text class="cta-text">开始咨询</text>
            <text class="cta-arrow">></text>
          </view>
        </view>
        <view class="ai-glow" />
      </view>

      <view class="grid">
        <view class="card fast-card" @tap="goOrder">
          <text class="fast-icon">药</text>
          <text class="fast-title">极速买药</text>
          <text class="fast-desc">{{ runtimeSettings.medicine_delivery_description }}</text>
          <text class="fast-deco">送</text>
        </view>

        <view class="card call-card" @tap="showCallModal = true">
          <view class="call-icon">呼</view>
          <text class="call-title">{{ runtimeSettings.medicine_support_title }}</text>
          <text class="call-desc">{{ runtimeSettings.medicine_support_subtitle }}</text>
        </view>
      </view>

      <view class="tip-card">
        <text class="tip-icon">提</text>
        <text class="tip-text">
          <text class="tip-strong">季节提醒：</text>
          {{ runtimeSettings.medicine_season_tip }}
        </text>
      </view>
    </view>

    <view v-if="showCallModal" class="mask" @tap="showCallModal = false">
      <view class="modal" @tap.stop>
        <view class="modal-icon">呼</view>
        <text class="modal-title">呼叫{{ runtimeSettings.medicine_support_title }}</text>
        <text class="modal-sub">{{ supportModalCopy }}</text>
        <view class="modal-actions">
          <view class="btn ghost" @tap="showCallModal = false">取消</view>
          <view class="btn danger" @tap="doCall">立即呼叫</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { fetchPublicRuntimeSettings } from '@/shared-ui/api.js'

const DEFAULT_RUNTIME_SETTINGS = {
  service_phone: '',
  medicine_support_phone: '',
  medicine_support_title: '一键医务室',
  medicine_support_subtitle: '紧急连线\n人工服务',
  medicine_delivery_description: '24小时配送\n平均30分钟达',
  medicine_season_tip: '近期流感高发，建议常备常用药。如遇高热不退请及时就医。'
}

function normalizeText(value, fallback = '') {
  const text = String(value || '').replace(/\\n/g, '\n').trim()
  return text || fallback
}

function normalizeRuntimeSettings(raw = {}) {
  return {
    service_phone: normalizeText(raw.service_phone, DEFAULT_RUNTIME_SETTINGS.service_phone),
    medicine_support_phone: normalizeText(raw.medicine_support_phone, DEFAULT_RUNTIME_SETTINGS.medicine_support_phone),
    medicine_support_title: normalizeText(raw.medicine_support_title, DEFAULT_RUNTIME_SETTINGS.medicine_support_title),
    medicine_support_subtitle: normalizeText(raw.medicine_support_subtitle, DEFAULT_RUNTIME_SETTINGS.medicine_support_subtitle),
    medicine_delivery_description: normalizeText(raw.medicine_delivery_description, DEFAULT_RUNTIME_SETTINGS.medicine_delivery_description),
    medicine_season_tip: normalizeText(raw.medicine_season_tip, DEFAULT_RUNTIME_SETTINGS.medicine_season_tip)
  }
}

export default {
  data() {
    return {
      showCallModal: false,
      runtimeSettings: { ...DEFAULT_RUNTIME_SETTINGS }
    }
  },
  computed: {
    hotlinePhone() {
      return this.runtimeSettings.medicine_support_phone || this.runtimeSettings.service_phone || ''
    },
    supportModalCopy() {
      if (!this.hotlinePhone) {
        return '当前未配置医药热线，请联系管理员在系统配置中完善。'
      }
      return `即将拨打 ${this.hotlinePhone}\n${this.runtimeSettings.medicine_support_subtitle}`
    }
  },
  onLoad() {
    this.loadRuntimeSettings()
  },
  methods: {
    async loadRuntimeSettings() {
      try {
        const response = await fetchPublicRuntimeSettings()
        this.runtimeSettings = normalizeRuntimeSettings(response)
      } catch (error) {
        this.runtimeSettings = { ...DEFAULT_RUNTIME_SETTINGS }
      }
    },
    goChat() {
      uni.navigateTo({ url: '/pages/medicine/chat' })
    },
    goOrder() {
      uni.navigateTo({ url: '/pages/medicine/order' })
    },
    doCall() {
      if (!this.hotlinePhone) {
        this.showCallModal = false
        uni.showToast({
          title: '暂未配置医药热线',
          icon: 'none'
        })
        return
      }

      this.showCallModal = false
      uni.makePhoneCall({
        phoneNumber: this.hotlinePhone,
        fail: () => {
          uni.showToast({
            title: '无法拨打电话，请检查设备权限',
            icon: 'none'
          })
        }
      })
    }
  }
}
</script>

<style scoped lang="scss">
.med-home {
  min-height: 100vh;
  background: #f0fdfa;
}

.status-spacer {
  height: 45px;
  background: #f0fdfa;
}

.main {
  min-height: calc(100vh - 45px);
  padding: 0 16px 16px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.title-block {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 6px 0 4px;
}

.h1 {
  font-size: 22px;
  font-weight: 900;
  color: #0f172a;
}

.h1-sub {
  font-size: 18px;
  font-weight: 900;
  color: #0d9488;
}

.card {
  background: #fff;
  border-radius: 22px;
  padding: 16px;
  box-sizing: border-box;
}

.ai-card {
  position: relative;
  overflow: hidden;
  display: flex;
  gap: 12px;
  padding: 18px;
  box-shadow: 0 10px 25px rgba(20, 184, 166, 0.12);
}

.ai-badge {
  width: 68px;
  height: 68px;
  border-radius: 18px;
  background: #ccfbf1;
  border: 1px solid #99f6e4;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.ai-svg {
  width: 44px;
  height: 44px;
}

.ai-main {
  flex: 1;
  min-width: 0;
}

.card-title {
  font-size: 18px;
  font-weight: 900;
  color: #0f172a;
}

.card-desc {
  display: block;
  font-size: 12px;
  color: #64748b;
  margin-top: 4px;
}

.cta {
  margin-top: 12px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #0d9488;
  font-weight: 900;
  font-size: 13px;
}

.ai-glow {
  position: absolute;
  right: -18px;
  top: -18px;
  width: 120px;
  height: 120px;
  border-radius: 999px;
  background: rgba(20, 184, 166, 0.12);
  filter: blur(10px);
}

.grid {
  display: flex;
  gap: 12px;
  margin-top: 12px;
}

.grid > .card {
  flex: 1;
}

.fast-card {
  background: #0d9488;
  color: #fff;
  position: relative;
  overflow: hidden;
}

.fast-icon {
  width: 40px;
  height: 40px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.16);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 8px;
  font-size: 18px;
  font-weight: 700;
}

.fast-title {
  font-size: 16px;
  font-weight: 900;
  display: block;
}

.fast-desc {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.85);
  margin-top: 6px;
  display: block;
  white-space: pre-line;
}

.fast-deco {
  position: absolute;
  right: 10px;
  bottom: 8px;
  font-size: 32px;
  font-weight: 900;
  opacity: 0.15;
}

.call-card {
  border: 1px solid #f1f5f9;
  box-shadow: 0 2px 10px rgba(2, 132, 199, 0.06);
}

.call-icon {
  width: 40px;
  height: 40px;
  border-radius: 14px;
  background: #fee2e2;
  color: #ef4444;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: 700;
  margin-bottom: 8px;
}

.call-title {
  font-size: 16px;
  font-weight: 900;
  color: #0f172a;
  display: block;
}

.call-desc {
  font-size: 12px;
  color: #94a3b8;
  margin-top: 6px;
  display: block;
  white-space: pre-line;
}

.tip-card {
  margin-top: 12px;
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.8);
  border-radius: 18px;
  padding: 12px;
  display: flex;
  gap: 10px;
  align-items: flex-start;
}

.tip-icon {
  width: 24px;
  height: 24px;
  border-radius: 12px;
  background: #ccfbf1;
  color: #0f766e;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  flex-shrink: 0;
}

.tip-text {
  font-size: 12px;
  color: #475569;
  line-height: 1.6;
}

.tip-strong {
  font-weight: 900;
  color: #0f766e;
}

.mask {
  position: fixed;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  box-sizing: border-box;
  z-index: 50;
}

.modal {
  width: 100%;
  max-width: 320px;
  background: #fff;
  border-radius: 22px;
  padding: 18px;
  box-sizing: border-box;
  text-align: center;
}

.modal-icon {
  width: 56px;
  height: 56px;
  border-radius: 999px;
  margin: 0 auto 10px;
  background: #fee2e2;
  color: #ef4444;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  font-weight: 700;
}

.modal-title {
  font-size: 18px;
  font-weight: 900;
  color: #0f172a;
  display: block;
}

.modal-sub {
  display: block;
  margin-top: 8px;
  font-size: 12px;
  color: #64748b;
  white-space: pre-line;
  line-height: 1.6;
}

.modal-actions {
  margin-top: 14px;
  display: flex;
  gap: 10px;
}

.btn {
  flex: 1;
  height: 42px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 900;
}

.btn.ghost {
  background: #f1f5f9;
  color: #475569;
}

.btn.danger {
  background: #ef4444;
  color: #fff;
}
</style>
