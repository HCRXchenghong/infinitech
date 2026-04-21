<template>
  <el-card class="card compose-card">
    <template #header>
      <div class="card-header">
        <span>发起 RTC 呼叫</span>
        <el-tag v-if="selectedTarget" size="small" type="success" effect="light">已选目标</el-tag>
      </div>
    </template>

    <div v-if="selectedTarget" class="selected-target-card">
      <div class="selected-target-name">{{ selectedTarget.name || selectedTarget.phone || selectedTarget.chatId }}</div>
      <div class="selected-target-meta">
        <span>{{ roleLabel(selectedTarget.role) }}</span>
        <span v-if="selectedTarget.phone">{{ selectedTarget.phone }}</span>
        <span v-if="selectedTarget.legacyId">Legacy {{ selectedTarget.legacyId }}</span>
      </div>
    </div>
    <div v-else class="empty-state compact-empty">
      先从左侧搜索并选择一个目标联系人。
    </div>

    <el-form class="compose-form" :model="callForm" label-width="110px" size="small">
      <el-form-item label="会话号">
        <el-input v-model.trim="callForm.conversationId" placeholder="默认带入 Chat ID，可手动调整" />
      </el-form-item>
      <el-form-item label="订单号">
        <el-input v-model.trim="callForm.orderId" placeholder="可选，用于客服 / 履约场景留痕" />
      </el-form-item>
      <el-form-item label="入口标识">
        <el-input v-model.trim="callForm.entryPoint" placeholder="如：admin_rtc_console" />
      </el-form-item>
      <el-form-item label="业务场景">
        <el-input v-model.trim="callForm.scene" placeholder="如：admin_support" />
      </el-form-item>
    </el-form>

    <div class="compose-tip">
      这里发起的呼叫会和聊天工作台、全局 RTC 弹窗共享同一套会话状态，审计会同步写入 RTC 通话审计页。
    </div>

    <div class="compose-actions">
      <el-button
        type="primary"
        :loading="startingCall"
        :disabled="!selectedTarget || !canCallSelected || currentCallActive"
        @click="startCall"
      >
        发起 RTC 语音
      </el-button>
    </div>
  </el-card>
</template>

<script setup>
defineProps({
  selectedTarget: {
    type: Object,
    default: () => null,
  },
  roleLabel: {
    type: Function,
    required: true,
  },
  callForm: {
    type: Object,
    required: true,
  },
  startingCall: {
    type: Boolean,
    default: false,
  },
  canCallSelected: {
    type: Boolean,
    default: false,
  },
  currentCallActive: {
    type: Boolean,
    default: false,
  },
  startCall: {
    type: Function,
    required: true,
  },
})
</script>
