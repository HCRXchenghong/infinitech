<template>
  <div class="page">
    <div class="title-row">
      <span class="title">财务日志</span>
      <div style="display:flex;gap:8px;align-items:center;">
        <el-select v-model="logFilter.type" placeholder="交易类型" size="small" clearable style="width:140px" @change="loadTransactionLogs">
          <el-option label="充值" value="recharge" />
          <el-option label="提现" value="withdraw" />
          <el-option label="支付" value="payment" />
          <el-option label="退款" value="refund" />
          <el-option label="赔付" value="compensation" />
          <el-option label="管理员充值" value="admin_add_balance" />
          <el-option label="管理员扣款" value="admin_deduct_balance" />
        </el-select>
        <el-select v-model="logFilter.userType" placeholder="用户类型" size="small" clearable style="width:120px" @change="loadTransactionLogs">
          <el-option label="用户" value="customer" />
          <el-option label="骑手" value="rider" />
          <el-option label="商户" value="merchant" />
        </el-select>
        <el-select v-model="logFilter.status" placeholder="状态" size="small" clearable style="width:120px" @change="loadTransactionLogs">
          <el-option label="成功" value="success" />
          <el-option label="处理中" value="processing" />
          <el-option label="失败" value="failed" />
          <el-option label="已取消" value="cancelled" />
        </el-select>
        <el-input v-model="logFilter.userId" placeholder="用户ID" size="small" clearable style="width:140px" @keyup.enter="loadTransactionLogs">
          <template #append>
            <el-button :icon="Search" @click="loadTransactionLogs" />
          </template>
        </el-input>
        <el-date-picker
          v-model="dateRange"
          type="daterange"
          range-separator="-"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          size="small"
          value-format="YYYY-MM-DD"
          style="width:240px"
          @change="loadTransactionLogs"
        />
        <el-button size="small" :loading="logsLoading" @click="loadTransactionLogs">刷新</el-button>
        <el-button size="small" @click="resetFilters">重置</el-button>
        <el-button
          type="danger"
          plain
          size="small"
          :disabled="logsLoading"
          @click="openClearDialog"
        >
          一键清除
        </el-button>
      </div>
    </div>

    <el-card class="card">
      <PageStateAlert :message="loadError" />
      <div v-if="logsLoading"><el-skeleton :rows="10" animated /></div>
      <el-table v-else :data="transactionLogs" size="small" stripe>
        <el-table-column prop="transactionId" label="交易ID" width="200" show-overflow-tooltip />
        <el-table-column label="用户" width="140">
          <template #default="{ row }">
            <div style="display:flex;flex-direction:column;gap:2px">
              <span style="font-size:12px;color:#909399">{{ formatUserType(row.userType) }}</span>
              <span style="font-size:13px;color:#303133">#{{ row.userId }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="类型" width="120">
          <template #default="{ row }">
            <el-tag :type="getTypeTagType(row.type)" size="small">
              {{ formatTransactionType(row.type) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="金额" width="120" align="right">
          <template #default="{ row }">
            <span :style="{ color: isIncomeType(row.type) ? '#67c23a' : '#f56c6c', fontWeight: 600 }">
              {{ isIncomeType(row.type) ? '+' : '-' }}¥{{ fen2yuan(row.amount) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="余额变化" width="200" align="right">
          <template #default="{ row }">
            <span style="color:#909399;font-size:12px">¥{{ fen2yuan(row.balanceBefore) }}</span>
            <span style="margin:0 6px;color:#909399">→</span>
            <span style="color:#303133;font-weight:600">¥{{ fen2yuan(row.balanceAfter) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-tag :type="getFinancialTransactionStatusTagType(row.status)" size="small">
              {{ formatStatus(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="支付方式" width="100">
          <template #default="{ row }">{{ row.paymentMethod || '-' }}</template>
        </el-table-column>
        <el-table-column prop="description" label="说明" min-width="180" show-overflow-tooltip />
        <el-table-column label="操作员" width="120" show-overflow-tooltip>
          <template #default="{ row }">
            <div v-if="row.operatorName" style="display:flex;flex-direction:column;gap:2px">
              <span style="font-size:13px">{{ row.operatorName }}</span>
              <span style="font-size:11px;color:#909399">{{ row.operatorId }}</span>
            </div>
            <span v-else style="color:#c0c4cc">-</span>
          </template>
        </el-table-column>
        <el-table-column label="时间" width="170">
          <template #default="{ row }">{{ formatDateTime(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="140" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="showDetail(row)">详情</el-button>
            <el-button link type="danger" size="small" @click="openDeleteDialog(row)">删除</el-button>
          </template>
        </el-table-column>
        <template #empty>
          <el-empty :description="loadError ? '加载失败，暂无可显示数据' : '暂无日志数据'" :image-size="90" />
        </template>
      </el-table>
      <el-pagination
        v-if="logPagination.total > 0"
        v-model:current-page="logPagination.page"
        v-model:page-size="logPagination.limit"
        :total="logPagination.total"
        :page-sizes="[20, 50, 100, 200]"
        layout="total, sizes, prev, pager, next, jumper"
        style="margin-top:20px;justify-content:center"
        @current-change="loadTransactionLogs"
        @size-change="loadTransactionLogs"
      />
    </el-card>

    <!-- 详情弹窗 -->
    <el-dialog v-model="detailVisible" title="交易详情" width="600px" align-center>
      <el-descriptions :column="2" border size="small">
        <el-descriptions-item label="交易ID" :span="2">{{ detailData.transactionId }}</el-descriptions-item>
        <el-descriptions-item label="用户ID">{{ detailData.userId }}</el-descriptions-item>
        <el-descriptions-item label="用户类型">{{ formatUserType(detailData.userType) }}</el-descriptions-item>
        <el-descriptions-item label="交易类型">{{ formatTransactionType(detailData.type) }}</el-descriptions-item>
        <el-descriptions-item label="业务类型">{{ detailData.businessType || '-' }}</el-descriptions-item>
        <el-descriptions-item label="业务ID" :span="2">{{ detailData.businessId || '-' }}</el-descriptions-item>
        <el-descriptions-item label="金额">¥{{ fen2yuan(detailData.amount) }}</el-descriptions-item>
        <el-descriptions-item label="状态">{{ formatStatus(detailData.status) }}</el-descriptions-item>
        <el-descriptions-item label="变动前余额">¥{{ fen2yuan(detailData.balanceBefore) }}</el-descriptions-item>
        <el-descriptions-item label="变动后余额">¥{{ fen2yuan(detailData.balanceAfter) }}</el-descriptions-item>
        <el-descriptions-item label="支付方式">{{ detailData.paymentMethod || '-' }}</el-descriptions-item>
        <el-descriptions-item label="支付渠道">{{ detailData.paymentChannel || '-' }}</el-descriptions-item>
        <el-descriptions-item label="操作员ID">{{ detailData.operatorId || '-' }}</el-descriptions-item>
        <el-descriptions-item label="操作员姓名">{{ detailData.operatorName || '-' }}</el-descriptions-item>
        <el-descriptions-item label="创建时间" :span="2">{{ formatDateTime(detailData.createdAt) }}</el-descriptions-item>
        <el-descriptions-item label="完成时间" :span="2">{{ formatDateTime(detailData.completedAt) }}</el-descriptions-item>
        <el-descriptions-item label="说明" :span="2">{{ detailData.description || '-' }}</el-descriptions-item>
        <el-descriptions-item label="备注" :span="2">{{ detailData.remark || '-' }}</el-descriptions-item>
      </el-descriptions>
      <template #footer>
        <el-button @click="detailVisible = false">关闭</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="deleteDialogVisible" title="删除财务日志（二次验证）" width="460px">
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
      <div class="delete-tip">删除后无法恢复，且会记录“谁删除了哪条财务日志”。</div>
      <template #footer>
        <el-button @click="deleteDialogVisible = false">取消</el-button>
        <el-button type="danger" :loading="deleting" @click="confirmDeleteLog">确认删除</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="clearDialogVisible" title="一键清除财务日志（二次验证）" width="460px">
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
      <div class="delete-tip">确认后将清空全部财务日志，操作不可恢复。</div>
      <template #footer>
        <el-button @click="clearDialogVisible = false">取消</el-button>
        <el-button type="danger" :loading="clearing" @click="confirmClearLogs">确认清除</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { Search } from '@element-plus/icons-vue';
import {
  extractFinancialTransactionLogPage,
  formatFinancialAmountYuan as fen2yuan,
  formatFinancialTransactionStatus as formatStatus,
  formatFinancialTransactionType as formatTransactionType,
  formatFinancialTransactionUserType as formatUserType,
  getFinancialTransactionStatusTagType,
  getFinancialTransactionTypeTagType as getTypeTagType,
  isFinancialTransactionIncomeType as isIncomeType,
} from '@infinitech/admin-core';
import { extractErrorMessage } from '@infinitech/contracts';
import request from '../utils/request';
import PageStateAlert from '@/components/PageStateAlert.vue';

const transactionLogs = ref([]);
const logsLoading = ref(false);
const loadError = ref('');
const logFilter = ref({ type: '', userType: '', status: '', userId: '' });
const logPagination = ref({ page: 1, limit: 50, total: 0 });
const dateRange = ref([]);

const detailVisible = ref(false);
const detailData = ref({});
const pendingDeleteLog = ref(null);
const deleteDialogVisible = ref(false);
const clearDialogVisible = ref(false);
const deleting = ref(false);
const clearing = ref(false);
const deleteVerifyForm = reactive({
  verifyAccount: '',
  verifyPassword: '',
});
const clearVerifyForm = reactive({
  verifyAccount: '',
  verifyPassword: '',
});

function formatDateTime(d) { return d ? String(d).slice(0, 19).replace('T', ' ') : '-'; }

async function loadTransactionLogs() {
  logsLoading.value = true;
  loadError.value = '';
  try {
    const params = {
      page: logPagination.value.page,
      limit: logPagination.value.limit,
    };
    if (logFilter.value.type) params.type = logFilter.value.type;
    if (logFilter.value.userType) params.userType = logFilter.value.userType;
    if (logFilter.value.status) params.status = logFilter.value.status;
    if (logFilter.value.userId) params.userId = logFilter.value.userId;
    if (dateRange.value && dateRange.value.length === 2) {
      params.startDate = dateRange.value[0];
      params.endDate = dateRange.value[1];
    }

    const res = await request.get('/api/financial/transaction-logs', { params });
    const page = extractFinancialTransactionLogPage(res.data);
    transactionLogs.value = page.items;
    logPagination.value.total = page.total;
  } catch (e) {
    loadError.value = extractErrorMessage(e, '加载财务日志失败，请稍后重试');
    ElMessage.error(loadError.value);
    transactionLogs.value = [];
    logPagination.value.total = 0;
  } finally {
    logsLoading.value = false;
  }
}

function resetFilters() {
  logFilter.value = { type: '', userType: '', status: '', userId: '' };
  dateRange.value = [];
  logPagination.value.page = 1;
  loadTransactionLogs();
}

function showDetail(row) {
  detailData.value = row;
  detailVisible.value = true;
}

function openDeleteDialog(row) {
  pendingDeleteLog.value = row;
  deleteVerifyForm.verifyAccount = '';
  deleteVerifyForm.verifyPassword = '';
  deleteDialogVisible.value = true;
}

function openClearDialog() {
  clearVerifyForm.verifyAccount = '';
  clearVerifyForm.verifyPassword = '';
  clearDialogVisible.value = true;
}

async function confirmDeleteLog() {
  const recordId = String(pendingDeleteLog.value?.recordId || pendingDeleteLog.value?.id || '').trim();
  if (!recordId) {
    ElMessage.warning('未找到可删除的日志');
    return;
  }
  if (!deleteVerifyForm.verifyAccount || !deleteVerifyForm.verifyPassword) {
    ElMessage.warning('请输入验证账号和密码');
    return;
  }

  deleting.value = true;
  try {
    await request.post('/api/financial/transaction-logs/delete', {
      id: recordId,
      recordId,
      sourceType: pendingDeleteLog.value?.sourceType || 'wallet_transaction',
      verifyAccount: deleteVerifyForm.verifyAccount,
      verifyPassword: deleteVerifyForm.verifyPassword,
    });
    ElMessage.success('财务日志已删除');
    deleteDialogVisible.value = false;
    pendingDeleteLog.value = null;
    loadTransactionLogs();
  } catch (error) {
    ElMessage.error(extractErrorMessage(error, '删除财务日志失败'));
  } finally {
    deleting.value = false;
  }
}

async function confirmClearLogs() {
  if (!clearVerifyForm.verifyAccount || !clearVerifyForm.verifyPassword) {
    ElMessage.warning('请输入验证账号和密码');
    return;
  }

  clearing.value = true;
  try {
    await request.post('/api/financial/transaction-logs/clear', {
      verifyAccount: clearVerifyForm.verifyAccount,
      verifyPassword: clearVerifyForm.verifyPassword,
    });
    ElMessage.success('财务日志已清空');
    clearDialogVisible.value = false;
    logPagination.value.page = 1;
    loadTransactionLogs();
  } catch (error) {
    ElMessage.error(extractErrorMessage(error, '清空财务日志失败'));
  } finally {
    clearing.value = false;
  }
}

onMounted(loadTransactionLogs);
</script>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.title {
  font-size: 18px;
  font-weight: 800;
}

.empty-tip {
  padding: 40px 0;
}

.delete-tip {
  color: #f56c6c;
  font-size: 13px;
}
</style>
