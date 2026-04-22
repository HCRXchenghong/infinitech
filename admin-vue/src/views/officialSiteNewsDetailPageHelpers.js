import { computed, ref, watch } from 'vue'
import { parseNotificationDisplayBlocks } from '@infinitech/domain-core'
import {
  extractErrorMessage,
  getPublicOfficialSiteNewsDetail,
} from '@/utils/officialSiteApi'
import {
  applyOfficialSiteSeo,
  buildOfficialSiteUrl,
  createOfficialSiteBreadcrumbJsonLd,
  createOfficialSiteOrganizationJsonLd,
  createOfficialSiteWebPageJsonLd,
  createOfficialSiteWebsiteJsonLd,
  getOfficialSiteOrganizationId,
  resolveOfficialSiteSeoConfig,
  toIsoDateString,
} from '@/utils/officialSiteSeo'

const FALLBACK_DESCRIPTION = '查看悦享e食官方支持平台发布的新闻详情、系统动态与校园资讯。'

function buildArticleDescription(article, blocks) {
  const summary = String(article?.summary || '').trim()
  if (summary) {
    return summary
  }

  const textBlock = blocks.find((block) => block.type === 'p' || block.type === 'quote')
  if (textBlock?.text) {
    return String(textBlock.text).slice(0, 160)
  }

  return FALLBACK_DESCRIPTION
}

function syncOfficialSiteNewsDetailSeo({ article, blocks, loadError, route }) {
  if (!article?.id || loadError) {
    applyOfficialSiteSeo(resolveOfficialSiteSeoConfig(route))
    return
  }

  const description = buildArticleDescription(article, blocks)
  const canonicalPath = route.fullPath || `/news/${article.id}`
  const canonicalUrl = buildOfficialSiteUrl(canonicalPath)
  const publishedAt = toIsoDateString(article.created_at)
  const image = String(article.cover || '').trim() || '/logo.png'
  const imageUrl = buildOfficialSiteUrl(image)

  applyOfficialSiteSeo({
    title: `${article.title || '新闻详情'} | 悦享e食新闻资讯`,
    description,
    keywords: [
      article.source || '官方公告',
      '新闻资讯',
      '校园资讯',
      '烟台城市科技职业学院',
      '悦享e食',
    ],
    path: canonicalPath,
    image,
    ogType: 'article',
    jsonLd: [
      createOfficialSiteWebsiteJsonLd(),
      createOfficialSiteOrganizationJsonLd(),
      createOfficialSiteWebPageJsonLd({
        name: `${article.title || '新闻详情'} | 悦享e食新闻资讯`,
        description,
        path: canonicalPath,
      }),
      createOfficialSiteBreadcrumbJsonLd([
        { name: '首页', path: '/' },
        { name: '新闻资讯', path: '/news' },
        { name: article.title || '新闻详情', path: canonicalPath },
      ]),
      {
        '@context': 'https://schema.org',
        '@type': 'NewsArticle',
        headline: article.title || '悦享e食新闻资讯',
        description,
        inLanguage: 'zh-CN',
        image: [imageUrl],
        datePublished: publishedAt || undefined,
        dateModified: publishedAt || undefined,
        mainEntityOfPage: canonicalUrl,
        author: {
          '@id': getOfficialSiteOrganizationId(),
        },
        publisher: {
          '@id': getOfficialSiteOrganizationId(),
        },
        articleSection: article.source || '官方公告',
      },
    ],
  })
}

export function useOfficialSiteNewsDetailPage({ route, router }) {
  const loading = ref(false)
  const loadError = ref('')
  const article = ref({})
  const blocks = computed(() => parseNotificationDisplayBlocks(article.value?.content))

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
      () => article.value?.id,
      () => article.value?.title,
      () => article.value?.summary,
      () => article.value?.created_at,
      () => article.value?.content,
      () => loadError.value,
    ],
    () => {
      syncOfficialSiteNewsDetailSeo({
        article: article.value,
        blocks: blocks.value,
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
      article.value = await getPublicOfficialSiteNewsDetail(route.params.id)
    } catch (error) {
      article.value = {}
      loadError.value = extractErrorMessage(error, '新闻详情加载失败')
    } finally {
      loading.value = false
    }
  }

  function goBack() {
    router.push('/news')
  }

  return {
    article,
    blocks,
    goBack,
    loadError,
    loading,
  }
}
