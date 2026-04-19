<template>
  <div class="page">
    <div class="grid">
      <div v-if="weatherData.available" class="weather-card">
        <div class="weather-header">
          <div class="weather-icon-wrapper">
            <div class="weather-icon" :class="getWeatherIconClass(weatherData.weather_icon)">
              <span class="weather-temp" style="font-size: 24px; margin: 0;">{{ weatherIconText }}</span>
            </div>
          </div>
          <div class="weather-info">
            <div class="weather-city">{{ weatherData.city_name || '当前城市' }}</div>
            <div class="weather-temp">{{ weatherTemperatureText }}</div>
            <div class="weather-desc">{{ weatherData.weather_main || '天气数据已同步' }}</div>
          </div>
        </div>

        <div class="weather-details">
          <div class="weather-detail-item">
            <span class="detail-label">湿度</span>
            <span class="detail-value">{{ weatherHumidityText }}</span>
          </div>
          <div v-if="weatherData.feels_like !== undefined" class="weather-detail-item">
            <span class="detail-label">体感温度</span>
            <span class="detail-value">{{ weatherData.feels_like }} °C</span>
          </div>
          <div v-if="weatherData.visibility !== undefined" class="weather-detail-item">
            <span class="detail-label">能见度</span>
            <span class="detail-value">{{ weatherData.visibility }} km</span>
          </div>
          <div v-if="weatherData.wind_direct || weatherData.wind_speed" class="weather-detail-item">
            <span class="detail-label">风力</span>
            <span class="detail-value">{{ weatherWindText }}</span>
          </div>
          <div v-if="weatherData.aqi" class="weather-detail-item">
            <span class="detail-label">空气质量</span>
            <span class="detail-value" :class="getAqiClass(weatherData.aqi)">
              {{ getAqiText(weatherData.aqi) }}
            </span>
          </div>
          <div class="weather-detail-item">
            <span class="detail-label">刷新周期</span>
            <span class="detail-value">{{ weatherConfig.refresh_interval_minutes || 10 }} 分钟</span>
          </div>
        </div>

        <div class="weather-meta">
          <div class="weather-update-time">
            <span class="update-label">更新时间</span>
            <span class="update-value">{{ weatherData.updated_at ? formatUpdateTime(weatherData.updated_at) : '暂无' }}</span>
          </div>
          <div class="weather-extended">
            <div class="weather-extended-item">预报天数：{{ forecastList.length }}</div>
            <div class="weather-extended-item">逐小时：{{ hourlyList.length }}</div>
            <div class="weather-extended-item">分钟降水：{{ minutelyList.length }}</div>
            <div class="weather-extended-item">生活指数：{{ lifeIndexEntries.length }}</div>
          </div>
        </div>
      </div>

      <div class="stats-row">
        <div v-for="card in statsCards" :key="card.key" class="holo-card">
          <div class="card-top">
            <div class="label">{{ card.label }}</div>
            <div class="tag">{{ card.tag }}</div>
          </div>
          <div class="number">{{ card.value }}</div>
          <div class="desc">{{ card.desc }}</div>
        </div>
      </div>
    </div>

    <PageStateAlert :message="loadError" />

    <div class="im-status-row">
      <div class="im-card" :class="{ 'im-online': imStats.online, 'im-offline': !imStats.online }">
        <div class="im-info">
          <div class="im-label">即时通讯服务</div>
          <div class="im-value">{{ imStats.online ? '在线运行' : '离线' }}</div>
          <div class="im-detail">在线连接 {{ imStats.onlineUsers }} · 消息计数 {{ imStats.messageCount }}</div>
          <div class="im-detail">运行时长 {{ formatUptime(imStats.uptime) }}</div>
        </div>
      </div>

      <div class="im-card">
        <div class="im-info">
          <div class="im-label">CPU 负载</div>
          <div class="im-value">{{ imStats.cpuUsage }}%</div>
          <div class="im-progress">
            <div
              class="im-progress-bar"
              :style="{ width: `${Math.min(100, Math.max(0, imStats.cpuUsage))}%`, background: imStats.cpuUsage > 80 ? '#ff4d4f' : '#0097ff' }"
            />
          </div>
        </div>
      </div>

      <div class="im-card">
        <div class="im-info">
          <div class="im-label">内存占用</div>
          <div class="im-value">{{ imStats.memoryUsage }}%</div>
          <div class="im-progress">
            <div
              class="im-progress-bar"
              :style="{ width: `${Math.min(100, Math.max(0, imStats.memoryUsage))}%`, background: imStats.memoryUsage > 80 ? '#ff4d4f' : '#52c41a' }"
            />
          </div>
        </div>
      </div>

      <div class="im-card">
        <div class="im-info">
          <div class="im-label">服务存储</div>
          <div class="im-value">{{ imStats.dbSizeMB }} MB</div>
          <div class="im-detail">监控时间 {{ statsTimestampLabel }}</div>
          <div class="im-detail">消息事实源默认以 Go 服务为准</div>
        </div>
      </div>

      <div class="im-card">
        <div class="im-info">
          <div class="im-label">广播模式</div>
          <div class="im-value">{{ getRedisModeLabel(imRedis.mode) }}</div>
          <div class="im-detail">
            Redis {{ imRedis.connected ? '已连接' : '未连接' }} · Adapter {{ imRedis.adapterEnabled ? '已启用' : '未启用' }}
          </div>
          <div class="im-detail">{{ getRedisModeHint(imRedis) }}</div>
        </div>
        <div class="im-mode-tags">
          <el-tag size="small" :type="getRedisModeTagType(imRedis.mode)">{{ getRedisModeLabel(imRedis.mode) }}</el-tag>
          <el-tag size="small" effect="plain">{{ imRedis.enabled ? `DB ${imRedis.database}` : '本地模式' }}</el-tag>
        </div>
      </div>

      <div class="im-card">
        <div class="im-info">
          <div class="im-label">发布探针</div>
          <div class="im-value">{{ runtimeHealthStatusLabel }}</div>
          <div class="im-detail">{{ runtimeHealthSummary }}</div>
          <div class="im-detail">{{ pushWorkerSummary }}</div>
        </div>
      </div>
    </div>

    <div class="panel presence-panel">
      <div class="panel-title">
        <div class="presence-title-block">
          <span>在线连接样本</span>
          <div class="presence-caption">{{ getRedisModeHint(imRedis) }}</div>
        </div>
        <div class="presence-status-tags">
          <el-tag size="small" :type="getRedisModeTagType(imRedis.mode)">{{ getRedisModeLabel(imRedis.mode) }}</el-tag>
          <el-tag size="small" effect="plain">在线 {{ imStats.onlineUsers }}</el-tag>
        </div>
      </div>

      <div v-if="onlinePresenceSample.length" class="presence-list">
        <div v-for="entry in onlinePresenceSample" :key="entry.key" class="presence-item">
          <div class="presence-main">
            <div class="presence-user">{{ entry.userLabel }}</div>
            <div class="presence-meta">{{ entry.roleLabel }} · {{ entry.socketLabel }}</div>
          </div>
          <div class="presence-side">
            <div class="presence-time">{{ formatPresenceConnectedAt(entry.connectedAt) }}</div>
          </div>
        </div>
      </div>
      <el-empty v-else :description="presenceEmptyDescription" :image-size="90" />
    </div>

    <div class="rank-row">
      <div class="panel rank-panel">
        <div class="panel-title">
          <span>用户消费排名</span>
          <div class="panel-actions">
            <el-radio-group v-model="userTab" size="small" @change="loadOrders">
              <el-radio-button value="week">周榜</el-radio-button>
              <el-radio-button value="month">月榜</el-radio-button>
            </el-radio-group>
            <el-button size="small" :loading="loading" @click="refreshData">刷新</el-button>
          </div>
        </div>

        <el-table :data="userRanks[userTab]" size="small" stripe>
          <el-table-column type="index" label="排名" width="70" />
          <el-table-column prop="name" label="用户" />
          <el-table-column prop="value" label="消费金额" width="120" align="right">
            <template #default="{ row }">
              <span>￥{{ row.value }}</span>
            </template>
          </el-table-column>
          <template #empty>
            <el-empty :description="rankError ? '加载失败，暂无可显示数据' : '暂无用户排名数据'" :image-size="90" />
          </template>
        </el-table>
      </div>

      <div class="panel rank-panel">
        <div class="panel-title">
          <span>骑手配送排名</span>
          <div class="panel-actions">
            <el-radio-group v-model="riderTab" size="small" @change="loadOrders">
              <el-radio-button value="week">周榜</el-radio-button>
              <el-radio-button value="month">月榜</el-radio-button>
            </el-radio-group>
            <el-button size="small" :loading="loading" @click="refreshData">刷新</el-button>
          </div>
        </div>

        <el-table :data="displayedRiderRanks" size="small" stripe>
          <el-table-column type="index" label="排名" width="70" />
          <el-table-column prop="name" label="骑手" />
          <el-table-column prop="level" label="段位" width="120">
            <template #default="{ row }">
              <el-tag :type="getRankType(row.level)" size="small">{{ getRankName(row.level, riderRankLevels) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="value" label="配送次数" width="120" align="right" />
          <template #empty>
            <el-empty :description="rankError ? '加载失败，暂无可显示数据' : '暂无骑手排名数据'" :image-size="90" />
          </template>
        </el-table>

        <div v-if="allRiderRanks[riderTab] && allRiderRanks[riderTab].length > 10" class="panel-footer">
          <el-button link type="primary" @click="viewAllRiders">
            查看全部（{{ allRiderRanks[riderTab].length }}）
          </el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { extractEnvelopeData, extractErrorMessage } from '@infinitech/contracts'
import {
  buildDashboardPushWorkerSummary,
  buildDashboardRuntimeHealthSummary,
  buildDashboardStatsCards,
  createDefaultServiceHealthStatus,
  createDefaultImStats,
  createDefaultStatsCards,
  extractDashboardRankItems,
  extractServiceHealthStatus,
  formatDashboardRuntimeHealthStatus,
  formatPresenceConnectedAt,
  formatUpdateTime,
  formatUptime,
  getAqiClass,
  getAqiText,
  getRankName,
  getRankType,
  getRedisModeHint,
  getRedisModeLabel,
  getRedisModeTagType,
  getWeatherIconClass,
  normalizeOnlinePresenceSample,
  normalizeRedisHealth,
  normalizeRefreshMinutes,
} from '@infinitech/admin-core'
import request from '@/utils/request'
import socketService from '@/utils/socket'
import { getCurrentAdminSocketIdentity } from '@/utils/runtime'
import { getCachedRiderRankSettings, loadRiderRankSettings } from '@/utils/platform-settings'
import PageStateAlert from '@/components/PageStateAlert.vue'

const router = useRouter()

const imStats = ref(createDefaultImStats())
const statsCards = ref(createDefaultStatsCards())
const runtimeHealth = ref(createDefaultServiceHealthStatus())

const userTab = ref('week')
const riderTab = ref('week')
const userRanks = ref({ week: [], month: [] })
const allRiderRanks = ref({ week: [], month: [] })
const loading = ref(false)
const riderRankSettings = ref(getCachedRiderRankSettings())

const weatherData = ref({ available: false })
const weatherConfig = ref({ refresh_interval_minutes: 10 })
const weatherError = ref('')
const statsError = ref('')
const rankError = ref('')
const loadError = computed(() => rankError.value || statsError.value || weatherError.value || '')

const statsCache = ref(null)
const ranksCache = ref(new Map())
const weatherCache = ref(null)
const cacheTimestamp = ref({ stats: 0, weather: 0 })

const STATS_CACHE_DURATION = 30000
const weatherCacheDurationMs = ref(10 * 60 * 1000)

let weatherTimer = null
let monitorSocket = null

function hasWeatherLocationConfig() {
  const adcode = String(weatherConfig.value?.adcode || '').trim()
  const city = String(weatherConfig.value?.city || weatherConfig.value?.location || '').trim()
  return Boolean(adcode || city)
}

const displayedRiderRanks = computed(() => (allRiderRanks.value[riderTab.value] || []).slice(0, 10))
const riderRankLevels = computed(() => riderRankSettings.value?.levels || [])
const lifeIndexEntries = computed(() => Object.entries(weatherData.value?.life_indices || {}))
const forecastList = computed(() => (Array.isArray(weatherData.value?.forecast) ? weatherData.value.forecast : []))
const hourlyList = computed(() =>
  Array.isArray(weatherData.value?.hourly_forecast) ? weatherData.value.hourly_forecast : []
)
const minutelyList = computed(() =>
  Array.isArray(weatherData.value?.minutely_precip?.data) ? weatherData.value.minutely_precip.data : []
)
const onlinePresenceSample = computed(() => normalizeOnlinePresenceSample(imStats.value?.onlinePresenceSample).slice(0, 8))
const imRedis = computed(() => normalizeRedisHealth(imStats.value?.redis))
const weatherIconText = computed(() => String(weatherData.value?.weather_main || '晴').trim().slice(0, 1) || '晴')
const weatherTemperatureText = computed(() =>
  weatherData.value?.temperature !== undefined ? `${weatherData.value.temperature} °C` : '--'
)
const weatherHumidityText = computed(() =>
  weatherData.value?.humidity !== undefined ? `${weatherData.value.humidity}%` : '--'
)
const weatherWindText = computed(() => {
  const segments = []
  if (weatherData.value?.wind_direct) segments.push(weatherData.value.wind_direct)
  if (weatherData.value?.wind_speed) segments.push(`${weatherData.value.wind_speed} 级`)
  return segments.join(' ') || '--'
})
const statsTimestampLabel = computed(() =>
  imStats.value?.timestamp ? formatUpdateTime(imStats.value.timestamp) : '等待服务上报'
)

const runtimeHealthStatusLabel = computed(() => formatDashboardRuntimeHealthStatus(runtimeHealth.value?.overall))

const runtimeHealthSummary = computed(() => buildDashboardRuntimeHealthSummary(runtimeHealth.value))

const pushWorkerSummary = computed(() => buildDashboardPushWorkerSummary(runtimeHealth.value))

const presenceEmptyDescription = computed(() => {
  if (imRedis.value.mode === 'redis' || imRedis.value.mode === 'redis-no-adapter') {
    return '暂无在线连接样本'
  }
  if (imRedis.value.mode === 'local-fallback') {
    return '当前处于单机回退模式，暂无共享在线样本'
  }
  return 'Redis 未启用，暂无共享在线样本'
})

function applyImStatsPatch(data) {
  const patch = data && typeof data === 'object' ? data : {}
  const nextStats = {
    ...imStats.value,
    ...patch
  }
  nextStats.onlinePresenceSample = normalizeOnlinePresenceSample(
    patch.onlinePresenceSample !== undefined ? patch.onlinePresenceSample : nextStats.onlinePresenceSample
  )
  nextStats.redis = normalizeRedisHealth(patch.redis !== undefined ? patch.redis : nextStats.redis)
  imStats.value = nextStats
}

function resetWeatherTimer() {
  if (weatherTimer) {
    clearInterval(weatherTimer)
    weatherTimer = null
  }
  weatherTimer = setInterval(() => {
    void loadWeather(true)
  }, weatherCacheDurationMs.value)
}

async function loadWeatherConfig() {
  try {
    const { data } = await request.get('/api/weather-config')
    const payload = extractEnvelopeData(data) || {}
    const refreshMinutes = normalizeRefreshMinutes(payload?.refresh_interval_minutes)
    weatherConfig.value = { ...payload, refresh_interval_minutes: refreshMinutes }
    weatherCacheDurationMs.value = refreshMinutes * 60 * 1000
  } catch (_error) {
    weatherConfig.value = { refresh_interval_minutes: 10 }
    weatherCacheDurationMs.value = 10 * 60 * 1000
  } finally {
    resetWeatherTimer()
  }
}

async function loadSystemHealth() {
  try {
    const { data } = await request.get('/api/system-health')
    runtimeHealth.value = extractServiceHealthStatus(data, { path: 'serviceStatus' })
  } catch (_error) {
    runtimeHealth.value = createDefaultServiceHealthStatus()
  }
}

async function loadRiderRankDictionary(forceRefresh = false) {
  riderRankSettings.value = await loadRiderRankSettings(forceRefresh)
}

function viewAllRiders() {
  router.push({
    path: '/rider-ranks',
    query: { period: riderTab.value }
  })
}

function handleServerStats(data) {
  applyImStatsPatch(data)
}

async function connectImStats() {
  try {
    monitorSocket = await socketService.connect('/monitor')
    monitorSocket.emit('join_monitor', { userId: getCurrentAdminSocketIdentity()?.userId || '' })
    socketService.on('server_stats', handleServerStats, '/monitor')

    const { data } = await request.get('/api/realtime/stats')
    applyImStatsPatch(extractEnvelopeData(data) || {})
  } catch (_error) {
    imStats.value.online = false
  }
}

async function refreshData() {
  await loadRiderRankDictionary(true)
  await loadWeatherConfig()
  weatherError.value = ''
  statsError.value = ''
  rankError.value = ''
  statsCache.value = null
  weatherCache.value = null
  ranksCache.value.clear()
  cacheTimestamp.value = { stats: 0, weather: 0 }
  await Promise.all([loadStats(true), loadOrders(true), loadWeather(true), loadSystemHealth()])
}

async function loadWeather(forceRefresh = false) {
  if (!hasWeatherLocationConfig()) {
    weatherError.value = ''
    weatherData.value = { available: false }
    weatherCache.value = weatherData.value
    cacheTimestamp.value.weather = Date.now()
    return
  }

  const now = Date.now()
  if (!forceRefresh && weatherCache.value && now - cacheTimestamp.value.weather < weatherCacheDurationMs.value) {
    weatherError.value = ''
    weatherData.value = weatherCache.value
    return
  }

  try {
    weatherError.value = ''
    const { data } = await request.get('/api/weather')
    weatherData.value = extractEnvelopeData(data) || data || { available: false }
    weatherCache.value = weatherData.value
    cacheTimestamp.value.weather = now
  } catch (error) {
    weatherError.value = extractErrorMessage(error, '加载天气数据失败，请稍后重试')
    weatherData.value = { available: false }
  }
}

async function loadStats(forceRefresh = false) {
  const now = Date.now()
  if (!forceRefresh && statsCache.value && now - cacheTimestamp.value.stats < STATS_CACHE_DURATION) {
    statsError.value = ''
    statsCards.value = statsCache.value.map((item) => ({ ...item }))
    return
  }

  try {
    statsError.value = ''
    const { data } = await request.get('/api/stats')
    const source = data && typeof data === 'object' ? data : {}
    const nextCards = buildDashboardStatsCards(source)
    statsCards.value = nextCards
    statsCache.value = nextCards.map((item) => ({ ...item }))
    cacheTimestamp.value.stats = now
  } catch (error) {
    statsError.value = extractErrorMessage(error, '加载统计数据失败，请稍后重试')
  }
}

async function loadOrders(forceRefresh = false) {
  const cacheKey = `${userTab.value}-${riderTab.value}`
  if (!forceRefresh && ranksCache.value.has(cacheKey)) {
    rankError.value = ''
    const cached = ranksCache.value.get(cacheKey)
    userRanks.value = cached.userRanks
    allRiderRanks.value = cached.allRiderRanks
    return
  }

  loading.value = true
  rankError.value = ''
  try {
    const [weekUserRes, monthUserRes, weekRiderRes, monthRiderRes] = await Promise.allSettled([
      request.get('/api/user-ranks?period=week&type=amount'),
      request.get('/api/user-ranks?period=month&type=amount'),
      request.get('/api/rider-ranks?period=week'),
      request.get('/api/rider-ranks?period=month')
    ])

    const hasFailure = [weekUserRes, monthUserRes, weekRiderRes, monthRiderRes].some(
      (item) => item.status === 'rejected'
    )
    if (hasFailure) {
      rankError.value = '部分排名数据加载失败，请稍后重试'
    }

    userRanks.value = {
      week: weekUserRes.status === 'fulfilled' ? extractDashboardRankItems(weekUserRes.value?.data) : [],
      month: monthUserRes.status === 'fulfilled' ? extractDashboardRankItems(monthUserRes.value?.data) : []
    }

    allRiderRanks.value = {
      week: weekRiderRes.status === 'fulfilled' ? extractDashboardRankItems(weekRiderRes.value?.data) : [],
      month: monthRiderRes.status === 'fulfilled' ? extractDashboardRankItems(monthRiderRes.value?.data) : []
    }

    ranksCache.value.set(cacheKey, {
      userRanks: {
        week: [...userRanks.value.week],
        month: [...userRanks.value.month]
      },
      allRiderRanks: {
        week: [...allRiderRanks.value.week],
        month: [...allRiderRanks.value.month]
      }
    })

    if (ranksCache.value.size > 10) {
      const firstKey = ranksCache.value.keys().next().value
      ranksCache.value.delete(firstKey)
    }
  } catch (error) {
    rankError.value = extractErrorMessage(error, '加载排名数据失败，请稍后重试')
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await loadRiderRankDictionary()
  await loadWeatherConfig()
  await refreshData()
  await connectImStats()
})

onUnmounted(() => {
  if (weatherTimer) {
    clearInterval(weatherTimer)
    weatherTimer = null
  }
  socketService.off('server_stats', handleServerStats, '/monitor')
  socketService.disconnect('/monitor')
  monitorSocket = null
})
</script>

<style scoped lang="css" src="./Dashboard.css"></style>
