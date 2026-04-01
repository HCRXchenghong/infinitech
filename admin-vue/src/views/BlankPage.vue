<template>
  <div class="workbench-page">
    <div class="hero">
      <div>
        <p class="eyebrow">联调工作台</p>
        <h1>服务健康、支付配置和提现队列都收在这里</h1>
        <p class="subtitle">
          这个入口继续保留在原来的导航位置，不再是空白页。现在它直接承接系统健康巡检、
          支付链路就绪度排查、保证金与提现队列的日常联调工作。
        </p>
        <div class="hero-meta">
          <span>最近检查：{{ formatTime(serviceStatus.checkedAt) }}</span>
          <span>整体状态：{{ overallStatusLabel }}</span>
          <span>待处理提现：{{ pendingWithdrawCount }}</span>
        </div>
      </div>
      <div class="hero-actions">
        <el-button :loading="loading" @click="loadWorkbench">刷新工作台</el-button>
        <el-button type="primary" @click="go('/payment-center')">打开支付中心</el-button>
        <el-button @click="go('/system-logs')">查看系统日志</el-button>
      </div>
    </div>

    <PageStateAlert :message="pageError" />

    <div class="summary-grid">
      <el-card class="summary-card">
        <span class="summary-label">核心服务</span>
        <strong>{{ serviceStatus.services.length }}</strong>
        <small>{{ upServiceCount }} 个在线，{{ downServiceCount }} 个异常</small>
      </el-card>
      <el-card class="summary-card">
        <span class="summary-label">业务旅程</span>
        <strong>{{ journeyCounts.ok }}</strong>
        <small>{{ journeyCounts.degraded }} 个降级，{{ journeyCounts.down }} 个阻断</small>
      </el-card>
      <el-card class="summary-card">
        <span class="summary-label">支付网关</span>
        <strong>{{ gatewayReadyCount }}/3</strong>
        <small>{{ gatewayModeLabel }}</small>
      </el-card>
      <el-card class="summary-card">
        <span class="summary-label">保证金概览</span>
        <strong>{{ riderDepositOverview.total || 0 }}</strong>
        <small>可提现 {{ riderDepositOverview.withdrawable || 0 }}，提现中 {{ riderDepositOverview.withdrawing || 0 }}</small>
      </el-card>
    </div>

    <div class="main-grid">
      <el-card class="panel">
        <template #header>
          <div class="panel-header">
            <span>服务健康</span>
            <el-tag size="small" :type="statusTagType(serviceStatus.overall)">
              {{ overallStatusLabel }}
            </el-tag>
          </div>
        </template>
        <div v-if="loading" class="skeleton-wrap">
          <el-skeleton :rows="6" animated />
        </div>
        <div v-else class="service-grid">
          <div v-for="item in serviceStatus.services" :key="item.key" class="service-item">
            <div class="service-top">
              <div>
                <div class="service-name">{{ item.label || item.key }}</div>
                <div class="service-target">{{ item.target || '-' }}</div>
              </div>
              <el-tag size="small" :type="statusTagType(item.status)">
                {{ serviceStatusLabel(item.status) }}
              </el-tag>
            </div>
            <div class="service-meta">
              <span v-if="item.probe">探针 {{ item.probe }}</span>
              <span v-if="item.httpStatus">HTTP {{ item.httpStatus }}</span>
              <span v-if="item.latencyMs !== null && item.latencyMs !== undefined">延迟 {{ item.latencyMs }}ms</span>
            </div>
            <div class="service-detail">
              {{ item.error ? `异常：${item.error}` : formatServiceDetail(item.detail) }}
            </div>
          </div>
        </div>
      </el-card>

      <el-card class="panel">
        <template #header>
          <div class="panel-header">
            <span>支付配置摘要</span>
            <el-button link type="primary" @click="go('/payment-center')">去维护</el-button>
          </div>
        </template>
        <div class="gateway-grid">
          <div class="gateway-item">
            <div class="gateway-top">
              <span class="gateway-name">微信支付</span>
              <el-tag size="small" :type="gatewaySummary.wechat?.ready ? 'success' : 'danger'">
                {{ gatewaySummary.wechat?.ready ? '已就绪' : '未完成' }}
              </el-tag>
            </div>
            <ul class="gateway-list">
              <li>商户号：{{ yesNo(gatewaySummary.wechat?.mchIdConfigured) }}</li>
              <li>API V3 Key：{{ yesNo(gatewaySummary.wechat?.apiV3KeyConfigured) }}</li>
              <li>证书序列号：{{ yesNo(gatewaySummary.wechat?.serialNoConfigured) }}</li>
              <li>回调地址：{{ yesNo(gatewaySummary.wechat?.notifyUrlConfigured) }}</li>
            </ul>
          </div>
          <div class="gateway-item">
            <div class="gateway-top">
              <span class="gateway-name">支付宝</span>
              <el-tag size="small" :type="gatewaySummary.alipay?.ready ? 'success' : 'danger'">
                {{ gatewaySummary.alipay?.ready ? '已就绪' : '未完成' }}
              </el-tag>
            </div>
            <ul class="gateway-list">
              <li>AppID：{{ yesNo(gatewaySummary.alipay?.appIdConfigured) }}</li>
              <li>私钥：{{ yesNo(gatewaySummary.alipay?.privateKeyConfigured) }}</li>
              <li>公钥：{{ yesNo(gatewaySummary.alipay?.publicKeyConfigured) }}</li>
              <li>侧车地址：{{ yesNo(gatewaySummary.alipay?.sidecarUrlConfigured) }}</li>
            </ul>
          </div>
          <div class="gateway-item">
            <div class="gateway-top">
              <span class="gateway-name">银行卡出款</span>
              <el-tag size="small" :type="gatewaySummary.bankCard?.ready ? 'success' : 'danger'">
                {{ gatewaySummary.bankCard?.ready ? '已就绪' : '未完成' }}
              </el-tag>
            </div>
            <ul class="gateway-list">
              <li>到账时效：{{ gatewaySummary.bankCard?.arrivalText || '24小时-48小时' }}</li>
              <li>侧车地址：{{ yesNo(gatewaySummary.bankCard?.sidecarUrlConfigured) }}</li>
              <li>供应商地址：{{ yesNo(gatewaySummary.bankCard?.providerUrlConfigured) }}</li>
              <li>商户号：{{ yesNo(gatewaySummary.bankCard?.merchantIdConfigured) }}</li>
              <li>API Key：{{ yesNo(gatewaySummary.bankCard?.apiKeyConfigured) }}</li>
              <li>回调地址：{{ yesNo(gatewaySummary.bankCard?.notifyUrlConfigured) }}</li>
              <li>Stub 兜底：{{ gatewaySummary.bankCard?.allowStub ? '开启' : '关闭' }}</li>
            </ul>
          </div>
        </div>
        <div class="mode-note">
          当前运行模式：{{ gatewayModeLabel }}
        </div>
      </el-card>
    </div>

    <div class="main-grid">
      <el-card class="panel">
        <template #header>关键业务旅程</template>
        <div class="journey-grid">
          <div v-for="journey in journeys" :key="journey.key" class="journey-item">
            <div class="journey-top">
              <span class="journey-name">{{ journey.label }}</span>
              <el-tag size="small" :type="statusTagType(journey.status)">
                {{ journeyStatusLabel(journey.status) }}
              </el-tag>
            </div>
            <p class="journey-detail">{{ journey.detail || '暂无说明' }}</p>
          </div>
        </div>
      </el-card>

      <el-card class="panel">
        <template #header>
          <div class="panel-header">
            <span>待处理提现队列</span>
            <el-button link type="primary" @click="go('/payment-center')">去处理</el-button>
          </div>
        </template>
        <el-table :data="recentWithdrawRequests" size="small" stripe>
          <el-table-column prop="request_id" label="提现单号" min-width="180" />
          <el-table-column label="端类型" width="90">
            <template #default="{ row }">{{ userTypeLabel(row.user_type) }}</template>
          </el-table-column>
          <el-table-column label="渠道" width="110">
            <template #default="{ row }">{{ withdrawMethodLabel(row.withdraw_method) }}</template>
          </el-table-column>
          <el-table-column label="金额" width="110">
            <template #default="{ row }">￥{{ formatFen(row.amount) }}</template>
          </el-table-column>
          <el-table-column label="状态" width="100">
            <template #default="{ row }">
              <el-tag size="small" :type="withdrawStatusTag(row.status)">
                {{ withdrawStatusLabel(row.status) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="创建时间" width="170">
            <template #default="{ row }">{{ formatTime(row.created_at) }}</template>
          </el-table-column>
        </el-table>
        <div v-if="!recentWithdrawRequests.length" class="empty-note">
          当前没有需要跟进的提现请求。
        </div>
      </el-card>
    </div>

    <el-card class="panel">
      <template #header>快捷入口</template>
      <div class="action-grid">
        <button class="action-item" @click="go('/dashboard')">
          <span>仪表盘</span>
          <small>回到经营概览和核心统计</small>
        </button>
        <button class="action-item" @click="go('/transaction-logs')">
          <span>财务日志</span>
          <small>检查充值、提现、退款和补单流水</small>
        </button>
        <button class="action-item" @click="go('/payment-center')">
          <span>支付中心</span>
          <small>维护渠道、分账、保证金和提现费</small>
        </button>
        <button class="action-item" @click="go('/monitor-chat')">
          <span>平台监控</span>
          <small>查看消息、RTC 和实时运行态</small>
        </button>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import request from '@/utils/request'
import PageStateAlert from '@/components/PageStateAlert.vue'

const router = useRouter()
const loading = ref(false)
const pageError = ref('')
const serviceStatus = reactive({
  checkedAt: '',
  overall: 'unknown',
  services: [],
  journeys: [],
})
const gatewaySummary = ref({
  mode: { isProd: false },
  wechat: {},
  alipay: {},
  bankCard: {},
})
const riderDepositOverview = ref({})
const withdrawRequests = ref([])

const overallStatusLabel = computed(() => journeyStatusLabel(serviceStatus.overall))
const upServiceCount = computed(() => serviceStatus.services.filter((item) => item.status === 'up' || item.status === 'ok' || item.status === 'ready').length)
const downServiceCount = computed(() => serviceStatus.services.filter((item) => item.status === 'down' || item.status === 'error').length)
const journeys = computed(() => Array.isArray(serviceStatus.journeys) ? serviceStatus.journeys : [])
const journeyCounts = computed(() => {
  return journeys.value.reduce((acc, item) => {
    const status = String(item?.status || 'unknown')
    if (status === 'ok' || status === 'ready') acc.ok += 1
    else if (status === 'degraded') acc.degraded += 1
    else acc.down += 1
    return acc
  }, { ok: 0, degraded: 0, down: 0 })
})
const gatewayReadyCount = computed(() => {
  let total = 0
  if (gatewaySummary.value.wechat?.ready) total += 1
  if (gatewaySummary.value.alipay?.ready) total += 1
  if (gatewaySummary.value.bankCard?.ready) total += 1
  return total
})
const gatewayModeLabel = computed(() => gatewaySummary.value.mode?.isProd ? '生产模式' : '开发 / 沙箱模式')
const pendingWithdrawCount = computed(() => {
  return withdrawRequests.value.filter((item) => ['pending', 'pending_review', 'pending_transfer', 'transferring'].includes(String(item?.status || ''))).length
})
const recentWithdrawRequests = computed(() => {
  return withdrawRequests.value
    .filter((item) => ['pending', 'pending_review', 'pending_transfer', 'transferring', 'failed'].includes(String(item?.status || '')))
    .slice(0, 8)
})

function normalizeListPayload(payload) {
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.items)) return payload.items
  if (Array.isArray(payload?.records)) return payload.records
  if (Array.isArray(payload?.list)) return payload.list
  if (Array.isArray(payload?.data?.items)) return payload.data.items
  if (Array.isArray(payload?.data?.records)) return payload.data.records
  if (Array.isArray(payload?.data?.list)) return payload.data.list
  return []
}

