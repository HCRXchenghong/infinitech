<template>
  <div class="page">
    <div class="title-row">
      <span class="title">财务中心</span>
      <div style="display:flex;align-items:center;gap:8px">
        <el-radio-group v-model="periodType" size="small" @change="loadAll">
          <el-radio-button value="daily">日</el-radio-button>
          <el-radio-button value="weekly">周</el-radio-button>
          <el-radio-button value="monthly">月</el-radio-button>
          <el-radio-button value="quarterly">季</el-radio-button>
          <el-radio-button value="yearly">年</el-radio-button>
        </el-radio-group>
        <el-date-picker v-model="statDate" type="date" value-format="YYYY-MM-DD"
          placeholder="选择日期" size="small" style="width:140px" @change="loadAll" />
        <el-button size="small" type="primary" :loading="exporting" @click="doExport">下载报表</el-button>
      </div>
    </div>

    <PageStateAlert :message="pageError" />

    <!-- 平台概览 -->
    <el-card class="card">
      <div class="card-title">平台概览</div>
      <div v-if="overviewLoading"><el-skeleton :rows="2" animated /></div>
      <el-descriptions v-else :column="4" border size="small">
        <el-descriptions-item v-for="c in kpiCards" :key="c.label" :label="c.label">
          <span style="cursor:pointer;color:#409eff" @click="openKpiDetail(c)">{{ c.value }}</span>
        </el-descriptions-item>
      </el-descriptions>
    </el-card>

    <!-- 退款与赔付 -->
    <el-card class="card">
      <div class="card-title">退款与赔付</div>
      <div v-if="overviewLoading"><el-skeleton :rows="1" animated /></div>
      <el-descriptions v-else :column="4" border size="small">
        <el-descriptions-item v-for="c in refundCards" :key="c.label" :label="c.label">
          <span style="cursor:pointer;color:#f56c6c" @click="openKpiDetail(c)">{{ c.value }}</span>
        </el-descriptions-item>
      </el-descriptions>
    </el-card>

    <!-- 充值/扣款管理 + 虚拟币比例 -->
    <div class="two-col">
      <div class="stack-col">
        <el-card class="card">
          <div class="card-title" style="display:flex;justify-content:space-between;align-items:center;">
            <span>账号充值</span>
            <el-button type="primary" size="small" @click="rechargeDialogVisible = true">发起充值</el-button>
          </div>
          <el-descriptions :column="1" border size="small">
            <el-descriptions-item label="功能说明">
              <span style="color:#6b7280;font-size:13px;">可向任意用户、骑手或商户账号充值余额，充值记录将计入钱包流水</span>
            </el-descriptions-item>
            <el-descriptions-item label="最近充值">
              <span v-if="lastRecharge" style="color:#374151;font-size:13px;">
                {{ lastRecharge.userType === 'user' ? '用户' : lastRecharge.userType === 'rider' ? '骑手' : '商户' }}
                #{{ lastRecharge.userId }} 充值 ¥{{ (lastRecharge.amount / 100).toFixed(2) }}
              </span>
              <span v-else style="color:#9ca3af;font-size:13px;">暂无记录</span>
            </el-descriptions-item>
          </el-descriptions>
        </el-card>

        <el-card class="card">
          <div class="card-title" style="display:flex;justify-content:space-between;align-items:center;">
            <span>账户扣款</span>
            <el-button type="warning" size="small" @click="deductDialogVisible = true">发起扣款</el-button>
          </div>
          <el-descriptions :column="1" border size="small">
            <el-descriptions-item label="功能说明">
              <span style="color:#6b7280;font-size:13px;">可从任意用户、骑手或商户账号扣除余额，扣款记录将计入钱包流水</span>
            </el-descriptions-item>
            <el-descriptions-item label="最近扣款">
              <span v-if="lastDeduct" style="color:#374151;font-size:13px;">
                {{ lastDeduct.userType === 'user' ? '用户' : lastDeduct.userType === 'rider' ? '骑手' : '商户' }}
                #{{ lastDeduct.userId }} 扣款 ¥{{ (lastDeduct.amount / 100).toFixed(2) }}
              </span>
              <span v-else style="color:#9ca3af;font-size:13px;">暂无记录</span>
            </el-descriptions-item>
          </el-descriptions>
        </el-card>
      </div>

      <el-card class="card">
        <div class="card-title">虚拟币兑换比例</div>
        <el-form :model="coinRatio" label-width="110px" size="small">
          <el-form-item label="1元 = 虚拟币">
            <el-input-number v-model="coinRatio.ratio" :min="1" :max="10000" :precision="0" style="width:160px;" />
            <span style="margin-left:8px;color:#6b7280;font-size:13px;">枚</span>
          </el-form-item>
          <el-form-item label="说明">
            <span style="color:#9ca3af;font-size:12px;">用户充值 1 元人民币将获得 {{ coinRatio.ratio }} 枚虚拟币</span>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" :loading="savingCoinRatio" @click="saveCoinRatio">保存</el-button>
          </el-form-item>
        </el-form>
      </el-card>
    </div>

    <!-- 骑手/商户榜 -->
    <div class="two-col">
      <el-card class="card">
        <div class="card-title">骑手收入榜 TOP20</div>
        <div v-if="detailsLoading"><el-skeleton :rows="3" animated /></div>
        <el-table v-else :data="riderDetails" size="small" stripe
          :row-class-name="() => 'clickable-row'"
          @row-click="(row) => openUserDetail(row, 'rider')">
          <el-table-column type="index" width="40" />
          <el-table-column prop="userId" label="骑手ID" show-overflow-tooltip />
          <el-table-column label="总收入" width="100">
            <template #default="{ row }">¥{{ fen2yuan(row.totalIncome) }}</template>
          </el-table-column>
          <el-table-column prop="orderCount" label="单数" width="60" />
          <template #empty>
            <el-empty :description="detailsError || '暂无数据'" :image-size="90" />
          </template>
        </el-table>
      </el-card>

      <el-card class="card">
        <div class="card-title">商户收入榜 TOP20</div>
        <div v-if="detailsLoading"><el-skeleton :rows="3" animated /></div>
        <el-table v-else :data="merchantDetails" size="small" stripe
          :row-class-name="() => 'clickable-row'"
          @row-click="(row) => openUserDetail(row, 'merchant')">
          <el-table-column type="index" width="40" />
          <el-table-column prop="userId" label="商户ID" show-overflow-tooltip />
          <el-table-column label="总收入" width="100">
            <template #default="{ row }">¥{{ fen2yuan(row.totalIncome) }}</template>
          </el-table-column>
          <el-table-column prop="orderCount" label="单数" width="60" />
          <template #empty>
            <el-empty :description="detailsError || '暂无数据'" :image-size="90" />
          </template>
        </el-table>
      </el-card>
    </div>

    <!-- 财务日志 -->
    <el-card class="card">
      <div class="card-title" style="display:flex;justify-content:space-between;align-items:center;">
        <span>财务日志</span>
        <el-button type="primary" size="small" @click="goToTransactionLogs">查看全部日志</el-button>
      </div>
      <PageStateAlert :message="logsError" />
      <el-descriptions :column="1" border size="small">
        <el-descriptions-item label="功能说明">
          <span style="color:#6b7280;font-size:13px;">记录所有金额变动，包括充值、提现、支付、退款、赔付等操作</span>
        </el-descriptions-item>
        <el-descriptions-item label="最近更新">
          <span v-if="transactionLogs.length > 0" style="color:#374151;font-size:13px;">
            {{ formatTransactionType(transactionLogs[0].type) }} ·
            {{ transactionLogs[0].userType === 'customer' ? '用户' : transactionLogs[0].userType === 'rider' ? '骑手' : '商户' }}
            #{{ transactionLogs[0].userId }} ·
            {{ isIncomeType(transactionLogs[0].type) ? '+' : '-' }}¥{{ fen2yuan(transactionLogs[0].amount) }}
          </span>
          <span v-else style="color:#9ca3af;font-size:13px;">暂无记录</span>
        </el-descriptions-item>
      </el-descriptions>
    </el-card>

    <!-- KPI 详情弹窗 -->
    <el-dialog v-model="kpiDialogVisible" :title="kpiDialogData.label" width="400px" align-center>
      <el-descriptions :column="1" border size="small">
        <el-descriptions-item label="数值">{{ kpiDialogData.value }}</el-descriptions-item>
        <el-descriptions-item label="说明">{{ kpiDialogData.desc }}</el-descriptions-item>
        <el-descriptions-item label="统计周期">
          {{ overview.periodStart ? fmtDate(overview.periodStart) : '-' }} ~
          {{ overview.periodEnd ? fmtDate(overview.periodEnd) : '-' }}
        </el-descriptions-item>
      </el-descriptions>
      <template #footer>
        <el-button @click="kpiDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>

    <!-- 用户详情弹窗 -->
    <el-dialog v-model="userDialogVisible"
      :title="(userDialogType === 'rider' ? '骑手' : '商户') + ' · ' + (userDialogData.userId || '')"
      width="480px" align-center>
      <el-descriptions :column="2" border size="small">
        <el-descriptions-item label="用户ID">{{ userDialogData.userId }}</el-descriptions-item>
        <el-descriptions-item label="类型">{{ userDialogType === 'rider' ? '骑手' : '商户' }}</el-descriptions-item>
        <el-descriptions-item label="总收入">¥{{ fen2yuan(userDialogData.totalIncome) }}</el-descriptions-item>
        <el-descriptions-item label="订单收入">¥{{ fen2yuan(userDialogData.orderIncome) }}</el-descriptions-item>
        <el-descriptions-item label="小费收入">¥{{ fen2yuan(userDialogData.tipIncome) }}</el-descriptions-item>
        <el-descriptions-item label="奖励收入">¥{{ fen2yuan(userDialogData.bonusIncome) }}</el-descriptions-item>
        <el-descriptions-item label="总支出">¥{{ fen2yuan(userDialogData.totalExpense) }}</el-descriptions-item>
        <el-descriptions-item label="退款金额">¥{{ fen2yuan(userDialogData.refundAmount) }}</el-descriptions-item>
        <el-descriptions-item label="赔付金额">¥{{ fen2yuan(userDialogData.compensationAmount) }}</el-descriptions-item>
        <el-descriptions-item label="接单数">{{ userDialogData.orderCount }}</el-descriptions-item>
        <el-descriptions-item label="完成数">{{ userDialogData.completedOrderCount }}</el-descriptions-item>
        <el-descriptions-item label="取消数">{{ userDialogData.cancelledOrderCount }}</el-descriptions-item>
      </el-descriptions>
      <template #footer>
        <el-button @click="userDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>

    <!-- 充值弹窗 -->
    <el-dialog v-model="rechargeDialogVisible" title="账号充值" width="440px" align-center :close-on-click-modal="false">
      <el-form :model="rechargeForm" label-width="90px" size="small">
        <el-form-item label="账号类型">
          <el-radio-group v-model="rechargeForm.userType">
            <el-radio-button value="user">用户</el-radio-button>
            <el-radio-button value="rider">骑手</el-radio-button>
            <el-radio-button value="merchant">商户</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="账号ID">
          <el-input v-model="rechargeForm.userId" placeholder="输入手机号或账号ID" />
        </el-form-item>
        <el-form-item label="充值金额">
          <el-input-number v-model="rechargeForm.amountYuan" :min="0.01" :precision="2" :step="10" style="width:180px;" />
          <span style="margin-left:8px;color:#6b7280;font-size:13px;">元</span>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="rechargeForm.note" placeholder="可选备注" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="rechargeDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="recharging" @click="doRecharge">确认充值</el-button>
      </template>
    </el-dialog>

    <!-- 扣款弹窗 -->
    <el-dialog v-model="deductDialogVisible" title="账户扣款" width="440px" align-center :close-on-click-modal="false">
      <el-form :model="deductForm" label-width="90px" size="small">
        <el-form-item label="账号类型">
          <el-radio-group v-model="deductForm.userType">
            <el-radio-button value="user">用户</el-radio-button>
            <el-radio-button value="rider">骑手</el-radio-button>
            <el-radio-button value="merchant">商户</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="账号ID">
          <el-input v-model="deductForm.userId" placeholder="输入手机号或账号ID" />
        </el-form-item>
        <el-form-item label="扣款金额">
          <el-input-number v-model="deductForm.amountYuan" :min="0.01" :precision="2" :step="10" style="width:180px;" />
          <span style="margin-left:8px;color:#6b7280;font-size:13px;">元</span>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="deductForm.note" placeholder="可选备注" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="deductDialogVisible = false">取消</el-button>
        <el-button type="danger" :loading="deducting" @click="doDeduct">确认扣款</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import request from '../utils/request';
