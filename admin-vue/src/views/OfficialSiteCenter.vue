<template>
  <div class="page official-site-center-page">
    <section class="official-site-center-hero">
      <div class="official-site-center-copy">
        <span class="center-kicker">官网中心</span>
        <h2>把官网的客服、曝光治理和合作线索放到同一套控制台里持续推进</h2>
        <p>
          这里不是静态数据看板，而是官网对外入口在后台的真实工作面。
          在线客服支持实时推送，曝光审核与合作线索支持持续跟进和备注。
        </p>
      </div>

      <div class="center-summary-grid">
        <article v-for="item in supportSummaryCards" :key="item.label" class="center-summary-card">
          <small>{{ item.label }}</small>
          <strong>{{ item.value }}</strong>
          <span>{{ item.desc }}</span>
        </article>
      </div>
    </section>

    <div class="panel official-site-center-panel">
      <div class="panel-header official-site-panel-header">
        <div>
          <div class="panel-title">官网中心</div>
          <div class="panel-subtitle">统一处理官网访客实时消息、曝光审核记录和商务合作线索。</div>
        </div>
        <div class="panel-actions">
          <el-button size="small" @click="refreshCurrent">刷新当前页</el-button>
        </div>
      </div>

      <el-tabs v-model="activeTab" class="official-center-tabs">
        <el-tab-pane label="官网客服" name="support">
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
                    <el-option label="进行中" value="open" />
                    <el-option label="已关闭" value="closed" />
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
                      <el-option label="进行中" value="open" />
                      <el-option label="已关闭" value="closed" />
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

                <div ref="adminMessageListRef" class="support-messages" v-loading="supportMessagesLoading">
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
                    v-model="supportReply"
                    type="textarea"
                    :rows="4"
                    resize="none"
                    maxlength="500"
                    show-word-limit
                    placeholder="输入回复内容"
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
        </el-tab-pane>

        <el-tab-pane label="曝光审核" name="exposures">
          <div class="center-tab-shell">
            <div class="center-tab-head">
              <div>
                <div class="center-tab-title">曝光审核与处理</div>
                <div class="center-tab-subtitle">审核通过后会在官网曝光板展示，处理完成后保留 30 天自动下线。</div>
              </div>
            </div>

            <div class="table-toolbar center-toolbar">
              <el-select v-model="exposureFilters.review_status" size="small" clearable placeholder="审核状态">
                <el-option label="待审核" value="pending" />
                <el-option label="已通过" value="approved" />
                <el-option label="已驳回" value="rejected" />
              </el-select>
              <el-select v-model="exposureFilters.process_status" size="small" clearable placeholder="处理状态">
                <el-option label="未处理" value="unresolved" />
                <el-option label="处理中" value="processing" />
                <el-option label="已处理" value="resolved" />
              </el-select>
              <el-button size="small" @click="loadExposures">筛选</el-button>
            </div>

            <div class="table-card">
              <el-table :data="exposures" size="small" stripe v-loading="exposureLoading">
                <el-table-column prop="content" label="问题描述" min-width="220" show-overflow-tooltip />
                <el-table-column label="金额" width="110">
                  <template #default="{ row }">¥{{ formatCurrency(row.amount) }}</template>
                </el-table-column>
                <el-table-column prop="contact_phone" label="联系电话" width="150" />
                <el-table-column label="审核" width="110">
                  <template #default="{ row }">
                    <el-tag :type="reviewTagType(row.review_status)" size="small">{{ reviewLabel(row.review_status) }}</el-tag>
                  </template>
                </el-table-column>
                <el-table-column label="处理" width="110">
                  <template #default="{ row }">
                    <el-tag :type="processTagType(row.process_status)" size="small">{{ processLabel(row.process_status) }}</el-tag>
                  </template>
                </el-table-column>
                <el-table-column prop="created_at" label="提交时间" width="170">
                  <template #default="{ row }">{{ formatDateTime(row.created_at) }}</template>
                </el-table-column>
                <el-table-column prop="handled_at" label="处理完成" width="170">
                  <template #default="{ row }">{{ formatDateTime(row.handled_at) }}</template>
                </el-table-column>
                <el-table-column label="操作" width="90" fixed="right">
                  <template #default="{ row }">
                    <el-button type="primary" link size="small" @click="openExposureDialog(row)">处理</el-button>
                  </template>
                </el-table-column>
                <template #empty>
                  <el-empty description="暂无曝光记录" :image-size="80" />
                </template>
              </el-table>
            </div>
          </div>
        </el-tab-pane>

        <el-tab-pane label="商务合作" name="cooperation">
          <div class="center-tab-shell">
            <div class="center-tab-head">
              <div>
                <div class="center-tab-title">官网商务合作线索</div>
                <div class="center-tab-subtitle">官网提交的合作方向、联系方式和备注都集中在这里持续跟进。</div>
              </div>
            </div>

            <div class="table-toolbar center-toolbar">
              <el-select v-model="cooperationFilters.status" size="small" clearable placeholder="跟进状态">
                <el-option label="待处理" value="pending" />
                <el-option label="处理中" value="processing" />
                <el-option label="已完成" value="done" />
              </el-select>
              <el-button size="small" @click="loadCooperations">筛选</el-button>
            </div>

            <div class="table-card">
              <el-table :data="cooperations" size="small" stripe v-loading="cooperationLoading">
                <el-table-column prop="contact_name" label="昵称" width="120" />
                <el-table-column prop="contact_phone" label="联系方式" width="180" />
                <el-table-column prop="description" label="合作方向" min-width="260" show-overflow-tooltip />
                <el-table-column prop="created_at" label="提交时间" width="170">
                  <template #default="{ row }">{{ formatDateTime(row.created_at) }}</template>
                </el-table-column>
                <el-table-column label="状态" width="150">
                  <template #default="{ row }">
                    <el-select v-model="row.status" size="small">
                      <el-option label="待处理" value="pending" />
                      <el-option label="处理中" value="processing" />
                      <el-option label="已完成" value="done" />
                    </el-select>
                  </template>
                </el-table-column>
                <el-table-column label="备注" min-width="220">
                  <template #default="{ row }">
                    <el-input v-model="row.admin_remark" size="small" maxlength="200" placeholder="管理员备注" />
                  </template>
                </el-table-column>
                <el-table-column label="操作" width="90" fixed="right">
                  <template #default="{ row }">
                    <el-button type="primary" link size="small" @click="saveCooperation(row)">保存</el-button>
                  </template>
                </el-table-column>
                <template #empty>
                  <el-empty description="暂无官网商务合作线索" :image-size="80" />
                </template>
              </el-table>
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>
    </div>

    <el-dialog v-model="exposureDialogVisible" title="曝光审核与处理" width="760px">
      <div class="exposure-dialog" v-if="exposureDraft.id">
        <div class="dialog-meta-row">
          <span>提交时间：{{ formatDateTime(exposureDraft.created_at) }}</span>
          <span>联系电话：{{ exposureDraft.contact_phone }}</span>
        </div>
        <div class="dialog-content-block">
          <strong>问题描述</strong>
          <p>{{ exposureDraft.content }}</p>
        </div>
        <div class="dialog-content-block">
          <strong>诉求</strong>
          <p>{{ exposureDraft.appeal }}</p>
        </div>
        <div class="dialog-meta-row">
          <span>涉及金额：¥{{ formatCurrency(exposureDraft.amount) }}</span>
          <span>处理完成：{{ formatDateTime(exposureDraft.handled_at) }}</span>
        </div>
        <div v-if="exposureDraft.photo_urls?.length" class="dialog-photos">
          <el-image
            v-for="photo in exposureDraft.photo_urls"
            :key="photo"
            :src="photo"
            fit="cover"
            :preview-src-list="exposureDraft.photo_urls"
            preview-teleported
          />
        </div>

        <div class="dialog-form-grid">
          <el-form-item label="审核状态">
            <el-select v-model="exposureDraft.review_status">
              <el-option label="待审核" value="pending" />
              <el-option label="已通过" value="approved" />
              <el-option label="已驳回" value="rejected" />
            </el-select>
          </el-form-item>
          <el-form-item label="处理状态">
            <el-select v-model="exposureDraft.process_status">
              <el-option label="未处理" value="unresolved" />
              <el-option label="处理中" value="processing" />
              <el-option label="已处理" value="resolved" />
            </el-select>
          </el-form-item>
        </div>

        <el-form-item label="审核备注">
          <el-input
            v-model="exposureDraft.review_remark"
            type="textarea"
            :rows="3"
            resize="none"
            maxlength="300"
            show-word-limit
          />
        </el-form-item>

        <el-form-item label="处理备注">
          <el-input
            v-model="exposureDraft.process_remark"
            type="textarea"
            :rows="3"
            resize="none"
            maxlength="300"
            show-word-limit
          />
        </el-form-item>
      </div>

      <template #footer>
        <el-button size="small" @click="exposureDialogVisible = false">取消</el-button>
        <el-button size="small" type="primary" :loading="exposureSaving" @click="saveExposure">保存处理结果</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
