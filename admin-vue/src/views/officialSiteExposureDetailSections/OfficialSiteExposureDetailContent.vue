<template>
  <PageStateAlert
    v-if="loadError"
    :message="loadError"
    class="exposure-detail-state"
  />

  <div
    v-else-if="!loading && !item.id"
    class="biz-card exposure-detail-empty"
  >
    <h3 class="text-xl font-bold text-slate-700">找不到该曝光记录</h3>
    <p class="mt-2 text-slate-500">可能已被平台隐藏或删除</p>
  </div>

  <OfficialSiteExposureDetailPanel
    v-else
    :item="item"
    :loading="loading"
  />
</template>

<script setup>
import PageStateAlert from '@/components/PageStateAlert.vue'
import OfficialSiteExposureDetailPanel from './OfficialSiteExposureDetailPanel.vue'

defineProps({
  item: {
    type: Object,
    required: true,
  },
  loadError: {
    type: String,
    default: '',
  },
  loading: {
    type: Boolean,
    default: false,
  },
})
</script>
