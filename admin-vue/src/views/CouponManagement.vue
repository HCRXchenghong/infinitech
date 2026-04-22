<template>
  <div class="coupon-page">
    <CouponManagementHeader :open-create-dialog="openCreateDialog" />

    <CouponManagementTableCard
      :copy-link="copyLink"
      :coupon-rule-text="couponRuleText"
      :coupons="coupons"
      :display-remaining-count="displayRemainingCount"
      :display-total-count="displayTotalCount"
      :fen2yuan="fen2yuan"
      :filters="filters"
      :format-time="formatTime"
      :load-coupons="loadCoupons"
      :load-error="loadError"
      :loading="loading"
      :on-current-page-change="onCurrentPageChange"
      :on-page-size-change="onPageSizeChange"
      :open-issue-dialog="openIssueDialog"
      :open-issue-log-dialog="openIssueLogDialog"
      :remove-coupon="removeCoupon"
      :short-link="shortLink"
      :source-tag-type="sourceTagType"
      :source-text="sourceText"
      :toggle-status="toggleStatus"
      :total="total"
    />

    <CouponCreateDialog
      :create-form="createForm"
      :create-form-ref="createFormRef"
      :create-rules="createRules"
      :creating="creating"
      :set-create-form-ref="setCreateFormRef"
      :set-create-dialog-visible="setCreateDialogVisible"
      :submit-create="submitCreate"
      :visible="createDialogVisible"
    />

    <CouponIssueDialog
      :issue-form="issueForm"
      :issue-form-ref="issueFormRef"
      :issue-rules="issueRules"
      :issuing="issuing"
      :set-issue-form-ref="setIssueFormRef"
      :set-issue-dialog-visible="setIssueDialogVisible"
      :submit-issue="submitIssue"
      :visible="issueDialogVisible"
    />

    <CouponIssueLogDialog
      :format-time="formatTime"
      :issue-channel-text="issueChannelText"
      :issue-log-coupon="issueLogCoupon"
      :issue-log-error="issueLogError"
      :issue-log-filters="issueLogFilters"
      :issue-log-loading="issueLogLoading"
      :issue-log-total="issueLogTotal"
      :issue-logs="issueLogs"
      :load-issue-logs="loadIssueLogs"
      :on-issue-log-page-change="onIssueLogPageChange"
      :on-issue-log-page-size-change="onIssueLogPageSizeChange"
      :set-issue-log-dialog-visible="setIssueLogDialogVisible"
      :visible="issueLogDialogVisible"
    />
  </div>
</template>

<script setup>
import './CouponManagement.css';
import CouponCreateDialog from './couponManagementSections/CouponCreateDialog.vue';
import CouponIssueDialog from './couponManagementSections/CouponIssueDialog.vue';
import CouponIssueLogDialog from './couponManagementSections/CouponIssueLogDialog.vue';
import CouponManagementHeader from './couponManagementSections/CouponManagementHeader.vue';
import CouponManagementTableCard from './couponManagementSections/CouponManagementTableCard.vue';
import { useCouponManagementPage } from './couponManagementHelpers';

const {
  loading,
  loadError,
  coupons,
  total,
  filters,
  createDialogVisible,
  creating,
  createFormRef,
  createForm,
  createRules,
  issueDialogVisible,
  issuing,
  issueFormRef,
  issueForm,
  issueLogDialogVisible,
  issueLogLoading,
  issueLogError,
  issueLogs,
  issueLogTotal,
  issueLogCoupon,
  issueLogFilters,
  issueRules,
  loadCoupons,
  sourceText,
  sourceTagType,
  couponRuleText,
  displayTotalCount,
  displayRemainingCount,
  fen2yuan,
  formatTime,
  shortLink,
  openCreateDialog,
  submitCreate,
  toggleStatus,
  removeCoupon,
  openIssueDialog,
  openIssueLogDialog,
  loadIssueLogs,
  issueChannelText,
  submitIssue,
  copyLink,
  onPageSizeChange,
  onCurrentPageChange,
  onIssueLogPageSizeChange,
  onIssueLogPageChange
} = useCouponManagementPage();

function setCreateDialogVisible(value) {
  createDialogVisible.value = Boolean(value);
}

function setCreateFormRef(element) {
  createFormRef.value = element;
}

function setIssueDialogVisible(value) {
  issueDialogVisible.value = Boolean(value);
}

function setIssueFormRef(element) {
  issueFormRef.value = element;
}

function setIssueLogDialogVisible(value) {
  issueLogDialogVisible.value = Boolean(value);
}
</script>