import socketService from '@/utils/socket';
import {
  appendAdminOfficialSiteSupportMessage,
  extractErrorMessage,
  formatCurrency,
  formatDateTime,
  getAdminOfficialSiteSupportMessages,
  listAdminOfficialSiteCooperations,
  listAdminOfficialSiteExposures,
  listAdminOfficialSiteSupportSessions,
  updateAdminOfficialSiteCooperation,
  updateAdminOfficialSiteExposure,
  updateAdminOfficialSiteSupportSession
} from '@/utils/officialSiteApi';
import {
  OFFICIAL_SITE_SUPPORT_MESSAGE_EVENT,
  OFFICIAL_SITE_SUPPORT_SESSION_EVENT
} from '@/utils/officialSiteRealtime';

const POLL_INTERVAL_MS = 20000;
const READ_SYNC_DELAY_MS = 320;
const NOTIFY_NAMESPACE = '/notify';

const activeTab = ref('support');

const supportLoading = ref(false);
const supportMessagesLoading = ref(false);
const supportSaving = ref(false);
const supportSending = ref(false);
const supportRealtimeConnected = ref(false);
const supportSessions = ref([]);
const selectedSupportId = ref('');
const selectedSupportSession = ref(null);
const supportMessages = ref([]);
const supportReply = ref('');
const adminMessageListRef = ref(null);
const supportFilters = reactive({
  status: '',
  search: ''
});

