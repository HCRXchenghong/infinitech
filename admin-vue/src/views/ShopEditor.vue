<template>
  <div class="shop-editor">
    <el-form :model="formData" label-width="120px" size="small">
      <el-tabs v-model="activeTab" type="card">
        <el-tab-pane label="基本信息" name="basic">
          <ShopEditorBasicTab
            :business-category-options="businessCategoryOptions"
            :form-data="formData"
            :handle-business-category-change="handleBusinessCategoryChange"
            :handle-merchant-type-change="handleMerchantTypeChange"
            :handle-order-type-change="handleOrderTypeChange"
            :merchant-type-options="merchantTypeOptions"
          />
        </el-tab-pane>
        <el-tab-pane label="图片设置" name="images">
          <ShopEditorImagesTab :form-data="formData" />
        </el-tab-pane>
        <el-tab-pane label="标签与优惠" name="tags">
          <ShopEditorTagsTab :form-data="formData" />
        </el-tab-pane>
      </el-tabs>

      <div class="shop-editor-actions">
        <el-button @click="emit('cancel')">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSave">保存</el-button>
      </div>
    </el-form>
  </div>
</template>

<script setup>
import './ShopEditor.css';
import { ElMessage } from 'element-plus';
import ShopEditorBasicTab from './shopEditorSections/ShopEditorBasicTab.vue';
import ShopEditorImagesTab from './shopEditorSections/ShopEditorImagesTab.vue';
import ShopEditorTagsTab from './shopEditorSections/ShopEditorTagsTab.vue';
import { useShopEditor } from './shopEditorHelpers';

const props = defineProps({
  shop: {
    type: Object,
    default: null,
  },
  merchantId: {
    type: [Number, String],
    required: true,
  },
});

const emit = defineEmits(['save', 'cancel']);

const {
  activeTab,
  businessCategoryOptions,
  formData,
  handleBusinessCategoryChange,
  handleMerchantTypeChange,
  handleOrderTypeChange,
  handleSave,
  merchantTypeOptions,
  saving,
} = useShopEditor({
  ElMessage,
  emit,
  props,
});
</script>
