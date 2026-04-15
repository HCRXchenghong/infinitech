<template>
  <div class="page phone-contact-audits-page">
    <div class="panel">
      <div class="panel-header">
        <div>
          <div class="panel-title">电话联系审计</div>
          <div class="panel-subtitle">
            查看各端触发系统电话联系的真实记录，便于排查投诉、订单协作和热线使用情况。
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
          <div class="summary-label">已点击</div>
          <div class="summary-value success">{{ summary.clicked }}</div>
        </div>
        <div class="summary-card">
          <div class="summary-label">已拉起</div>
          <div class="summary-value primary">{{ summary.opened }}</div>
        </div>
        <div class="summary-card">
          <div class="summary-label">失败</div>
          <div class="summary-value danger">{{ summary.failed }}</div>
        </div>
      </div>

      <div class="filters">
        <el-select v-model="filters.actorRole" clearable size="small" placeholder="发起方角色" style="width: 140px">
          <el-option label="用户" value="user" />
          <el-option label="商户" value="merchant" />
          <el-option label="骑手" value="rider" />
          <el-option label="管理员" value="admin" />
        </el-select>
        <el-select v-model="filters.targetRole" clearable size="small" placeholder="目标方角色" style="width: 140px">
          <el-option label="用户" value="user" />
          <el-option label="商户" value="merchant" />
          <el-option label="骑手" value="rider" />
          <el-option label="管理员" value="admin" />
        </el-select>
        <el-select v-model="filters.clientResult" clearable size="small" placeholder="客户端结果" style="width: 140px">
          <el-option label="已点击" value="clicked" />
          <el-option label="已拉起" value="opened" />
          <el-option label="失败" value="failed" />
        </el-select>
        <el-input v-model.trim="filters.entryPoint" clearable size="small" placeholder="入口点" style="width: 140px" />
        <el-input
          v-model.trim="filters.keyword"
          clearable
          size="small"
          placeholder="手机号 / 订单号 / 房间号"
          style="width: 260px"
          @keyup.enter="handleSearch"
        />
        <el-button type="primary" size="small" @click="handleSearch">查询</el-button>
        <el-button size="small" @click="resetFilters">重置</el-button>
      </div>

      <PageStateAlert :message="loadError" />

      <el-table :data="records" size="small" stripe v-loading="loading">
        <el-table-column label="时间" width="168">
          <template #default="{ row }">
            {{ formatDateTime(row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column label="发起方" min-width="150">
          <template #default="{ row }">
            <div>{{ roleLabel(row.actor_role) }} / {{ row.actor_id || '-' }}</div>
            <div class="muted-text">{{ row.actor_phone || '-' }}</div>
          </template>
        </el-table-column>
        <el-table-column label="目标方" min-width="150">
          <template #default="{ row }">
            <div>{{ roleLabel(row.target_role) }} / {{ row.target_id || '-' }}</div>
            <div class="muted-text">{{ row.target_phone || '-' }}</div>
          </template>
        </el-table-column>
        <el-table-column label="场景" min-width="160">
          <template #default="{ row }">
            <div>{{ row.scene || '-' }}</div>
            <div class="muted-text">{{ row.entry_point || '-' }}</div>
          </template>
        </el-table-column>
        <el-table-column label="订单 / 房间" min-width="180">
          <template #default="{ row }">
            <div>{{ row.order_id || '-' }}</div>
            <div class="muted-text">{{ row.room_id || '-' }}</div>
          </template>
        </el-table-column>
        <el-table-column label="平台" width="110">
          <template #default="{ row }">
            {{ row.client_platform || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="结果" width="100">
          <template #default="{ row }">
            <el-tag size="small" :type="resultTagType(row.client_result)">
              {{ resultLabel(row.client_result) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="openDetail(row)">查看详情</el-button>
          </template>
        </el-table-column>
        <template #empty>
          <el-empty
            :description="loadError ? '加载失败，暂无可显示数据' : '暂无电话联系审计记录'"
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

    <el-dialog v-model="detailVisible" title="电话联系详情" width="720px">
      <el-descriptions v-if="detailRecord" :column="2" border size="small">
        <el-descriptions-item label="时间">{{ formatDateTime(detailRecord.created_at) }}</el-descriptions-item>
        <el-descriptions-item label="客户端结果">{{ resultLabel(detailRecord.client_result) }}</el-descriptions-item>
        <el-descriptions-item label="发起方角色">{{ roleLabel(detailRecord.actor_role) }}</el-descriptions-item>
        <el-descriptions-item label="发起方 ID">{{ detailRecord.actor_id || '-' }}</el-descriptions-item>
        <el-descriptions-item label="发起方电话">{{ detailRecord.actor_phone || '-' }}</el-descriptions-item>
        <el-descriptions-item label="目标方角色">{{ roleLabel(detailRecord.target_role) }}</el-descriptions-item>
        <el-descriptions-item label="目标方 ID">{{ detailRecord.target_id || '-' }}</el-descriptions-item>
        <el-descriptions-item label="目标方电话">{{ detailRecord.target_phone || '-' }}</el-descriptions-item>
        <el-descriptions-item label="场景">{{ detailRecord.scene || '-' }}</el-descriptions-item>
        <el-descriptions-item label="入口点">{{ detailRecord.entry_point || '-' }}</el-descriptions-item>
        <el-descriptions-item label="订单号">{{ detailRecord.order_id || '-' }}</el-descriptions-item>
        <el-descriptions-item label="房间号">{{ detailRecord.room_id || '-' }}</el-descriptions-item>
        <el-descriptions-item label="页面路径" :span="2">{{ detailRecord.page_path || '-' }}</el-descriptions-item>
        <el-descriptions-item label="客户端平台">{{ detailRecord.client_platform || '-' }}</el-descriptions-item>
        <el-descriptions-item label="联系通道">{{ detailRecord.contact_channel || '-' }}</el-descriptions-item>
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
import { extractContactPhoneAuditPage } from '@infinitech/admin-core'
import { extractErrorMessage } from '@infinitech/contracts'
import request from '@/utils/request'
import PageStateAlert from '@/components/PageStateAlert.vue'

const loading = ref(false)
const loadError = ref('')
const records = ref([])
const detailVisible = ref(false)
const detailRecord = ref(null)

const filters = reactive({
  actorRole: '',
  targetRole: '',
  clientResult: '',
  entryPoint: '',
  keyword: '',
})

const pagination = reactive({
  page: 1,
  limit: 20,
  total: 0,
})

const summary = reactive({
  total: 0,
  clicked: 0,
  opened: 0,
  failed: 0,
})

function roleLabel(role) {
  if (role === 'user') return '用户'
  if (role === 'merchant') return '商户'
  if (role === 'rider') return '骑手'
  if (role === 'admin') return '管理员'
  return role || '-'
}

function resultLabel(result) {
  if (result === 'clicked') return '已点击'
  if (result === 'opened') return '已拉起'
  if (result === 'failed') return '失败'
  return result || '-'
}

function resultTagType(result) {
  if (result === 'clicked') return 'info'
  if (result === 'opened') return 'success'
  if (result === 'failed') return 'danger'
  return ''
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
    const { data } = await request.get('/api/contact-phone-audits', {
      params: {
        actorRole: filters.actorRole || undefined,
        targetRole: filters.targetRole || undefined,
        clientResult: filters.clientResult || undefined,
        entryPoint: filters.entryPoint || undefined,
        keyword: filters.keyword || undefined,
        page: pagination.page,
        limit: pagination.limit,
      },
    })
    const payload = extractContactPhoneAuditPage(data)
    records.value = payload.items
    const nextSummary = payload.summary || {}
    summary.total = Number(nextSummary.total || 0)
    summary.clicked = Number(nextSummary.clicked || 0)
    summary.opened = Number(nextSummary.opened || 0)
    summary.failed = Number(nextSummary.failed || 0)
    const nextPagination = payload.pagination || {}
    pagination.total = Number(nextPagination.total || 0)
  } catch (error) {
    records.value = []
    summary.total = 0
    summary.clicked = 0
    summary.opened = 0
    summary.failed = 0
    pagination.total = 0
    loadError.value = extractErrorMessage(error, '加载电话联系审计失败')
    ElMessage.error('加载电话联系审计失败')
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  pagination.page = 1
  void loadAudits()
}

function resetFilters() {
  filters.actorRole = ''
  filters.targetRole = ''
  filters.clientResult = ''
  filters.entryPoint = ''
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
.phone-contact-audits-page {
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
  grid-template-columns: repeat(4, minmax(0, 1fr));
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
