<template>
  <div class="official-site-news-page">
    <div class="official-site-news-shell">
      <OfficialSiteNewsHeader />
      <OfficialSiteNewsList
        :loading="loading"
        :records="records"
        :format-date="formatDate"
        :open-detail="openDetail"
        :resolve-cover="resolveCover"
        :resolve-tag-type="resolveTagType"
      />
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import './OfficialSiteNews.css'
import OfficialSiteNewsHeader from './officialSiteNewsSections/OfficialSiteNewsHeader.vue'
import OfficialSiteNewsList from './officialSiteNewsSections/OfficialSiteNewsList.vue'
import { useOfficialSiteNewsPage } from './officialSiteNewsPageHelpers'

const router = useRouter()

const {
  formatDate,
  loading,
  openDetail,
  records,
  resolveCover,
  resolveTagType,
} = useOfficialSiteNewsPage({
  router,
})
</script>
