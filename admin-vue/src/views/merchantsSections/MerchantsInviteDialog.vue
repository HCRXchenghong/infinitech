<template>
  <el-dialog
    :model-value="visible"
    title="商户邀请链接"
    width="620px"
    :close-on-click-modal="false"
    @update:model-value="emit('update:visible', $event)"
  >
    <el-form :model="inviteForm" label-width="110px">
      <el-form-item label="有效期(小时)">
        <el-input-number v-model="inviteForm.expires_hours" :min="1" :max="720" />
      </el-form-item>
      <el-form-item label="可用次数">
        <el-input-number v-model="inviteForm.max_uses" :min="1" :max="1000" />
      </el-form-item>
      <el-form-item v-if="inviteResult.invite_url" label="邀请链接">
        <el-input v-model="inviteResult.invite_url" readonly />
      </el-form-item>
      <el-form-item v-if="inviteResult.invite_url" label="状态">
        <span class="merchants-invite-meta">
          总次数：{{ inviteResult.max_uses || 1 }}，剩余：{{ getInviteRemainingUses() }}，过期时间：{{ formatDateTime(inviteResult.expires_at) }}
        </span>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="emit('update:visible', false)">关闭</el-button>
      <el-button v-if="inviteResult.invite_url" @click="copyInviteUrl">复制链接</el-button>
      <el-button type="primary" :loading="creatingInvite" @click="createInviteLink">生成链接</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  inviteForm: {
    type: Object,
    required: true,
  },
  inviteResult: {
    type: Object,
    required: true,
  },
  creatingInvite: {
    type: Boolean,
    default: false,
  },
  copyInviteUrl: {
    type: Function,
    required: true,
  },
  createInviteLink: {
    type: Function,
    required: true,
  },
  formatDateTime: {
    type: Function,
    required: true,
  },
  getInviteRemainingUses: {
    type: Function,
    required: true,
  },
});

const emit = defineEmits(['update:visible']);
</script>
