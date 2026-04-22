<template>
  <div class="rider-ranks-page">
    <div class="rider-ranks-panel">
      <RiderRanksHeader
        v-model:period="period"
        :loading="loading"
        :go-back="goBack"
        :handle-period-change="handlePeriodChange"
        :refresh-ranks="refreshRanks"
      />

      <PageStateAlert :message="loadError" />

      <RiderRanksTable
        :loading="loading"
        :ranks="ranks"
        :load-error="loadError"
        :index-method="indexMethod"
        :get-rank-type="getRankType"
        :get-rank-name="getRankName"
        :rider-rank-levels="riderRankLevels"
      />
    </div>
  </div>
</template>

<script setup>
import './RiderRanks.css'
import { useRoute, useRouter } from 'vue-router'
import request from '@/utils/request'
import PageStateAlert from '@/components/PageStateAlert.vue'
import RiderRanksHeader from './riderRanksSections/RiderRanksHeader.vue'
import RiderRanksTable from './riderRanksSections/RiderRanksTable.vue'
import { useRiderRanksPage } from './riderRanksPageHelpers'

const router = useRouter()
const route = useRoute()

const {
  getRankName,
  getRankType,
  goBack,
  handlePeriodChange,
  indexMethod,
  loadError,
  loading,
  period,
  ranks,
  refreshRanks,
  riderRankLevels,
} = useRiderRanksPage({
  request,
  route,
  router,
})
</script>
