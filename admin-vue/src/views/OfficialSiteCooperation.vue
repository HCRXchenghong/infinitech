<template>
  <div class="official-site-cooperation-page">
    <OfficialSiteCooperationHero
      :hero-badges="heroBadges"
      :hero-stats="heroStats"
    />

    <section class="official-site-cooperation-shell">
      <OfficialSiteCooperationBenefits
        :benefits="benefits"
        :feature-intro="featureIntro"
      />

      <OfficialSiteCooperationFormCard
        :form="form"
        :page-error="pageError"
        :submitting="submitting"
        :submit-cooperation="submitCooperation"
      />
    </section>
  </div>
</template>

<script setup>
import { ElMessage } from 'element-plus'
import './OfficialSiteCooperation.css'
import OfficialSiteCooperationBenefits from './officialSiteCooperationSections/OfficialSiteCooperationBenefits.vue'
import OfficialSiteCooperationFormCard from './officialSiteCooperationSections/OfficialSiteCooperationFormCard.vue'
import OfficialSiteCooperationHero from './officialSiteCooperationSections/OfficialSiteCooperationHero.vue'
import { useOfficialSiteCooperationPage } from './officialSiteCooperationPageHelpers'

const {
  benefits,
  featureIntro,
  form,
  heroBadges,
  heroStats,
  pageError,
  submitCooperation,
  submitting,
} = useOfficialSiteCooperationPage({
  ElMessage,
})
</script>
