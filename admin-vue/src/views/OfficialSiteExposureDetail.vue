<template>
  <div class="official-site-exposure-detail-page">
    <div class="exposure-detail-shell">
      <OfficialSiteExposureDetailTopbar :go-back="goBack" />
      <OfficialSiteExposureDetailContent
        :item="item"
        :load-error="loadError"
        :loading="loading"
      />
    </div>
  </div>
</template>

<script setup>
import { useRoute, useRouter } from 'vue-router'
import './OfficialSiteExposureDetail.css'
import OfficialSiteExposureDetailContent from './officialSiteExposureDetailSections/OfficialSiteExposureDetailContent.vue'
import OfficialSiteExposureDetailTopbar from './officialSiteExposureDetailSections/OfficialSiteExposureDetailTopbar.vue'
import { useOfficialSiteExposureDetailPage } from './officialSiteExposureDetailPageHelpers'

const route = useRoute()
const router = useRouter()

const {
  goBack,
  item,
  loadError,
  loading,
} = useOfficialSiteExposureDetailPage({
  route,
  router,
})
</script>
