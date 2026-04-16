<template>
  <div class="page rtc-call-audits-page">
    <div class="panel">
      <div class="panel-header">
        <div>
          <div class="panel-title">RTC 通话审计</div>
          <div class="panel-subtitle">
            查看 App / H5 站内语音的服务端留痕，并在后台处理投诉冻结与录音留存状态。
          </div>
        </div>
        <div class="panel-actions">
          <el-button size="small" :loading="loading" @click="loadAudits">刷新</el-button>
        </div>
      </div>

      <div class="summary-grid">
        <div class="summary-card">
          <div class="summary-label">当前筛选总数</div>
          <div class="summary-value">{{ summary.total }}</div>
        </div>
        <div class="summary-card">
          <div class="summary-label">已接通</div>
          <div class="summary-value success">{{ summary.accepted }}</div>
        </div>
        <div class="summary-card">
          <div class="summary-label">已结束</div>
          <div class="summary-value primary">{{ summary.ended }}</div>
        </div>
        <div class="summary-card">
          <div class="summary-label">异常 / 失败</div>
          <div class="summary-value danger">{{ summary.failed }}</div>
        </div>
        <div class="summary-card">
          <div class="summary-label">投诉中</div>
          <div class="summary-value warning">{{ summary.complaints }}</div>
        </div>
      </div>

      <div class="filters">
        <el-select v-model="filters.callerRole" clearable size="small" placeholder="发起方角色" style="width: 140px">
          <el-option label="用户" value="user" />
          <el-option label="商户" value="merchant" />
          <el-option label="骑手" value="rider" />
          <el-option label="管理员" value="admin" />
        </el-select>
        <el-select v-model="filters.calleeRole" clearable size="small" placeholder="接收方角色" style="width: 140px">
          <el-option label="用户" value="user" />
          <el-option label="商户" value="merchant" />
          <el-option label="骑手" value="rider" />
          <el-option label="管理员" value="admin" />
        </el-select>
        <el-select v-model="filters.status" clearable size="small" placeholder="通话状态" style="width: 140px">
          <el-option label="发起中" value="initiated" />
          <el-option label="振铃中" value="ringing" />
          <el-option label="已接通" value="accepted" />
          <el-option label="已结束" value="ended" />
          <el-option label="已拒接" value="rejected" />
          <el-option label="忙线" value="busy" />
          <el-option label="已取消" value="cancelled" />
          <el-option label="超时" value="timeout" />
          <el-option label="失败" value="failed" />
        </el-select>
        <el-select v-model="filters.clientKind" clearable size="small" placeholder="终端类型" style="width: 140px">
          <el-option label="App" value="app" />
          <el-option label="H5" value="h5" />
          <el-option label="uni-user" value="uni-user" />
          <el-option label="uni-app-mobile" value="uni-app-mobile" />
        </el-select>
        <el-select
          v-model="filters.complaintStatus"
          clearable
          size="small"
          placeholder="投诉状态"
          style="width: 140px"
        >
          <el-option label="无投诉" value="none" />
          <el-option label="投诉中" value="reported" />
          <el-option label="已处理" value="resolved" />
        </el-select>
        <el-input
          v-model.trim="filters.keyword"
          clearable
          size="small"
          placeholder="通话 ID / 订单号 / 会话号 / 手机号"
          style="width: 300px"
          @keyup.enter="handleSearch"
        />
        <el-button type="primary" size="small" @click="handleSearch">查询</el-button>
        <el-button size="small" @click="resetFilters">重置</el-button>
      </div>

      <PageStateAlert :message="loadError" />

      <el-table :data="records" size="small" stripe v-loading="loading">
        <el-table-column label="创建时间" width="168">
          <template #default="{ row }">
            {{ formatDateTime(row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column label="通话 ID" min-width="180" show-overflow-tooltip>
          <template #default="{ row }">
            {{ row.uid || row.id || row.call_id_raw || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="发起方" min-width="170">
          <template #default="{ row }">
            <div>{{ roleLabel(row.caller_role) }} / {{ row.caller_id || '-' }}</div>
            <div class="muted-text">{{ row.caller_phone || '-' }}</div>
          </template>
        </el-table-column>
        <el-table-column label="接收方" min-width="170">
          <template #default="{ row }">
            <div>{{ roleLabel(row.callee_role) }} / {{ row.callee_id || '-' }}</div>
            <div class="muted-text">{{ row.callee_phone || '-' }}</div>
          </template>
        </el-table-column>
        <el-table-column label="会话 / 订单" min-width="180">
          <template #default="{ row }">
            <div>{{ row.conversation_id || '-' }}</div>
            <div class="muted-text">{{ row.order_id || '-' }}</div>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="110">
          <template #default="{ row }">
            <el-tag size="small" :type="statusTagType(row.status)">{{ statusLabel(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="时长" width="110">
          <template #default="{ row }">
            {{ formatDuration(row.duration_seconds) }}
          </template>
        </el-table-column>
        <el-table-column label="投诉" width="96">
          <template #default="{ row }">
            <el-tag size="small" :type="complaintTagType(row.complaint_status)">
              {{ complaintLabel(row.complaint_status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="录音留存" width="120">
          <template #default="{ row }">
            <el-tag size="small" :type="retentionTagType(row.recording_retention)">
              {{ retentionLabel(row.recording_retention) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="260" fixed="right">
          <template #default="{ row }">
            <div class="row-actions">
              <el-button type="primary" link size="small" @click="openDetail(row)">查看详情</el-button>
              <el-button
                v-if="row.complaint_status !== 'reported'"
                type="danger"
                link
                size="small"
                :loading="actionLoading[row.uid || row.id]"
                @click="markComplaint(row)"
              >
                标记投诉
              </el-button>
              <el-button
                v-if="row.complaint_status === 'reported'"
                type="success"
                link
                size="small"
                :loading="actionLoading[row.uid || row.id]"
                @click="resolveComplaint(row)"
              >
                处理完成
              </el-button>
              <el-button
                v-if="row.recording_retention !== 'frozen'"
                type="warning"
                link
                size="small"
                :loading="actionLoading[row.uid || row.id]"
                @click="freezeRetention(row)"
              >
                冻结留存
              </el-button>
              <el-button
                v-if="row.recording_retention !== 'cleared' && row.complaint_status !== 'reported'"
                type="info"
                link
                size="small"
                :loading="actionLoading[row.uid || row.id]"
                @click="clearRetention(row)"
              >
                标记清理
              </el-button>
            </div>
          </template>
        </el-table-column>
        <template #empty>
          <el-empty
            :description="loadError ? '加载失败，暂无可显示数据' : '暂无 RTC 通话审计记录'"
            :image-size="96"
          />
        </template>
      </el-table>

      <el-pagination
        v-if="pagination.total > 0"
        v-model:current-page="pagination.page"
        v-model:page-size="pagination.limit"
        :page-sizes="[20, 50, 100]"
        :total="pagination.total"
        layout="total, sizes, prev, pager, next, jumper"
        class="pager"
        @current-change="loadAudits"
        @size-change="handlePageSizeChange"
      />
    </div>

    <el-dialog v-model="detailVisible" title="RTC 通话详情" width="820px">
      <el-descriptions v-if="detailRecord" :column="2" border size="small">
        <el-descriptions-item label="通话 ID">{{ detailRecord.uid || detailRecord.id || detailRecord.call_id_raw || '-' }}</el-descriptions-item>
        <el-descriptions-item label="通话类型">{{ callTypeLabel(detailRecord.call_type) }}</el-descriptions-item>
        <el-descriptions-item label="发起方">{{ roleLabel(detailRecord.caller_role) }}</el-descriptions-item>
        <el-descriptions-item label="发起方 ID">{{ detailRecord.caller_id || '-' }}</el-descriptions-item>
        <el-descriptions-item label="发起方电话">{{ detailRecord.caller_phone || '-' }}</el-descriptions-item>
        <el-descriptions-item label="接收方">{{ roleLabel(detailRecord.callee_role) }}</el-descriptions-item>
        <el-descriptions-item label="接收方 ID">{{ detailRecord.callee_id || '-' }}</el-descriptions-item>
        <el-descriptions-item label="接收方电话">{{ detailRecord.callee_phone || '-' }}</el-descriptions-item>
        <el-descriptions-item label="入口点">{{ detailRecord.entry_point || '-' }}</el-descriptions-item>
        <el-descriptions-item label="场景">{{ detailRecord.scene || '-' }}</el-descriptions-item>
        <el-descriptions-item label="会话号">{{ detailRecord.conversation_id || '-' }}</el-descriptions-item>
        <el-descriptions-item label="订单号">{{ detailRecord.order_id || '-' }}</el-descriptions-item>
        <el-descriptions-item label="客户端平台">{{ detailRecord.client_platform || '-' }}</el-descriptions-item>
        <el-descriptions-item label="终端类型">{{ detailRecord.client_kind || '-' }}</el-descriptions-item>
        <el-descriptions-item label="状态">{{ statusLabel(detailRecord.status) }}</el-descriptions-item>
        <el-descriptions-item label="失败原因">{{ detailRecord.failure_reason || '-' }}</el-descriptions-item>
        <el-descriptions-item label="投诉状态">{{ complaintLabel(detailRecord.complaint_status) }}</el-descriptions-item>
        <el-descriptions-item label="录音留存">{{ retentionLabel(detailRecord.recording_retention) }}</el-descriptions-item>
        <el-descriptions-item label="开始时间">{{ formatDateTime(detailRecord.started_at) }}</el-descriptions-item>
        <el-descriptions-item label="接通时间">{{ formatDateTime(detailRecord.answered_at) }}</el-descriptions-item>
        <el-descriptions-item label="结束时间">{{ formatDateTime(detailRecord.ended_at) }}</el-descriptions-item>
        <el-descriptions-item label="时长">{{ formatDuration(detailRecord.duration_seconds) }}</el-descriptions-item>
      </el-descriptions>

      <div class="metadata-title">元数据</div>
      <el-input :model-value="formatMetadata(detailRecord?.metadata)" type="textarea" :rows="10" readonly />

      <template #footer>
        <div class="dialog-actions">
          <el-button
            v-if="detailRecord && detailRecord.complaint_status !== 'reported'"
            type="danger"
            :loading="actionLoading[detailRecord.uid || detailRecord.id]"
            @click="markComplaint(detailRecord)"
          >
            标记投诉
          </el-button>
          <el-button
            v-if="detailRecord && detailRecord.complaint_status === 'reported'"
            type="success"
            :loading="actionLoading[detailRecord.uid || detailRecord.id]"
            @click="resolveComplaint(detailRecord)"
          >
            处理完成
          </el-button>
          <el-button
            v-if="detailRecord && detailRecord.recording_retention !== 'frozen'"
            type="warning"
            :loading="actionLoading[detailRecord.uid || detailRecord.id]"
            @click="freezeRetention(detailRecord)"
          >
            冻结留存
          </el-button>
          <el-button
            v-if="detailRecord && detailRecord.recording_retention !== 'cleared' && detailRecord.complaint_status !== 'reported'"
            :loading="actionLoading[detailRecord.uid || detailRecord.id]"
            @click="clearRetention(detailRecord)"
          >
            标记清理
          </el-button>
          <el-button @click="detailVisible = false">关闭</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  buildAdminRTCCallAuditQuery,
  createAdminAuditPaginationState,
  createAdminRTCCallAuditFilters,
  createAdminRTCCallAuditSummary,
  createAdminRTCCallReviewAction,
  extractRTCCallAuditPage,
  extractRTCCallAuditRecord,
  formatAdminCommunicationAuditDateTime,
  formatAdminCommunicationAuditMetadata,
  formatAdminRTCCallDuration,
  getAdminCommunicationRoleLabel,
  getAdminRTCCallAuditRowKey,
  getAdminRTCCallComplaintLabel,
  getAdminRTCCallComplaintTagType,
  getAdminRTCCallRetentionLabel,
  getAdminRTCCallRetentionTagType,
  getAdminRTCCallStatusLabel,
  getAdminRTCCallStatusTagType,
  getAdminRTCCallTypeLabel,
  mergeAdminRTCCallAuditDetail,
  mergeAdminRTCCallAuditRecords,
} from '@infinitech/admin-core'
import { extractErrorMessage } from '@infinitech/contracts'
import request from '@/utils/request'
import PageStateAlert from '@/components/PageStateAlert.vue'

const loading = ref(false)
const loadError = ref('')
const records = ref([])
const detailVisible = ref(false)
const detailRecord = ref(null)
const actionLoading = reactive({})

const filters = reactive(createAdminRTCCallAuditFilters())
const pagination = reactive(createAdminAuditPaginationState())
const summary = reactive(createAdminRTCCallAuditSummary())

async function loadAudits() {
  loading.value = true
  loadError.value = ''
  try {
    const { data } = await request.get('/api/rtc-call-audits', {
      params: buildAdminRTCCallAuditQuery(filters, pagination),
    })
    const payload = extractRTCCallAuditPage(data)
    records.value = payload.items
    Object.assign(summary, createAdminRTCCallAuditSummary(payload.summary))
    const nextPagination = payload.pagination || {}
    pagination.total = createAdminAuditPaginationState({ total: nextPagination.total }).total
  } catch (error) {
    records.value = []
    Object.assign(summary, createAdminRTCCallAuditSummary())
    pagination.total = 0
    loadError.value = extractErrorMessage(error, '加载 RTC 通话审计失败')
    ElMessage.error('加载 RTC 通话审计失败')
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  pagination.page = 1
  void loadAudits()
}

function resetFilters() {
  Object.assign(filters, createAdminRTCCallAuditFilters())
  pagination.page = 1
  void loadAudits()
}

function handlePageSizeChange() {
  pagination.page = 1
  void loadAudits()
}

function openDetail(row) {
  detailRecord.value = { ...row }
  detailVisible.value = true
}

function syncRecord(updated) {
  const key = getAdminRTCCallAuditRowKey(updated)
  if (!key) return
  records.value = mergeAdminRTCCallAuditRecords(records.value, updated)
  detailRecord.value = mergeAdminRTCCallAuditDetail(detailRecord.value, updated)
}

async function submitReview(row, kind) {
  const action = createAdminRTCCallReviewAction(kind)
  if (!action) {
    ElMessage.error('不支持的 RTC 审计操作')
    return
  }
  const key = getAdminRTCCallAuditRowKey(row)
  if (!key) {
    ElMessage.error('缺少 RTC 通话标识')
    return
  }

  if (action.confirmMessage) {
    await ElMessageBox.confirm(action.confirmMessage, '确认操作', {
      type: 'warning',
      confirmButtonText: '继续',
      cancelButtonText: '取消',
    })
  }

  actionLoading[key] = true
  try {
    const { data } = await request.post(`/api/rtc-call-audits/${encodeURIComponent(key)}/review`, action.payload)
    const updated = extractRTCCallAuditRecord(data)
    syncRecord(updated)
    ElMessage.success(action.successMessage)
    await loadAudits()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(extractErrorMessage(error, '更新 RTC 审计失败'))
    }
  } finally {
    actionLoading[key] = false
  }
}

function markComplaint(row) {
  return submitReview(row, 'markComplaint')
}

function resolveComplaint(row) {
  return submitReview(row, 'resolveComplaint')
}

function freezeRetention(row) {
  return submitReview(row, 'freezeRetention')
}

function clearRetention(row) {
  return submitReview(row, 'clearRetention')
}

onMounted(() => {
  void loadAudits()
})

const rowKey = getAdminRTCCallAuditRowKey
const roleLabel = getAdminCommunicationRoleLabel
const callTypeLabel = getAdminRTCCallTypeLabel
const statusLabel = getAdminRTCCallStatusLabel
const statusTagType = getAdminRTCCallStatusTagType
const complaintLabel = getAdminRTCCallComplaintLabel
const complaintTagType = getAdminRTCCallComplaintTagType
const retentionLabel = getAdminRTCCallRetentionLabel
const retentionTagType = getAdminRTCCallRetentionTagType
const formatDateTime = formatAdminCommunicationAuditDateTime
const formatDuration = formatAdminRTCCallDuration
const formatMetadata = formatAdminCommunicationAuditMetadata
</script>

<style scoped>
.rtc-call-audits-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.panel {
  background: #fff;
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.06);
}

.panel-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
}

.panel-title {
  font-size: 22px;
  font-weight: 700;
  color: #111827;
}

.panel-subtitle {
  margin-top: 6px;
  font-size: 13px;
  line-height: 1.6;
  color: #6b7280;
}

.panel-actions {
  display: flex;
  gap: 8px;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.summary-card {
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 14px 16px;
  background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
}

.summary-label {
  font-size: 12px;
  color: #6b7280;
}

.summary-value {
  margin-top: 8px;
  font-size: 28px;
  font-weight: 700;
  color: #111827;
}

.summary-value.success {
  color: #059669;
}

.summary-value.primary {
  color: #2563eb;
}

.summary-value.danger {
  color: #dc2626;
}

.summary-value.warning {
  color: #d97706;
}

.filters {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 16px;
}

.muted-text {
  margin-top: 4px;
  color: #6b7280;
  font-size: 12px;
}

.row-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 10px;
}

.metadata-title {
  margin: 18px 0 10px;
  font-size: 14px;
  font-weight: 600;
  color: #111827;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.pager {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

@media (max-width: 1280px) {
  .summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
