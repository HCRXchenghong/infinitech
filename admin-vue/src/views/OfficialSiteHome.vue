<template>
  <div class="official-site-home-page">
    <OfficialSiteHomeHero
      :activate-hero-phone="activateHeroPhone"
      :deactivate-hero-phone="deactivateHeroPhone"
      :hero-phone-interactive="heroPhoneInteractive"
      :hero-phone-qr-image="heroPhoneQrImage"
      :open-coop-page="openCoopPage"
      :open-download-page="openDownloadPage"
      :open-expose-page="openExposePage"
      :set-hero-phone-element="setHeroPhoneElement"
    />
    <OfficialSiteHomeServices :service-cards="serviceCards" />
    <OfficialSiteHomeNews
      :featured-news="featuredNews"
      :format-date="formatDate"
      :loading="loading"
      :open-news="openNews"
      :open-news-list-page="openNewsListPage"
      :resolve-news-cover="resolveNewsCover"
      :secondary-news="secondaryNews"
    />
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import './OfficialSiteHome.css';
import OfficialSiteHomeHero from './officialSiteHomeSections/OfficialSiteHomeHero.vue';
import OfficialSiteHomeNews from './officialSiteHomeSections/OfficialSiteHomeNews.vue';
import OfficialSiteHomeServices from './officialSiteHomeSections/OfficialSiteHomeServices.vue';
import { useOfficialSiteHomePage } from './officialSiteHomePageHelpers';

const router = useRouter();
const {
  activateHeroPhone,
  deactivateHeroPhone,
  featuredNews,
  formatDate,
  heroPhoneInteractive,
  heroPhoneQrImage,
  loading,
  openCoopPage,
  openDownloadPage,
  openExposePage,
  openNews,
  openNewsListPage,
  resolveNewsCover,
  secondaryNews,
  serviceCards,
  setHeroPhoneElement,
} = useOfficialSiteHomePage({
  router,
  ElMessage,
});
</script>
