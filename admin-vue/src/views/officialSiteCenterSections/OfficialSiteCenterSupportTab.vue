<template>
  <div class="support-console">
    <aside class="support-sidebar">
      <div class="support-sidebar-head">
        <div>
          <div class="support-sidebar-title">官网客服会话</div>
          <div class="support-sidebar-subtitle">实时消息优先推送，断开时自动回落到轮询同步。</div>
        </div>
        <el-tag size="small" :type="supportRealtimeConnected ? 'success' : 'warning'">
          {{ supportRealtimeConnected ? '实时在线' : '兜底同步' }}
        </el-tag>
      </div>

      <div class="support-toolbar">
        <el-input
          v-model="supportFilters.search"
          size="small"
          placeholder="搜索昵称 / 联系方式 / 最近消息"
          clearable
          @keyup.enter="loadSupportSessions"
        />
        <div class="support-toolbar-row">
          <el-select v-model="supportFilters.status" size="small" clearable placeholder="状态">
            <el-option
              v-for="option in OFFICIAL_SITE_SUPPORT_STATUS_OPTIONS"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            />
          </el-select>
          <el-button size="small" @click="loadSupportSessions">筛选</el-button>
        </div>
        <div class="support-toolbar-note">
          {{ supportRealtimeConnected ? '官网客服新消息会即时推送到这里。' : '实时链路断开时，系统会自动轮询同步。' }}
        </div>
      </div>

      <div class="support-session-list" v-loading="supportLoading">
        <button
          v-for="item in supportSessions"
          :key="item.id"
          type="button"
          class="support-session-card"
          :class="{ active: item.id === selectedSupportId }"
          @click="selectSupportSession(item.id)"
        >
          <div class="support-session-top">
            <div class="support-session-title-wrap">
              <strong>{{ item.nickname || '官网访客' }}</strong>
              <span>{{ item.contact || '未留联系方式' }}</span>
            </div>
            <div class="support-session-badges">
              <el-tag size="small" :type="item.status === 'closed' ? 'info' : 'success'">
                {{ item.status === 'closed' ? '已关闭' : '进行中' }}
              </el-tag>
              <span v-if="item.unread_admin_count" class="support-unread">{{ item.unread_admin_count }}</span>
            </div>
          </div>
          <div class="support-session-preview">{{ item.last_message_preview || '暂无消息' }}</div>
          <div class="support-session-meta">
            <span>{{ formatDateTime(item.last_message_at || item.created_at) }}</span>
            <span>{{ item.last_actor === 'visitor' ? '访客最近发言' : '后台最近回复' }}</span>
          </div>
        </button>

        <el-empty
          v-if="!supportLoading && supportSessions.length === 0"
          description="暂无官网客服会话"
          :image-size="72"
        />
      </div>
    </aside>

    <section class="support-detail">
      <template v-if="selectedSupportSession">
        <div class="support-detail-header">
          <div>
            <div class="support-detail-title-row">
              <div class="support-detail-title">{{ selectedSupportSession.nickname || '官网访客' }}</div>
              <el-tag size="small" :type="selectedSupportSession.status === 'closed' ? 'info' : 'success'">
                {{ selectedSupportSession.status === 'closed' ? '已关闭' : '进行中' }}
              </el-tag>
            </div>
            <div class="support-detail-meta">
              <span>联系方式：{{ selectedSupportSession.contact || '未填写' }}</span>
              <span>创建时间：{{ formatDateTime(selectedSupportSession.created_at) }}</span>
            </div>
          </div>

          <div class="support-detail-actions">
            <el-select v-model="selectedSupportSession.status" size="small">
              <el-option
                v-for="option in OFFICIAL_SITE_SUPPORT_STATUS_OPTIONS"
                :key="option.value"
                :label="option.label"
                :value="option.value"
              />
            </el-select>
            <el-button size="small" :loading="supportSaving" @click="saveSupportSession">保存会话</el-button>
          </div>
        </div>

        <div class="support-remark-card">
          <div class="support-remark-title">管理员备注</div>
          <el-input
            v-model="selectedSupportSession.admin_remark"
            type="textarea"
            :rows="2"
            resize="none"
            maxlength="300"
            show-word-limit
            placeholder="记录访客背景、跟进情况或后续处理要点"
          />
        </div>

        <div ref="messageListRef" class="support-messages" v-loading="supportMessagesLoading">
          <div
            v-for="message in supportMessages"
            :key="message.id || message.legacy_id || `${message.sender_type}-${message.created_at}`"
            class="support-message-row"
            :class="{ self: message.sender_type === 'admin' }"
          >
            <div class="support-message-avatar">
              {{ message.sender_type === 'admin' ? '管' : '客' }}
            </div>
            <div class="support-message-bubble">
              <div class="support-message-author">
                {{ message.sender_type === 'admin' ? (message.sender_name || '管理员') : '官网访客' }}
              </div>
              <div class="support-message-text">{{ message.content }}</div>
              <div class="support-message-time">{{ formatDateTime(message.created_at) }}</div>
            </div>
          </div>

          <el-empty
            v-if="!supportMessagesLoading && supportMessages.length === 0"
            description="暂无消息"
            :image-size="72"
          />
        </div>

        <div class="support-reply-box">
          <div class="support-reply-head">
            <div>
              <div class="support-reply-title">回复访客</div>
              <div class="support-reply-subtitle">消息发送后会实时回到官网聊天窗。</div>
            </div>
            <el-button size="small" @click="loadSelectedSupportMessages">刷新消息</el-button>
          </div>

          <el-input
            :model-value="supportReply"
            type="textarea"
            :rows="4"
            resize="none"
            maxlength="500"
            show-word-limit
            placeholder="输入回复内容"
            @update:model-value="updateSupportReply"
            @keydown.enter.exact.prevent="sendSupportReply"
          />
          <div class="support-reply-actions">
            <span>保持简洁、明确，便于访客快速理解下一步。</span>
            <el-button type="primary" size="small" :loading="supportSending" @click="sendSupportReply">
              发送回复
            </el-button>
          </div>
        </div>
      </template>

      <div v-else class="support-detail-empty">
        <div class="support-detail-empty-card">
          <h3>从左侧选择一个官网客服会话</h3>
          <p>选择会话后可查看完整消息、修改会话状态、填写备注并直接回复访客。</p>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { nextTick, ref, watch } from 'vue';
