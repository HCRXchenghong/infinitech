<template>
  <el-dialog
    :model-value="visible"
    title="编辑员工备案"
    width="860px"
    :close-on-click-modal="false"
    @update:model-value="$emit('update:visible', $event)"
  >
    <el-form :model="staffForm" label-width="120px">
      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="姓名" required>
            <el-input v-model="staffForm.employeeName" placeholder="请输入姓名" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="年龄">
            <el-input-number
              v-model="staffForm.employeeAge"
              :min="0"
              :step="1"
              :precision="0"
              style="width: 100%"
            />
          </el-form-item>
        </el-col>
      </el-row>

      <el-form-item label="岗位">
        <el-input
          v-model="staffForm.employeePosition"
          placeholder="例如：店长 / 后厨 / 配送对接人"
        />
      </el-form-item>

      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="身份证到期时间">
            <el-date-picker
              v-model="staffForm.idCardExpireAt"
              type="date"
              value-format="YYYY-MM-DD"
              format="YYYY-MM-DD"
              placeholder="请选择日期"
              style="width: 100%"
            />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="健康证到期时间">
            <el-date-picker
              v-model="staffForm.healthCertExpireAt"
              type="date"
              value-format="YYYY-MM-DD"
              format="YYYY-MM-DD"
              placeholder="请选择日期"
              style="width: 100%"
            />
          </el-form-item>
        </el-col>
      </el-row>

      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="入职时间">
            <el-date-picker
              v-model="staffForm.employmentStartAt"
              type="date"
              value-format="YYYY-MM-DD"
              format="YYYY-MM-DD"
              placeholder="请选择日期"
              style="width: 100%"
            />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="离职时间">
            <el-date-picker
              v-model="staffForm.employmentEndAt"
              type="date"
              value-format="YYYY-MM-DD"
              format="YYYY-MM-DD"
              placeholder="请选择日期"
              style="width: 100%"
            />
          </el-form-item>
        </el-col>
      </el-row>

      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="身份证正面">
            <ImageUpload
              v-model="staffForm.idCardFrontImage"
              upload-domain="merchant_document"
            />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="身份证反面">
            <ImageUpload
              v-model="staffForm.idCardBackImage"
              upload-domain="merchant_document"
            />
          </el-form-item>
        </el-col>
      </el-row>

      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="健康证正面">
            <ImageUpload
              v-model="staffForm.healthCertFrontImage"
              upload-domain="merchant_document"
            />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="健康证反面">
            <ImageUpload
              v-model="staffForm.healthCertBackImage"
              upload-domain="merchant_document"
            />
          </el-form-item>
        </el-col>
      </el-row>
    </el-form>
    <template #footer>
      <el-button @click="$emit('update:visible', false)">取消</el-button>
      <el-button type="primary" :loading="saving" @click="saveStaffInfo">保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import ImageUpload from '@/components/ImageUpload.vue';

defineEmits(['update:visible']);

defineProps({
  saveStaffInfo: {
    type: Function,
    required: true,
  },
  saving: {
    type: Boolean,
    default: false,
  },
  staffForm: {
    type: Object,
    required: true,
  },
  visible: {
    type: Boolean,
    default: false,
  },
});
</script>
