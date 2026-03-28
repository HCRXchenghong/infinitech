<template>
  <view class="container">
    <view class="page-padding">
      <view class="insurance-status-card">
        <view class="status-icon">🛡️</view>
        <view class="status-info">
          <text class="status-title">{{ settings.statusTitle }}</text>
          <text class="status-desc">{{ settings.statusDesc }}</text>
        </view>
      </view>

      <view class="coverage-card">
        <view class="card-title">保障项目</view>
        <view v-if="settings.coverages.length" class="coverage-list">
          <view
            v-for="(coverage, index) in settings.coverages"
            :key="`coverage-${index}`"
            class="coverage-item"
          >
            <view class="coverage-left">
              <text class="coverage-icon">{{ coverage.icon || '🧾' }}</text>
              <text class="coverage-name">{{ coverage.name || '保障项目' }}</text>
            </view>
            <text class="coverage-amount">{{ coverage.amount || '以平台投保方案为准' }}</text>
          </view>
        </view>
        <text v-else class="empty-inline">当前保障项目以平台发布方案为准，如有疑问请联系平台管理员。</text>
      </view>

      <view class="policy-card">
        <view class="card-title">保单信息</view>
        <view class="policy-info">
          <view class="policy-item">
            <text class="policy-label">保单号</text>
            <text class="policy-value">{{ displayValue(settings.policyNumber) }}</text>
          </view>
          <view class="divider"></view>
          <view class="policy-item">
            <text class="policy-label">保险公司</text>
            <text class="policy-value">{{ displayValue(settings.provider) }}</text>
          </view>
          <view class="divider"></view>
          <view class="policy-item">
            <text class="policy-label">生效日期</text>
            <text class="policy-value">{{ displayValue(settings.effectiveDate) }}</text>
          </view>
          <view class="divider"></view>
          <view class="policy-item">
            <text class="policy-label">失效日期</text>
            <text class="policy-value">{{ displayValue(settings.expireDate) }}</text>
          </view>
        </view>
      </view>

      <view class="guide-card">
        <view class="card-title">理赔指南</view>
        <view v-if="settings.claimSteps.length" class="guide-steps">
          <view
            v-for="(step, index) in settings.claimSteps"
            :key="`claim-step-${index}`"
            class="step-item"
          >
            <view class="step-number">{{ index + 1 }}</view>
            <text class="step-text">{{ step }}</text>
          </view>
        </view>
        <text v-else class="empty-inline">当前理赔流程以平台发布说明为准，如有疑问请联系平台管理员。</text>
      </view>

      <view class="actions">
        <button class="btn-claim" @tap="openClaim">{{ settings.claimButtonText }}</button>
        <button class="btn-detail" @tap="openDetail">{{ settings.detailButtonText }}</button>
      </view>
    </view>
  </view>
</template>

<script lang="ts">
import Vue from 'vue'
import { fetchPublicRuntimeSettings } from '@/shared-ui/api'

declare const uni: any
declare const plus: any

const DEFAULT_INSURANCE_SETTINGS = {
  statusTitle: '骑手保障信息',
  statusDesc: '保障内容、承保信息和理赔入口以平台发布为准',
  policyNumber: '',
  provider: '',
  effectiveDate: '',
  expireDate: '',
  claimUrl: '',
  detailUrl: '',
  claimButtonText: '联系平台处理',
  detailButtonText: '查看保障说明',
  claimSteps: [
    '发生意外后第一时间联系客服或站点负责人',
    '准备相关证明材料（医疗票据、诊断证明、事故说明等）',
    '按平台指引提交理赔申请与补充材料',
    '等待保险审核与回款通知'
  ],
  coverages: []
}