function go(path) {
  router.push(path)
}

function yesNo(value) {
  return value ? '已配置' : '未配置'
}

function formatTime(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  const pad = (part) => String(part).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

function formatFen(value) {
  return (Number(value || 0) / 100).toFixed(2)
}

function statusTagType(status) {
  if (status === 'ok' || status === 'ready' || status === 'up') return 'success'
  if (status === 'degraded') return 'warning'
  if (status === 'down' || status === 'error') return 'danger'
  return 'info'
}

function serviceStatusLabel(status) {
  if (status === 'ok' || status === 'ready' || status === 'up') return '在线'
  if (status === 'degraded') return '降级'
  if (status === 'down' || status === 'error') return '异常'
  return '未知'
}

function journeyStatusLabel(status) {
  if (status === 'ok' || status === 'ready') return '正常'
  if (status === 'degraded') return '降级'
  if (status === 'down' || status === 'error') return '阻断'
  return '未知'
}

function formatServiceDetail(detail) {
  if (!detail) return '暂未返回扩展说明'
  const summary = String(detail)
    .split('|')
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 4)
    .join('，')
  return summary || '暂未返回扩展说明'
}

function withdrawMethodLabel(method) {
  return {
    wechat: '微信提现',
    alipay: '支付宝提现',
    bank_card: '银行卡提现',
  }[String(method || '')] || method || '-'
}

