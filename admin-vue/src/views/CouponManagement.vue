<template>
  <div class="coupon-page">
    <div class="page-header">
      <div>
        <h2>优惠券管理</h2>
        <p>统一管理商户券、客服券与平台券，支持手机号发券与链接领取。</p>
      </div>
      <el-button type="primary" @click="openCreateDialog">新建优惠券</el-button>
    </div>

    <el-card class="panel">
      <div class="filters">
        <el-select v-model="filters.source" clearable placeholder="来源" style="width: 150px;">
          <el-option label="商户券" value="merchant" />
          <el-option label="客服券" value="customer_service" />
          <el-option label="平台" value="port_1788" />
        </el-select>
        <el-select v-model="filters.status" clearable placeholder="状态" style="width: 120px;">
          <el-option label="上架" value="active" />
          <el-option label="下架" value="inactive" />
        </el-select>
        <el-input
          v-model="filters.keyword"
          clearable
          placeholder="按名称或描述搜索"
          style="width: 220px;"
          @keyup.enter="loadCoupons"
        />
        <el-input
          v-model="filters.shopId"
          clearable
          placeholder="店铺ID（可选）"
          style="width: 160px;"
          @keyup.enter="loadCoupons"
        />
        <el-button type="primary" @click="loadCoupons">查询</el-button>
      </div>

      <PageStateAlert :message="loadError" />

      <el-table :data="coupons" v-loading="loading" stripe style="width: 100%; margin-top: 16px;">
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="name" label="券名称" min-width="160" />
        <el-table-column label="来源" width="120">
          <template #default="{ row }">
            <el-tag :type="sourceTagType(row.source)">{{ sourceText(row.source) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="优惠规则" min-width="180">
          <template #default="{ row }">
            {{ couponRuleText(row) }}
          </template>
        </el-table-column>
        <el-table-column label="预算成本" width="120">
          <template #default="{ row }">¥{{ fen2yuan(row.budgetCost || 0) }}</template>
        </el-table-column>
        <el-table-column label="库存" min-width="170">
          <template #default="{ row }">
            <span>总 {{ displayTotalCount(row.totalCount) }}</span>
            <span class="stock-gap">已领 {{ row.receivedCount || 0 }}</span>
            <span class="stock-gap">剩余 {{ displayRemainingCount(row.remainingCount) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="有效期" min-width="210">
          <template #default="{ row }">
            <div>{{ formatTime(row.validFrom) }}</div>
            <div class="sub-text">{{ formatTime(row.validUntil) }}</div>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-tag :type="row.status === 'active' ? 'success' : 'info'">
              {{ row.status === 'active' ? '上架' : '下架' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="链接" min-width="200">
          <template #default="{ row }">
            <div v-if="row.claimEnabled && row.claimUrl" class="link-cell">
              <el-link :underline="false" type="primary" @click="copyLink(row.claimUrl)">复制链接</el-link>
              <span class="sub-text">{{ shortLink(row.claimUrl) }}</span>
            </div>
            <span v-else class="sub-text">-</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="340" fixed="right">
          <template #default="{ row }">
            <div class="actions">
              <el-button
                size="small"
                :type="row.status === 'active' ? 'warning' : 'success'"
                @click="toggleStatus(row)"
              >
                {{ row.status === 'active' ? '下架' : '上架' }}
              </el-button>
              <el-button size="small" type="primary" @click="openIssueLogDialog(row)">发送记录</el-button>
              <el-button size="small" type="success" @click="openIssueDialog(row)">手机号发券</el-button>
              <el-button size="small" type="danger" @click="removeCoupon(row)">删除</el-button>
            </div>
          </template>
        </el-table-column>
        <template #empty>
          <el-empty :description="loadError ? '加载失败，暂无可显示数据' : '暂无优惠券数据'" :image-size="90" />
        </template>
      </el-table>

      <div class="pagination">
        <el-pagination
          background
          layout="total, sizes, prev, pager, next"
          :total="total"
          :current-page="filters.page"
          :page-size="filters.limit"
          :page-sizes="[10, 20, 50, 100]"
          @size-change="onPageSizeChange"
          @current-change="onCurrentPageChange"
        />
      </div>
    </el-card>

    <el-dialog v-model="createDialogVisible" title="新建优惠券" width="760px" :close-on-click-modal="false">
      <el-form ref="createFormRef" :model="createForm" :rules="createRules" label-width="110px">
        <div class="form-grid">
          <el-form-item label="券名称" prop="name">
            <el-input v-model="createForm.name" maxlength="50" placeholder="例如：客服补偿券" />
          </el-form-item>

          <el-form-item label="来源" prop="source">
            <el-select v-model="createForm.source" style="width: 100%;">
              <el-option label="商户券" value="merchant" />
              <el-option label="客服券" value="customer_service" />
              <el-option label="平台" value="port_1788" />
            </el-select>
          </el-form-item>

          <el-form-item label="店铺ID">
            <el-input v-model="createForm.shopId" placeholder="0=平台通用，商户券需填写店铺ID" />
          </el-form-item>

          <el-form-item label="优惠类型" prop="type">
            <el-select v-model="createForm.type" style="width: 100%;">
              <el-option label="固定金额券" value="fixed" />
              <el-option label="折扣券（百分比）" value="percent" />
            </el-select>
          </el-form-item>

          <el-form-item label="优惠金额" prop="amount">
            <el-input-number v-model="createForm.amount" :min="0.01" :precision="2" :step="1" style="width: 100%;" />
          </el-form-item>

          <el-form-item v-if="createForm.type === 'percent'" label="最大优惠">
            <el-input-number v-model="createForm.maxDiscount" :min="0" :precision="2" :step="1" style="width: 100%;" />
          </el-form-item>

          <el-form-item label="门槛类型">
            <el-radio-group v-model="createForm.conditionType">
              <el-radio label="threshold">满减券</el-radio>
              <el-radio label="no_threshold">无门槛券</el-radio>
            </el-radio-group>
          </el-form-item>

          <el-form-item label="消费门槛">
            <el-input-number
              v-model="createForm.minAmount"
              :disabled="createForm.conditionType === 'no_threshold'"
              :min="0"
              :precision="2"
              :step="1"
              style="width: 100%;"
            />
          </el-form-item>

          <el-form-item label="发放数量">
            <el-input-number v-model="createForm.totalCount" :min="0" :step="10" style="width: 100%;" />
          </el-form-item>

          <el-form-item label="预算成本(分)">
            <el-input-number v-model="createForm.budgetCost" :min="0" :step="100" style="width: 100%;" />
          </el-form-item>

          <el-form-item label="开始时间" prop="validFrom">
            <el-date-picker v-model="createForm.validFrom" type="datetime" style="width: 100%;" />
          </el-form-item>

          <el-form-item label="结束时间" prop="validUntil">
            <el-date-picker v-model="createForm.validUntil" type="datetime" style="width: 100%;" />
          </el-form-item>

          <el-form-item label="生成链接">
            <el-switch v-model="createForm.claimLinkEnabled" />
          </el-form-item>
        </div>

        <el-form-item label="说明">
          <el-input v-model="createForm.description" type="textarea" :rows="3" maxlength="200" />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="createDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="creating" @click="submitCreate">创建</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="issueDialogVisible" title="手机号发券" width="440px" :close-on-click-modal="false">
      <el-form ref="issueFormRef" :model="issueForm" :rules="issueRules" label-width="90px">
        <el-form-item label="手机号" prop="phone">
          <el-input v-model="issueForm.phone" maxlength="11" placeholder="请输入注册手机号" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="issueDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="issuing" @click="submitIssue">确认发券</el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="issueLogDialogVisible"
      title="客服券发送记录"
      width="980px"
      :close-on-click-modal="false"
    >
      <div class="log-toolbar">
        <div class="log-toolbar-left">
          <span class="sub-text">券ID：{{ issueLogCoupon.id || '-' }}</span>
          <span class="sub-text">券名：{{ issueLogCoupon.name || '-' }}</span>
        </div>
        <div class="log-toolbar-right">
          <el-select
            v-model="issueLogFilters.status"
            clearable
            placeholder="结果"
            style="width: 120px;"
            @change="loadIssueLogs"
          >
            <el-option label="成功" value="success" />
            <el-option label="失败" value="failed" />
          </el-select>
          <el-input
            v-model="issueLogFilters.keyword"
            clearable
            placeholder="手机号/失败原因/操作人"
            style="width: 240px;"
            @keyup.enter="loadIssueLogs"
          />
          <el-button type="primary" @click="loadIssueLogs">查询</el-button>
        </div>
      </div>

      <PageStateAlert :message="issueLogError" />

      <el-table :data="issueLogs" v-loading="issueLogLoading" stripe style="width: 100%;">
        <el-table-column prop="createdAt" label="发放时间" width="170">
          <template #default="{ row }">{{ formatTime(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column prop="phone" label="手机号" width="130" />
        <el-table-column prop="issueChannel" label="来源渠道" width="120">
          <template #default="{ row }">{{ issueChannelText(row.issueChannel) }}</template>
        </el-table-column>
        <el-table-column prop="status" label="结果" width="90">
          <template #default="{ row }">
            <el-tag :type="row.status === 'success' ? 'success' : 'danger'">
              {{ row.status === 'success' ? '成功' : '失败' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="failureReason" label="失败原因" min-width="260">
          <template #default="{ row }">
            <span class="fail-reason">{{ row.failureReason || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作人" width="180">
          <template #default="{ row }">
            <div>{{ row.issuedByName || '-' }}</div>
            <div class="sub-text">{{ row.issuedByRole || '-' }} / {{ row.issuedById || '-' }}</div>
          </template>
        </el-table-column>
        <template #empty>
          <el-empty :description="issueLogError ? '加载失败，暂无可显示数据' : '暂无发送记录'" :image-size="90" />
        </template>
      </el-table>

      <div class="pagination">
        <el-pagination
          background
          layout="total, sizes, prev, pager, next"
          :total="issueLogTotal"
          :current-page="issueLogFilters.page"
          :page-size="issueLogFilters.limit"
          :page-sizes="[10, 20, 50, 100]"
          @size-change="onIssueLogPageSizeChange"
          @current-change="onIssueLogPageChange"
        />
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import PageStateAlert from '@/components/PageStateAlert.vue';
import { useCouponManagementPage } from './couponManagementHelpers';

const {
  loading,
  loadError,
  coupons,
  total,
  filters,
  createDialogVisible,
  creating,
  createFormRef,
  createForm,
  createRules,
  issueDialogVisible,
  issuing,
  issueFormRef,
  issueForm,
  issueLogDialogVisible,
  issueLogLoading,
  issueLogError,
  issueLogs,
  issueLogTotal,
  issueLogCoupon,
  issueLogFilters,
  issueRules,
  loadCoupons,
  sourceText,
  sourceTagType,
  couponRuleText,
  displayTotalCount,
  displayRemainingCount,
  fen2yuan,
  formatTime,
  shortLink,
  openCreateDialog,
  submitCreate,
  toggleStatus,
  removeCoupon,
  openIssueDialog,
  openIssueLogDialog,
  loadIssueLogs,
  issueChannelText,
  submitIssue,
  copyLink,
  onPageSizeChange,
  onCurrentPageChange,
  onIssueLogPageSizeChange,
  onIssueLogPageChange
} = useCouponManagementPage();
</script>

<style scoped lang="css" src="./CouponManagement.css"></style>