const exposureLoading = ref(false);
const exposureSaving = ref(false);
const exposures = ref([]);
const exposureFilters = reactive({
  review_status: '',
  process_status: ''
});
const exposureDialogVisible = ref(false);
const exposureDraft = reactive(createExposureDraft());

const cooperationLoading = ref(false);
const cooperations = ref([]);
const cooperationFilters = reactive({
  status: ''
});

const supportSummaryCards = computed(() => {
  const sessions = Array.isArray(supportSessions.value) ? supportSessions.value : [];
  const openCount = sessions.filter((item) => item?.status !== 'closed').length;
  const unreadCount = sessions.reduce((total, item) => total + Number(item?.unread_admin_count || 0), 0);
  return [
    {
      label: '实时链路',
      value: supportRealtimeConnected.value ? '在线' : '兜底',
      desc: supportRealtimeConnected.value ? '官网客服新消息即时推送。' : '当前改为自动轮询同步。'
    },
    {
      label: '进行中会话',
      value: String(openCount),
      desc: '当前仍在推进中的官网客服会话数量。'
    },
    {
      label: '待看消息',
      value: String(unreadCount),
      desc: '来自官网访客、后台尚未查看的未读消息数。'
    },
    {
      label: '当前选中',
      value: selectedSupportSession.value?.nickname || '待选择',
      desc: '选择会话后可直接查看消息、改状态和发送回复。'
    }
  ];
});

let supportPollTimer = 0;
let supportReadSyncTimer = 0;
let supportRefreshTimer = 0;
let supportNotifySocket = null;

onMounted(() => {
  refreshCurrent();
  startSupportPolling();
  void connectSupportRealtime();
});

onBeforeUnmount(() => {
  stopSupportPolling();
  clearSupportReadSyncTimer();
  clearSupportRefreshTimer();
  disconnectSupportRealtime();
});

watch(activeTab, (tab) => {
  refreshCurrent();
  if (tab === 'support') {
    startSupportPolling();
    return;
  }
  stopSupportPolling();
});

watch(supportMessages, async () => {
  await nextTick();
  if (adminMessageListRef.value) {
    adminMessageListRef.value.scrollTop = adminMessageListRef.value.scrollHeight;
  }
});

function refreshCurrent() {
  if (activeTab.value === 'support') {
    void loadSupportSessions();
    return;
  }
  if (activeTab.value === 'exposures') {
    void loadExposures();
    return;
  }
  void loadCooperations();
}

function startSupportPolling() {
  stopSupportPolling();
  supportPollTimer = window.setInterval(() => {
    if (activeTab.value !== 'support') return;
    void loadSupportSessions(true);
    if (selectedSupportId.value) {
      void loadSelectedSupportMessages(true);
    }
  }, POLL_INTERVAL_MS);
}

