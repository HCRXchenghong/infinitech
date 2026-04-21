<template>
  <el-dialog
    :model-value="visible"
    title="编辑商户信息"
    width="520px"
    :close-on-click-modal="false"
    @update:model-value="emit('update:visible', $event)"
  >
    <el-form :model="merchantForm" label-width="100px">
      <el-form-item label="商户名称" required>
        <el-input v-model="merchantForm.name" placeholder="请输入商户名称" />
      </el-form-item>
      <el-form-item label="负责人" required>
        <el-input v-model="merchantForm.owner_name" placeholder="请输入负责人姓名" />
      </el-form-item>
      <el-form-item label="手机号" required>
        <el-input v-model="merchantForm.phone" placeholder="请输入手机号" />
      </el-form-item>
      <el-form-item label="营业执照">
        <div class="upload-box">
          <el-upload
            :show-file-list="false"
            :auto-upload="false"
            accept="image/*"
            :on-change="handleBusinessLicenseChange"
          >
            <el-button :loading="uploadingBusinessLicense">上传照片</el-button>
          </el-upload>
          <el-image
            v-if="merchantForm.business_license_image"
            class="license-image"
            :src="merchantForm.business_license_image"
            :preview-src-list="[merchantForm.business_license_image]"
            fit="cover"
          />
        </div>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="emit('update:visible', false)">取消</el-button>
      <el-button type="primary" :loading="savingMerchant" @click="saveMerchant">保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  merchantForm: {
    type: Object,
    required: true,
  },
  savingMerchant: {
    type: Boolean,
    default: false,
  },
  uploadingBusinessLicense: {
    type: Boolean,
    default: false,
  },
  handleBusinessLicenseChange: {
    type: Function,
    required: true,
  },
  saveMerchant: {
    type: Function,
    required: true,
  },
});

const emit = defineEmits(['update:visible']);
</script>