import { OFFICIAL_SITE_SUPPORT_STATUS_OPTIONS } from '@infinitech/admin-core';
import { formatDateTime } from '@/utils/officialSiteApi';

const props = defineProps({
  supportFilters: {
    type: Object,
    required: true,
  },
  supportRealtimeConnected: {
    type: Boolean,
    default: false,
  },
  supportLoading: {
    type: Boolean,
    default: false,
  },
  supportSessions: {
    type: Array,
    default: () => [],
  },
  selectedSupportId: {
    type: String,
    default: '',
  },
  selectedSupportSession: {
    type: Object,
    default: null,
  },
  supportSaving: {
    type: Boolean,
    default: false,
  },
  supportMessagesLoading: {
    type: Boolean,
    default: false,
  },
  supportMessages: {
    type: Array,
    default: () => [],
  },
  supportReply: {
    type: String,
    default: '',
  },
  supportSending: {
    type: Boolean,
    default: false,
  },
  loadSupportSessions: {
    type: Function,
    required: true,
  },
  selectSupportSession: {
    type: Function,
    required: true,
  },
  saveSupportSession: {
    type: Function,
    required: true,
  },
  loadSelectedSupportMessages: {
    type: Function,
    required: true,
  },
  sendSupportReply: {
    type: Function,
    required: true,
  },
});

const emit = defineEmits(['update:supportReply']);
const messageListRef = ref(null);

function updateSupportReply(value) {
  emit('update:supportReply', value);
}

watch(
  () => props.supportMessages,
  async () => {
    await nextTick();
    if (messageListRef.value) {
      messageListRef.value.scrollTop = messageListRef.value.scrollHeight;
    }
  },
  { deep: true },
);
</script>
