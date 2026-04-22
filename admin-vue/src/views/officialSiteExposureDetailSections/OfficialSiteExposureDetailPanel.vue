<template>
  <div v-loading="loading" class="biz-card exposure-detail-panel">
    <div class="site-article-hero flex flex-col items-start justify-between gap-4 border-b border-slate-100 bg-slate-50 p-6 md:flex-row md:items-center md:p-8">
      <div>
        <div class="mb-2 flex items-center gap-3">
          <h2 class="text-2xl font-bold text-slate-900">维权工单详情</h2>
          <span
            class="rounded border px-3 py-1 text-sm font-bold"
            :class="resolveOfficialSiteExposureStatusClass(item.process_status)"
          >
            {{ getOfficialSiteExposureStatusLabel(item.process_status) }}
          </span>
        </div>
        <p class="text-sm text-slate-500">
          工单号：Exp-{{ item.id }} | 提交时间：{{ formatOfficialSiteExposureDate(item.created_at) }}
        </p>
      </div>
      <div v-if="item.handled_at" class="text-right">
        <p class="mb-1 text-sm text-slate-500">解决时间</p>
        <p class="font-bold text-slate-800">
          {{ formatOfficialSiteExposureDate(item.handled_at) }}
        </p>
      </div>
    </div>

    <div class="exposure-detail-body">
      <div class="flex flex-col gap-8 md:flex-row">
        <div class="flex-1">
          <h3 class="mb-3 text-sm font-bold uppercase tracking-wider text-slate-400">
            事件经过描述
          </h3>
          <p class="mb-8 whitespace-pre-wrap text-lg leading-loose text-slate-800">
            {{ item.content }}
          </p>

          <div v-if="item.photo_urls?.length">
            <h3 class="mb-3 text-sm font-bold uppercase tracking-wider text-slate-400">
              举证资料
            </h3>
            <div class="exposure-detail-gallery">
              <el-image
                v-for="photo in item.photo_urls"
                :key="photo"
                :src="photo"
                class="block h-64 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 shadow-sm sm:h-72"
                fit="cover"
                :preview-src-list="item.photo_urls"
                preview-teleported
              />
            </div>
          </div>
        </div>

        <div class="exposure-detail-sidebar h-fit rounded-lg border border-slate-100 bg-slate-50 p-6">
          <div class="mb-6">
            <p class="mb-1 text-xs font-bold text-slate-500">涉事金额</p>
            <p class="text-2xl font-bold text-red-600">￥{{ formatCurrency(item.amount) }}</p>
          </div>
          <div class="mb-6">
            <p class="mb-1 text-xs font-bold text-slate-500">核心诉求</p>
            <p class="font-medium text-slate-800">{{ item.appeal }}</p>
          </div>
          <div>
            <p class="mb-1 text-xs font-bold text-slate-500">处理状态</p>
            <p class="font-medium text-slate-800">
              {{ getOfficialSiteExposureStatusLabel(item.process_status) }}
            </p>
            <p class="mt-1 text-[10px] text-slate-400">
              * 联系方式仅平台工作人员可见
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { formatCurrency } from '@/utils/officialSiteApi'
import {
  formatOfficialSiteExposureDate,
  getOfficialSiteExposureStatusLabel,
  resolveOfficialSiteExposureStatusClass,
} from '../officialSiteExposureDetailPageHelpers'

defineProps({
  item: {
    type: Object,
    required: true,
  },
  loading: {
    type: Boolean,
    default: false,
  },
})
</script>