function stopSupportPolling() {
  if (supportPollTimer) {
    window.clearInterval(supportPollTimer);
    supportPollTimer = 0;
  }
}

async function connectSupportRealtime() {
  try {
    supportNotifySocket = await socketService.connect(NOTIFY_NAMESPACE);
    if (!supportNotifySocket) {
      supportRealtimeConnected.value = false;
      return;
    }

    supportRealtimeConnected.value = Boolean(supportNotifySocket.connected);
    supportNotifySocket.on('connect', handleSupportSocketConnect);
    supportNotifySocket.on('disconnect', handleSupportSocketDisconnect);
    supportNotifySocket.on('connect_error', handleSupportSocketError);
    socketService.on(OFFICIAL_SITE_SUPPORT_MESSAGE_EVENT, handleSupportRealtimeMessage, NOTIFY_NAMESPACE);
    socketService.on(OFFICIAL_SITE_SUPPORT_SESSION_EVENT, handleSupportRealtimeSession, NOTIFY_NAMESPACE);
  } catch (_error) {
    supportRealtimeConnected.value = false;
  }
}

function disconnectSupportRealtime() {
  socketService.off(OFFICIAL_SITE_SUPPORT_MESSAGE_EVENT, handleSupportRealtimeMessage, NOTIFY_NAMESPACE);
  socketService.off(OFFICIAL_SITE_SUPPORT_SESSION_EVENT, handleSupportRealtimeSession, NOTIFY_NAMESPACE);
  if (supportNotifySocket) {
    supportNotifySocket.off('connect', handleSupportSocketConnect);
    supportNotifySocket.off('disconnect', handleSupportSocketDisconnect);
    supportNotifySocket.off('connect_error', handleSupportSocketError);
    supportNotifySocket = null;
  }
  socketService.disconnect(NOTIFY_NAMESPACE);
  supportRealtimeConnected.value = false;
}

function handleSupportSocketConnect() {
  supportRealtimeConnected.value = true;
}

function handleSupportSocketDisconnect() {
  supportRealtimeConnected.value = false;
}

function handleSupportSocketError() {
  supportRealtimeConnected.value = false;
}

function clearSupportReadSyncTimer() {
  if (supportReadSyncTimer) {
    window.clearTimeout(supportReadSyncTimer);
    supportReadSyncTimer = 0;
  }
}

function clearSupportRefreshTimer() {
  if (supportRefreshTimer) {
    window.clearTimeout(supportRefreshTimer);
    supportRefreshTimer = 0;
  }
}

function scheduleSupportSessionsRefresh() {
  clearSupportRefreshTimer();
  supportRefreshTimer = window.setTimeout(() => {
    supportRefreshTimer = 0;
    if (activeTab.value === 'support') {
      void loadSupportSessions(true);
    }
  }, 220);
}

function scheduleSelectedSupportSync() {
  if (!selectedSupportId.value || activeTab.value !== 'support') {
    return;
  }
  clearSupportReadSyncTimer();
  supportReadSyncTimer = window.setTimeout(() => {
    supportReadSyncTimer = 0;
    void loadSelectedSupportMessages(true);
  }, READ_SYNC_DELAY_MS);
}

function handleSupportRealtimeMessage(payload) {
  const sessionPayload = payload?.session || null;
  if (!sessionPayload?.id) {
    return;
  }

  upsertSupportSession(sessionPayload);
  if (selectedSupportId.value === sessionPayload.id) {
    selectedSupportSession.value = mergeSupportSessionPayload(selectedSupportSession.value, sessionPayload);
    if (payload?.message) {
      supportMessages.value = mergeSupportMessages(supportMessages.value, [payload.message]);
    }
    if (payload?.message?.sender_type === 'visitor') {
      scheduleSelectedSupportSync();
    }
  }

  scheduleSupportSessionsRefresh();
}

function handleSupportRealtimeSession(payload) {
  const sessionPayload = payload?.session || null;
  if (!sessionPayload?.id) {
    return;
  }

  upsertSupportSession(sessionPayload);
  if (selectedSupportId.value === sessionPayload.id) {
    selectedSupportSession.value = mergeSupportSessionPayload(selectedSupportSession.value, sessionPayload);
  }

  scheduleSupportSessionsRefresh();
}

