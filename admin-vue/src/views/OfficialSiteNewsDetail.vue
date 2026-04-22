<template>
  <div class="official-site-news-detail-page">
    <div class="news-detail-shell">
      <OfficialSiteNewsDetailTopbar :go-back="goBack" />
      <OfficialSiteNewsDetailContent
        :article="article"
        :blocks="blocks"
        :load-error="loadError"
        :loading="loading"
      />
    </div>
  </div>
</template>

<script setup>
import { useRoute, useRouter } from 'vue-router'
import './OfficialSiteNewsDetail.css'
import OfficialSiteNewsDetailContent from './officialSiteNewsDetailSections/OfficialSiteNewsDetailContent.vue'
import OfficialSiteNewsDetailTopbar from './officialSiteNewsDetailSections/OfficialSiteNewsDetailTopbar.vue'
import { useOfficialSiteNewsDetailPage } from './officialSiteNewsDetailPageHelpers'

const route = useRoute()
const router = useRouter()

const {
  article,
  blocks,
  goBack,
  loadError,
  loading,
} = useOfficialSiteNewsDetailPage({
  route,
  router,
})
</script>
