<template>
  <div class="official-site-cookie-required-page">
    <div class="official-site-cookie-required-shell">
      <section class="cookie-required-card">
        <OfficialSiteCookieRequiredHero
          :accept-and-continue="acceptAndContinue"
          :go-disclaimer="goDisclaimer"
          :go-privacy-policy="goPrivacyPolicy"
        />
        <OfficialSiteCookieRequiredPanels
          :accept-effects="acceptEffects"
          :reject-effects="rejectEffects"
        />
      </section>
    </div>
  </div>
</template>

<script setup>
import { useRoute, useRouter } from 'vue-router'
import './OfficialSiteCookieRequired.css'
import OfficialSiteCookieRequiredHero from './officialSiteCookieRequiredSections/OfficialSiteCookieRequiredHero.vue'
import OfficialSiteCookieRequiredPanels from './officialSiteCookieRequiredSections/OfficialSiteCookieRequiredPanels.vue'
import { useOfficialSiteCookieRequiredPage } from './officialSiteCookieRequiredPageHelpers'

const route = useRoute()
const router = useRouter()

const {
  acceptAndContinue,
  acceptEffects,
  goDisclaimer,
  goPrivacyPolicy,
  rejectEffects,
} = useOfficialSiteCookieRequiredPage({
  route,
  router,
})
</script>