async function loadSupportSessions(silent = false) {
  if (!silent) {
    supportLoading.value = true;
  }
  try {
    const data = await listAdminOfficialSiteSupportSessions({
      status: supportFilters.status || undefined,
      search: supportFilters.search || undefined,
      limit: 50
    });
    supportSessions.value = Array.isArray(data.records) ? data.records : [];

    if (selectedSupportId.value) {
      const stillExists = supportSessions.value.some((item) => item.id === selectedSupportId.value);
      if (!stillExists) {
        selectedSupportId.value = '';
        selectedSupportSession.value = null;
        supportMessages.value = [];
      } else {
        const selectedFromList = supportSessions.value.find((item) => item.id === selectedSupportId.value);
        selectedSupportSession.value = mergeSupportSessionPayload(selectedSupportSession.value, selectedFromList);
      }
    }

    if (!selectedSupportId.value && supportSessions.value.length > 0) {
      selectedSupportId.value = supportSessions.value[0].id;
      await loadSelectedSupportMessages(true);
    }
  } catch (error) {
    if (!silent) {
      ElMessage.error(extractErrorMessage(error, '官网客服会话加载失败'));
    }
  } finally {
    supportLoading.value = false;
  }
}

async function selectSupportSession(id) {
  if (!id || id === selectedSupportId.value) return;
  selectedSupportId.value = id;
  await loadSelectedSupportMessages();
}

async function loadSelectedSupportMessages(silent = false) {
  if (!selectedSupportId.value) return;
  if (!silent) {
    supportMessagesLoading.value = true;
  }
  try {
    const data = await getAdminOfficialSiteSupportMessages(selectedSupportId.value);
    selectedSupportSession.value = data?.session || null;
    supportMessages.value = Array.isArray(data?.messages) ? data.messages : [];
    upsertSupportSession(selectedSupportSession.value);
  } catch (error) {
    if (!silent) {
      ElMessage.error(extractErrorMessage(error, '官网客服消息加载失败'));
    }
  } finally {
    supportMessagesLoading.value = false;
  }
}

async function saveSupportSession() {
  if (!selectedSupportSession.value?.id) return;
  supportSaving.value = true;
  try {
    const data = await updateAdminOfficialSiteSupportSession(selectedSupportSession.value.id, {
      status: selectedSupportSession.value.status,
      admin_remark: selectedSupportSession.value.admin_remark || ''
    });
    selectedSupportSession.value = {
      ...selectedSupportSession.value,
      ...data
    };
    await loadSupportSessions(true);
    ElMessage.success('会话状态已保存');
  } catch (error) {
    ElMessage.error(extractErrorMessage(error, '保存会话失败'));
  } finally {
    supportSaving.value = false;
  }
}

async function sendSupportReply() {
  const content = supportReply.value.trim();
  if (!content || !selectedSupportId.value) {
    return;
  }
  supportSending.value = true;
  try {
    await appendAdminOfficialSiteSupportMessage(selectedSupportId.value, { content });
    supportReply.value = '';
    await loadSelectedSupportMessages(true);
    await loadSupportSessions(true);
    ElMessage.success('回复已发送');
  } catch (error) {
    ElMessage.error(extractErrorMessage(error, '发送回复失败'));
  } finally {
    supportSending.value = false;
  }
}

async function loadExposures() {
  exposureLoading.value = true;
  try {
    const data = await listAdminOfficialSiteExposures({
      review_status: exposureFilters.review_status || undefined,
      process_status: exposureFilters.process_status || undefined,
      limit: 50
    });
    exposures.value = Array.isArray(data.records) ? data.records : [];
  } catch (error) {
    ElMessage.error(extractErrorMessage(error, '曝光记录加载失败'));
  } finally {
    exposureLoading.value = false;
  }
}

function openExposureDialog(row) {
  Object.assign(exposureDraft, createExposureDraft(), {
    ...row,
    photo_urls: Array.isArray(row.photo_urls) ? [...row.photo_urls] : []
  });
  exposureDialogVisible.value = true;
}

async function saveExposure() {
  if (!exposureDraft.id) return;
  exposureSaving.value = true;
  try {
    await updateAdminOfficialSiteExposure(exposureDraft.id, {
      review_status: exposureDraft.review_status,
      review_remark: exposureDraft.review_remark,
      process_status: exposureDraft.process_status,
      process_remark: exposureDraft.process_remark
    });
    exposureDialogVisible.value = false;
    await loadExposures();
    ElMessage.success('曝光处理结果已保存');
  } catch (error) {
    ElMessage.error(extractErrorMessage(error, '曝光处理保存失败'));
  } finally {
    exposureSaving.value = false;
  }
}

