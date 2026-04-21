<template>
  <el-drawer
    :model-value="visible"
    title="消息治理"
    size="55%"
    @update:model-value="emit('update:visible', $event)"
  >
    <div class="drawer-toolbar">
      <strong>{{ activePartyForMessages?.title || '组局消息' }}</strong>
      <el-button size="small" :loading="messagesLoading" @click="loadMessages(activePartyForMessages?.id, true)">刷新</el-button>
    </div>
    <el-table :data="messages" v-loading="messagesLoading" size="small" border>
      <el-table-column prop="sender_name" label="发送人" width="140" />
      <el-table-column prop="content" label="消息内容" min-width="260" />
      <el-table-column prop="created_at" label="发送时间" width="180" />
      <el-table-column label="操作" width="120">
        <template #default="{ row }">
          <el-button size="small" text type="danger" @click="deleteMessage(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
  </el-drawer>
</template>

<script setup>
defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  activePartyForMessages: {
    type: Object,
    default: () => null,
  },
  messages: {
    type: Array,
    default: () => [],
  },
  messagesLoading: {
    type: Boolean,
    default: false,
  },
  loadMessages: {
    type: Function,
    required: true,
  },
  deleteMessage: {
    type: Function,
    required: true,
  },
})

const emit = defineEmits(['update:visible'])
</script>
