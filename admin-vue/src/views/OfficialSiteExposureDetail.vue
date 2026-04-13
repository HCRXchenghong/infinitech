<template>
  <div class="py-8 px-6 max-w-4xl mx-auto min-h-screen">
    <div class="mb-6">
      <el-button link class="!text-slate-500 hover:!text-[#1976d2]" @click="router.push('/expose')">
        返回曝光板
      </el-button>
    </div>

    <div v-if="loadError" class="biz-card p-16 text-center text-red-500">
      {{ loadError }}
    </div>

    <div v-else-if="!loading && !item.id" class="biz-card p-16 text-center">
      <h3 class="text-xl font-bold text-slate-700">找不到该曝光记录</h3>
      <p class="text-slate-500 mt-2">可能已被平台隐藏或删除</p>
    </div>

    <div v-else v-loading="loading" class="biz-card overflow-hidden">
      <div class="bg-slate-50 p-6 md:p-8 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 site-article-hero">
        <div>
          <div class="flex items-center gap-3 mb-2">
            <h2 class="text-2xl font-bold text-slate-900">维权工单详情</h2>
            <span
              class="px-3 py-1 text-sm font-bold rounded border"
              :class="item.process_status === 'resolved' ? 'bg-green-50 text-green-600 border-green-200' : 'bg-red-50 text-red-600 border-red-200'"
            >
              {{ item.process_status === 'resolved' ? '维权已解决' : (item.process_status === 'processing' ? '平台处理中' : '等待处理') }}
            </span>
          </div>
          <p class="text-slate-500 text-sm">工单号：Exp-{{ item.id }} | 提交时间：{{ formatDate(item.created_at) }}</p>
        </div>
        <div v-if="item.handled_at" class="text-right">
          <p class="text-sm text-slate-500 mb-1">解决时间</p>
          <p class="font-bold text-slate-800">{{ formatDate(item.handled_at) }}</p>
        </div>
      </div>

      <div class="p-6 md:p-8">
        <div class="flex flex-col md:flex-row gap-8">
          <div class="flex-1">
            <h3 class="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">事件经过描述</h3>
            <p class="text-slate-800 leading-loose text-lg mb-8 whitespace-pre-wrap">{{ item.content }}</p>

            <div v-if="item.photo_urls?.length">
              <h3 class="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">举证资料</h3>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <el-image
                  v-for="photo in item.photo_urls"
                  :key="photo"
                  :src="photo"
                  class="block w-full h-64 sm:h-72 rounded-xl border border-slate-200 shadow-sm overflow-hidden bg-slate-100"
                  fit="cover"
                  :preview-src-list="item.photo_urls"
                  preview-teleported
                />
              </div>
            </div>
          </div>

          <div class="w-full md:w-64 bg-slate-50 rounded-lg p-6 border border-slate-100 h-fit">
            <div class="mb-6">
              <p class="text-xs font-bold text-slate-500 mb-1">涉事金额</p>
              <p class="text-2xl font-bold text-red-600">￥{{ formatCurrency(item.amount) }}</p>
            </div>
            <div class="mb-6">
              <p class="text-xs font-bold text-slate-500 mb-1">核心诉求</p>
              <p class="text-slate-800 font-medium">{{ item.appeal }}</p>
            </div>
            <div>
              <p class="text-xs font-bold text-slate-500 mb-1">处理状态</p>
              <p class="text-slate-800 font-medium">{{ statusLabel(item.process_status) }}</p>
              <p class="text-[10px] text-slate-400 mt-1">* 联系方式仅平台工作人员可见</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { extractErrorMessage, formatCurrency, getPublicOfficialSiteExposureDetail } from '@/utils/officialSiteApi';
import {
  applyOfficialSiteSeo,
  buildOfficialSiteUrl,
  createOfficialSiteBreadcrumbJsonLd,
  createOfficialSiteOrganizationJsonLd,
  createOfficialSiteWebPageJsonLd,
  createOfficialSiteWebsiteJsonLd,
  resolveOfficialSiteSeoConfig,
  toIsoDateString
} from '@/utils/officialSiteSeo';

const route = useRoute();
const router = useRouter();
const loading = ref(false);
const loadError = ref('');
const item = ref({});

watch(
  () => route.params.id,
  () => {
    void loadDetail();
  },
  { immediate: true }
);

watch(
  () => [item.value?.id, item.value?.content, item.value?.appeal, item.value?.created_at, item.value?.process_status, loadError.value],
  () => {
    syncSeo();
  },
  { immediate: true }
);

async function loadDetail() {
  loading.value = true;
  loadError.value = '';
  try {
    item.value = await getPublicOfficialSiteExposureDetail(route.params.id);
  } catch (error) {
    item.value = {};
    loadError.value = extractErrorMessage(error, '曝光详情加载失败');
  } finally {
    loading.value = false;
  }
}

function formatDate(value) {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function statusLabel(status) {
  if (status === 'resolved') return '维权已解决';
  if (status === 'processing') return '平台处理中';
  return '等待处理';
}

function syncSeo() {
  if (!item.value?.id || loadError.value) {
    applyOfficialSiteSeo(resolveOfficialSiteSeoConfig(route));
    return;
  }

  const status = statusLabel(item.value.process_status);
  const description = `${status}，核心诉求：${String(item.value.appeal || '查看曝光处理进度').trim()}。${String(item.value.content || '').trim().slice(0, 100)}`;
  const canonicalPath = route.fullPath || `/expose/${item.value.id}`;
  const canonicalUrl = buildOfficialSiteUrl(canonicalPath);
  const image = Array.isArray(item.value.photo_urls) && item.value.photo_urls[0]
    ? item.value.photo_urls[0]
    : '/logo.png';

  applyOfficialSiteSeo({
    title: `${status} | 悦享e食校园维权曝光详情`,
    description,
    keywords: [
      '校园维权',
      '曝光店铺',
      '曝光处理进度',
      status,
      '烟台城市科技职业学院'
    ],
    path: canonicalPath,
    image,
    jsonLd: [
      createOfficialSiteWebsiteJsonLd(),
      createOfficialSiteOrganizationJsonLd(),
      createOfficialSiteWebPageJsonLd({
        name: `${status} | 悦享e食校园维权曝光详情`,
        description,
        path: canonicalPath
      }),
      createOfficialSiteBreadcrumbJsonLd([
        { name: '首页', path: '/' },
        { name: '校园维权曝光板', path: '/expose' },
        { name: `曝光详情 ${item.value.id}`, path: canonicalPath }
      ]),
      {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: `${status} | 悦享e食校园维权曝光详情`,
        description,
        url: canonicalUrl,
        datePublished: toIsoDateString(item.value.created_at) || undefined,
        dateModified: toIsoDateString(item.value.handled_at || item.value.created_at) || undefined,
        inLanguage: 'zh-CN'
      }
    ]
  });
}
</script>
