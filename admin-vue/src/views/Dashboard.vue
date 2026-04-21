<template>
  <div class="page">
    <DashboardOverviewSection
      :weather-data="weatherData"
      :weather-config="weatherConfig"
      :weather-icon-text="weatherIconText"
      :weather-temperature-text="weatherTemperatureText"
      :weather-humidity-text="weatherHumidityText"
      :weather-wind-text="weatherWindText"
      :forecast-list="forecastList"
      :hourly-list="hourlyList"
      :minutely-list="minutelyList"
      :life-index-entries="lifeIndexEntries"
      :get-weather-icon-class="getWeatherIconClass"
      :get-aqi-class="getAqiClass"
      :get-aqi-text="getAqiText"
      :format-update-time="formatUpdateTime"
      :stats-cards="statsCards"
    />

    <PageStateAlert :message="loadError" />

    <DashboardImStatusRow
      :im-stats="imStats"
      :stats-timestamp-label="statsTimestampLabel"
      :im-redis="imRedis"
      :get-redis-mode-label="getRedisModeLabel"
      :get-redis-mode-hint="getRedisModeHint"
      :get-redis-mode-tag-type="getRedisModeTagType"
      :runtime-health-status-label="runtimeHealthStatusLabel"
      :runtime-health-summary="runtimeHealthSummary"
      :push-worker-summary="pushWorkerSummary"
    />

    <DashboardPresencePanel
      :online-presence-sample="onlinePresenceSample"
      :presence-empty-description="presenceEmptyDescription"
      :im-redis="imRedis"
      :im-stats="imStats"
      :get-redis-mode-tag-type="getRedisModeTagType"
      :get-redis-mode-label="getRedisModeLabel"
      :get-redis-mode-hint="getRedisModeHint"
      :format-presence-connected-at="formatPresenceConnectedAt"
    />

    <DashboardRankSection
      :user-tab="userTab"
      :rider-tab="riderTab"
      :user-ranks="userRanks"
      :displayed-rider-ranks="displayedRiderRanks"
      :all-rider-ranks="allRiderRanks"
      :rider-rank-levels="riderRankLevels"
      :loading="loading"
      :rank-error="rankError"
      :set-user-tab="setUserTab"
      :set-rider-tab="setRiderTab"
      :load-orders="loadOrders"
      :refresh-data="refreshData"
      :get-rank-type="getRankType"
      :get-rank-name="getRankName"
      :view-all-riders="viewAllRiders"
    />
  </div>
</template>

<script setup>
import './Dashboard.css'
import request from '@/utils/request'
import socketService from '@/utils/socket'
import { getCurrentAdminSocketIdentity } from '@/utils/runtime'
import {
  getCachedRiderRankSettings,
  loadRiderRankSettings,
} from '@/utils/platform-settings'
import PageStateAlert from '@/components/PageStateAlert.vue'
import DashboardImStatusRow from './dashboardSections/DashboardImStatusRow.vue'
import DashboardOverviewSection from './dashboardSections/DashboardOverviewSection.vue'
import DashboardPresencePanel from './dashboardSections/DashboardPresencePanel.vue'
import DashboardRankSection from './dashboardSections/DashboardRankSection.vue'
import { useDashboardPage } from './dashboardPageHelpers'

const {
  allRiderRanks,
  displayedRiderRanks,
  forecastList,
  formatPresenceConnectedAt,
  formatUpdateTime,
  getAqiClass,
  getAqiText,
  getRankName,
  getRankType,
  getRedisModeHint,
  getRedisModeLabel,
  getRedisModeTagType,
  getWeatherIconClass,
  hourlyList,
  imRedis,
  imStats,
  lifeIndexEntries,
  loadError,
  loadOrders,
  loading,
  minutelyList,
  onlinePresenceSample,
  presenceEmptyDescription,
  pushWorkerSummary,
  rankError,
  refreshData,
  riderRankLevels,
  riderTab,
  runtimeHealthStatusLabel,
  runtimeHealthSummary,
  setRiderTab,
  setUserTab,
  statsCards,
  statsTimestampLabel,
  userRanks,
  userTab,
  viewAllRiders,
  weatherConfig,
  weatherData,
  weatherHumidityText,
  weatherIconText,
  weatherTemperatureText,
  weatherWindText,
} = useDashboardPage({
  request,
  socketService,
  getCurrentAdminSocketIdentity,
  getCachedRiderRankSettings,
  loadRiderRankSettings,
})
</script>
