<template>
  <div class="after-sales-page">
    <el-card class="toolbar-card" shadow="never">
      <div class="toolbar">
        <el-input
          v-model="searchKeyword"
          clearable
          placeholder="搜索售后单号/订单号/手机号/用户ID"
          style="width: 340px"
          @keyup.enter="handleSearch"
        />
        <el-select v-model="statusFilter" clearable placeholder="全部状态" style="width: 160px">
          <el-option
            v-for="item in statusOptions"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
        <el-button type="primary" @click="handleSearch">查询</el-button>
        <el-button @click="handleReset">重置</el-button>
        <el-button type="danger" :loading="clearing" @click="openClearSelector">一键清除</el-button>
      </div>
    </el-card>

    <el-card shadow="never">
      <PageStateAlert :message="loadError" />
      <el-table v-loading="loading" :data="records" stripe>
        <el-table-column prop="requestNo" label="售后单号" min-width="190" />
        <el-table-column prop="orderNo" label="订单号" min-width="150" />
        <el-table-column prop="userId" label="用户ID" min-width="120" />
        <el-table-column prop="contactPhone" label="联系电话" min-width="130" />
        <el-table-column prop="typeText" label="售后类型" min-width="110" />
        <el-table-column label="申请退款" min-width="120">
          <template #default="{ row }">
            {{ row.requestedRefundAmount > 0 ? `¥${fen2yuan(row.requestedRefundAmount)}` : '-' }}
          </template>
        </el-table-column>
        <el-table-column label="状态" width="110">
          <template #default="{ row }">
            <el-tag :type="statusTagType(row.status)">{{ row.statusText }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="提交时间" min-width="170">
          <template #default="{ row }">
            {{ formatDateTime(row.createdAt || row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openDetail(row)">查看</el-button>
            <el-button link type="warning" @click="openProcess(row)">处理</el-button>
          </template>
        </el-table-column>
        <template #empty>
          <el-empty :description="loadError ? '加载失败，暂无可显示数据' : '暂无售后数据'" :image-size="90" />
        </template>
      </el-table>

      <div class="pagination-wrap">
        <el-pagination
          v-model:current-page="page"
          v-model:page-size="pageSize"
          background
          layout="total, sizes, prev, pager, next, jumper"
          :total="total"
          :page-sizes="[10, 20, 50]"
          @size-change="handleSizeChange"
          @current-change="fetchRecords"
        />
      </div>
    </el-card>

    <el-dialog v-model="detailVisible" title="售后申请详情" width="760px">
      <template v-if="detailRecord">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="售后单号">{{ detailRecord.requestNo }}</el-descriptions-item>
          <el-descriptions-item label="订单号">{{ detailRecord.orderNo || '-' }}</el-descriptions-item>
          <el-descriptions-item label="用户ID">{{ detailRecord.userId }}</el-descriptions-item>
          <el-descriptions-item label="联系电话">{{ detailRecord.contactPhone || '-' }}</el-descriptions-item>
          <el-descriptions-item label="售后类型">{{ detailRecord.typeText }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="statusTagType(detailRecord.status)">{{ detailRecord.statusText }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="申请退款">
            {{ detailRecord.requestedRefundAmount > 0 ? `¥${fen2yuan(detailRecord.requestedRefundAmount)}` : '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="退款决策">
            <el-tag :type="detailRecord.shouldRefund ? 'success' : 'info'">
              {{ detailRecord.shouldRefund ? '退款' : '不退款' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="实际退款">
            {{ detailRecord.refundAmount > 0 ? `¥${fen2yuan(detailRecord.refundAmount)}` : '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="退款流水号">
            {{ detailRecord.refundTransactionId || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="提交时间">
            {{ formatDateTime(detailRecord.createdAt || detailRecord.created_at) }}
          </el-descriptions-item>
          <el-descriptions-item label="更新时间">
            {{ formatDateTime(detailRecord.updatedAt || detailRecord.updated_at) }}
          </el-descriptions-item>
        </el-descriptions>

        <div class="section-title">问题描述</div>
        <div class="section-content">{{ detailRecord.problemDesc || '-' }}</div>

        <div class="section-title">申请商品</div>
        <el-table :data="detailRecord.selectedProducts || []" size="small" border>
          <el-table-column prop="name" label="商品名" min-width="140" />
          <el-table-column prop="spec" label="规格" min-width="120" />
          <el-table-column prop="price" label="单价" min-width="90" />
          <el-table-column prop="count" label="数量" min-width="80" />
        </el-table>

        <div class="section-title">凭证图片</div>
        <div class="image-list">
          <el-image
            v-for="(url, idx) in detailRecord.evidenceImages || []"
            :key="idx"
            :src="url"
            :preview-src-list="detailRecord.evidenceImages || []"
            fit="cover"
            class="evidence-image"
          />
          <span v-if="!detailRecord.evidenceImages || detailRecord.evidenceImages.length === 0">未上传</span>
        </div>

        <div class="section-title">处理备注</div>
        <div class="section-content">{{ detailRecord.adminRemark || '-' }}</div>
      </template>
    </el-dialog>

    <el-dialog v-model="processVisible" title="处理售后申请" width="520px">
      <el-form label-width="90px">
        <el-form-item label="售后单号">
          <span>{{ processForm.requestNo }}</span>
        </el-form-item>
        <el-form-item label="申请退款">
          <span>{{ processForm.requestedRefundAmount > 0 ? `¥${fen2yuan(processForm.requestedRefundAmount)}` : '-' }}</span>
        </el-form-item>
        <el-form-item label="处理状态">
          <el-select v-model="processForm.status" style="width: 100%">
            <el-option
              v-for="item in statusOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="退款处理">
          <el-radio-group v-model="processForm.shouldRefund">
            <el-radio :label="true">退款</el-radio>
            <el-radio :label="false">不退款</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="processForm.shouldRefund" label="退款金额">
          <el-input
            v-model="processForm.refundAmountYuan"
            placeholder="请输入退款金额（元）"
            clearable
          >
            <template #prepend>¥</template>
          </el-input>
        </el-form-item>
        <el-form-item label="退款说明">
          <el-input
            v-model="processForm.refundReason"
            type="textarea"
            :rows="2"
            placeholder="请输入退款/不退款说明（可选）"
          />
        </el-form-item>
        <el-form-item label="处理备注">
          <el-input
            v-model="processForm.adminRemark"
            type="textarea"
            :rows="4"
            placeholder="请输入处理说明（可选）"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="processVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitProcess">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import { extractAfterSalesPage } from '@infinitech/admin-core';
import { ElMessage, ElMessageBox } from 'element-plus';
import { extractEnvelopeData, extractErrorMessage } from '@infinitech/contracts';
import request from '@/utils/request';
import PageStateAlert from '@/components/PageStateAlert.vue';

const loading = ref(false);
const loadError = ref('');
const submitting = ref(false);
const clearing = ref(false);
const records = ref([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(20);
const searchKeyword = ref('');
const statusFilter = ref('');

const detailVisible = ref(false);
const detailRecord = ref(null);
const processVisible = ref(false);
const processForm = ref({
  id: null,
  requestNo: '',
  status: 'pending',
  adminRemark: '',
  shouldRefund: false,
  requestedRefundAmount: 0,
  refundAmountYuan: '',
  refundReason: '',
  refundTransactionId: ''
});

const statusOptions = [
  { label: '待处理', value: 'pending' },
  { label: '处理中', value: 'processing' },
  { label: '已通过', value: 'approved' },
  { label: '已拒绝', value: 'rejected' },
  { label: '已完成', value: 'completed' }
];

function normalizeRecord(raw) {
  return {
    id: raw.id,
    requestNo: raw.requestNo || raw.request_no || '',
    orderNo: raw.orderNo || raw.order_no || '',
    userId: raw.userId || raw.user_id || '',
    contactPhone: raw.contactPhone || raw.contact_phone || '',
    type: raw.type || '',
    typeText: raw.typeText || raw.type || '',
    status: raw.status || 'pending',
    statusText: raw.statusText || raw.status || '待处理',
    problemDesc: raw.problemDesc || raw.problem_desc || '',
    selectedProducts: Array.isArray(raw.selectedProducts)
      ? raw.selectedProducts
      : Array.isArray(raw.selected_products)
        ? raw.selected_products
        : [],
    evidenceImages: Array.isArray(raw.evidenceImages)
      ? raw.evidenceImages
      : Array.isArray(raw.evidence_images)
        ? raw.evidence_images
        : [],
    adminRemark: raw.adminRemark || raw.admin_remark || '',
    requestedRefundAmount: Number(raw.requestedRefundAmount ?? raw.requested_refund_amount ?? 0) || 0,
    shouldRefund: toBoolean(raw.shouldRefund ?? raw.should_refund ?? false),
    refundAmount: Number(raw.refundAmount ?? raw.refund_amount ?? 0) || 0,
    refundReason: raw.refundReason || raw.refund_reason || '',
    refundTransactionId: raw.refundTransactionId || raw.refund_transaction_id || '',
    refundedAt: raw.refundedAt || raw.refunded_at || '',
    created_at: raw.created_at || raw.createdAt || '',
    createdAt: raw.createdAt || raw.created_at || '',
    updated_at: raw.updated_at || raw.updatedAt || '',
    updatedAt: raw.updatedAt || raw.updated_at || ''
  };
}

function toBoolean(value) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  const text = String(value || '').trim().toLowerCase();
  if (['1', 'true', 'yes', 'y'].includes(text)) return true;
  if (['0', 'false', 'no', 'n', ''].includes(text)) return false;
  return Boolean(value);
}

function fen2yuan(fen) {
  return (Math.abs(Number(fen || 0)) / 100).toFixed(2);
}

function yuanToFen(yuan) {
  const text = String(yuan || '').trim();
  if (!text || !/^\d+(\.\d{1,2})?$/.test(text)) return 0;
  return Math.round(Number(text) * 100);
}

function statusTagType(status) {
  if (status === 'pending') return 'info';
  if (status === 'processing') return 'warning';
  if (status === 'approved') return 'success';
  if (status === 'completed') return 'success';
  if (status === 'rejected') return 'danger';
  return '';
}

function formatDateTime(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const h = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${d} ${h}:${min}`;
}

async function fetchRecords() {
  loading.value = true;
  loadError.value = '';
  try {
    const { data } = await request.get('/api/after-sales', {
      params: {
        page: page.value,
        limit: pageSize.value,
        status: statusFilter.value || undefined,
        search: searchKeyword.value || undefined
      }
    });
    const pageData = extractAfterSalesPage(data);
    records.value = pageData.items.map(normalizeRecord);
    total.value = Number(pageData.total || 0);
  } catch (error) {
    records.value = [];
    total.value = 0;
    loadError.value = extractErrorMessage(error, '加载售后列表失败，请稍后重试');
    ElMessage.error(loadError.value);
  } finally {
    loading.value = false;
  }
}

function handleSearch() {
  page.value = 1;
  fetchRecords();
}

function handleReset() {
  searchKeyword.value = '';
  statusFilter.value = '';
  page.value = 1;
  fetchRecords();
}

function handleSizeChange() {
  page.value = 1;
  fetchRecords();
}

async function openClearSelector() {
  if (clearing.value) return;
  try {
    await ElMessageBox.confirm(
      '请选择清除范围：点击“清除已处理”将删除所有非待处理售后单，点击“全部清除”将删除全部售后单。',
      '一键清除',
      {
        confirmButtonText: '清除已处理',
        cancelButtonText: '全部清除',
        distinguishCancelAndClose: true,
        closeOnClickModal: false,
        closeOnPressEscape: false,
        type: 'warning'
      }
    );
    await submitClear('processed');
  } catch (action) {
    if (action === 'cancel') {
      await submitClear('all');
    }
  }
}

async function submitClear(scope) {
  clearing.value = true;
  try {
    const { data } = await request.post('/api/after-sales/clear', { scope });
    const payload = extractEnvelopeData(data) || data || {};
    const deleted = Number(payload.deleted || 0);
    const scopeText = scope === 'all' ? '全部售后单' : '已处理售后单';
    ElMessage.success(`${scopeText}已清除，共 ${deleted} 条`);
    page.value = 1;
    fetchRecords();
  } catch (error) {
    ElMessage.error(extractErrorMessage(error, '清除售后记录失败'));
  } finally {
    clearing.value = false;
  }
}

function openDetail(row) {
  detailRecord.value = row;
  detailVisible.value = true;
}

function openProcess(row) {
  const fallbackRefundAmount = Number(row.refundAmount || row.requestedRefundAmount || 0);
  processForm.value = {
    id: row.id,
    requestNo: row.requestNo,
    status: row.status || 'pending',
    adminRemark: row.adminRemark || '',
    shouldRefund: toBoolean(row.shouldRefund),
    requestedRefundAmount: Number(row.requestedRefundAmount || 0),
    refundAmountYuan: fallbackRefundAmount > 0 ? fen2yuan(fallbackRefundAmount) : '',
    refundReason: row.refundReason || '',
    refundTransactionId: row.refundTransactionId || ''
  };
  processVisible.value = true;
}

function resolveAdminName() {
  try {
    const text = localStorage.getItem('admin_user') || sessionStorage.getItem('admin_user') || '';
    const parsed = text ? JSON.parse(text) : null;
    return parsed?.name || parsed?.phone || 'admin';
  } catch (error) {
    return 'admin';
  }
}

async function submitProcess() {
  if (!processForm.value.id) return;
  if (processForm.value.shouldRefund && ['pending', 'rejected'].includes(processForm.value.status)) {
    ElMessage.warning('当前状态不允许执行退款，请选择处理中/已通过/已完成');
    return;
  }

  const refundAmount = processForm.value.shouldRefund ? yuanToFen(processForm.value.refundAmountYuan) : 0;
  if (processForm.value.shouldRefund && refundAmount <= 0) {
    ElMessage.warning('请填写有效的退款金额');
    return;
  }

  submitting.value = true;
  try {
    const { data } = await request.put(`/api/after-sales/${processForm.value.id}/status`, {
      status: processForm.value.status,
      adminRemark: processForm.value.adminRemark || '',
      processedBy: resolveAdminName(),
      shouldRefund: processForm.value.shouldRefund,
      refundAmount,
      refundReason: processForm.value.refundReason || ''
    });
    const payload = extractEnvelopeData(data) || data || {};
    const latest = normalizeRecord(payload);
    if (processForm.value.shouldRefund && !latest.refundTransactionId) {
      ElMessage.warning('状态已更新，但未生成退款流水号，请检查后端退款接口');
    } else {
      ElMessage.success('处理状态已更新');
    }
    processVisible.value = false;
    await fetchRecords();
  } catch (error) {
    ElMessage.error(extractErrorMessage(error, '更新状态失败'));
  } finally {
    submitting.value = false;
  }
}

onMounted(() => {
  fetchRecords();
});
</script>

<style scoped lang="css" src="./AfterSales.css"></style>
