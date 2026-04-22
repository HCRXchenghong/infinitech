<template>
  <PageStateAlert
    v-if="loadError"
    :message="loadError"
    class="news-detail-state"
  />

  <div
    v-else-if="!loading && !article.id"
    class="biz-card news-detail-empty"
  >
    找不到这篇新闻
  </div>

  <OfficialSiteNewsDetailArticle
    v-else
    :article="article"
    :blocks="blocks"
    :loading="loading"
  />
</template>

<script setup>
import PageStateAlert from '@/components/PageStateAlert.vue'
import OfficialSiteNewsDetailArticle from './OfficialSiteNewsDetailArticle.vue'

defineProps({
  article: {
    type: Object,
    required: true,
  },
  blocks: {
    type: Array,
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
