<template>
  <div class="official-site-privacy-policy-page">
    <div class="official-site-privacy-policy-container">
      <section class="official-site-privacy-policy-shell">
        <OfficialSitePrivacyPolicyHero
          :hero-introduction="heroIntroduction"
          :hero-updated-at="heroUpdatedAt"
        />
        <OfficialSitePrivacyPolicyArticle
          :policy-notice="policyNotice"
          :policy-sections="policySections"
        />
      </section>
    </div>
  </div>
</template>

<script setup>
import './OfficialSitePrivacyPolicy.css'
import OfficialSitePrivacyPolicyArticle from './officialSitePrivacyPolicySections/OfficialSitePrivacyPolicyArticle.vue'
import OfficialSitePrivacyPolicyHero from './officialSitePrivacyPolicySections/OfficialSitePrivacyPolicyHero.vue'
import { useOfficialSitePrivacyPolicyPage } from './officialSitePrivacyPolicyPageHelpers'

const {
  heroIntroduction,
  heroUpdatedAt,
  policyNotice,
  policySections,
} = useOfficialSitePrivacyPolicyPage()
</script>
