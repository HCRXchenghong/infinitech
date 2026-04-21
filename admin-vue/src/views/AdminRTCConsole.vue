<template>
  <div class="page rtc-console-page">
    <AdminRTCConsoleHero
      :rtc-state="adminRTCState"
      :audit-summary="auditSummary"
      :go-to-chat-console="goToChatConsole"
      :go-to-audits="goToAudits"
    />

    <div class="console-grid">
      <AdminRTCConsoleSearchPanel
        :search-form="searchForm"
        :targets-loading="targetsLoading"
        :search-targets="searchTargets"
        :targets-error="targetsError"
        :filtered-targets="filteredTargets"
        :selected-target="selectedTarget"
        :select-target="selectTarget"
        :role-label="roleLabel"
      />
      <AdminRTCConsoleComposePanel
        :selected-target="selectedTarget"
        :role-label="roleLabel"
        :call-form="callForm"
        :starting-call="startingCall"
        :can-call-selected="canCallSelected"
        :current-call-active="currentCallActive"
        :start-call="startCall"
      />
      <AdminRTCConsoleStatusPanel
        :rtc-state="adminRTCState"
        :audits-loading="auditsLoading"
        :load-recent-audits="loadRecentAudits"
        :current-target-text="currentTargetText"
        :current-biz-text="currentBizText"
        :role-label="roleLabel"
        :show-reject="showReject"
        :show-cancel="showCancel"
        :show-accept="showAccept"
        :show-end="showEnd"
        :can-close-current-call="canCloseCurrentCall"
        :handle-reject="handleReject"
        :handle-cancel="handleCancel"
        :handle-accept="handleAccept"
        :handle-end="handleEnd"
        :handle-close-call="handleCloseCall"
      />
    </div>

    <AdminRTCConsoleHistoryPanel
      :recent-audits="recentAudits"
      :audits-loading="auditsLoading"
      :audits-error="auditsError"
      :load-recent-audits="loadRecentAudits"
      :go-to-audits="goToAudits"
      :format-date-time="formatDateTime"
      :role-label="roleLabel"
      :status-tag-type="statusTagType"
      :status-label="statusLabel"
      :format-duration="formatDuration"
      :complaint-tag-type="complaintTagType"
      :complaint-label="complaintLabel"
    />
  </div>
</template>

<script setup>
import './AdminRTCConsole.css'
import { ElMessage } from 'element-plus'
import request from '@/utils/request'
import AdminRTCConsoleComposePanel from './adminRTCConsoleSections/AdminRTCConsoleComposePanel.vue'
import AdminRTCConsoleHero from './adminRTCConsoleSections/AdminRTCConsoleHero.vue'
import AdminRTCConsoleHistoryPanel from './adminRTCConsoleSections/AdminRTCConsoleHistoryPanel.vue'
import AdminRTCConsoleSearchPanel from './adminRTCConsoleSections/AdminRTCConsoleSearchPanel.vue'
import AdminRTCConsoleStatusPanel from './adminRTCConsoleSections/AdminRTCConsoleStatusPanel.vue'
import { useAdminRTCConsolePage } from './adminRTCConsoleHelpers'

const {
  adminRTCState,
  auditsError,
  auditsLoading,
  auditSummary,
  callForm,
  canCallSelected,
  canCloseCurrentCall,
  complaintLabel,
  complaintTagType,
  currentBizText,
  currentCallActive,
  currentTargetText,
  filteredTargets,
  formatDateTime,
  formatDuration,
  goToAudits,
  goToChatConsole,
  handleAccept,
  handleCancel,
  handleCloseCall,
  handleEnd,
  handleReject,
  loadRecentAudits,
  recentAudits,
  roleLabel,
  searchForm,
  searchTargets,
  selectTarget,
  selectedTarget,
  showAccept,
  showCancel,
  showEnd,
  showReject,
  startCall,
  startingCall,
  statusLabel,
  statusTagType,
  targetsError,
  targetsLoading,
} = useAdminRTCConsolePage({
  request,
  ElMessage,
})
</script>
