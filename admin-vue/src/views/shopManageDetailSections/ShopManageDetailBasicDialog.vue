<template>
  <el-dialog
    :model-value="visible"
    title="编辑基本信息"
    width="760px"
    :close-on-click-modal="false"
    @update:model-value="$emit('update:visible', $event)"
  >
    <el-form :model="basicForm" label-width="100px">
      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="店铺名称" required>
            <el-input v-model="basicForm.name" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="联系电话">
            <el-input v-model="basicForm.phone" />
          </el-form-item>
        </el-col>
      </el-row>

      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="店铺类型">
            <el-select v-model="basicForm.orderType" style="width: 100%">
              <el-option
                v-for="option in merchantTypeOptions"
                :key="option.key"
                :label="option.orderTypeLabel"
                :value="option.legacyOrderTypeLabel"
              />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="业务分类">
            <el-select
              v-model="basicForm.businessCategoryKey"
              style="width: 100%"
              @change="handleBasicBusinessCategoryChange"
            >
              <el-option
                v-for="option in businessCategoryOptions"
                :key="option.key"
                :label="option.label"
                :value="option.key"
              />
            </el-select>
          </el-form-item>
        </el-col>
      </el-row>

      <el-row :gutter="16">
        <el-col :span="8">
          <el-form-item label="评分">
            <el-input-number
              v-model="basicForm.rating"
              :min="0"
              :max="5"
              :step="0.1"
              :precision="1"
              style="width: 100%"
            />
          </el-form-item>
        </el-col>
        <el-col :span="8">
          <el-form-item label="月销量">
            <el-input-number v-model="basicForm.monthlySales" :min="0" style="width: 100%" />
          </el-form-item>
        </el-col>
        <el-col :span="8">
          <el-form-item label="营业状态">
            <el-switch v-model="basicForm.isActive" />
          </el-form-item>
        </el-col>
      </el-row>

      <el-row :gutter="16">
        <el-col :span="8">
          <el-form-item label="今日推荐">
            <el-switch v-model="basicForm.isTodayRecommended" />
          </el-form-item>
        </el-col>
        <el-col :span="8">
          <el-form-item label="推荐位次">
            <el-input-number
              v-model="basicForm.todayRecommendPosition"
              :min="1"
              :disabled="!basicForm.isTodayRecommended"
              style="width: 100%"
            />
          </el-form-item>
        </el-col>
      </el-row>

      <el-form-item label="营业时间">
        <el-input v-model="basicForm.businessHours" />
      </el-form-item>
      <el-form-item label="店铺地址">
        <el-input v-model="basicForm.address" />
      </el-form-item>
      <el-form-item label="公告">
        <el-input v-model="basicForm.announcement" type="textarea" :rows="3" />
      </el-form-item>
      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="商家资质">
            <ImageUpload
              v-model="basicForm.merchantQualification"
              upload-domain="merchant_document"
            />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="食品经营许可">
            <ImageUpload
              v-model="basicForm.foodBusinessLicense"
              upload-domain="merchant_document"
            />
          </el-form-item>
        </el-col>
      </el-row>
    </el-form>
    <template #footer>
      <el-button @click="$emit('update:visible', false)">取消</el-button>
      <el-button type="primary" :loading="saving" @click="saveBasicInfo">保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import ImageUpload from '@/components/ImageUpload.vue';

defineEmits(['update:visible']);

defineProps({
  basicForm: {
    type: Object,
    required: true,
  },
  businessCategoryOptions: {
    type: Array,
    default: () => [],
  },
  handleBasicBusinessCategoryChange: {
    type: Function,
    required: true,
  },
  merchantTypeOptions: {
    type: Array,
    default: () => [],
  },
  saveBasicInfo: {
    type: Function,
    required: true,
  },
  saving: {
    type: Boolean,
    default: false,
  },
  visible: {
    type: Boolean,
    default: false,
  },
});
</script>
