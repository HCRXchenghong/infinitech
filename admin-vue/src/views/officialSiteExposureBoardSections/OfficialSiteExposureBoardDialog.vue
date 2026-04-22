<template>
  <el-dialog
    :model-value="visible"
    title="提交维权信息"
    width="500px"
    destroy-on-close
    class="!rounded-lg official-site-exposure-board-dialog"
    @update:model-value="setFormVisible"
    @closed="handleDialogClosed"
  >
    <el-form label-position="top">
      <el-form-item label="证据截图/照片 (选填)">
        <el-upload
          :ref="setUploadRef"
          action="#"
          list-type="picture-card"
          multiple
          :limit="6"
          accept="image/*"
          :http-request="handlePhotoUpload"
          :before-upload="beforePhotoUpload"
          :on-success="handlePhotoSuccess"
          :on-remove="handlePhotoRemove"
          :on-exceed="handlePhotoExceed"
        >
          <div class="text-slate-400 text-xs">上传证据</div>
        </el-upload>
      </el-form-item>
      <el-form-item label="事件描述">
        <el-input
          v-model="form.content"
          type="textarea"
          :rows="4"
          placeholder="客观、详实地描述发生的经过..."
        />
      </el-form-item>
      <div class="flex gap-4">
        <el-form-item label="涉及金额(元)" class="flex-1">
          <el-input-number
            v-model="form.amount"
            :min="0"
            :precision="2"
            class="!w-full"
            :controls="false"
            placeholder="0.00"
          />
        </el-form-item>
        <el-form-item label="您的电话(平台严格保密)" class="flex-1">
          <el-input v-model="form.contact_phone" placeholder="仅用于核实" />
        </el-form-item>
      </div>
      <el-form-item label="您的诉求">
        <el-input v-model="form.appeal" placeholder="如：退款并按食安法赔偿" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="closeForm">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="submitExpose">
        提交审核
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup>
defineProps({
  beforePhotoUpload: {
    type: Function,
    required: true,
  },
  closeForm: {
    type: Function,
    required: true,
  },
  form: {
    type: Object,
    required: true,
  },
  handleDialogClosed: {
    type: Function,
    required: true,
  },
  handlePhotoExceed: {
    type: Function,
    required: true,
  },
  handlePhotoRemove: {
    type: Function,
    required: true,
  },
  handlePhotoSuccess: {
    type: Function,
    required: true,
  },
  handlePhotoUpload: {
    type: Function,
    required: true,
  },
  setFormVisible: {
    type: Function,
    required: true,
  },
  setUploadRef: {
    type: Function,
    required: true,
  },
  submitExpose: {
    type: Function,
    required: true,
  },
  submitting: {
    type: Boolean,
    default: false,
  },
  visible: {
    type: Boolean,
    default: false,
  },
});
</script>
