<template>
  <view class="page med-home">
    <view class="status-spacer" />

    <view class="main">
      <view class="title-block">
        <text class="h1">{{ texts.pageTitle }}</text>
        <text class="h1-sub">{{ texts.pageSubtitle }}</text>
      </view>

      <view class="card ai-card" @tap="goChat">
        <view class="ai-badge">
          <image class="ai-svg" src="/static/icons/ai-doctor.svg" mode="aspectFit" />
        </view>
        <view class="ai-main">
          <text class="card-title">{{ texts.aiTitle }}</text>
          <text class="card-desc">{{ texts.aiDesc }}</text>
          <view class="cta">
            <text class="cta-text">{{ texts.startConsult }}</text>
            <text class="cta-arrow">></text>
          </view>
        </view>
        <view class="ai-glow" />
      </view>

      <view class="grid">
        <view class="card fast-card" @tap="goOrder">
          <text class="fast-icon">RX</text>
          <text class="fast-title">{{ texts.fastTitle }}</text>
          <text class="fast-desc">{{ runtimeSettings.medicine_delivery_description }}</text>
          <text class="fast-deco">GO</text>
        </view>

        <view class="card call-card" @tap="showCallModal = true">
          <view class="call-icon">SOS</view>
          <text class="call-title">{{ runtimeSettings.medicine_support_title }}</text>
          <text class="call-desc">{{ runtimeSettings.medicine_support_subtitle }}</text>
        </view>
      </view>

      <view class="tip-card">
        <text class="tip-icon">TIP</text>
        <text class="tip-text">
          <text class="tip-strong">{{ texts.seasonTipLabel }}</text>
          {{ runtimeSettings.medicine_season_tip }}
        </text>
      </view>
    </view>

    <view v-if="showCallModal" class="mask" @tap="showCallModal = false">
      <view class="modal" @tap.stop>
        <view class="modal-icon">TEL</view>
        <text class="modal-title">{{ modalTitle }}</text>
        <text class="modal-sub">{{ supportModalCopy }}</text>
        <view class="modal-actions">
          <view class="btn ghost" @tap="showCallModal = false">{{ texts.cancel }}</view>
          <view class="btn danger" @tap="doCall">{{ texts.callNow }}</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { fetchPublicRuntimeSettings, recordPhoneContactClick } from '@/shared-ui/api.js'
import { ensureRuntimeFeatureOpen } from '@/shared-ui/feature-runtime.js'
import { createPhoneContactHelper } from '../../../shared/mobile-common/phone-contact.js'

const phoneContactHelper = createPhoneContactHelper({ recordPhoneContactClick })

const TEXTS = {
  pageTitle: '\u60a8\u54ea\u91cc\u4e0d\u8212\u670d\uff1f',
  pageSubtitle: '\u5168\u5929\u5019\u533b\u836f\u5b88\u62a4',
  aiTitle: 'AI \u667a\u80fd\u95ee\u8bca',
  aiDesc: '\u63cf\u8ff0\u75c7\u72b6\uff0c\u5feb\u901f\u83b7\u53d6\u7528\u836f\u5efa\u8bae',
  startConsult: '\u5f00\u59cb\u54a8\u8be2',
  fastTitle: '\u6781\u901f\u4e70\u836f',
  seasonTipLabel: '\u5b63\u8282\u63d0\u9192\uff1a',
  cancel: '\u53d6\u6d88',
  callNow: '\u7acb\u5373\u62e8\u6253',
  supportModalFallback:
    '\u5f53\u524d\u533b\u836f\u70ed\u7ebf\u4ee5\u5e73\u53f0\u53d1\u5e03\u4e3a\u51c6\uff0c\u5982\u9700\u5e2e\u52a9\u8bf7\u5148\u8054\u7cfb\u5728\u7ebf\u5ba2\u670d\u3002',
  hotlineUnavailable: '\u533b\u836f\u70ed\u7ebf\u6682\u672a\u5f00\u653e',
  callFailed: '\u65e0\u6cd5\u62e8\u6253\u7535\u8bdd\uff0c\u8bf7\u68c0\u67e5\u6743\u9650',
  contactPrefix: '\u8054\u7cfb'
}

