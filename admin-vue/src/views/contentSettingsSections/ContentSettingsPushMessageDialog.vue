<template>
  <el-dialog
    :model-value="visible"
    :title="dialogTitle"
    :width="dialogWidth"
    class="content-settings-push-message-dialog"
    :close-on-click-modal="false"
    @update:model-value="emit('update:visible', $event)"
  >
    <el-form :model="pushMessageForm" :label-width="isMobile ? '0' : '120px'" size="small">
      <el-form-item :label="isMobile ? '' : '消息标题'" required>
        <el-input v-model="pushMessageForm.title" placeholder="请输入消息标题" />
      </el-form-item>

      <el-form-item :label="isMobile ? '' : '消息内容'" required>
        <el-input
          v-model="pushMessageForm.content"
          type="textarea"
          :rows="6"
          placeholder="请输入消息内容。如需在文字中插入图片，请在上传图片后在需要插入图片的位置输入 [图片] 标记"
        />
        <div class="form-tip">提示：在需要插入图片的位置输入 [图片] 标记，图片将显示在该位置</div>
      </el-form-item>

      <el-form-item :label="isMobile ? '' : '消息图片'">
        <el-upload
          class="push-message-uploader"
          :http-request="uploadPushMessageImage"
          :show-file-list="false"
          :before-upload="beforePushMessageUpload"
          accept="image/*"
        >
          <el-image
            v-if="pushMessageForm.image_url"
            :src="pushMessageForm.image_url"
            fit="cover"
            class="push-message-image-preview"
            :preview-src-list="[pushMessageForm.image_url]"
          />
          <div v-else class="push-message-uploader-placeholder">
            <el-icon class="push-message-uploader-icon"><Plus /></el-icon>
            <div class="push-message-uploader-text">点击上传图片（可选）</div>
          </div>
          <template #tip>
            <div class="form-tip">只能上传 jpg/png 文件，且不超过 10MB。上传后可在内容中输入 [图片] 标记来插入图片</div>
          </template>
        </el-upload>

        <div v-if="pushMessageForm.image_url" class="push-message-image-actions">
          <el-button size="small" type="primary" @click="insertImageTag">插入图片标记 [图片]</el-button>
          <el-button size="small" type="danger" @click="clearPushMessageImage">删除图片</el-button>
        </div>

        <div class="push-message-switch-row">
          <el-switch v-model="pushMessageForm.compress_image" />
          <span class="switch-hint">
            {{ pushMessageForm.compress_image ? '上传时自动压缩到1MB以内' : '保留原图（不压缩）' }}
          </span>
        </div>
      </el-form-item>

      <el-form-item :label="isMobile ? '' : '立即推送'">
        <el-switch v-model="pushMessageForm.is_active" />
        <span class="switch-hint">
          {{ pushMessageForm.is_active ? '开启后将立即向用户推送' : '关闭后用户不会收到此消息' }}
        </span>
      </el-form-item>

      <el-form-item :label="isMobile ? '' : '定时开始时间'">
        <el-date-picker
          v-model="pushMessageForm.scheduled_start_time"
          type="datetime"
          placeholder="选择定时开始推送时间（可选）"
          format="YYYY-MM-DD HH:mm:ss"
          value-format="YYYY-MM-DD HH:mm:ss"
          class="push-message-date-picker"
        />
        <div class="form-tip">设置后将在指定时间自动开始推送</div>
      </el-form-item>

      <el-form-item :label="isMobile ? '' : '定时结束时间'">
        <el-date-picker
          v-model="pushMessageForm.scheduled_end_time"
          type="datetime"
          placeholder="选择定时结束推送时间（可选）"
          format="YYYY-MM-DD HH:mm:ss"
          value-format="YYYY-MM-DD HH:mm:ss"
          class="push-message-date-picker"
        />
        <div class="form-tip">设置后将在指定时间自动停止推送</div>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="cancelPushMessageDialog">取消</el-button>
      <el-button type="primary" :loading="savingPushMessage" @click="savePushMessage">保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { computed } from 'vue';
import { Plus } from '@element-plus/icons-vue';

const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  isMobile: {
    type: Boolean,
    default: false,
  },
  editingPushMessage: {
    type: Object,
    default: null,
  },
  pushMessageForm: {
    type: Object,
    required: true,
  },
  savingPushMessage: {
    type: Boolean,
    default: false,
  },
  savePushMessage: {
    type: Function,
    required: true,
  },
  cancelPushMessageDialog: {
    type: Function,
    required: true,
  },
  uploadPushMessageImage: {
    type: Function,
    required: true,
  },
  beforePushMessageUpload: {
    type: Function,
    required: true,
  },
  insertImageTag: {
    type: Function,
    required: true,
  },
  clearPushMessageImage: {
    type: Function,
    required: true,
  },
});

const emit = defineEmits(['update:visible']);

const dialogTitle = computed(() => (props.editingPushMessage ? '编辑推送消息' : '添加推送消息'));
const dialogWidth = computed(() => (props.isMobile ? '95%' : '700px'));
</script>

<style scoped>
.push-message-image-preview {
  width: 300px;
  max-width: 100%;
  height: 180px;
  border-radius: 4px;
  cursor: pointer;
}

.push-message-image-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}

.push-message-switch-row {
  margin-top: 12px;
}

.push-message-date-picker {
  width: 100%;
}

.switch-hint {
  margin-left: 10px;
  color: #909399;
  font-size: 12px;
}

.form-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 5px;
}

@media (max-width: 768px) {
  .push-message-image-actions {
    flex-direction: column;
  }

  .push-message-image-actions :deep(.el-button) {
    width: 100%;
    margin-left: 0;
  }
}
</style>
