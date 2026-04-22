<template>
  <div class="official-site-about-page">
    <OfficialSiteAboutHero
      :hero-feature-items="heroFeatureItems"
      :hero-footer-stats="heroFooterStats"
      :hero-metrics="heroMetrics"
      :hero-perspective-cards="heroPerspectiveCards"
    />

    <div class="official-site-about-shell">
      <OfficialSiteAboutFounders :founders="founders" />
      <OfficialSiteAboutPartners :partners="partners" />
      <OfficialSiteAboutCompliance :compliance-items="complianceItems" />
    </div>
  </div>
</template>

<script setup>
import './OfficialSiteAbout.css'
import OfficialSiteAboutCompliance from './officialSiteAboutSections/OfficialSiteAboutCompliance.vue'
import OfficialSiteAboutFounders from './officialSiteAboutSections/OfficialSiteAboutFounders.vue'
import OfficialSiteAboutHero from './officialSiteAboutSections/OfficialSiteAboutHero.vue'
import OfficialSiteAboutPartners from './officialSiteAboutSections/OfficialSiteAboutPartners.vue'
import { useOfficialSiteAboutPage } from './officialSiteAboutPageHelpers'

const {
  complianceItems,
  founders,
  heroFeatureItems,
  heroFooterStats,
  heroMetrics,
  heroPerspectiveCards,
  partners,
} = useOfficialSiteAboutPage()
</script>