function normalizeText(value: any, fallback = ''): string {
  const normalized = String(value || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim()
  return normalized || fallback
}

function normalizeSteps(items: any): string[] {
  if (!Array.isArray(items)) return []
  const seen = new Set<string>()
  return items
    .map((item) => normalizeText(item, ''))
    .filter((item) => {
      if (!item || seen.has(item)) return false
      seen.add(item)
      return true
    })
    .slice(0, 10)
}

function normalizeCoverages(items: any) {
  if (!Array.isArray(items)) return []
  return items
    .map((item) => ({
      icon: normalizeText(item?.icon, ''),
      name: normalizeText(item?.name, ''),
      amount: normalizeText(item?.amount, '')
    }))
    .filter((item) => item.icon || item.name || item.amount)
    .slice(0, 10)
}

function buildInsuranceSettings(payload: any = {}) {
  const claimSteps = normalizeSteps(payload?.rider_insurance_claim_steps)
  return {
    statusTitle: normalizeText(payload?.rider_insurance_status_title, DEFAULT_INSURANCE_SETTINGS.statusTitle),
    statusDesc: normalizeText(payload?.rider_insurance_status_desc, DEFAULT_INSURANCE_SETTINGS.statusDesc),
    policyNumber: normalizeText(payload?.rider_insurance_policy_number, ''),
    provider: normalizeText(payload?.rider_insurance_provider, ''),
    effectiveDate: normalizeText(payload?.rider_insurance_effective_date, ''),
    expireDate: normalizeText(payload?.rider_insurance_expire_date, ''),
    claimUrl: normalizeText(payload?.rider_insurance_claim_url, ''),
    detailUrl: normalizeText(payload?.rider_insurance_detail_url, ''),
    claimButtonText: normalizeText(payload?.rider_insurance_claim_button_text, DEFAULT_INSURANCE_SETTINGS.claimButtonText),
    detailButtonText: normalizeText(payload?.rider_insurance_detail_button_text, DEFAULT_INSURANCE_SETTINGS.detailButtonText),
    claimSteps: claimSteps.length ? claimSteps : [...DEFAULT_INSURANCE_SETTINGS.claimSteps],
    coverages: normalizeCoverages(payload?.rider_insurance_coverages)
  }
}

export default Vue.extend({
  data() {
    return {
      settings: buildInsuranceSettings(),
      loading: false
    }
  },
  onShow() {
    this.loadSettings()
  },
  methods: {
    async loadSettings() {
      if (this.loading) return
      this.loading = true
      try {
        const payload = await fetchPublicRuntimeSettings()
        this.settings = buildInsuranceSettings(payload)
      } catch (error) {
        this.settings = buildInsuranceSettings()
      } finally {
        this.loading = false
      }
    },
    displayValue(value: string) {
      return String(value || '').trim() || '以平台发布为准'
    },
    openExternalLink(url: string, emptyMessage: string) {
      const link = String(url || '').trim()
      if (!link) {
        uni.showToast({ title: emptyMessage, icon: 'none' })
        return
      }

      // #ifdef H5
      if (typeof window !== 'undefined') {
        window.open(link, '_blank')
        return
      }
      // #endif

      // #ifdef APP-PLUS
      plus.runtime.openURL(link)
      return
      // #endif

      uni.setClipboardData({
        data: link,
        success: () => {
          uni.showToast({ title: '链接已复制，请在浏览器打开', icon: 'none' })
        }
      })
    },
    openClaim() {
      this.openExternalLink(this.settings.claimUrl, '理赔入口暂未开放')
    },
    openDetail() {
      this.openExternalLink(this.settings.detailUrl, '保障详情暂未发布')
    }
  }
})
</script>

<style lang="scss" scoped>
.container {
  min-height: 100vh;
  background: #f3f4f6;
  padding-top: 88rpx;
}

.page-padding {
  padding: 24rpx;
  padding-bottom: 120rpx;
  box-sizing: border-box;
}

.insurance-status-card {
  background: linear-gradient(135deg, #16a34a 0%, #15803d 100%);
  border-radius: 24rpx;
  padding: 48rpx 32rpx;
  display: flex;
  align-items: center;
  gap: 24rpx;
  color: white;
  margin-bottom: 24rpx;
  box-shadow: 0 8rpx 24rpx rgba(22, 163, 74, 0.2);
}

.status-icon {
  font-size: 72rpx;
}

.status-info {
  flex: 1;
}

.status-title {
  font-size: 36rpx;
  font-weight: bold;
  display: block;
  margin-bottom: 8rpx;
}

.status-desc {
  font-size: 24rpx;
  opacity: 0.9;
  display: block;
}

.coverage-card,
.policy-card,
.guide-card {
  background: white;
  border-radius: 24rpx;
  padding: 32rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
}

.card-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #1f2937;
  margin-bottom: 24rpx;
}

.empty-inline {
  display: block;
  font-size: 26rpx;
  line-height: 1.6;
  color: #6b7280;
}

.coverage-list {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.coverage-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx;
  background: #f9fafb;
  border-radius: 16rpx;
}

.coverage-left {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.coverage-icon {
  font-size: 36rpx;
}

.coverage-name {
  font-size: 28rpx;
  color: #1f2937;
  font-weight: 500;
}

.coverage-amount {
  font-size: 28rpx;
  color: #16a34a;
  font-weight: bold;
}

.policy-info {
  display: flex;
  flex-direction: column;
}

.policy-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx 0;
}

.policy-label {
  font-size: 28rpx;
  color: #6b7280;
}

.policy-value {
  font-size: 28rpx;
  color: #1f2937;
  font-weight: 500;
}

.divider {
  height: 2rpx;
  background: #f9fafb;
}

.guide-steps {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.step-item {
  display: flex;
  align-items: flex-start;
  gap: 16rpx;
}

.step-number {
  width: 48rpx;
  height: 48rpx;
  border-radius: 50%;
  background: #eff6ff;
  color: #009bf5;
  font-size: 24rpx;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.step-text {
  flex: 1;
  font-size: 26rpx;
  color: #4b5563;
  line-height: 1.6;
  padding-top: 8rpx;
}

.actions {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.btn-claim,
.btn-detail {
  width: 100%;
  padding: 24rpx;
  border-radius: 16rpx;
  font-size: 32rpx;
  font-weight: bold;
  border: none;
}

.btn-claim {
  background: linear-gradient(135deg, #16a34a 0%, #15803d 100%);
  color: white;
  box-shadow: 0 4rpx 12rpx rgba(22, 163, 74, 0.3);
}

.btn-detail {
  background: white;
  color: #16a34a;
  border: 2rpx solid #16a34a;
}
</style>