const DEFAULT_RUNTIME_SETTINGS = {
  service_phone: '',
  medicine_support_phone: '',
  medicine_support_title: '\u4e00\u952e\u533b\u52a1\u5ba4',
  medicine_support_subtitle: '\u7d27\u6025\u60c5\u51b5\u53ef\u8054\u7cfb\u4eba\u5de5\u670d\u52a1',
  medicine_delivery_description: '24\u5c0f\u65f6\u914d\u9001\n\u5e73\u574730\u5206\u949f\u8fbe',
  medicine_season_tip:
    '\u8fd1\u671f\u6d41\u611f\u9ad8\u53d1\uff0c\u5efa\u8bae\u5e38\u5907\u5e38\u7528\u836f\u3002\u5982\u9047\u9ad8\u70ed\u4e0d\u9000\u8bf7\u53ca\u65f6\u5c31\u533b\u3002'
}

function normalizeText(value, fallback) {
  const text = String(value || '').replace(/\\n/g, '\n').trim()
  return text || fallback
}

function normalizeRuntimeSettings(raw) {
  const payload = raw && typeof raw === 'object' ? raw : {}
  return {
    service_phone: normalizeText(payload.service_phone, DEFAULT_RUNTIME_SETTINGS.service_phone),
    medicine_support_phone: normalizeText(
      payload.medicine_support_phone,
      DEFAULT_RUNTIME_SETTINGS.medicine_support_phone
    ),
    medicine_support_title: normalizeText(
      payload.medicine_support_title,
      DEFAULT_RUNTIME_SETTINGS.medicine_support_title
    ),
    medicine_support_subtitle: normalizeText(
      payload.medicine_support_subtitle,
      DEFAULT_RUNTIME_SETTINGS.medicine_support_subtitle
    ),
    medicine_delivery_description: normalizeText(
      payload.medicine_delivery_description,
      DEFAULT_RUNTIME_SETTINGS.medicine_delivery_description
    ),
    medicine_season_tip: normalizeText(
      payload.medicine_season_tip,
      DEFAULT_RUNTIME_SETTINGS.medicine_season_tip
    )
  }
}

export default {
  data() {
    return {
      texts: TEXTS,
      showCallModal: false,
      runtimeSettings: { ...DEFAULT_RUNTIME_SETTINGS }
    }
  },
  computed: {
    hotlinePhone() {
      return this.runtimeSettings.medicine_support_phone || this.runtimeSettings.service_phone || ''
    },
    modalTitle() {
      return `${this.texts.contactPrefix}${this.runtimeSettings.medicine_support_title}`
    },
    supportModalCopy() {
      if (!this.hotlinePhone) {
        return this.texts.supportModalFallback
      }
      return `\u5373\u5c06\u62e8\u6253 ${this.hotlinePhone}\n${this.runtimeSettings.medicine_support_subtitle}`
    }
  },
  async onLoad() {
    const enabled = await ensureRuntimeFeatureOpen('medicine', 'user-vue')
    if (!enabled) {
      return
    }
    void this.loadRuntimeSettings()
  },
  methods: {
    async loadRuntimeSettings() {
      try {
        const response = await fetchPublicRuntimeSettings()
        this.runtimeSettings = normalizeRuntimeSettings(response)
      } catch (_error) {
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
          title: this.texts.hotlineUnavailable,
          icon: 'none'
        })
        return
      }

      this.showCallModal = false
      phoneContactHelper
        .makePhoneCall({
          targetRole: 'admin',
          targetPhone: this.hotlinePhone,
          entryPoint: 'medicine_home',
          scene: 'medicine_support',
          pagePath: '/pages/medicine/home',
          metadata: {
            supportTitle: this.runtimeSettings.medicine_support_title
          }
        })
        .catch(() => {
          uni.showToast({
            title: this.texts.callFailed,
            icon: 'none'
          })
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
  font-size: 14px;
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
  font-size: 26px;
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
  font-size: 12px;
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
  font-size: 9px;
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
  font-size: 14px;
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