async function loadCooperations() {
  cooperationLoading.value = true;
  try {
    const data = await listAdminOfficialSiteCooperations({
      status: cooperationFilters.status || undefined,
      limit: 50
    });
    cooperations.value = Array.isArray(data.records) ? data.records : [];
  } catch (error) {
    ElMessage.error(extractErrorMessage(error, '官网商务合作加载失败'));
  } finally {
    cooperationLoading.value = false;
  }
}

async function saveCooperation(row) {
  try {
    await updateAdminOfficialSiteCooperation(row.id, {
      status: row.status,
      remark: row.admin_remark || ''
    });
    ElMessage.success('合作线索状态已更新');
  } catch (error) {
    ElMessage.error(extractErrorMessage(error, '更新失败'));
    await loadCooperations();
  }
}

function createExposureDraft() {
  return {
    id: '',
    content: '',
    amount: 0,
    appeal: '',
    contact_phone: '',
    photo_urls: [],
    review_status: 'pending',
    review_remark: '',
    process_status: 'unresolved',
    process_remark: '',
    created_at: '',
    handled_at: ''
  };
}

function reviewLabel(status) {
  if (status === 'approved') return '已通过';
  if (status === 'rejected') return '已驳回';
  return '待审核';
}

function reviewTagType(status) {
  if (status === 'approved') return 'success';
  if (status === 'rejected') return 'danger';
  return 'warning';
}

function processLabel(status) {
  if (status === 'resolved') return '已处理';
  if (status === 'processing') return '处理中';
  return '未处理';
}

function processTagType(status) {
  if (status === 'resolved') return 'success';
  if (status === 'processing') return 'warning';
  return 'danger';
}

function mergeSupportSessionPayload(currentValue, payload) {
  if (!payload || typeof payload !== 'object') {
    return currentValue || null;
  }
  return {
    ...(currentValue || {}),
    ...payload
  };
}

function upsertSupportSession(payload) {
  if (!payload?.id) {
    return;
  }

  const records = Array.isArray(supportSessions.value) ? [...supportSessions.value] : [];
  const index = records.findIndex((item) => item.id === payload.id);
  if (index >= 0) {
    records[index] = {
      ...records[index],
      ...payload
    };
  } else {
    records.unshift(payload);
  }

  records.sort(compareSupportSessions);
  supportSessions.value = records;
}

function compareSupportSessions(left, right) {
  const leftTime = Date.parse(left?.last_message_at || left?.created_at || '') || 0;
  const rightTime = Date.parse(right?.last_message_at || right?.created_at || '') || 0;
  if (leftTime !== rightTime) {
    return rightTime - leftTime;
  }
  return String(left?.id || '').localeCompare(String(right?.id || ''));
}

function mergeSupportMessages(existing, incoming) {
  const merged = new Map();
  [...(Array.isArray(existing) ? existing : []), ...(Array.isArray(incoming) ? incoming : [])].forEach((item) => {
    if (!item || typeof item !== 'object') {
      return;
    }
    merged.set(supportMessageKey(item), item);
  });
  return Array.from(merged.values()).sort(compareSupportMessages);
}

function supportMessageKey(message) {
  if (message?.id) return `id:${message.id}`;
  if (message?.legacy_id) return `legacy:${message.legacy_id}`;
  return `${message?.sender_type || 'unknown'}:${message?.created_at || ''}:${message?.content || ''}`;
}

function compareSupportMessages(left, right) {
  const leftTime = Date.parse(left?.created_at || '') || 0;
  const rightTime = Date.parse(right?.created_at || '') || 0;
  if (leftTime !== rightTime) {
    return leftTime - rightTime;
  }
  return supportMessageKey(left).localeCompare(supportMessageKey(right));
}
</script>

<style scoped>
.official-site-center-page {
  display: grid;
  gap: 16px;
}

