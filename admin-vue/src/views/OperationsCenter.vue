<template>
  <div class="operations-center-page">
    <div class="operations-center-panel">
      <OperationsCenterHeader :loading="loading" :refresh-current="refreshCurrent" />
      <PageStateAlert :message="pageError" />

      <el-tabs v-model="activeTab" class="operations-center-tabs">
        <el-tab-pane label="反馈与合作" name="cooperation">
          <OperationsCenterCooperationsSection
            :cooperations="cooperations"
            :loading="loading"
            :load-error="loadError"
            :cooperation-status-options="cooperationStatusOptions"
            :format-cooperation-type="formatCooperationType"
            :get-cooperation-type-tag-type="getCooperationTypeTagType"
            :update-cooperation="updateCooperation"
          />
        </el-tab-pane>

        <el-tab-pane label="邀请好友" name="invite">
          <OperationsCenterInviteSection
            :invite-codes="inviteCodes"
            :invite-records="inviteRecords"
            :loading="loading"
            :load-error="loadError"
          />
        </el-tab-pane>

        <el-tab-pane label="积分兑换" name="redemption">
          <OperationsCenterRedemptionsSection
            :redemptions="redemptions"
            :loading="loading"
            :load-error="loadError"
            :redemption-status-options="redemptionStatusOptions"
            :update-redemption="updateRedemption"
          />
        </el-tab-pane>

        <el-tab-pane label="积分商品" name="goods">
          <OperationsCenterGoodsSection
            :goods="goods"
            :loading="loading"
            :load-error="loadError"
            :open-good-dialog="openGoodDialog"
            :toggle-good="toggleGood"
            :delete-good="deleteGood"
          />
        </el-tab-pane>
      </el-tabs>
    </div>

    <OperationsCenterGoodDialog
      :visible="goodDialogVisible"
      :good-form="goodForm"
      :saving-good="savingGood"
      :goods-type-options="goodsTypeOptions"
      :save-good="saveGood"
      @update:visible="handleGoodDialogVisibleUpdate"
    />
  </div>
</template>

<script setup>
import './OperationsCenter.css';
import { ElMessage, ElMessageBox } from 'element-plus';
import request from '@/utils/request';
import PageStateAlert from '@/components/PageStateAlert.vue';
import OperationsCenterCooperationsSection from './operationsCenterSections/OperationsCenterCooperationsSection.vue';
import OperationsCenterGoodDialog from './operationsCenterSections/OperationsCenterGoodDialog.vue';
import OperationsCenterGoodsSection from './operationsCenterSections/OperationsCenterGoodsSection.vue';
import OperationsCenterHeader from './operationsCenterSections/OperationsCenterHeader.vue';
import OperationsCenterInviteSection from './operationsCenterSections/OperationsCenterInviteSection.vue';
import OperationsCenterRedemptionsSection from './operationsCenterSections/OperationsCenterRedemptionsSection.vue';
import { useOperationsCenterPage } from './operationsCenterPageHelpers';

const {
  activeTab,
  cooperationStatusOptions,
  cooperations,
  formatCooperationType,
  getCooperationTypeTagType,
  goodDialogVisible,
  goodForm,
  goods,
  goodsTypeOptions,
  inviteCodes,
  inviteRecords,
  loadError,
  loading,
  openGoodDialog,
  pageError,
  redemptionStatusOptions,
  redemptions,
  refreshCurrent,
  saveGood,
  savingGood,
  toggleGood,
  deleteGood,
  updateCooperation,
  updateRedemption,
  closeGoodDialog,
} = useOperationsCenterPage({
  request,
  ElMessage,
  ElMessageBox,
});

function handleGoodDialogVisibleUpdate(value) {
  if (!value) {
    closeGoodDialog();
    return;
  }
  goodDialogVisible.value = value;
}
</script>
