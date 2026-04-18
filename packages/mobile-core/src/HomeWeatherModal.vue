<template>
  <view v-if="show" class="modal-mask" @tap="handleClose">
    <view class="modal-content" @tap.stop>
      <view class="modal-header">
        <text class="modal-title">今日天气</text>
        <text class="modal-close" @tap="handleClose">×</text>
      </view>
      <view class="modal-body">
        <view class="weather-main">
          <view class="weather-icon-wrap">
            <view class="weather-icon">{{ icon }}</view>
          </view>
          <view class="weather-info">
            <text class="temp-text">{{ weather.temp }}°</text>
            <text class="condition-text">{{ weather.condition }}</text>
            <text class="location-text"
              >{{ weather.province || "" }} {{ weather.city || "" }}</text
            >
          </view>
        </view>
        <view class="weather-extra">
          <view class="extra-item">
            <text class="extra-label">体感</text>
            <text class="extra-value"
              >{{ weather.feelsLike || weather.temp }}°</text
            >
          </view>
          <view class="extra-item">
            <text class="extra-label">空气</text>
            <text class="extra-value">{{ weather.airQuality || "良好" }}</text>
          </view>
          <view class="extra-item" v-if="weather.humidity !== undefined">
            <text class="extra-label">湿度</text>
            <text class="extra-value">{{ weather.humidity }}%</text>
          </view>
          <view
            class="extra-item"
            v-if="weather.windDirection || weather.windPower"
          >
            <text class="extra-label">风力</text>
            <text class="extra-value"
              >{{ weather.windDirection || "" }}
              {{ weather.windPower || "" }}</text
            >
          </view>
          <view class="extra-item" v-if="weather.reportTime">
            <text class="extra-label">更新时间</text>
            <text class="extra-value">{{ weather.reportTime }}</text>
          </view>
          <view class="extra-item" v-if="weather.refreshIntervalMinutes">
            <text class="extra-label">刷新周期</text>
            <text class="extra-value"
              >{{ weather.refreshIntervalMinutes }} 分钟</text
            >
          </view>
          <view class="extra-item">
            <text class="extra-label">提示</text>
            <text class="extra-value">{{
              weather.tips || "出门记得带伞，多喝热水～"
            }}</text>
          </view>
        </view>

        <view class="section-block" v-if="forecastList.length > 0">
          <text class="section-title"
            >多天预报（{{ forecastList.length }}）</text
          >
          <view
            v-for="(item, idx) in forecastList"
            :key="'fc-' + idx"
            class="kv-row"
          >
            <text class="kv-key">{{
              item.date || item.fxDate || "第" + (idx + 1) + "天"
            }}</text>
            <text class="kv-value">
              {{ item.weather || item.textDay || item.dayweather || "--" }}
              {{ resolveForecastMin(item) }}°~{{ resolveForecastMax(item) }}°
            </text>
          </view>
        </view>

        <view class="section-block" v-if="hourlyList.length > 0">
          <text class="section-title"
            >逐小时预报（{{ hourlyList.length }}）</text
          >
          <view
            v-for="(item, idx) in hourlyPreviewList"
            :key="'hour-' + idx"
            class="kv-row"
          >
            <text class="kv-key">{{
              item.fxTime || item.time || item.datetime || "+" + idx + "h"
            }}</text>
            <text class="kv-value"
              >{{ item.weather || item.text || "--" }}
              {{ resolveHourlyTemp(item) }}°</text
            >
          </view>
        </view>

        <view class="section-block" v-if="minutelySummary">
          <text class="section-title">分钟降水</text>
          <view class="kv-row">
            <text class="kv-key">摘要</text>
            <text class="kv-value">{{ minutelySummary }}</text>
          </view>
          <view class="kv-row" v-if="minutelyList.length > 0">
            <text class="kv-key">数据点</text>
            <text class="kv-value">{{ minutelyList.length }} 个</text>
          </view>
        </view>

        <view class="section-block" v-if="lifeIndexList.length > 0">
          <text class="section-title"
            >生活指数（{{ lifeIndexList.length }}）</text
          >
          <view
            v-for="(item, idx) in lifeIndexList"
            :key="'idx-' + idx"
            class="kv-row"
          >
            <text class="kv-key">{{ item.label }}</text>
            <text class="kv-value">{{ item.level || item.brief || "--" }}</text>
          </view>
        </view>

        <view class="section-block">
          <text class="section-title">完整天气数据（JSON）</text>
          <text class="json-text">{{ weatherJson }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { createHomeWeatherModalComponent } from "./home-weather-modal.js";

export default createHomeWeatherModalComponent();
</script>

<style scoped lang="scss">
.modal-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  z-index: 999;
  display: flex;
  align-items: flex-end;
  backdrop-filter: blur(2px);
}

.modal-content {
  background: #fff;
  width: 100%;
  border-radius: 24px 24px 0 0;
  padding: 24px;
  padding-bottom: calc(24px + env(safe-area-inset-bottom));
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.modal-title {
  font-size: 20px;
  font-weight: 700;
  color: #111;
}

.modal-close {
  font-size: 32px;
  color: #999;
  line-height: 1;
}

.modal-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-height: 70vh;
  overflow-y: auto;
}

.weather-main {
  display: flex;
  align-items: center;
}

.weather-icon-wrap {
  width: 64px;
  height: 64px;
  border-radius: 20px;
  background: #e0f2fe;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16px;
}

.weather-icon {
  font-size: 32px;
}

.weather-info {
  flex: 1;
}

.temp-text {
  font-size: 32px;
  font-weight: 700;
  color: #111827;
}

.condition-text {
  margin-top: 4px;
  font-size: 14px;
  color: #6b7280;
}

.location-text {
  margin-top: 2px;
  font-size: 12px;
  color: #9ca3af;
}

.weather-extra {
  padding: 14px 16px;
  border-radius: 16px;
  background: #f9fafb;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.extra-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.extra-label {
  font-size: 13px;
  color: #6b7280;
}

.extra-value {
  font-size: 13px;
  color: #111827;
  font-weight: 500;
  text-align: right;
}

.section-block {
  padding: 12px;
  border-radius: 12px;
  background: #f3f4f6;
}

.section-title {
  font-size: 13px;
  font-weight: 700;
  color: #111827;
  margin-bottom: 8px;
  display: block;
}

.kv-row {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  padding: 4px 0;
}

.kv-key {
  font-size: 12px;
  color: #4b5563;
}

.kv-value {
  font-size: 12px;
  color: #111827;
  text-align: right;
  flex: 1;
}

.json-text {
  display: block;
  max-height: 220px;
  overflow-y: auto;
  padding: 10px;
  border-radius: 8px;
  background: #0f172a;
  color: #dbeafe;
  font-size: 11px;
  line-height: 1.4;
  white-space: pre-wrap;
  word-break: break-all;
}
</style>