import PageStateAlert from '@/components/PageStateAlert.vue';

const router = useRouter();

const periodType = ref('daily');
const statDate = ref('');
const overview = ref({});
const overviewLoading = ref(false);
const riderDetails = ref([]);
const merchantDetails = ref([]);
const detailsLoading = ref(false);
const exporting = ref(false);
const overviewError = ref('');
const detailsError = ref('');
const logsError = ref('');

const kpiDialogVisible = ref(false);
const kpiDialogData = ref({});
const userDialogVisible = ref(false);
const userDialogData = ref({});
const userDialogType = ref('rider');

// 充值
const rechargeDialogVisible = ref(false);
const recharging = ref(false);
const lastRecharge = ref(null);
const rechargeForm = ref({ userType: 'user', userId: '', amountYuan: 10, note: '' });

// 扣款
const deductDialogVisible = ref(false);
const deducting = ref(false);
const lastDeduct = ref(null);
const deductForm = ref({ userType: 'user', userId: '', amountYuan: 10, note: '' });

// 虚拟币比例
const coinRatio = ref({ ratio: 100 });
const savingCoinRatio = ref(false);

// 财务日志
const transactionLogs = ref([]);
const logsLoading = ref(false);

function fen2yuan(fen) { return fen ? (fen / 100).toFixed(2) : '0.00'; }
function fmtDate(d) { return d ? String(d).slice(0, 10) : '-'; }
function buildParams() {
  const p = { periodType: periodType.value };
  if (statDate.value) p.statDate = statDate.value;
  return p;
}

