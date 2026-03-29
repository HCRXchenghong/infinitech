<template>
  <div class="page">
    <div class="title-row">
      <span class="title">系统日志</span>
      <div class="title-actions">
        <el-button
          type="danger"
          plain
          size="small"
          :disabled="loading"
          @click="openClearDialog"
        >
          一键清空
        </el-button>
        <el-button size="small" :loading="loading" @click="loadLogs">刷新</el-button>
      </div>
    </div>

    <el-card class="status-card">
      <div class="status-header">
        <div class="status-title-row">
          <span class="status-title">服务状态</span>
          <el-tag size="small" :type="serviceTagType(serviceStatus.overall)">
            {{ overallStatusText(serviceStatus.overall) }}
          </el-tag>
        </div>
        <span class="status-time">检查时间：{{ formatTime(serviceStatus.checkedAt) }}</span>
      </div>

      <div v-if="serviceStatus.services.length > 0" class="status-grid">
        <div v-for="item in serviceStatus.services" :key="item.key" class="status-item">
          <div class="status-item-top">
            <span class="service-name">{{ item.label || item.key }}</span>
            <el-tag size="small" :type="serviceTagType(item.status)">
              {{ serviceStatusText(item.status) }}
            </el-tag>
          </div>
          <div class="service-target">
            {{ item.target || "-" }}
            <span v-if="item.probe" class="service-probe">探针 {{ formatProbeType(item.probe) }}</span>
          </div>
          <div class="service-meta">
            <span v-if="item.httpStatus">HTTP {{ item.httpStatus }}</span>
            <span v-if="item.latencyMs !== null && item.latencyMs !== undefined">延迟 {{ item.latencyMs }}ms</span>
            <span v-if="item.error" class="service-error">{{ item.error }}</span>
          </div>
          <div v-if="getServiceSignals(item).length > 0" class="service-signals">
            <el-tag
              v-for="signal in getServiceSignals(item)"
              :key="`${item.key}-${signal.key}-${signal.value}`"
              size="small"
              :type="signal.type"
              effect="plain"
              class="service-signal"
            >
              {{ signal.label }}{{ signal.value ? ` ${signal.value}` : "" }}
            </el-tag>
          </div>
          <div v-if="resolveServiceSummary(item)" class="service-detail">
            {{ resolveServiceSummary(item) }}
          </div>
        </div>
      </div>
      <el-empty v-else description="暂无服务状态数据" :image-size="56" />
    </el-card>

    <el-card class="summary-card">
      <div class="summary-grid">
        <div class="summary-item">
          <div class="summary-label">新增</div>
          <div class="summary-value create">{{ summary.create }}</div>
        </div>
        <div class="summary-item">
          <div class="summary-label">删除</div>
          <div class="summary-value delete">{{ summary.delete }}</div>
        </div>
        <div class="summary-item">
          <div class="summary-label">修改</div>
          <div class="summary-value update">{{ summary.update }}</div>
        </div>
        <div class="summary-item">
          <div class="summary-label">查询</div>
          <div class="summary-value read">{{ summary.read }}</div>
        </div>
        <div class="summary-item">
          <div class="summary-label">系统</div>
          <div class="summary-value system">{{ summary.system }}</div>
        </div>
        <div class="summary-item">
          <div class="summary-label">异常</div>
          <div class="summary-value error">{{ summary.error }}</div>
        </div>
      </div>
    </el-card>

    <el-card class="card">
      <div class="toolbar">
        <el-select v-model="filters.source" size="small" style="width: 140px" @change="handleSearch">
          <el-option label="全部来源" value="all" />
          <el-option label="来自 BFF" value="bff" />
          <el-option label="来自 Go" value="go" />
        </el-select>
        <el-select v-model="filters.action" size="small" style="width: 140px" @change="handleSearch">
          <el-option label="全部操作" value="all" />
          <el-option label="新增" value="create" />
          <el-option label="删除" value="delete" />
          <el-option label="修改" value="update" />
          <el-option label="查询" value="read" />
          <el-option label="系统" value="system" />
          <el-option label="异常" value="error" />
        </el-select>
        <el-input
          v-model="filters.keyword"
          size="small"
          clearable
          placeholder="搜索操作、接口、原始日志"
          style="width: 280px"
          @keyup.enter="handleSearch"
          @clear="handleSearch"
        />
        <el-button size="small" @click="resetFilters">重置</el-button>
      </div>

      <PageStateAlert :message="loadError" />

      <div v-if="loading">
        <el-skeleton :rows="10" animated />
      </div>

      <el-table v-else :data="logs" size="small" stripe>
        <el-table-column label="时间" width="180">
          <template #default="{ row }">
            {{ formatTime(row.timestamp) }}
          </template>
        </el-table-column>
        <el-table-column label="来源" width="90">
          <template #default="{ row }">
            <el-tag size="small" :type="row.source === 'bff' ? 'primary' : 'success'">
              {{ row.sourceLabel || row.source }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="类型" width="90">
          <template #default="{ row }">
            <el-tag size="small" :type="actionTagType(row.actionType)">
              {{ row.actionLabel || "-" }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="operation" label="操作说明" min-width="220" show-overflow-tooltip />
        <el-table-column label="操作人" width="150" show-overflow-tooltip>
          <template #default="{ row }">
            <span v-if="row.operatorName">{{ row.operatorName }}</span>
            <span v-else-if="row.operatorId">{{ row.operatorId }}</span>
            <span v-else class="muted-text">-</span>
          </template>
        </el-table-column>
        <el-table-column label="接口" min-width="210" show-overflow-tooltip>
          <template #default="{ row }">
            <span v-if="row.method && row.path">{{ row.method }} {{ row.path }}</span>
            <span v-else class="muted-text">{{ row.message || "-" }}</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <span v-if="row.status">{{ row.status }}</span>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="140" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="openDetail(row)">查看详情</el-button>
            <el-button link type="danger" size="small" @click="openDeleteDialog(row)">删除</el-button>
          </template>
        </el-table-column>
        <template #empty>
          <el-empty
            :description="loadError ? '加载失败，暂时没有可显示数据' : '暂无日志数据'"
            :image-size="90"
          />
        </template>
      </el-table>

      <el-pagination
        v-if="pagination.total > 0"
        v-model:current-page="pagination.page"
        v-model:page-size="pagination.limit"
        :total="pagination.total"
        :page-sizes="[20, 50, 100, 200]"
        layout="total, sizes, prev, pager, next, jumper"
        style="margin-top: 18px; justify-content: center"
        @current-change="loadLogs"
        @size-change="handlePageSizeChange"
      />
    </el-card>

    <el-dialog v-model="detailVisible" title="日志详情（原始格式）" width="760px">
      <el-descriptions :column="2" border size="small">
        <el-descriptions-item label="时间">{{ formatTime(detailLog?.timestamp) }}</el-descriptions-item>
        <el-descriptions-item label="来源">{{ detailLog?.sourceLabel || "-" }}</el-descriptions-item>
        <el-descriptions-item label="操作类型">{{ detailLog?.actionLabel || "-" }}</el-descriptions-item>
        <el-descriptions-item label="级别">{{ detailLog?.level || "-" }}</el-descriptions-item>
        <el-descriptions-item label="操作人">
          {{ detailLog?.operatorName || detailLog?.operatorId || "-" }}
        </el-descriptions-item>
        <el-descriptions-item label="操作人 ID">{{ detailLog?.operatorId || "-" }}</el-descriptions-item>
        <el-descriptions-item label="操作说明" :span="2">{{ detailLog?.operation || "-" }}</el-descriptions-item>
        <el-descriptions-item label="接口" :span="2">{{ formatMethodPath(detailLog) }}</el-descriptions-item>
        <el-descriptions-item label="状态码">{{ detailLog?.status || "-" }}</el-descriptions-item>
        <el-descriptions-item label="IP">{{ detailLog?.ip || "-" }}</el-descriptions-item>
      </el-descriptions>

      <div class="raw-title">原始日志</div>
      <el-input :model-value="detailLog?.raw || '-'" type="textarea" :rows="14" readonly />
      <template #footer>
        <el-button @click="detailVisible = false">关闭</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="deleteDialogVisible" title="删除日志（二次验证）" width="460px">
      <el-form :model="deleteVerifyForm" label-width="80px">
        <el-form-item label="账号">
          <el-input v-model="deleteVerifyForm.verifyAccount" placeholder="请输入验证账号" />
        </el-form-item>
        <el-form-item label="密码">
          <el-input
            v-model="deleteVerifyForm.verifyPassword"
            type="password"
            show-password
            placeholder="请输入验证密码"
            @keyup.enter="confirmDeleteLog"
          />
        </el-form-item>
      </el-form>
      <div class="delete-tip">删除后无法恢复，并且会留下完整审计记录。</div>
      <template #footer>
        <el-button @click="deleteDialogVisible = false">取消</el-button>
        <el-button type="danger" :loading="deleting" @click="confirmDeleteLog">确认删除</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="clearDialogVisible" title="一键清空系统日志（二次验证）" width="460px">
      <el-form :model="clearVerifyForm" label-width="80px">
        <el-form-item label="账号">
          <el-input v-model="clearVerifyForm.verifyAccount" placeholder="请输入验证账号" />
        </el-form-item>
        <el-form-item label="密码">
          <el-input
            v-model="clearVerifyForm.verifyPassword"
            type="password"
            show-password
            placeholder="请输入验证密码"
            @keyup.enter="confirmClearLogs"
          />
        </el-form-item>
      </el-form>
      <div class="delete-tip">
        即将清空 <strong>{{ clearSourceLabel }}</strong> 的日志数据，操作不可恢复。
      </div>
      <template #footer>
        <el-button @click="clearDialogVisible = false">取消</el-button>
        <el-button type="danger" :loading="clearing" @click="confirmClearLogs">确认清空</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from "vue";
import { ElMessage } from "element-plus";
import request from "@/utils/request";
import PageStateAlert from "@/components/PageStateAlert.vue";

const SIGNAL_LABELS = {
  error: "错误",
  redisConnected: "Redis 连接",
  redisMode: "Redis 模式",
  adapterEnabled: "Adapter 已启用",
  fallbackMessages: "Fallback 消息数",
  fallbackChats: "Fallback 会话数",
  fallbackOldestAge: "Fallback 最老年龄",
  fallbackDisabledPurged: "禁用后清理",
  fallbackExpiredPruned: "过期裁剪",
  fallbackOverflowPruned: "溢出裁剪",
  goApiOk: "Go 可用",
  goApiProbe: "Go 探针",
  goApiError: "Go 错误",
  pushWorkerOk: "推送 Worker",
  pushEnabled: "推送已启用",
  pushRunning: "推送运行中",
  pushProvider: "推送通道",
  pushCycle: "最近周期",
  pushLastSuccessAt: "最近成功",
  pushConsecutiveFailures: "连续失败",
  pushProcessed: "最近处理数",
  pushError: "推送错误",
  pushQueue: "推送队列",
  pushQueued: "待派发",
  pushRetry: "待重试",
  pushDispatching: "派发中",
  pushFailed: "失败数",
  pushOldestQueuedAt: "最老排队时间",
  pushOldestQueuedAgeSeconds: "最老排队年龄",
  pushOldestRetryPendingAt: "最老重试时间",
  pushOldestRetryPendingAgeSeconds: "最老重试年龄",
  pushOldestDispatchingAt: "最老派发时间",
  pushOldestDispatchingAgeSeconds: "最老派发年龄",
  pushLatestSentAt: "最近派发",
  pushLatestFailedAt: "最近失败",
  pushLatestAcknowledgedAt: "最近确认"
};

const TIME_SIGNAL_KEYS = new Set([
  "pushLastSuccessAt",
  "pushOldestQueuedAt",
  "pushOldestRetryPendingAt",
  "pushOldestDispatchingAt",
  "pushLatestSentAt",
  "pushLatestFailedAt",
  "pushLatestAcknowledgedAt"
]);

const AGE_SIGNAL_KEYS = new Set([
  "fallbackOldestAge",
  "pushOldestQueuedAgeSeconds",
  "pushOldestRetryPendingAgeSeconds",
  "pushOldestDispatchingAgeSeconds"
]);

const loading = ref(false);
const loadError = ref("");
const logs = ref([]);
const detailVisible = ref(false);
const detailLog = ref(null);
const deleteDialogVisible = ref(false);
const deleting = ref(false);
const pendingDeleteLog = ref(null);
const clearDialogVisible = ref(false);
const clearing = ref(false);

const summary = reactive({
  create: 0,
  delete: 0,
  update: 0,
  read: 0,
  system: 0,
  error: 0
});

const serviceStatus = reactive({
  checkedAt: "",
  overall: "unknown",
  services: []
});

const filters = reactive({
  source: "all",
  action: "all",
  keyword: ""
});

const pagination = reactive({
  page: 1,
  limit: 50,
  total: 0
});

const deleteVerifyForm = reactive({
  verifyAccount: "",
  verifyPassword: ""
});

const clearVerifyForm = reactive({
  verifyAccount: "",
  verifyPassword: ""
});

const clearSourceLabel = computed(() => {
  if (filters.source === "bff") return "BFF 来源";
  if (filters.source === "go") return "Go 来源";
  return "全部来源";
});

function actionTagType(actionType) {
  if (actionType === "create") return "success";
  if (actionType === "delete") return "danger";
  if (actionType === "update") return "warning";
  if (actionType === "read") return "info";
  if (actionType === "error") return "danger";
  return "";
}

function serviceTagType(status) {
  if (status === "up" || status === "ok" || status === "ready") return "success";
  if (status === "degraded") return "warning";
  if (status === "down" || status === "error") return "danger";
  return "info";
}

function serviceStatusText(status) {
  if (status === "up" || status === "ok" || status === "ready") return "在线";
  if (status === "degraded") return "降级";
  if (status === "down" || status === "error") return "异常";
  return "未知";
}

function formatProbeType(probe) {
  if (probe === "ready") return "/ready";
  if (probe === "health") return "/health";
  if (probe === "tcp") return "TCP";
  return String(probe || "-");
}

function overallStatusText(status) {
  if (status === "ok" || status === "ready") return "整体正常";
  if (status === "degraded") return "核心正常，存在降级";
  if (status === "down") return "核心异常";
  return "状态未知";
}

function formatTime(raw) {
  if (!raw) return "-";
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    return String(raw);
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  const second = String(date.getSeconds()).padStart(2, "0");
  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}

function formatMethodPath(item) {
  if (item?.method && item?.path) {
    return `${item.method} ${item.path}`;
  }
  return item?.message || "-";
}

function toDisplayLabel(key) {
  if (SIGNAL_LABELS[key]) {
    return SIGNAL_LABELS[key];
  }
  return String(key || "")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .trim();
}

function formatAgeSeconds(seconds) {
  const numeric = Number(seconds);
  if (!Number.isFinite(numeric) || numeric <= 0) return "0 秒";
  if (numeric < 60) return `${numeric} 秒`;
  const minutes = Math.floor(numeric / 60);
  if (minutes < 60) return `${minutes} 分钟`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小时`;
  const days = Math.floor(hours / 24);
  return `${days} 天`;
}

function formatAgeMs(ms) {
  const numeric = Number(ms);
  if (!Number.isFinite(numeric) || numeric <= 0) return "0 秒";
  return formatAgeSeconds(Math.floor(numeric / 1000));
}

function normalizeSignalValue(key, value) {
  const text = String(value ?? "").trim();
  if (!text) return "";

  if (text === "true") return "正常";
  if (text === "false") return "异常";

  if (key === "fallbackOldestAge" && /^\d+$/.test(text)) {
    return formatAgeMs(text);
  }

  if (AGE_SIGNAL_KEYS.has(key) && /^\d+$/.test(text)) {
    return formatAgeSeconds(text);
  }

  if (TIME_SIGNAL_KEYS.has(key)) {
    return formatTime(text);
  }

  return text;
}

function resolveSignalType(key, rawValue) {
  const value = String(rawValue ?? "").trim();
  const numeric = Number(value);

  if (key.endsWith("Error") || key === "error" || key === "pushError" || key === "goApiError") {
    return "danger";
  }

  if (["redisConnected", "adapterEnabled", "goApiOk", "pushWorkerOk", "pushEnabled", "pushRunning"].includes(key)) {
    return value === "true" ? "success" : "danger";
  }

  if (key === "redisMode") {
    if (value === "redis") return "success";
    if (value) return "warning";
  }

  if (key === "goApiProbe") {
    return "info";
  }

  if (key === "pushCycle") {
    if (value === "ok") return "success";
    if (value === "dispatching") return "info";
    return "warning";
  }

  if (key === "fallbackOldestAge") {
    return "warning";
  }

  if ([
    "fallbackMessages",
    "fallbackChats",
    "fallbackDisabledPurged",
    "pushQueue",
    "pushQueued",
    "pushRetry",
    "pushDispatching",
    "pushFailed",
    "pushConsecutiveFailures",
    "pushOldestQueuedAgeSeconds",
    "pushOldestRetryPendingAgeSeconds",
    "pushOldestDispatchingAgeSeconds"
  ].includes(key)) {
    if (!Number.isFinite(numeric) || numeric <= 0) {
      return "info";
    }
    if (["pushFailed", "pushConsecutiveFailures"].includes(key)) {
      return numeric >= 3 ? "danger" : "warning";
    }
    if (AGE_SIGNAL_KEYS.has(key)) {
      return numeric >= 900 ? "danger" : "warning";
    }
    return "warning";
  }

  return "info";
}

function parseServiceDetail(detail) {
  return String(detail || "")
    .split("|")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const separatorIndex = part.indexOf("=");
      if (separatorIndex === -1) {
        return {
          key: part,
          label: part,
          value: "",
          rawValue: "",
          type: "info"
        };
      }

      const key = part.slice(0, separatorIndex).trim();
      const rawValue = part.slice(separatorIndex + 1).trim();
      return {
        key,
        label: toDisplayLabel(key),
        value: normalizeSignalValue(key, rawValue),
        rawValue,
        type: resolveSignalType(key, rawValue)
      };
    });
}

function getServiceSignals(item) {
  return parseServiceDetail(item?.detail)
    .filter((signal) => signal.key !== "status")
    .slice(0, 14);
}

function resolveServiceSummary(item) {
  if (!item?.detail) return "";
  const signals = parseServiceDetail(item.detail);
  if (signals.length === 0) return "";
  return signals
    .slice(0, 4)
    .map((signal) => `${signal.label}${signal.value ? `：${signal.value}` : ""}`)
    .join("，");
}

async function loadLogs() {
  loading.value = true;
  loadError.value = "";

  try {
    const params = {
      page: pagination.page,
      limit: pagination.limit,
      source: filters.source,
      action: filters.action
    };
    if (filters.keyword.trim()) {
      params.keyword = filters.keyword.trim();
    }

    const { data } = await request.get("/api/system-logs", { params });
    logs.value = Array.isArray(data?.items) ? data.items : [];
    pagination.total = Number(data?.pagination?.total || 0);

    const nextSummary = data?.summary || {};
    summary.create = Number(nextSummary.create || 0);
    summary.delete = Number(nextSummary.delete || 0);
    summary.update = Number(nextSummary.update || 0);
    summary.read = Number(nextSummary.read || 0);
    summary.system = Number(nextSummary.system || 0);
    summary.error = Number(nextSummary.error || 0);

    const nextServiceStatus = data?.serviceStatus || {};
    serviceStatus.checkedAt = String(nextServiceStatus.checkedAt || "");
    serviceStatus.overall = String(nextServiceStatus.overall || "unknown");
    serviceStatus.services = Array.isArray(nextServiceStatus.services) ? nextServiceStatus.services : [];
  } catch (error) {
    logs.value = [];
    pagination.total = 0;
    summary.create = 0;
    summary.delete = 0;
    summary.update = 0;
    summary.read = 0;
    summary.system = 0;
    summary.error = 0;
    serviceStatus.checkedAt = "";
    serviceStatus.overall = "unknown";
    serviceStatus.services = [];
    loadError.value = error?.response?.data?.error || error?.message || "加载系统日志失败，请稍后重试";
    ElMessage.error("加载系统日志失败");
  } finally {
    loading.value = false;
  }
}

function handleSearch() {
  pagination.page = 1;
  void loadLogs();
}

function handlePageSizeChange() {
  pagination.page = 1;
  void loadLogs();
}

function resetFilters() {
  filters.source = "all";
  filters.action = "all";
  filters.keyword = "";
  pagination.page = 1;
  void loadLogs();
}

function openDetail(item) {
  detailLog.value = item;
  detailVisible.value = true;
}

function openDeleteDialog(item) {
  pendingDeleteLog.value = item;
  deleteVerifyForm.verifyAccount = "";
  deleteVerifyForm.verifyPassword = "";
  deleteDialogVisible.value = true;
}

function openClearDialog() {
  clearVerifyForm.verifyAccount = "";
  clearVerifyForm.verifyPassword = "";
  clearDialogVisible.value = true;
}

async function confirmDeleteLog() {
  if (!pendingDeleteLog.value) return;
  if (!deleteVerifyForm.verifyAccount || !deleteVerifyForm.verifyPassword) {
    ElMessage.warning("请输入验证账号和密码");
    return;
  }

  deleting.value = true;
  try {
    await request.post("/api/system-logs/delete", {
      source: pendingDeleteLog.value.source,
      raw: pendingDeleteLog.value.raw,
      verifyAccount: deleteVerifyForm.verifyAccount,
      verifyPassword: deleteVerifyForm.verifyPassword
    });
    ElMessage.success("日志已删除");
    deleteDialogVisible.value = false;
    pendingDeleteLog.value = null;
    await loadLogs();
  } catch (error) {
    ElMessage.error(error?.response?.data?.error || "删除日志失败");
  } finally {
    deleting.value = false;
  }
}

async function confirmClearLogs() {
  if (!clearVerifyForm.verifyAccount || !clearVerifyForm.verifyPassword) {
    ElMessage.warning("请输入验证账号和密码");
    return;
  }

  clearing.value = true;
  try {
    await request.post("/api/system-logs/clear", {
      source: filters.source,
      verifyAccount: clearVerifyForm.verifyAccount,
      verifyPassword: clearVerifyForm.verifyPassword
    });
    ElMessage.success("系统日志已清空");
    clearDialogVisible.value = false;
    pagination.page = 1;
    await loadLogs();
  } catch (error) {
    ElMessage.error(error?.response?.data?.error || "清空日志失败");
  } finally {
    clearing.value = false;
  }
}

onMounted(() => {
  void loadLogs();
});
</script>

<style scoped lang="css" src="./SystemLogs.css"></style>
