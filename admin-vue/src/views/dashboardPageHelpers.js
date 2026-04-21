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

export { formatUptime } from '@infinitech/admin-core'

export function useDashboardPage({
  request,
  socketService,
  getCurrentAdminSocketIdentity,
  getCachedRiderRankSettings,
  loadRiderRankSettings,
}) {
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

  const displayedRiderRanks = computed(() =>
    (allRiderRanks.value[riderTab.value] || []).slice(0, 10),
  )
  const riderRankLevels = computed(() => riderRankSettings.value?.levels || [])
  const lifeIndexEntries = computed(() =>
    Object.entries(weatherData.value?.life_indices || {}),
  )
  const forecastList = computed(() =>
    (Array.isArray(weatherData.value?.forecast) ? weatherData.value.forecast : []),
  )
  const hourlyList = computed(() =>
    Array.isArray(weatherData.value?.hourly_forecast) ? weatherData.value.hourly_forecast : [],
  )
  const minutelyList = computed(() =>
    Array.isArray(weatherData.value?.minutely_precip?.data)
      ? weatherData.value.minutely_precip.data
      : [],
  )
  const onlinePresenceSample = computed(() =>
    normalizeOnlinePresenceSample(imStats.value?.onlinePresenceSample).slice(0, 8),
  )
  const imRedis = computed(() => normalizeRedisHealth(imStats.value?.redis))
  const weatherIconText = computed(() =>
    String(weatherData.value?.weather_main || '晴').trim().slice(0, 1) || '晴',
  )
  const weatherTemperatureText = computed(() =>
    weatherData.value?.temperature !== undefined ? `${weatherData.value.temperature} °C` : '--',
  )
  const weatherHumidityText = computed(() =>
    weatherData.value?.humidity !== undefined ? `${weatherData.value.humidity}%` : '--',
  )
  const weatherWindText = computed(() => {
    const segments = []
    if (weatherData.value?.wind_direct) segments.push(weatherData.value.wind_direct)
    if (weatherData.value?.wind_speed) segments.push(`${weatherData.value.wind_speed} 级`)
    return segments.join(' ') || '--'
  })
  const statsTimestampLabel = computed(() =>
    imStats.value?.timestamp ? formatUpdateTime(imStats.value.timestamp) : '等待服务上报',
  )

  const runtimeHealthStatusLabel = computed(() =>
    formatDashboardRuntimeHealthStatus(runtimeHealth.value?.overall),
  )
  const runtimeHealthSummary = computed(() =>
    buildDashboardRuntimeHealthSummary(runtimeHealth.value),
  )
  const pushWorkerSummary = computed(() =>
    buildDashboardPushWorkerSummary(runtimeHealth.value),
  )
  const presenceEmptyDescription = computed(() => {
    if (imRedis.value.mode === 'redis' || imRedis.value.mode === 'redis-no-adapter') {
      return '暂无在线连接样本'
    }
    if (imRedis.value.mode === 'local-fallback') {
      return '当前处于单机回退模式，暂无共享在线样本'
    }
    return 'Redis 未启用，暂无共享在线样本'
  })

  function setUserTab(value) {
    userTab.value = value
  }

  function setRiderTab(value) {
    riderTab.value = value
  }

  function applyImStatsPatch(data) {
    const patch = data && typeof data === 'object' ? data : {}
    const nextStats = {
      ...imStats.value,
      ...patch,
    }
    nextStats.onlinePresenceSample = normalizeOnlinePresenceSample(
      patch.onlinePresenceSample !== undefined
        ? patch.onlinePresenceSample
        : nextStats.onlinePresenceSample,
    )
    nextStats.redis = normalizeRedisHealth(
      patch.redis !== undefined ? patch.redis : nextStats.redis,
    )
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
      query: { period: riderTab.value },
    })
  }

  function handleServerStats(data) {
    applyImStatsPatch(data)
  }

  async function connectImStats() {
    try {
      monitorSocket = await socketService.connect('/monitor')
      monitorSocket.emit('join_monitor', {
        userId: getCurrentAdminSocketIdentity()?.userId || '',
      })
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
    await Promise.all([
      loadStats(true),
      loadOrders(true),
      loadWeather(true),
      loadSystemHealth(),
    ])
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
    if (
      !forceRefresh
      && weatherCache.value
      && now - cacheTimestamp.value.weather < weatherCacheDurationMs.value
    ) {
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
    if (
      !forceRefresh
      && statsCache.value
      && now - cacheTimestamp.value.stats < STATS_CACHE_DURATION
    ) {
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
      const [weekUserRes, monthUserRes, weekRiderRes, monthRiderRes] =
        await Promise.allSettled([
          request.get('/api/user-ranks?period=week&type=amount'),
          request.get('/api/user-ranks?period=month&type=amount'),
          request.get('/api/rider-ranks?period=week'),
          request.get('/api/rider-ranks?period=month'),
        ])

      const hasFailure = [weekUserRes, monthUserRes, weekRiderRes, monthRiderRes]
        .some((item) => item.status === 'rejected')
      if (hasFailure) {
        rankError.value = '部分排名数据加载失败，请稍后重试'
      }

      userRanks.value = {
        week: weekUserRes.status === 'fulfilled'
          ? extractDashboardRankItems(weekUserRes.value?.data)
          : [],
        month: monthUserRes.status === 'fulfilled'
          ? extractDashboardRankItems(monthUserRes.value?.data)
          : [],
      }

      allRiderRanks.value = {
        week: weekRiderRes.status === 'fulfilled'
          ? extractDashboardRankItems(weekRiderRes.value?.data)
          : [],
        month: monthRiderRes.status === 'fulfilled'
          ? extractDashboardRankItems(monthRiderRes.value?.data)
          : [],
      }

      ranksCache.value.set(cacheKey, {
        userRanks: {
          week: [...userRanks.value.week],
          month: [...userRanks.value.month],
        },
        allRiderRanks: {
          week: [...allRiderRanks.value.week],
          month: [...allRiderRanks.value.month],
        },
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

  return {
    allRiderRanks,
    displayedRiderRanks,
    forecastList,
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
  }
}
