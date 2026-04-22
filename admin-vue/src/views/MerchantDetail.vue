<template>
  <div class="merchant-detail-page">
    <PageStateAlert :message="loadError" />

    <el-tabs v-model="activeTab" type="border-card">
      <el-tab-pane label="基本信息" name="basic">
        <MerchantDetailBasicTab :merchant="merchant" />
      </el-tab-pane>

      <el-tab-pane label="店铺列表" name="shops">
        <MerchantDetailShopsTab
          :shops="shops"
          :load-error="loadError"
          :add-shop="addShop"
          :edit-shop="editShop"
          :delete-shop="deleteShop"
        />
      </el-tab-pane>
    </el-tabs>

    <MerchantDetailShopDialog
      :visible="shopDialogVisible"
      :shop-dialog-title="shopDialogTitle"
      :current-shop="currentShop"
      :merchant-id="merchantId"
      :handle-shop-save="handleShopSave"
      @update:visible="handleShopDialogVisibleChange"
    />
  </div>
</template>

<script setup>
import { ElMessage, ElMessageBox } from 'element-plus'
import './MerchantDetail.css'
import PageStateAlert from '@/components/PageStateAlert.vue'
import request from '@/utils/request'
import MerchantDetailBasicTab from './merchantDetailSections/MerchantDetailBasicTab.vue'
import MerchantDetailShopDialog from './merchantDetailSections/MerchantDetailShopDialog.vue'
import MerchantDetailShopsTab from './merchantDetailSections/MerchantDetailShopsTab.vue'
import { useMerchantDetailPage } from './merchantDetailPageHelpers'

const props = defineProps({
  merchant: {
    type: Object,
    required: true,
  },
})

const emit = defineEmits(['refresh', 'close'])

const {
  activeTab,
  addShop,
  currentShop,
  deleteShop,
  editShop,
  handleShopDialogVisibleChange,
  handleShopSave,
  loadError,
  merchantId,
  shopDialogTitle,
  shopDialogVisible,
  shops,
} = useMerchantDetailPage({
  props,
  emit,
  request,
  ElMessage,
  ElMessageBox,
})
</script>
