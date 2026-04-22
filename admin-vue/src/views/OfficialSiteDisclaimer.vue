<template>
  <div class="official-site-disclaimer-page">
    <div class="official-site-disclaimer-container">
      <section class="official-site-disclaimer-shell">
        <OfficialSiteDisclaimerHero
          :hero-introduction="heroIntroduction"
          :hero-updated-at="heroUpdatedAt"
        />
        <OfficialSiteDisclaimerArticle
          :disclaimer-notice="disclaimerNotice"
          :disclaimer-sections="disclaimerSections"
        />
      </section>
    </div>
  </div>
</template>

<script setup>
import './OfficialSiteDisclaimer.css'
import OfficialSiteDisclaimerArticle from './officialSiteDisclaimerSections/OfficialSiteDisclaimerArticle.vue'
import OfficialSiteDisclaimerHero from './officialSiteDisclaimerSections/OfficialSiteDisclaimerHero.vue'
import { useOfficialSiteDisclaimerPage } from './officialSiteDisclaimerPageHelpers'

const {
  disclaimerNotice,
  disclaimerSections,
  heroIntroduction,
  heroUpdatedAt,
} = useOfficialSiteDisclaimerPage()
</script>