function userTypeLabel(userType) {
  return {
    customer: '用户',
    rider: '骑手',
    merchant: '商户',
  }[String(userType || '')] || userType || '-'
}

function withdrawStatusLabel(status) {
  return {
    pending: '待审核',
    pending_review: '待审核',
    pending_transfer: '待打款',
    transferring: '转账中',
    success: '已完成',
    failed: '已失败',
    rejected: '已驳回',
  }[String(status || '')] || status || '-'
}

function withdrawStatusTag(status) {
  if (status === 'success') return 'success'
  if (status === 'failed' || status === 'rejected') return 'danger'
  if (status === 'pending_transfer' || status === 'transferring') return 'warning'
  return 'info'
}

async function loadWorkbench() {
  loading.value = true
  pageError.value = ''
  try {
    const [healthRes, payCenterRes, depositRes, withdrawRes] = await Promise.all([
      request.get('/api/admin/system-health'),
      request.get('/api/admin/wallet/pay-center/config'),
      request.get('/api/admin/wallet/rider-deposit/overview'),
      request.get('/api/admin/wallet/withdraw-requests', { params: { page: 1, limit: 20 } }),
    ])

    const nextHealth = healthRes.data?.serviceStatus || {}
    serviceStatus.checkedAt = String(nextHealth.checkedAt || '')
    serviceStatus.overall = String(nextHealth.overall || 'unknown')
    serviceStatus.services = Array.isArray(nextHealth.services) ? nextHealth.services : []
    serviceStatus.journeys = Array.isArray(nextHealth.journeys) ? nextHealth.journeys : []
    gatewaySummary.value = payCenterRes.data?.gateway_summary || { mode: { isProd: false }, wechat: {}, alipay: {}, bankCard: {} }
    riderDepositOverview.value = depositRes.data || {}
    withdrawRequests.value = normalizeListPayload(withdrawRes.data)
  } catch (error) {
    pageError.value = error?.response?.data?.error || error?.message || '加载联调工作台失败'
  } finally {
    loading.value = false
  }
}