function formatTransactionType(type) {
  const typeMap = {
    'recharge': '充值',
    'withdraw': '提现',
    'payment': '支付',
    'refund': '退款',
    'compensation': '赔付',
    'admin_add_balance': '管理员充值',
    'admin_deduct_balance': '管理员扣款',
    'income': '收入'
  };
  return typeMap[type] || type;
}

function isIncomeType(type) {
  return ['recharge', 'admin_add_balance', 'income', 'refund'].includes(type);
}

const kpiCards = computed(() => [
  { label: '总流水', value: '¥' + fen2yuan(overview.value.totalTransactionAmount), desc: '周期内所有支付类交易总金额' },
  { label: '充值金额', value: '¥' + fen2yuan(overview.value.totalRechargeAmount), desc: '周期内用户充值总金额' },
  { label: '提现金额', value: '¥' + fen2yuan(overview.value.totalWithdrawAmount), desc: '周期内提现申请总金额' },
  { label: '平台收益', value: '¥' + fen2yuan(overview.value.platformRevenue), desc: '周期内平台佣金收益' },
  { label: '订单数', value: overview.value.totalOrderCount ?? 0, desc: '周期内新增订单总数' },
  { label: '活跃用户', value: overview.value.activeCustomerCount ?? 0, desc: '当前活跃用户钱包账户数' },
  { label: '活跃骑手', value: overview.value.activeRiderCount ?? 0, desc: '当前活跃骑手钱包账户数' },
  { label: '活跃商户', value: overview.value.activeMerchantCount ?? 0, desc: '当前活跃商户钱包账户数' },
]);

