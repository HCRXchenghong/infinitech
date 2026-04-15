<template>
  <div class="page rtc-console-page">
    <div class="title-row">
      <div>
        <div class="title">RTC 管理台</div>
        <div class="title-subtitle">
          面向管理端的独立 RTC 工作台。这里可以搜索站内联系人、直接发起语音、查看当前通话状态，并快速回看最近审计记录。
        </div>
      </div>
      <div class="title-actions">
        <el-tag :type="adminRTCState.bridgeConnected ? 'success' : 'warning'" effect="light">
          {{ adminRTCState.bridgeConnected ? 'RTC 信令已连接' : 'RTC 信令未连接' }}
        </el-tag>
        <el-tag :type="adminRTCState.mediaSupported ? 'success' : 'info'" effect="light">
          {{ adminRTCState.mediaSupported ? '支持 WebRTC 音频' : '当前仅支持信令与审计' }}
        </el-tag>
        <el-button @click="goToChatConsole">客服工作台</el-button>
        <el-button type="primary" plain @click="goToAudits">查看审计</el-button>
      </div>
    </div>

    <div class="summary-grid">
      <div class="summary-card">
        <div class="summary-label">最近记录</div>
        <div class="summary-value">{{ auditSummary.total }}</div>
      </div>
      <div class="summary-card">
        <div class="summary-label">已接通</div>
        <div class="summary-value success">{{ auditSummary.accepted }}</div>
      </div>
      <div class="summary-card">
        <div class="summary-label">已结束</div>
        <div class="summary-value primary">{{ auditSummary.ended }}</div>
      </div>
      <div class="summary-card">
        <div class="summary-label">投诉中</div>
        <div class="summary-value warning">{{ auditSummary.complaints }}</div>
      </div>
    </div>

    <div class="console-grid">
      <el-card class="card search-card">
        <template #header>
          <div class="card-header">
            <span>站内联系人搜索</span>
            <el-button size="small" :loading="targetsLoading" @click="searchTargets">搜索</el-button>
          </div>
        </template>

        <div class="search-toolbar">
          <el-input
            v-model.trim="searchForm.keyword"
            clearable
            placeholder="姓名 / 手机号 / Chat ID / Legacy ID"
            @keyup.enter="searchTargets"
          />
          <el-select v-model="searchForm.role" clearable placeholder="角色筛选">
            <el-option label="全部角色" value="" />
            <el-option label="用户" value="user" />
            <el-option label="商户" value="merchant" />
            <el-option label="骑手" value="rider" />
          </el-select>
        </div>

        <PageStateAlert :message="targetsError" />

        <div class="search-results" v-loading="targetsLoading">
          <div v-if="filteredTargets.length === 0" class="empty-state">
            {{ searchForm.keyword ? '没有搜到可用的 RTC 联系人' : '输入关键词后可搜索用户 / 商户 / 骑手' }}
          </div>

          <button
            v-for="target in filteredTargets"
            :key="target.resultKey"
            type="button"
            class="target-item"
            :class="{ active: selectedTarget?.resultKey === target.resultKey }"
            @click="selectTarget(target)"
          >
            <div class="target-top">
              <div class="target-name">{{ target.name || target.phone || target.chatId || '未命名联系人' }}</div>
              <el-tag size="small" effect="light">{{ roleLabel(target.role) }}</el-tag>
            </div>
            <div class="target-meta">
              <span v-if="target.phone">{{ target.phone }}</span>
              <span v-if="target.legacyId">Legacy {{ target.legacyId }}</span>
              <span v-if="target.chatId">Chat {{ target.chatId }}</span>
            </div>
          </button>
        </div>
      </el-card>

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

      <el-card class="card status-card">
        <template #header>
          <div class="card-header">
            <span>当前通话状态</span>
            <el-button size="small" :loading="auditsLoading" @click="loadRecentAudits">刷新记录</el-button>
          </div>
        </template>

        <div class="status-hero">
          <div class="status-title">{{ adminRTCState.statusText }}</div>
          <div class="status-hint">{{ adminRTCState.statusHint }}</div>
        </div>

        <div class="status-grid">
          <div class="status-item">
            <span class="status-label">通话 ID</span>
            <span class="status-value">{{ adminRTCState.callId || '--' }}</span>
          </div>
          <div class="status-item">
            <span class="status-label">当前模式</span>
            <span class="status-value">{{ adminRTCState.mode === 'incoming' ? '来电' : '呼出' }}</span>
          </div>
          <div class="status-item">
            <span class="status-label">目标角色</span>
            <span class="status-value">{{ adminRTCState.targetRole ? roleLabel(adminRTCState.targetRole) : '--' }}</span>
          </div>
          <div class="status-item">
            <span class="status-label">目标信息</span>
            <span class="status-value">{{ currentTargetText }}</span>
          </div>
          <div class="status-item">
            <span class="status-label">媒体状态</span>
            <span class="status-value">{{ adminRTCState.mediaStatusText }}</span>
          </div>
          <div class="status-item">
            <span class="status-label">会话 / 订单</span>
            <span class="status-value">{{ currentBizText }}</span>
          </div>
        </div>

        <div v-if="adminRTCState.errorMessage" class="status-error">
          {{ adminRTCState.errorMessage }}
        </div>

        <div class="status-actions">
          <el-button
            v-if="showReject"
            :disabled="adminRTCState.busy"
            @click="handleReject"
          >
            拒绝
          </el-button>
          <el-button
            v-if="showCancel"
            :disabled="adminRTCState.busy"
            @click="handleCancel"
          >
            取消呼叫
          </el-button>
          <el-button
            v-if="showAccept"
            type="primary"
            :loading="adminRTCState.busy"
            @click="handleAccept"
          >
            接听
          </el-button>
          <el-button
            v-if="showEnd"
            type="danger"
            :loading="adminRTCState.busy"
            @click="handleEnd"
          >
            挂断
          </el-button>
          <el-button
            v-if="canCloseCurrentCall"
            @click="handleCloseCall"
          >
            关闭状态
          </el-button>
        </div>
      </el-card>
    </div>

    <el-card class="card history-card">
      <template #header>
        <div class="card-header">
          <span>最近 RTC 通话记录</span>
          <div class="history-actions">
            <el-button size="small" @click="loadRecentAudits" :loading="auditsLoading">刷新</el-button>
            <el-button size="small" type="primary" plain @click="goToAudits">进入通话审计</el-button>
          </div>
        </div>
      </template>

      <PageStateAlert :message="auditsError" />

      <el-table :data="recentAudits" size="small" stripe v-loading="auditsLoading">
        <el-table-column label="创建时间" width="168">
          <template #default="{ row }">
            {{ formatDateTime(row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column label="通话 ID" min-width="170" show-overflow-tooltip>
          <template #default="{ row }">
            {{ row.uid || row.id || row.call_id_raw || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="双方" min-width="230">
          <template #default="{ row }">
            <div>{{ roleLabel(row.caller_role) }} {{ row.caller_phone || row.caller_id || '-' }}</div>
            <div class="muted-text">-> {{ roleLabel(row.callee_role) }} {{ row.callee_phone || row.callee_id || '-' }}</div>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="110">
          <template #default="{ row }">
            <el-tag size="small" :type="statusTagType(row.status)">
              {{ statusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="时长" width="110">
          <template #default="{ row }">
            {{ formatDuration(row.duration_seconds) }}
          </template>
        </el-table-column>
        <el-table-column label="会话 / 订单" min-width="180">
          <template #default="{ row }">
            <div>{{ row.conversation_id || '-' }}</div>
            <div class="muted-text">{{ row.order_id || '-' }}</div>
          </template>
        </el-table-column>
        <el-table-column label="投诉" width="96">
          <template #default="{ row }">
            <el-tag size="small" :type="complaintTagType(row.complaint_status)">
              {{ complaintLabel(row.complaint_status) }}
            </el-tag>
          </template>
        </el-table-column>
        <template #empty>
          <el-empty :description="auditsError ? '加载失败，暂无可显示数据' : '暂无 RTC 通话记录'" :image-size="88" />
        </template>
      </el-table>
    </el-card>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useRouter } from 'vue-router'
import { extractRTCCallAuditPage } from '@infinitech/admin-core'
import { extractErrorMessage } from '@infinitech/contracts'

import PageStateAlert from '@/components/PageStateAlert.vue'
import {
  acceptAdminRTCCall,
  adminRTCState,
  cancelAdminRTCCall,
  canStartAdminRTCCall,
  dismissAdminRTCCallDialog,
  endAdminRTCCall,
  ensureAdminRTCBridge,
  isFinalStatus,
  isWaitingStatus,
  rejectAdminRTCCall,
  searchAdminRTCTargets,
  startAdminRTCCall,
} from '@/utils/adminRtc'

const router = useRouter()

const searchForm = reactive({
  keyword: '',
  role: '',
})

const callForm = reactive({
  conversationId: '',
  orderId: '',
  entryPoint: 'admin_rtc_console',
  scene: 'admin_support',
})

const targetsLoading = ref(false)
const targetsError = ref('')
const targets = ref([])
const selectedTarget = ref(null)
const startingCall = ref(false)

const recentAudits = ref([])
const auditsLoading = ref(false)
const auditsError = ref('')

const auditSummary = reactive({
  total: 0,
  accepted: 0,
  ended: 0,
  complaints: 0,
})

function normalizeRole(value) {
  const role = String(value || '').trim().toLowerCase()
  if (role === 'shop') return 'merchant'
  if (role === 'customer') return 'user'
  return role
}

function roleLabel(role) {
  if (normalizeRole(role) === 'user') return '用户'
  if (normalizeRole(role) === 'merchant') return '商户'
  if (normalizeRole(role) === 'rider') return '骑手'
  if (normalizeRole(role) === 'admin') return '管理员'
  return role || '-'
}

function statusLabel(value) {
  if (value === 'initiated') return '发起中'
  if (value === 'ringing') return '振铃中'
  if (value === 'accepted') return '已接通'
  if (value === 'ended') return '已结束'
  if (value === 'rejected') return '已拒接'
  if (value === 'busy') return '忙线'
  if (value === 'cancelled') return '已取消'
  if (value === 'timeout') return '超时'
  if (value === 'failed') return '失败'
  return value || '-'
}

function statusTagType(value) {
  if (value === 'accepted' || value === 'ended') return 'success'
  if (value === 'initiated' || value === 'ringing') return 'info'
  if (value === 'busy' || value === 'timeout' || value === 'failed' || value === 'rejected') return 'danger'
  if (value === 'cancelled') return 'warning'
  return ''
}

function complaintLabel(value) {
  if (value === 'none') return '无投诉'
  if (value === 'reported') return '投诉中'
  if (value === 'resolved') return '已处理'
  return value || '-'
}

function complaintTagType(value) {
  if (value === 'reported') return 'danger'
  if (value === 'resolved') return 'success'
  return 'info'
}

function formatDateTime(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')
  const second = String(date.getSeconds()).padStart(2, '0')
  return `${year}-${month}-${day} ${hour}:${minute}:${second}`
}

function formatDuration(value) {
  const numeric = Number(value || 0)
  if (!Number.isFinite(numeric) || numeric <= 0) return '0 秒'
  if (numeric < 60) return `${numeric} 秒`
  const minutes = Math.floor(numeric / 60)
  const seconds = numeric % 60
  if (minutes < 60) return seconds > 0 ? `${minutes} 分 ${seconds} 秒` : `${minutes} 分`
  const hours = Math.floor(minutes / 60)
  const remainMinutes = minutes % 60
  return remainMinutes > 0 ? `${hours} 小时 ${remainMinutes} 分` : `${hours} 小时`
}

function normalizeTarget(raw = {}) {
  const role = normalizeRole(raw.role)
  const chatId = String(raw.chatId || raw.id || raw.uid || '').trim()
  const legacyId = String(raw.legacyId || '').trim()
  return {
    resultKey: `${role}:${chatId || legacyId || raw.phone || raw.name || 'target'}`,
    role,
    chatId,
    id: String(raw.id || '').trim(),
    uid: String(raw.uid || '').trim(),
    legacyId,
    phone: String(raw.phone || '').trim(),
    name: String(raw.name || '').trim(),
    avatar: String(raw.avatar || '').trim(),
  }
}

const filteredTargets = computed(() => {
  const role = normalizeRole(searchForm.role)
  return targets.value.filter((item) => !role || item.role === role)
})

const canCallSelected = computed(() => canStartAdminRTCCall(selectedTarget.value || {}))
const currentCallActive = computed(() => Boolean(adminRTCState.callId) && !isFinalStatus(adminRTCState.status))
const currentTargetText = computed(() => {
  return adminRTCState.targetPhone || adminRTCState.targetName || adminRTCState.targetId || '--'
})
const currentBizText = computed(() => {
  return [adminRTCState.conversationId || '--', adminRTCState.orderId || '--'].join(' / ')
})

const showAccept = computed(() => {
  return adminRTCState.mode === 'incoming' && isWaitingStatus(adminRTCState.status)
})

const showReject = computed(() => {
  return adminRTCState.mode === 'incoming' && isWaitingStatus(adminRTCState.status)
})

const showCancel = computed(() => {
  return adminRTCState.mode === 'outgoing' && isWaitingStatus(adminRTCState.status)
})

const showEnd = computed(() => adminRTCState.status === 'accepted')
const canCloseCurrentCall = computed(() => !adminRTCState.callId || isFinalStatus(adminRTCState.status))

function selectTarget(target) {
  selectedTarget.value = target
  callForm.conversationId = target.chatId || ''
}

async function searchTargets() {
  if (!searchForm.keyword) {
    targets.value = []
    selectedTarget.value = null
    targetsError.value = ''
    return
  }

  targetsLoading.value = true
  targetsError.value = ''
  try {
    const list = await searchAdminRTCTargets(searchForm.keyword)
    targets.value = list
      .map((item) => normalizeTarget(item))
      .filter((item) => ['user', 'merchant', 'rider'].includes(item.role))

    if (targets.value.length > 0) {
      selectTarget(targets.value[0])
    } else {
      selectedTarget.value = null
    }
  } catch (error) {
    targets.value = []
    selectedTarget.value = null
    targetsError.value = extractErrorMessage(error, '搜索 RTC 联系人失败')
    ElMessage.error(targetsError.value)
  } finally {
    targetsLoading.value = false
  }
}

async function loadRecentAudits() {
  auditsLoading.value = true
  auditsError.value = ''
  try {
    const { data } = await request.get('/api/rtc-call-audits', {
      params: {
        page: 1,
        limit: 8,
      },
    })
    const payload = extractRTCCallAuditPage(data)
    recentAudits.value = payload.items
    const summary = payload.summary || {}
    auditSummary.total = Number(summary.total || 0)
    auditSummary.accepted = Number(summary.accepted || 0)
    auditSummary.ended = Number(summary.ended || 0)
    auditSummary.complaints = Number(summary.complaints || 0)
  } catch (error) {
    recentAudits.value = []
    auditSummary.total = 0
    auditSummary.accepted = 0
    auditSummary.ended = 0
    auditSummary.complaints = 0
    auditsError.value = extractErrorMessage(error, '加载 RTC 通话记录失败')
    ElMessage.error(auditsError.value)
  } finally {
    auditsLoading.value = false
  }
}

async function startCall() {
  if (!selectedTarget.value) {
    ElMessage.warning('请先选择联系人')
    return
  }

  startingCall.value = true
  try {
    await startAdminRTCCall({
      role: selectedTarget.value.role,
      chatId: callForm.conversationId || selectedTarget.value.chatId,
      conversationId: callForm.conversationId || selectedTarget.value.chatId,
      targetId: selectedTarget.value.id || selectedTarget.value.chatId,
      targetLegacyId: selectedTarget.value.legacyId,
      phone: selectedTarget.value.phone,
      name: selectedTarget.value.name,
      orderId: callForm.orderId,
      entryPoint: callForm.entryPoint || 'admin_rtc_console',
      scene: callForm.scene || 'admin_support',
    })
    ElMessage.success('RTC 呼叫已发起')
    await loadRecentAudits()
  } catch (error) {
    ElMessage.error(extractErrorMessage(error, '发起 RTC 呼叫失败'))
  } finally {
    startingCall.value = false
  }
}

async function handleAccept() {
  try {
    await acceptAdminRTCCall()
    ElMessage.success('已接听 RTC 通话')
  } catch (error) {
    ElMessage.error(extractErrorMessage(error, '接听 RTC 通话失败'))
  }
}

async function handleReject() {
  try {
    await rejectAdminRTCCall()
    ElMessage.success('已拒绝 RTC 来电')
  } catch (error) {
    ElMessage.error(extractErrorMessage(error, '拒绝 RTC 来电失败'))
  }
}

async function handleCancel() {
  try {
    await cancelAdminRTCCall()
    ElMessage.success('已取消 RTC 呼叫')
  } catch (error) {
    ElMessage.error(extractErrorMessage(error, '取消 RTC 呼叫失败'))
  }
}

async function handleEnd() {
  try {
    await endAdminRTCCall()
    ElMessage.success('RTC 通话已结束')
    await loadRecentAudits()
  } catch (error) {
    ElMessage.error(extractErrorMessage(error, '结束 RTC 通话失败'))
  }
}

function handleCloseCall() {
  if (!dismissAdminRTCCallDialog()) {
    ElMessage.warning('请先结束当前 RTC 通话')
    return
  }
  ElMessage.success('已关闭当前通话状态')
}

function goToAudits() {
  router.push('/rtc-call-audits')
}

function goToChatConsole() {
  router.push('/support-chat')
}

onMounted(() => {
  void ensureAdminRTCBridge()
  void loadRecentAudits()
})
</script>

<style scoped>
.rtc-console-page {
  display: grid;
  gap: 20px;
}

.title-row {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
}

.title {
  font-size: 24px;
  font-weight: 700;
  color: #0f172a;
}

.title-subtitle {
  margin-top: 8px;
  max-width: 820px;
  color: #64748b;
  line-height: 1.7;
}

.title-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: flex-end;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.summary-card {
  padding: 18px 20px;
  border-radius: 18px;
  background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
  border: 1px solid rgba(148, 163, 184, 0.22);
  box-shadow: 0 16px 32px rgba(15, 23, 42, 0.05);
}

.summary-label {
  font-size: 13px;
  color: #64748b;
}

.summary-value {
  margin-top: 10px;
  font-size: 28px;
  font-weight: 700;
  color: #0f172a;
}

.summary-value.success {
  color: #15803d;
}

.summary-value.primary {
  color: #0f766e;
}

.summary-value.warning {
  color: #b45309;
}

.console-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr) minmax(0, 1fr);
  gap: 18px;
}

.card {
  border-radius: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
}

.search-toolbar {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 120px;
  gap: 10px;
  margin-bottom: 12px;
}

.search-results {
  display: grid;
  gap: 10px;
  min-height: 280px;
}

.target-item {
  width: 100%;
  padding: 14px 16px;
  border: 1px solid rgba(203, 213, 225, 0.8);
  border-radius: 16px;
  background: #ffffff;
  text-align: left;
  cursor: pointer;
  transition: border-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
}

.target-item:hover,
.target-item.active {
  border-color: #0f766e;
  transform: translateY(-1px);
  box-shadow: 0 14px 26px rgba(15, 118, 110, 0.12);
}

.target-top {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
}

.target-name {
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
}

.target-meta {
  margin-top: 8px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px 12px;
  color: #64748b;
  font-size: 12px;
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 180px;
  padding: 20px;
  border-radius: 16px;
  background: #f8fafc;
  color: #64748b;
  text-align: center;
  line-height: 1.7;
}

.compact-empty {
  min-height: 92px;
  margin-bottom: 14px;
}

.selected-target-card {
  margin-bottom: 16px;
  padding: 16px;
  border-radius: 18px;
  background: linear-gradient(135deg, #ecfeff 0%, #f0fdf4 100%);
  border: 1px solid rgba(15, 118, 110, 0.18);
}

.selected-target-name {
  font-size: 18px;
  font-weight: 700;
  color: #0f172a;
}

.selected-target-meta {
  margin-top: 8px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px 12px;
  color: #475569;
  font-size: 13px;
}

.compose-form {
  margin-top: 12px;
}

.compose-tip {
  margin-top: 6px;
  padding: 12px 14px;
  border-radius: 14px;
  background: #f8fafc;
  color: #475569;
  font-size: 13px;
  line-height: 1.7;
}

.compose-actions {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}

.status-hero {
  padding: 16px;
  border-radius: 18px;
  background: linear-gradient(135deg, #eff6ff 0%, #f8fafc 100%);
  border: 1px solid rgba(59, 130, 246, 0.14);
}

.status-title {
  font-size: 20px;
  font-weight: 700;
  color: #0f172a;
}

.status-hint {
  margin-top: 8px;
  color: #475569;
  line-height: 1.7;
}

.status-grid {
  margin-top: 16px;
  display: grid;
  gap: 12px;
}

.status-item {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
  font-size: 13px;
}

.status-label {
  color: #64748b;
}

.status-value {
  color: #0f172a;
  font-weight: 600;
  text-align: right;
  word-break: break-all;
}

.status-error {
  margin-top: 14px;
  padding: 12px 14px;
  border-radius: 14px;
  background: #fef2f2;
  color: #b91c1c;
  line-height: 1.7;
}

.status-actions {
  margin-top: 16px;
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;
}

.history-actions {
  display: flex;
  gap: 10px;
}

.muted-text {
  color: #64748b;
}

@media (max-width: 1440px) {
  .console-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 1120px) {
  .summary-grid,
  .console-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .title-row,
  .card-header {
    flex-direction: column;
    align-items: stretch;
  }

  .search-toolbar {
    grid-template-columns: 1fr;
  }

  .title-actions,
  .history-actions,
  .compose-actions,
  .status-actions {
    justify-content: flex-start;
  }

  .status-item {
    flex-direction: column;
    gap: 6px;
  }

  .status-value {
    text-align: left;
  }
}
</style>