.official-site-center-hero {
  display: grid;
  grid-template-columns: minmax(0, 1.06fr) minmax(340px, 0.94fr);
  gap: 16px;
  padding: 24px 26px;
  border-radius: 24px;
  background:
    radial-gradient(circle at top right, rgba(37, 99, 235, 0.18), transparent 26%),
    linear-gradient(135deg, #0f1f34 0%, #17365a 100%);
  color: #ffffff;
  box-shadow: 0 22px 48px rgba(15, 31, 52, 0.2);
}

.official-site-center-copy {
  display: grid;
  align-content: center;
}

.center-kicker {
  display: inline-flex;
  align-items: center;
  width: fit-content;
  padding: 7px 12px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.1);
  color: #9be7ff;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.official-site-center-copy h2 {
  margin: 14px 0 0;
  font-size: 32px;
  line-height: 1.18;
}

.official-site-center-copy p {
  margin: 12px 0 0;
  color: rgba(255, 255, 255, 0.74);
  line-height: 1.8;
}

.center-summary-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.center-summary-card {
  padding: 18px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(16px);
  display: grid;
  gap: 8px;
}

.center-summary-card small {
  color: rgba(255, 255, 255, 0.62);
  font-size: 12px;
}

.center-summary-card strong {
  color: #ffffff;
  font-size: 22px;
  line-height: 1.15;
}

.center-summary-card span {
  color: rgba(255, 255, 255, 0.72);
  font-size: 12px;
  line-height: 1.7;
}

.official-site-center-panel {
  min-height: 72vh;
  border-radius: 22px;
  border: 1px solid rgba(0, 0, 0, 0.05);
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.06);
}

.official-site-panel-header {
  align-items: flex-start;
}

.panel-subtitle {
  margin-top: 6px;
  color: #64748b;
  font-size: 13px;
  line-height: 1.7;
}

.official-center-tabs :deep(.el-tabs__header) {
  margin-bottom: 18px;
}

.official-center-tabs :deep(.el-tabs__nav-wrap::after) {
  height: 1px;
  background: #e6edf6;
}

.official-center-tabs :deep(.el-tabs__item) {
  height: 40px;
  padding: 0 18px;
  font-weight: 700;
}

.support-console {
  display: grid;
  grid-template-columns: 340px 1fr;
  gap: 18px;
}

.support-sidebar,
.support-detail,
.table-card {
  border: 1px solid #e6edf6;
  border-radius: 20px;
  background: #ffffff;
}

.support-sidebar {
  overflow: hidden;
}

