<template>
  <div class="page-shell">
    <div class="page-header">
      <div>
        <h2>同频饭友治理</h2>
        <p>统一管理运行时配置、组局治理、消息举报、敏感词、用户限制与审计日志。</p>
      </div>
      <div class="page-actions">
        <el-button size="small" :loading="pageLoading" @click="loadAll(true)">刷新全部</el-button>
      </div>
    </div>

    <PageStateAlert :message="pageError" />

    <el-tabs v-model="activeTab">
      <el-tab-pane label="运行时配置" name="runtime">
        <DiningBuddyRuntimeTab
          :runtime-loading="runtimeLoading"
          :runtime-saving="runtimeSaving"
          :runtime-form="runtimeForm"
          :sorted-runtime-categories="sortedRuntimeCategories"
          :save-runtime-settings="saveRuntimeSettings"
          :add-question="addQuestion"
          :remove-question="removeQuestion"
          :add-question-option="addQuestionOption"
          :remove-question-option="removeQuestionOption"
        />
      </el-tab-pane>

      <el-tab-pane label="组局管理" name="parties">
        <DiningBuddyPartiesTab
          :party-filters="partyFilters"
          :party-status-options="DINING_BUDDY_PARTY_STATUS_OPTIONS"
          :party-category-options="DINING_BUDDY_PARTY_CATEGORY_OPTIONS"
          :parties="parties"
          :parties-loading="partiesLoading"
          :load-parties="loadParties"
          :open-party-drawer="openPartyDrawer"
          :open-message-drawer="openMessageDrawer"
          :change-party-status="changePartyStatus"
        />
      </el-tab-pane>

      <el-tab-pane label="举报中心" name="reports">
        <DiningBuddyReportsTab
          :report-filters="reportFilters"
          :report-status-options="DINING_BUDDY_REPORT_STATUS_OPTIONS"
          :reports="reports"
          :reports-loading="reportsLoading"
          :load-reports="loadReports"
          :handle-report="handleReport"
        />
      </el-tab-pane>

      <el-tab-pane label="敏感词" name="sensitive-words">
        <DiningBuddySensitiveWordsTab
          :sensitive-words="sensitiveWords"
          :sensitive-loading="sensitiveLoading"
          :load-sensitive-words="loadSensitiveWords"
          :open-sensitive-dialog="openSensitiveDialog"
          :delete-sensitive-word="deleteSensitiveWord"
        />
      </el-tab-pane>

      <el-tab-pane label="用户限制" name="restrictions">
        <DiningBuddyRestrictionsTab
          :restrictions="restrictions"
          :restrictions-loading="restrictionsLoading"
          :load-restrictions="loadRestrictions"
          :open-restriction-dialog="openRestrictionDialog"
        />
      </el-tab-pane>

      <el-tab-pane label="审计日志" name="audit">
        <DiningBuddyAuditTab
          :audit-logs="auditLogs"
          :audit-loading="auditLoading"
          :load-audit-logs="loadAuditLogs"
        />
      </el-tab-pane>
    </el-tabs>

    <DiningBuddyPartyDetailDrawer
      v-model:visible="partyDrawerVisible"
      :party-detail="partyDetail"
    />

    <DiningBuddyMessageDrawer
      v-model:visible="messageDrawerVisible"
      :active-party-for-messages="activePartyForMessages"
      :messages="messages"
      :messages-loading="messagesLoading"
      :load-messages="loadMessages"
      :delete-message="deleteMessage"
    />

    <DiningBuddySensitiveDialog
      v-model:visible="sensitiveDialogVisible"
      :sensitive-form="sensitiveForm"
      :sensitive-saving="sensitiveSaving"
      :get-dining-buddy-sensitive-dialog-title="getDiningBuddySensitiveDialogTitle"
      :save-sensitive-word="saveSensitiveWord"
    />

    <DiningBuddyRestrictionDialog
      v-model:visible="restrictionDialogVisible"
      :restriction-form="restrictionForm"
      :restriction-type-options="DINING_BUDDY_RESTRICTION_TYPE_OPTIONS"
      :restriction-saving="restrictionSaving"
      :get-dining-buddy-restriction-dialog-title="getDiningBuddyRestrictionDialogTitle"
      :save-restriction="saveRestriction"
    />
  </div>
</template>

<script setup>
import './DiningBuddyGovernance.css'
import { ElMessage, ElMessageBox } from 'element-plus'
import request from '@/utils/request'
import PageStateAlert from '@/components/PageStateAlert.vue'
import DiningBuddyAuditTab from './diningBuddyGovernanceSections/DiningBuddyAuditTab.vue'
import DiningBuddyMessageDrawer from './diningBuddyGovernanceSections/DiningBuddyMessageDrawer.vue'
import DiningBuddyPartiesTab from './diningBuddyGovernanceSections/DiningBuddyPartiesTab.vue'
import DiningBuddyPartyDetailDrawer from './diningBuddyGovernanceSections/DiningBuddyPartyDetailDrawer.vue'
import DiningBuddyReportsTab from './diningBuddyGovernanceSections/DiningBuddyReportsTab.vue'
import DiningBuddyRestrictionDialog from './diningBuddyGovernanceSections/DiningBuddyRestrictionDialog.vue'
import DiningBuddyRestrictionsTab from './diningBuddyGovernanceSections/DiningBuddyRestrictionsTab.vue'
import DiningBuddyRuntimeTab from './diningBuddyGovernanceSections/DiningBuddyRuntimeTab.vue'
import DiningBuddySensitiveDialog from './diningBuddyGovernanceSections/DiningBuddySensitiveDialog.vue'
import DiningBuddySensitiveWordsTab from './diningBuddyGovernanceSections/DiningBuddySensitiveWordsTab.vue'
import { useDiningBuddyGovernancePage } from './diningBuddyGovernanceHelpers'

const {
  activePartyForMessages,
  activeTab,
  addQuestion,
  addQuestionOption,
  auditLoading,
  auditLogs,
  changePartyStatus,
  deleteMessage,
  deleteSensitiveWord,
  DINING_BUDDY_PARTY_CATEGORY_OPTIONS,
  DINING_BUDDY_PARTY_STATUS_OPTIONS,
  DINING_BUDDY_REPORT_STATUS_OPTIONS,
  DINING_BUDDY_RESTRICTION_TYPE_OPTIONS,
  getDiningBuddyRestrictionDialogTitle,
  getDiningBuddySensitiveDialogTitle,
  handleReport,
  loadAll,
  loadAuditLogs,
  loadMessages,
  loadParties,
  loadReports,
  loadRestrictions,
  loadSensitiveWords,
  messageDrawerVisible,
  messages,
  messagesLoading,
  openMessageDrawer,
  openPartyDrawer,
  openRestrictionDialog,
  openSensitiveDialog,
  pageError,
  pageLoading,
  parties,
  partiesLoading,
  partyDetail,
  partyDrawerVisible,
  partyFilters,
  removeQuestion,
  removeQuestionOption,
  reportFilters,
  reports,
  reportsLoading,
  restrictionDialogVisible,
  restrictionForm,
  restrictions,
  restrictionsLoading,
  restrictionSaving,
  runtimeForm,
  runtimeLoading,
  runtimeSaving,
  saveRestriction,
  saveRuntimeSettings,
  saveSensitiveWord,
  sensitiveDialogVisible,
  sensitiveForm,
  sensitiveLoading,
  sensitiveSaving,
  sensitiveWords,
  sortedRuntimeCategories,
} = useDiningBuddyGovernancePage({
  request,
  ElMessage,
  ElMessageBox,
})
</script>
