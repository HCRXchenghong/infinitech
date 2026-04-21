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
            <span v-if="item.latencyMs !== null && item.latencyMs !== undefined">
              延迟 {{ item.latencyMs }}ms
            </span>
            <span v-if="item.error" class="service-error">{{ item.error }}</span>
          </div>
          <div v-if="getServiceSignals(item).length > 0" class="service-signals">
            <el-tag
              v-for="signal in getServiceSignals(item)"
              :key="`${item.key}-${signal.key}-${signal.rawValue}`"
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
          <el-option
            v-for="option in SYSTEM_LOG_SOURCE_OPTIONS"
            :key="option.value"
            :label="option.label"
            :value="option.value"
          />
        </el-select>
        <el-select v-model="filters.action" size="small" style="width: 140px" @change="handleSearch">
          <el-option
            v-for="option in SYSTEM_LOG_ACTION_OPTIONS"
            :key="option.value"
            :label="option.label"
            :value="option.value"
          />
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
            :description="loadError ? '加载失败，暂无可显示数据' : '暂无日志数据'"
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
import { ElMessage } from 'element-plus';
import request from '@/utils/request';
import PageStateAlert from '@/components/PageStateAlert.vue';
import { useSystemLogsPage } from './systemLogsHelpers';

const {
  actionTagType,
  clearDialogVisible,
  clearSourceLabel,
  clearVerifyForm,
  clearing,
  confirmClearLogs,
  confirmDeleteLog,
  deleteDialogVisible,
  deleteVerifyForm,
  deleting,
  detailLog,
  detailVisible,
  filters,
  formatMethodPath,
  formatProbeType,
  formatTime,
  getServiceSignals,
  handlePageSizeChange,
  handleSearch,
  loadError,
  loadLogs,
  loading,
  logs,
  openClearDialog,
  openDeleteDialog,
  openDetail,
  overallStatusText,
  pagination,
  resolveServiceSummary,
  resetFilters,
  serviceStatus,
  serviceStatusText,
  serviceTagType,
  summary,
  SYSTEM_LOG_ACTION_OPTIONS,
  SYSTEM_LOG_SOURCE_OPTIONS,
} = useSystemLogsPage({
  request,
  ElMessage,
});
</script>

<style scoped lang="css" src="./SystemLogs.css"></style>