.support-sidebar-head {
  padding: 16px;
  border-bottom: 1px solid #e6edf6;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.support-sidebar-title,
.center-tab-title,
.support-reply-title {
  font-size: 18px;
  font-weight: 800;
  color: #0f172a;
}

.support-sidebar-subtitle,
.center-tab-subtitle,
.support-reply-subtitle {
  margin-top: 6px;
  color: #64748b;
  font-size: 12px;
  line-height: 1.7;
}

.support-toolbar {
  padding: 14px 16px;
  display: grid;
  gap: 10px;
  border-bottom: 1px solid #edf2f8;
  background: #f8fbff;
}

.support-toolbar-row,
.support-session-top,
.support-session-meta,
.support-detail-header,
.support-detail-meta,
.support-detail-actions,
.support-reply-actions,
.table-toolbar,
.dialog-meta-row,
.support-reply-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.support-toolbar-note {
  color: #64748b;
  font-size: 12px;
  line-height: 1.7;
}

.support-session-list {
  height: 68vh;
  overflow-y: auto;
  padding: 12px;
  display: grid;
  gap: 10px;
  background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
}

.support-session-card {
  width: 100%;
  text-align: left;
  border: 1px solid #e6edf6;
  border-radius: 18px;
  background: #ffffff;
  padding: 14px;
  cursor: pointer;
  transition: all 0.18s ease;
}

.support-session-card:hover,
.support-session-card.active {
  border-color: rgba(37, 99, 235, 0.26);
  box-shadow: 0 14px 28px rgba(37, 99, 235, 0.08);
  transform: translateY(-1px);
}

.support-session-title-wrap strong {
  display: block;
  color: #0f172a;
  font-size: 15px;
}

.support-session-title-wrap span,
.support-session-preview,
.support-session-meta,
.support-detail-meta,
.support-message-time,
.dialog-meta-row {
  color: #64748b;
  font-size: 12px;
}

.support-session-title-wrap span {
  display: block;
  margin-top: 6px;
}

.support-session-badges {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.support-unread {
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  border-radius: 999px;
  background: #dc2626;
  color: #fff;
  font-size: 12px;
  line-height: 20px;
  text-align: center;
  font-weight: 700;
}

.support-session-preview {
  margin-top: 10px;
  line-height: 1.75;
}

.support-session-meta {
  margin-top: 12px;
}

.support-detail {
  padding: 16px;
  display: grid;
  gap: 14px;
  background: linear-gradient(180deg, #ffffff 0%, #fbfdff 100%);
}

.support-detail-title-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.support-detail-title {
  font-size: 20px;
  font-weight: 800;
  color: #0f172a;
}

.support-remark-card {
  display: grid;
  gap: 10px;
  padding: 14px 16px;
  border-radius: 18px;
  background: #f8fbff;
  border: 1px solid #e6edf6;
}

.support-remark-title {
  font-size: 13px;
  font-weight: 700;
  color: #334155;
}

.support-messages {
  height: 44vh;
  overflow-y: auto;
  padding: 16px;
  border-radius: 20px;
  background:
    radial-gradient(circle at top right, rgba(37, 99, 235, 0.08), transparent 26%),
    linear-gradient(180deg, #f3f8ff 0%, #f9fbff 100%);
}

.support-message-row {
  display: flex;
  align-items: flex-end;
  gap: 10px;
  margin-bottom: 12px;
}

.support-message-row.self {
  justify-content: flex-end;
}

.support-message-row.self .support-message-avatar {
  order: 2;
  background: linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%);
  color: #ffffff;
}

.support-message-avatar {
  flex-shrink: 0;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(15, 23, 42, 0.1);
  color: #0f172a;
  font-size: 12px;
  font-weight: 800;
}

.support-message-bubble {
  max-width: 76%;
  padding: 12px 14px;
  border-radius: 20px 20px 20px 8px;
  background: #ffffff;
  box-shadow: 0 10px 20px rgba(15, 23, 42, 0.06);
}

.support-message-row.self .support-message-bubble {
  border-radius: 20px 20px 8px 20px;
  background: linear-gradient(135deg, #0f1f34 0%, #1e3a5f 100%);
  color: #ffffff;
}

.support-message-author {
  font-size: 12px;
  font-weight: 700;
  color: #475569;
}

.support-message-row.self .support-message-author,
.support-message-row.self .support-message-time {
  color: rgba(255, 255, 255, 0.72);
}

.support-message-text {
  margin-top: 6px;
  line-height: 1.8;
  white-space: pre-wrap;
  word-break: break-word;
}

.support-reply-box {
  display: grid;
  gap: 10px;
  padding: 16px;
  border-radius: 18px;
  background: #ffffff;
  border: 1px solid #e6edf6;
}

.support-reply-actions span {
  color: #64748b;
  font-size: 12px;
  line-height: 1.7;
}

.support-detail-empty {
  display: grid;
  place-items: center;
  min-height: 380px;
}

.support-detail-empty-card {
  max-width: 420px;
  text-align: center;
  padding: 32px 28px;
  border-radius: 24px;
  background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
  border: 1px dashed #dbe6f5;
}

.support-detail-empty-card h3 {
  margin: 0;
  color: #0f172a;
  font-size: 24px;
}

.support-detail-empty-card p {
  margin: 12px 0 0;
  color: #64748b;
  line-height: 1.8;
}

.center-tab-shell {
  display: grid;
  gap: 14px;
}

.center-toolbar {
  margin-bottom: 0;
}

.table-card {
  overflow: hidden;
}

.exposure-dialog {
  display: grid;
  gap: 16px;
}

.dialog-content-block {
  padding: 14px 16px;
  border-radius: 16px;
  background: #f8fbff;
}

.dialog-content-block strong {
  color: #0f172a;
}

.dialog-content-block p {
  margin: 10px 0 0;
  line-height: 1.8;
  color: #475569;
  white-space: pre-wrap;
}

.dialog-photos {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 10px;
}

.dialog-photos :deep(.el-image) {
  width: 100%;
  height: 120px;
  border-radius: 14px;
  overflow: hidden;
}

.dialog-form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

@media (max-width: 1180px) {
  .official-site-center-hero,
  .support-console {
    grid-template-columns: 1fr;
  }

  .center-summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .support-session-list {
    height: auto;
    max-height: 320px;
  }
}

@media (max-width: 768px) {
  .official-site-center-hero {
    padding: 18px;
  }

  .official-site-center-copy h2 {
    font-size: 26px;
  }

  .center-summary-grid,
  .dialog-form-grid {
    grid-template-columns: 1fr;
  }

  .support-messages {
    height: 320px;
  }

  .support-message-bubble {
    max-width: 84%;
  }
}
</style>
