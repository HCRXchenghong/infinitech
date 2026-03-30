<template>
  <div class="page rtc-call-audits-page">
    <div class="panel">
      <div class="panel-header">
        <div>
          <div class="panel-title">RTC 通话审计</div>
          <div class="panel-subtitle">
            查看 App / H5 音频通话的服务端留痕，便于排查投诉、授权关系和通话质量问题。
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
          <el-option label="小程序" value="miniprogram" />
        </el-select>
        <el-select v-model="filters.complaintStatus" clearable size="small" placeholder="投诉状态" style="width: 140px">
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
        <el-table-column label="通话 ID" min-width="150" show-overflow-tooltip>
          <template #default="{ row }">
            {{ row.id || row.uid || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="发起方" min-width="150">
          <template #default="{ row }">
            <div>{{ roleLabel(row.caller_role) }} / {{ row.caller_id || '-' }}</div>
            <div class="muted-text">{{ row.caller_phone || '-' }}</div>
          </template>
        </el-table-column>
        <el-table-column label="接收方" min-width="150">
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
            <el-tag size="small" :type="statusTagType(row.status)">
              {{ statusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="时长" width="96">
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
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="openDetail(row)">查看详情</el-button>
          </template>
        </el-table-column>
        <template #empty>
          <el-empty :description="loadError ? '加载失败，暂无可显示数据' : '暂无 RTC 通话审计记录'" :image-size="96" />
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

    <el-dialog v-model="detailVisible" title="RTC 通话详情" width="780px">
      <el-descriptions v-if="detailRecord" :column="2" border size="small">
        <el-descriptions-item label="通话 ID">{{ detailRecord.id || detailRecord.uid || '-' }}</el-descriptions-item>
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
        <el-button @click="detailVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import request from '@/utils/request'
import PageStateAlert from '@/components/PageStateAlert.vue'

const loading = ref(false)
const loadError = ref('')
const records = ref([])
const detailVisible = ref(false)
const detailRecord = ref(null)

const filters = reactive({
  callerRole: '',
  calleeRole: '',
  status: '',
  clientKind: '',
  complaintStatus: '',
  keyword: '',
})

const pagination = reactive({
  page: 1,
  limit: 20,
  total: 0,
})

const summary = reactive({
  total: 0,
  accepted: 0,
  ended: 0,
  failed: 0,
  complaints: 0,
})

function roleLabel(role) {
  if (role === 'user') return '用户'
  if (role === 'merchant') return '商户'
  if (role === 'rider') return '骑手'
  if (role === 'admin') return '管理员'
  return role || '-'
}

function callTypeLabel(value) {
  if (value === 'audio') return '音频通话'
  return value || '-'
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

function retentionLabel(value) {
  if (value === 'standard') return '按默认策略保留'
  if (value === 'frozen') return '冻结保留'
  if (value === 'cleared') return '已清理'
  return value || '-'
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

function formatMetadata(metadata) {
  if (!metadata) return '-'
  const text = String(metadata).trim()
  if (!text) return '-'
  try {
    return JSON.stringify(JSON.parse(text), null, 2)
  } catch {
    return text
  }
}

async function loadAudits() {
  loading.value = true
  loadError.value = ''
  try {
    const { data } = await request.get('/api/rtc-call-audits', {
      params: {
        callerRole: filters.callerRole || undefined,
        calleeRole: filters.calleeRole || undefined,
        status: filters.status || undefined,
        clientKind: filters.clientKind || undefined,
        complaintStatus: filters.complaintStatus || undefined,
        keyword: filters.keyword || undefined,
        page: pagination.page,
        limit: pagination.limit,
      },
    })
    const payload = data?.data || data || {}
    records.value = Array.isArray(payload.items) ? payload.items : []
    const nextSummary = payload.summary || {}
    summary.total = Number(nextSummary.total || 0)
    summary.accepted = Number(nextSummary.accepted || 0)
    summary.ended = Number(nextSummary.ended || 0)
    summary.failed = Number(nextSummary.failed || 0)
    summary.complaints = Number(nextSummary.complaints || 0)
    const nextPagination = payload.pagination || {}
    pagination.total = Number(nextPagination.total || 0)
  } catch (error) {
    records.value = []
    summary.total = 0
    summary.accepted = 0
    summary.ended = 0
    summary.failed = 0
    summary.complaints = 0
    pagination.total = 0
    loadError.value = error?.response?.data?.error || error?.message || '加载 RTC 通话审计失败'
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
  filters.callerRole = ''
  filters.calleeRole = ''
  filters.status = ''
  filters.clientKind = ''
  filters.complaintStatus = ''
  filters.keyword = ''
  pagination.page = 1
  void loadAudits()
}

function handlePageSizeChange() {
  pagination.page = 1
  void loadAudits()
}

function openDetail(row) {
  detailRecord.value = row
  detailVisible.value = true
}

onMounted(() => {
  void loadAudits()
})
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
  color: #6b7280;
  font-size: 12px;
}

.pager {
  margin-top: 18px;
  justify-content: center;
}

.metadata-title {
  margin: 16px 0 10px;
  font-weight: 600;
  color: #111827;
}

@media (max-width: 1200px) {
  .summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 768px) {
  .panel {
    padding: 16px;
  }

  .panel-header {
    flex-direction: column;
    align-items: stretch;
  }

  .summary-grid {
    grid-template-columns: 1fr;
  }
}
</style>
