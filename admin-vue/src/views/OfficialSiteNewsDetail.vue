<template>
  <div class="bg-white min-h-screen">
    <div class="max-w-4xl mx-auto px-6 py-10">
      <el-button link class="!px-0 !text-slate-500 hover:!text-[#1976d2]" @click="router.push('/news')">
        返回新闻资讯
      </el-button>

      <div v-if="loadError" class="biz-card p-10 mt-6 text-center text-red-500">
        {{ loadError }}
      </div>

      <div v-else-if="!loading && !article.id" class="biz-card p-10 mt-6 text-center text-slate-400">
        找不到这篇新闻
      </div>

      <article v-else v-loading="loading" class="mt-6">
        <div class="border-b border-slate-200 pb-8 site-article-hero">
          <div class="flex items-center gap-3 mb-4">
            <el-tag size="small" type="primary">{{ article.source || '官方公告' }}</el-tag>
            <span class="text-sm text-slate-400">{{ formatDateTime(article.created_at) }}</span>
          </div>
          <h1 class="text-4xl font-bold text-slate-900 leading-tight">{{ article.title || '未命名新闻' }}</h1>
          <p class="text-slate-500 text-lg leading-relaxed mt-5">{{ article.summary || '查看详情' }}</p>
        </div>

        <div v-if="article.cover" class="mt-10 overflow-hidden rounded-xl">
          <img :src="article.cover" class="w-full h-[360px] object-cover" alt="news cover">
        </div>

        <div class="official-site-article py-10">
          <template v-for="(block, index) in blocks" :key="`block_${index}`">
            <p v-if="block.type === 'p'" class="p-block">{{ block.text }}</p>
            <h2 v-else-if="block.type === 'h2'" class="h2-block">{{ block.text }}</h2>
            <blockquote v-else-if="block.type === 'quote'" class="quote-block">{{ block.text }}</blockquote>
            <ul v-else-if="block.type === 'ul'" class="ul-block">
              <li v-for="(item, itemIndex) in block.items" :key="`li_${itemIndex}`">{{ item }}</li>
            </ul>
            <figure v-else-if="block.type === 'img'" class="img-block">
              <img v-if="block.url" :src="block.url" class="w-full object-cover" alt="block image">
              <figcaption v-if="block.caption">{{ block.caption }}</figcaption>
            </figure>
          </template>
        </div>
      </article>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { extractErrorMessage, getPublicOfficialSiteNewsDetail } from '@/utils/officialSiteApi';
import {
  applyOfficialSiteSeo,
  buildOfficialSiteUrl,
  createOfficialSiteBreadcrumbJsonLd,
  createOfficialSiteOrganizationJsonLd,
  createOfficialSiteWebPageJsonLd,
  createOfficialSiteWebsiteJsonLd,
  getOfficialSiteOrganizationId,
  resolveOfficialSiteSeoConfig,
  toIsoDateString
} from '@/utils/officialSiteSeo';

const route = useRoute();
const router = useRouter();
const loading = ref(false);
const loadError = ref('');
const article = ref({});

const blocks = computed(() => {
  const raw = article.value?.content;
  const sourceBlocks = Array.isArray(raw?.blocks) ? raw.blocks : [];
  const normalized = sourceBlocks.map((item) => {
    const type = String(item?.type || 'p');
    if (type === 'ul') {
      return {
        type: 'ul',
        items: Array.isArray(item?.items)
          ? item.items.map((value) => String(value || '').trim()).filter(Boolean)
          : []
      };
    }
    if (type === 'img') {
      return {
        type: 'img',
        url: String(item?.url || '').trim(),
        caption: String(item?.caption || '').trim()
      };
    }
    return {
      type: ['p', 'h2', 'quote'].includes(type) ? type : 'p',
      text: String(item?.text || '').trim()
    };
  }).filter((item) => {
    if (item.type === 'ul') return item.items.length > 0;
    if (item.type === 'img') return Boolean(item.url);
    return Boolean(item.text);
  });

  if (normalized.length > 0) {
    return normalized;
  }

  return article.value?.summary
    ? [{ type: 'p', text: article.value.summary }]
    : [];
});

watch(
  () => route.params.id,
  () => {
    void loadDetail();
  },
  { immediate: true }
);

watch(
  () => [article.value?.id, article.value?.title, article.value?.summary, article.value?.created_at, loadError.value],
  () => {
    syncSeo();
  },
  { immediate: true }
);

async function loadDetail() {
  loading.value = true;
  loadError.value = '';
  try {
    article.value = await getPublicOfficialSiteNewsDetail(route.params.id);
  } catch (error) {
    article.value = {};
    loadError.value = extractErrorMessage(error, '新闻详情加载失败');
  } finally {
    loading.value = false;
  }
}

function formatDateTime(value) {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hour}:${minute}`;
}

function buildArticleDescription() {
  const summary = String(article.value?.summary || '').trim();
  if (summary) {
    return summary;
  }
  const textBlock = blocks.value.find((block) => block.type === 'p' || block.type === 'quote');
  if (textBlock?.text) {
    return String(textBlock.text).slice(0, 160);
  }
  return '查看悦享e食官方支持平台发布的新闻详情、系统动态与校园资讯。';
}

function syncSeo() {
  if (!article.value?.id || loadError.value) {
    applyOfficialSiteSeo(resolveOfficialSiteSeoConfig(route));
    return;
  }

  const description = buildArticleDescription();
  const canonicalPath = route.fullPath || `/news/${article.value.id}`;
  const canonicalUrl = buildOfficialSiteUrl(canonicalPath);
  const publishedAt = toIsoDateString(article.value.created_at);
  const image = String(article.value.cover || '').trim() || '/logo.png';
  const imageUrl = buildOfficialSiteUrl(image);

  applyOfficialSiteSeo({
    title: `${article.value.title || '新闻详情'} | 悦享e食新闻资讯`,
    description,
    keywords: [
      article.value.source || '官方公告',
      '新闻资讯',
      '校园资讯',
      '烟台城市科技职业学院',
      '悦享e食'
    ],
    path: canonicalPath,
    image,
    ogType: 'article',
    jsonLd: [
      createOfficialSiteWebsiteJsonLd(),
      createOfficialSiteOrganizationJsonLd(),
      createOfficialSiteWebPageJsonLd({
        name: `${article.value.title || '新闻详情'} | 悦享e食新闻资讯`,
        description,
        path: canonicalPath
      }),
      createOfficialSiteBreadcrumbJsonLd([
        { name: '首页', path: '/' },
        { name: '新闻资讯', path: '/news' },
        { name: article.value.title || '新闻详情', path: canonicalPath }
      ]),
      {
        '@context': 'https://schema.org',
        '@type': 'NewsArticle',
        headline: article.value.title || '悦享e食新闻资讯',
        description,
        inLanguage: 'zh-CN',
        image: [imageUrl],
        datePublished: publishedAt || undefined,
        dateModified: publishedAt || undefined,
        mainEntityOfPage: canonicalUrl,
        author: {
          '@id': getOfficialSiteOrganizationId()
        },
        publisher: {
          '@id': getOfficialSiteOrganizationId()
        },
        articleSection: article.value.source || '官方公告'
      }
    ]
  });
}
</script>