const refundCards = computed(() => [
  { label: '退款金额', value: '¥' + fen2yuan(overview.value.totalRefundAmount), desc: '周期内退款总金额' },
  { label: '退款笔数', value: overview.value.totalRefundCount ?? 0, desc: '周期内退款总笔数' },
  { label: '赔付金额', value: '¥' + fen2yuan(overview.value.totalCompensationAmount), desc: '周期内赔付总金额' },
  { label: '赔付笔数', value: overview.value.totalCompensationCount ?? 0, desc: '周期内赔付总笔数' },
]);

const pageError = computed(() => overviewError.value || detailsError.value || logsError.value || '');

function openKpiDetail(card) { kpiDialogData.value = card; kpiDialogVisible.value = true; }
function openUserDetail(row, type) { userDialogData.value = row; userDialogType.value = type; userDialogVisible.value = true; }

function goToTransactionLogs() {
  router.push('/transaction-logs');
}

async function loadOverview() {
  overviewLoading.value = true;
  overviewError.value = '';
  try {
    const res = await request.get('/api/financial/overview', { params: buildParams() });
    overview.value = res.data || {};
  } catch (error) {
    overview.value = {};
    overviewError.value = error?.response?.data?.error || error?.message || '加载平台概览失败';
  }
  finally { overviewLoading.value = false; }
}