onMounted(loadWorkbench)
</script>

<style scoped>
.workbench-page {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.hero {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  padding: 28px;
  border-radius: 24px;
  border: 1px solid #f0e4c4;
  background:
    radial-gradient(circle at top right, rgba(255, 196, 88, 0.28), transparent 32%),
    linear-gradient(135deg, #fff9ec, #fff 58%, #f2f7ff);
}

.eyebrow {
  margin: 0 0 10px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.12em;
  color: #9a6b00;
}

.hero h1 {
  margin: 0;
  font-size: 32px;
  line-height: 1.15;
  color: #1f2937;
}

.subtitle {
  max-width: 760px;
  margin: 12px 0 0;
  color: #5b6472;
  line-height: 1.7;
}

.hero-meta {
  display: flex;
  gap: 14px;
  flex-wrap: wrap;
  margin-top: 16px;
  color: #6b7280;
  font-size: 13px;
}

.hero-actions {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  flex-wrap: wrap;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.summary-card {
  border-radius: 18px;
}

.summary-card :deep(.el-card__body) {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.summary-label {
  font-size: 13px;
  color: #6b7280;
}

.summary-card strong {
  font-size: 28px;
  color: #111827;
}

.summary-card small {
  color: #6b7280;
}

.main-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.panel {
  border-radius: 18px;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.skeleton-wrap {
  padding: 8px 0;
}

.service-grid,
.journey-grid,
.action-grid,
.gateway-grid {
  display: grid;
  gap: 12px;
}

.service-grid,
.journey-grid,
.action-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.gateway-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.service-item,
.journey-item,
.gateway-item,
.action-item {
  border: 1px solid #e7ebf3;
  border-radius: 16px;
  background: #fff;
}

.service-item,
.journey-item,
.gateway-item {
  padding: 14px 16px;
}

.service-top,
.journey-top,
.gateway-top {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.service-name,
.journey-name,
.gateway-name {
  font-size: 15px;
  font-weight: 700;
  color: #1f2937;
}

.service-target {
  margin-top: 4px;
  color: #6b7280;
  font-size: 12px;
  word-break: break-all;
}

.service-meta {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 12px;
  color: #6b7280;
  font-size: 12px;
}

.service-detail,
.journey-detail,
.mode-note {
  margin-top: 12px;
  color: #4b5563;
  line-height: 1.7;
}

.gateway-list {
  margin: 12px 0 0;
  padding-left: 18px;
  color: #4b5563;
  line-height: 1.8;
}

.empty-note {
  padding-top: 14px;
  color: #8b93a3;
}

.action-item {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  padding: 14px 16px;
  cursor: pointer;
  transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
}

.action-item:hover {
  transform: translateY(-1px);
  border-color: #f2b84b;
  box-shadow: 0 12px 24px rgba(15, 23, 42, 0.08);
}

.action-item span {
  font-size: 16px;
  font-weight: 700;
  color: #1f2937;
}

.action-item small {
  color: #6b7280;
}

@media (max-width: 1180px) {
  .summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .main-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 960px) {
  .hero {
    flex-direction: column;
  }

  .service-grid,
  .journey-grid,
  .action-grid,
  .gateway-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .summary-grid {
    grid-template-columns: 1fr;
  }
}
</style>
