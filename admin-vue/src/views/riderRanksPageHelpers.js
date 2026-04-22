import { onMounted, ref } from 'vue'
import { extractErrorMessage } from '@infinitech/contracts'
import {
  extractDashboardRankItems,
  getRankName,
  getRankType,
} from '@infinitech/admin-core'
import {
  getCachedRiderRankSettings,
  loadRiderRankSettings,
} from '@/utils/platform-settings'

export function useRiderRanksPage({ request, route, router }) {
  const loading = ref(false)
  const ranks = ref([])
  const period = ref(String(route.query.period || 'week'))
  const loadError = ref('')
  const dataCache = ref(new Map())
  const riderRankSettings = ref(getCachedRiderRankSettings())
  const riderRankLevels = ref(riderRankSettings.value?.levels || [])

  function goBack() {
    router.push('/dashboard')
  }

  function indexMethod(index) {
    return index + 1
  }

  function handlePeriodChange() {
    dataCache.value.clear()
    void loadRanks()
  }

  async function loadRanks(forceRefresh = false) {
    if (forceRefresh) {
      await loadRiderRankDictionary(true)
    }

    const cacheKey = period.value
    loadError.value = ''

    if (!forceRefresh && dataCache.value.has(cacheKey)) {
      ranks.value = dataCache.value.get(cacheKey)
      return
    }

    loading.value = true

    try {
      const { data } = await request.get(`/api/rider-ranks?period=${period.value}`)
      ranks.value = extractDashboardRankItems(data)
      dataCache.value.set(cacheKey, [...ranks.value])
    } catch (error) {
      ranks.value = []
      loadError.value = extractErrorMessage(error, '加载骑手排名失败，请稍后重试')
    } finally {
      loading.value = false
    }
  }

  async function loadRiderRankDictionary(forceRefresh = false) {
    riderRankSettings.value = await loadRiderRankSettings(forceRefresh)
    riderRankLevels.value = riderRankSettings.value?.levels || []
  }

  async function refreshRanks() {
    await loadRanks(true)
  }

  onMounted(() => {
    void loadRiderRankDictionary()
    void loadRanks()
  })

  return {
    getRankName,
    getRankType,
    goBack,
    handlePeriodChange,
    indexMethod,
    loadError,
    loading,
    period,
    ranks,
    refreshRanks,
    riderRankLevels,
  }
}
