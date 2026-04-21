<template>
  <el-card class="card push-message-card">
    <div class="card-title">推送消息管理</div>

    <div class="push-message-actions">
      <el-button size="small" type="primary" @click="showAddPushMessageDialog">添加推送消息</el-button>
      <el-button size="small" :loading="pushMessageLoading" @click="loadPushMessages">刷新</el-button>
    </div>

    <div v-loading="pushMessageLoading" class="mobile-push-message-list">
      <div v-if="pushMessages.length === 0" class="empty-state">
        <p>暂无推送消息</p>
      </div>

      <div
        v-for="message in pushMessages"
        :key="message.id"
        class="push-message-card-item"
      >
        <div class="card-item-header">
          <div class="card-item-info">
            <div class="card-item-title">
              <span class="info-label">ID:</span>
              <span class="info-value">{{ message.id }}</span>
            </div>
            <div class="card-item-title">
              <span class="info-label">标题:</span>
              <span class="info-value">{{ message.title }}</span>
            </div>
            <div class="card-item-content">
              <span class="info-label">内容:</span>
              <div class="info-value content-text">{{ message.content || '无' }}</div>
            </div>
            <div class="card-item-meta">
              <el-tag :type="message.is_active ? 'success' : 'danger'" size="small">
                {{ message.is_active ? '推送中' : '已停止' }}
              </el-tag>
              <span
                v-if="message.scheduled_start_time || message.scheduled_end_time"
                class="time-info"
              >
                <span v-if="message.scheduled_start_time">开始: {{ message.scheduled_start_time }}</span>
                <span v-if="message.scheduled_end_time"> 结束: {{ message.scheduled_end_time }}</span>
              </span>
              <span v-else class="time-info">无定时设置</span>
            </div>
          </div>
        </div>

        <div class="card-item-actions">
          <el-button size="small" @click="showPushMessageStats(message)">查看统计</el-button>
          <el-button size="small" type="primary" @click="editPushMessage(message)">编辑</el-button>
          <el-button size="small" type="danger" @click="deletePushMessage(message)">删除</el-button>
        </div>
      </div>
    </div>
  </el-card>
</template>

<script setup>
defineProps({
  pushMessages: {
    type: Array,
    default: () => [],
  },
  pushMessageLoading: {
    type: Boolean,
    default: false,
  },
  showAddPushMessageDialog: {
    type: Function,
    required: true,
  },
  loadPushMessages: {
    type: Function,
    required: true,
  },
  showPushMessageStats: {
    type: Function,
    required: true,
  },
  editPushMessage: {
    type: Function,
    required: true,
  },
  deletePushMessage: {
    type: Function,
    required: true,
  },
});
</script>