async function loadDetails() {
  detailsLoading.value = true;
  detailsError.value = '';
  try {
    const params = { ...buildParams(), limit: 20, sortBy: 'total_income', sortOrder: 'desc' };
    const [rRes, mRes] = await Promise.all([
      request.get('/api/financial/user-details', { params: { ...params, userType: 'rider' } }),
      request.get('/api/financial/user-details', { params: { ...params, userType: 'merchant' } }),
    ]);
    riderDetails.value = rRes.data?.items || [];
    merchantDetails.value = mRes.data?.items || [];
  } catch (error) {
    riderDetails.value = [];
    merchantDetails.value = [];
    detailsError.value = error?.response?.data?.error || error?.message || '加载收入榜失败';
  }
  finally { detailsLoading.value = false; }
}

function loadAll() { loadOverview(); loadDetails(); loadCoinRatio(); loadRecentTransactions(); }

async function loadCoinRatio() {
  try {
    const res = await request.get('/api/coin-ratio');
    coinRatio.value = { ratio: res.data?.ratio || 100 };
  } catch { /* ignore */ }
}

async function loadRecentTransactions() {
  logsLoading.value = true;
  logsError.value = '';
  try {
    const res = await request.get('/api/financial/transaction-logs', { params: { page: 1, limit: 1 } });
    transactionLogs.value = res.data?.items || [];
  } catch (error) {
    transactionLogs.value = [];
    logsError.value = error?.response?.data?.error || error?.message || '加载财务日志失败';
  } finally {
    logsLoading.value = false;
  }
}

async function saveCoinRatio() {
  savingCoinRatio.value = true;
  try {
    await request.post('/api/coin-ratio', coinRatio.value);
    ElMessage.success('虚拟币比例保存成功');
  } catch (e) {
    ElMessage.error('保存失败');
  } finally { savingCoinRatio.value = false; }
}

async function doRecharge() {
  if (!rechargeForm.value.userId) return ElMessage.warning('请输入账号ID');
  recharging.value = true;
  try {
    await request.post('/api/admin/wallet/recharge', {
      user_id: String(rechargeForm.value.userId),
      user_type: rechargeForm.value.userType,
      amount: Math.round(rechargeForm.value.amountYuan * 100),
      note: rechargeForm.value.note,
    });
    ElMessage.success('充值成功');
    lastRecharge.value = {
      userId: rechargeForm.value.userId,
      userType: rechargeForm.value.userType,
      amount: Math.round(rechargeForm.value.amountYuan * 100),
    };
    rechargeDialogVisible.value = false;
    rechargeForm.value = { userType: 'user', userId: '', amountYuan: 10, note: '' };
    loadRecentTransactions();
  } catch (e) {
    ElMessage.error(e?.response?.data?.error || '充值失败');
  } finally { recharging.value = false; }
}

async function doDeduct() {
  if (!deductForm.value.userId) return ElMessage.warning('请输入账号ID');
  deducting.value = true;
  try {
    await request.post('/api/admin/wallet/deduct-balance', {
      targetUserId: String(deductForm.value.userId),
      targetUserType: deductForm.value.userType,
      amount: Math.round(deductForm.value.amountYuan * 100),
      reason: 'manual_deduct',
      remark: deductForm.value.note,
    });
    ElMessage.success('扣款成功');
    lastDeduct.value = {
      userId: deductForm.value.userId,
      userType: deductForm.value.userType,
      amount: Math.round(deductForm.value.amountYuan * 100),
    };
    deductDialogVisible.value = false;
    deductForm.value = { userType: 'user', userId: '', amountYuan: 10, note: '' };
    loadRecentTransactions();
  } catch (e) {
    ElMessage.error(e?.response?.data?.error || '扣款失败');
  } finally { deducting.value = false; }
}

async function doExport() {
  exporting.value = true;
  try {
    const res = await request.get('/api/financial/export', { params: buildParams() });
    const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(blob),
      download: `finance-report-${periodType.value}-${statDate.value || 'latest'}.json`,
    });
    a.click(); URL.revokeObjectURL(a.href);
  } catch { /* ignore */ }
  finally { exporting.value = false; }
}

onMounted(loadAll);
</script>

<style scoped lang="css" src="./FinanceCenter.css"></style>
