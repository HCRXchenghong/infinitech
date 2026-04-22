import { ref, watch } from 'vue'
import {
  extractErrorMessage,
  getPublicOfficialSiteExposureDetail,
} from '@/utils/officialSiteApi'
import {
  applyOfficialSiteSeo,
  buildOfficialSiteUrl,
  createOfficialSiteBreadcrumbJsonLd,
  createOfficialSiteOrganizationJsonLd,
  createOfficialSiteWebPageJsonLd,
  createOfficialSiteWebsiteJsonLd,
  resolveOfficialSiteSeoConfig,
  toIsoDateString,
} from '@/utils/officialSiteSeo'

export function formatOfficialSiteExposureDate(value) {
  if (!value) return '--'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function getOfficialSiteExposureStatusLabel(status) {
  if (status === 'resolved') return '维权已解决'
  if (status === 'processing') return '平台处理中'
  return '等待处理'
}

export function resolveOfficialSiteExposureStatusClass(status) {
  return status === 'resolved'
    ? 'bg-green-50 text-green-600 border-green-200'
    : 'bg-red-50 text-red-600 border-red-200'
}

function syncOfficialSiteExposureSeo({ item, loadError, route }) {
  if (!item?.id || loadError) {
    applyOfficialSiteSeo(resolveOfficialSiteSeoConfig(route))
    return
  }

  const status = getOfficialSiteExposureStatusLabel(item.process_status)
  const description = `${status}，核心诉求：${String(item.appeal || '查看曝光处理进度').trim()}。${String(item.content || '').trim().slice(0, 100)}`
  const canonicalPath = route.fullPath || `/expose/${item.id}`
  const canonicalUrl = buildOfficialSiteUrl(canonicalPath)
  const image = Array.isArray(item.photo_urls) && item.photo_urls[0]
    ? item.photo_urls[0]
    : '/logo.png'

  applyOfficialSiteSeo({
    title: `${status} | 悦享e食校园维权曝光详情`,
    description,
    keywords: [
      '校园维权',
      '曝光店铺',
      '曝光处理进度',
      status,
      '烟台城市科技职业学院',
    ],
    path: canonicalPath,
    image,
    jsonLd: [
      createOfficialSiteWebsiteJsonLd(),
      createOfficialSiteOrganizationJsonLd(),
      createOfficialSiteWebPageJsonLd({
        name: `${status} | 悦享e食校园维权曝光详情`,
        description,
        path: canonicalPath,
      }),
      createOfficialSiteBreadcrumbJsonLd([
        { name: '首页', path: '/' },
        { name: '校园维权曝光板', path: '/expose' },
        { name: `曝光详情 ${item.id}`, path: canonicalPath },
      ]),
      {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: `${status} | 悦享e食校园维权曝光详情`,
        description,
        url: canonicalUrl,
        datePublished: toIsoDateString(item.created_at) || undefined,
        dateModified: toIsoDateString(item.handled_at || item.created_at) || undefined,
        inLanguage: 'zh-CN',
      },
    ],
  })
}

export function useOfficialSiteExposureDetailPage({ route, router }) {
  const loading = ref(false)
  const loadError = ref('')
  const item = ref({})

  watch(
    () => route.params.id,
    () => {
      void loadDetail()
    },
    { immediate: true },
  )

  watch(
    [
      () => route.fullPath,
      () => item.value?.id,
      () => item.value?.content,
      () => item.value?.appeal,
      () => item.value?.created_at,
      () => item.value?.handled_at,
      () => item.value?.process_status,
      () => loadError.value,
    ],
    () => {
      syncOfficialSiteExposureSeo({
        item: item.value,
        loadError: loadError.value,
        route,
      })
    },
    { immediate: true },
  )

  async function loadDetail() {
    loading.value = true
    loadError.value = ''
    try {
      item.value = await getPublicOfficialSiteExposureDetail(route.params.id)
    } catch (error) {
      item.value = {}
      loadError.value = extractErrorMessage(error, '曝光详情加载失败')
    } finally {
      loading.value = false
    }
  }

  function goBack() {
    router.push('/expose')
  }

  return {
    goBack,
    item,
    loadError,
    loading,
  }
}
