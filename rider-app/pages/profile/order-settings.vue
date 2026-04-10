<template>
  <view class="container">
    <view class="page-padding">
      <view class="section">
        <view class="section-title">接单范围</view>
        <view class="settings-card">
          <view class="setting-item slider-item">
            <view class="slider-head">
              <text class="setting-label">接单距离</text>
              <text class="setting-value">{{ orderSettings.maxDistanceKm.toFixed(1) }} 公里</text>
            </view>
            <slider
              class="distance-slider"
              min="1"
              max="20"
              step="0.5"
              :value="orderSettings.maxDistanceKm"
              activeColor="#009bf5"
              backgroundColor="#dbeafe"
              block-color="#009bf5"
              @change="handleDistanceChange"
            />
          </view>
          <view class="divider"></view>
          <view class="setting-item">
            <text class="setting-label">自动接单</text>
            <switch :checked="orderSettings.autoAcceptEnabled" @change="toggleAuto" color="#009bf5" />
          </view>
        </view>
      </view>

      <view class="section">
        <view class="section-title">偏好设置</view>
        <view class="settings-card">
          <view class="setting-item">
            <text class="setting-label">优先顺路单</text>
            <switch :checked="orderSettings.preferRoute" color="#009bf5" @change="handleSwitchChange('preferRoute', $event)" />
          </view>
          <view class="divider"></view>
          <view class="setting-item">
            <text class="setting-label">优先高价单</text>
            <switch :checked="orderSettings.preferHighPrice" color="#009bf5" @change="handleSwitchChange('preferHighPrice', $event)" />
          </view>
          <view class="divider"></view>
          <view class="setting-item">
            <text class="setting-label">优先近距离</text>
            <switch :checked="orderSettings.preferNearby" color="#009bf5" @change="handleSwitchChange('preferNearby', $event)" />
          </view>
        </view>
      </view>

      <view class="tip-box">
        <text class="tip-icon">💡</text>
        <text class="tip-text">{{ tipText }}</text>
      </view>

      <button class="save-btn" :disabled="saving || loading" @tap="savePreferences">
        {{ loading ? '加载中...' : (saving ? '保存中...' : '保存设置') }}
      </button>
    </view>
  </view>
</template>

<script lang="ts">
import Vue from 'vue'
import { fetchRiderPreferences, saveRiderPreferences } from '../../shared-ui/api'

export default Vue.extend({
  data() {
    return {
      loading: false,
      saving: false,
      orderSettings: {
        maxDistanceKm: 3,
        autoAcceptEnabled: false,
        preferRoute: true,
        preferHighPrice: true,
        preferNearby: false
      },
      tipText: '合理设置接单偏好，可提升候选单排序质量与自动接单命中率'
    }
  },
  onLoad() {
    this.loadPreferences()
  },
  onShow() {
    this.loadPreferences()
  },
  methods: {
    normalizePreferences(raw: any = {}) {
      const maxDistanceKm = Number(raw.max_distance_km ?? raw.maxDistanceKm ?? 3)
      return {
        maxDistanceKm: Number.isFinite(maxDistanceKm) && maxDistanceKm > 0 ? maxDistanceKm : 3,
        autoAcceptEnabled: !!(raw.auto_accept_enabled ?? raw.autoAcceptEnabled),
        preferRoute: raw.prefer_route === undefined && raw.preferRoute === undefined ? true : !!(raw.prefer_route ?? raw.preferRoute),
        preferHighPrice: raw.prefer_high_price === undefined && raw.preferHighPrice === undefined ? true : !!(raw.prefer_high_price ?? raw.preferHighPrice),
        preferNearby: !!(raw.prefer_nearby ?? raw.preferNearby)
      }
    },
    async loadPreferences() {
      this.loading = true
      try {
        const response: any = await fetchRiderPreferences()
        const payload = response?.data || response || {}
        this.orderSettings = this.normalizePreferences(payload)
      } catch (error) {
        this.orderSettings = this.normalizePreferences()
        uni.showToast({ title: error?.error || error?.message || '加载设置失败', icon: 'none' })
      } finally {
        this.loading = false
      }
    },
    handleDistanceChange(event: any) {
      const value = Number(event?.detail?.value || 3)
      this.orderSettings.maxDistanceKm = Math.max(1, Math.min(20, value))
    },
    handleSwitchChange(field: 'preferRoute' | 'preferHighPrice' | 'preferNearby', event: any) {
      this.orderSettings[field] = !!event?.detail?.value
    },
    toggleAuto() {
      const nextValue = !this.orderSettings.autoAcceptEnabled

      if (nextValue) {
        uni.showModal({
          title: '开启自动接单',
          content: '开启后将自动接受符合条件的订单，确定开启吗？',
          success: (res) => {
            this.orderSettings.autoAcceptEnabled = !!res.confirm
          }
        })
        return
      }

      this.orderSettings.autoAcceptEnabled = false
    },
    async savePreferences() {
      if (this.saving || this.loading) return
      this.saving = true
      try {
        const response: any = await saveRiderPreferences({
          max_distance_km: this.orderSettings.maxDistanceKm,
          auto_accept_enabled: this.orderSettings.autoAcceptEnabled,
          prefer_route: this.orderSettings.preferRoute,
          prefer_high_price: this.orderSettings.preferHighPrice,
          prefer_nearby: this.orderSettings.preferNearby
        })
        const payload = response?.data || response || {}
        this.orderSettings = this.normalizePreferences(payload)
        uni.showToast({ title: '保存成功', icon: 'success' })
      } catch (error) {
        uni.showToast({ title: error?.error || error?.message || '保存失败', icon: 'none' })
      } finally {
        this.saving = false
      }
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
  box-sizing: border-box;
}

.section {
  margin-bottom: 48rpx;
}

.section-title {
  font-size: 26rpx;
  color: #6b7280;
  padding: 0 16rpx 16rpx;
  font-weight: 500;
}

.settings-card {
  background: white;
  border-radius: 24rpx;
  padding: 0 32rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
}

.setting-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 32rpx 0;
}

.slider-item {
  display: block;
}

.slider-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.setting-label {
  font-size: 28rpx;
  color: #1f2937;
}

.setting-right {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.setting-value {
  font-size: 28rpx;
  color: #6b7280;
}

.arrow {
  font-size: 32rpx;
  color: #d1d5db;
}

.divider {
  height: 2rpx;
  background: #f9fafb;
}

.distance-slider {
  margin-top: 12rpx;
}

.tip-box {
  background: #fffbeb;
  border: 2rpx solid #fef3c7;
  border-radius: 16rpx;
  padding: 24rpx;
  display: flex;
  align-items: flex-start;
  gap: 16rpx;
}

.tip-icon {
  font-size: 32rpx;
  line-height: 1;
}

.tip-text {
  flex: 1;
  font-size: 24rpx;
  color: #92400e;
  line-height: 1.5;
}

.save-btn {
  margin-top: 32rpx;
  height: 88rpx;
  border-radius: 20rpx;
  background: linear-gradient(135deg, #009bf5 0%, #38bdf8 100%);
  color: #fff;
  font-size: 30rpx;
  font-weight: 600;
}
</style>
