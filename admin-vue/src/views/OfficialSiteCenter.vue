<template>
  <div class="page official-site-center-page">
    <OfficialSiteCenterHero :support-summary-cards="supportSummaryCards" />

    <div class="panel official-site-center-panel">
      <div class="panel-header official-site-panel-header">
        <div>
          <div class="panel-title">官网中心</div>
          <div class="official-site-panel-subtitle">统一处理官网访客实时消息、曝光审核记录和商务合作线索。</div>
        </div>
        <div class="panel-actions">
          <el-button size="small" @click="refreshCurrent">刷新当前页</el-button>
        </div>
      </div>

      <el-tabs v-model="activeTab" class="official-center-tabs">
        <el-tab-pane label="官网客服" name="support">
          <OfficialSiteCenterSupportTab
            v-model:support-reply="supportReply"
            :support-filters="supportFilters"
            :support-realtime-connected="supportRealtimeConnected"
            :support-loading="supportLoading"
            :support-sessions="supportSessions"
            :selected-support-id="selectedSupportId"
            :selected-support-session="selectedSupportSession"
            :support-saving="supportSaving"
            :support-messages-loading="supportMessagesLoading"
            :support-messages="supportMessages"
            :support-sending="supportSending"
            :load-support-sessions="loadSupportSessions"
            :select-support-session="selectSupportSession"
            :save-support-session="saveSupportSession"
            :load-selected-support-messages="loadSelectedSupportMessages"
            :send-support-reply="sendSupportReply"
          />
        </el-tab-pane>

        <el-tab-pane label="曝光审核" name="exposures">
          <OfficialSiteCenterExposuresTab
            :exposure-filters="exposureFilters"
            :exposures="exposures"
            :exposure-loading="exposureLoading"
            :load-exposures="loadExposures"
            :open-exposure-dialog="openExposureDialog"
          />
        </el-tab-pane>

        <el-tab-pane label="商务合作" name="cooperation">
          <OfficialSiteCenterCooperationTab
            :cooperation-filters="cooperationFilters"
            :cooperations="cooperations"
            :cooperation-loading="cooperationLoading"
            :load-cooperations="loadCooperations"
            :save-cooperation="saveCooperation"
          />
        </el-tab-pane>
      </el-tabs>
    </div>

    <OfficialSiteCenterExposureDialog
      v-model:visible="exposureDialogVisible"
      :exposure-draft="exposureDraft"
      :exposure-saving="exposureSaving"
      :save-exposure="saveExposure"
    />
  </div>
</template>

<script setup>
import './OfficialSiteCenter.css';
import OfficialSiteCenterCooperationTab from './officialSiteCenterSections/OfficialSiteCenterCooperationTab.vue';
import OfficialSiteCenterExposureDialog from './officialSiteCenterSections/OfficialSiteCenterExposureDialog.vue';
import OfficialSiteCenterExposuresTab from './officialSiteCenterSections/OfficialSiteCenterExposuresTab.vue';
import OfficialSiteCenterHero from './officialSiteCenterSections/OfficialSiteCenterHero.vue';
import OfficialSiteCenterSupportTab from './officialSiteCenterSections/OfficialSiteCenterSupportTab.vue';
import { useOfficialSiteCenterPage } from './officialSiteCenterHelpers';

const {
  activeTab,
  cooperationFilters,
  cooperationLoading,
  cooperations,
  exposureDialogVisible,
  exposureDraft,
  exposureFilters,
  exposureLoading,
  exposureSaving,
  exposures,
  loadCooperations,
  loadExposures,
  loadSelectedSupportMessages,
  loadSupportSessions,
  openExposureDialog,
  refreshCurrent,
  saveCooperation,
  saveExposure,
  saveSupportSession,
  selectedSupportId,
  selectedSupportSession,
  selectSupportSession,
  sendSupportReply,
  supportFilters,
  supportLoading,
  supportMessages,
  supportMessagesLoading,
  supportRealtimeConnected,
  supportReply,
  supportSaving,
  supportSending,
  supportSessions,
  supportSummaryCards,
} = useOfficialSiteCenterPage();
</script>
