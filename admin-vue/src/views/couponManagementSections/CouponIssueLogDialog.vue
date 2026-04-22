<template>
  <el-dialog
    :model-value="visible"
    title="客服券发送记录"
    width="980px"
    :close-on-click-modal="false"
    @update:model-value="setIssueLogDialogVisible"
  >
    <div class="log-toolbar">
      <div class="log-toolbar-left">
        <span class="sub-text">券ID：{{ issueLogCoupon.id || '-' }}</span>
        <span class="sub-text">券名：{{ issueLogCoupon.name || '-' }}</span>
      </div>
      <div class="log-toolbar-right">
        <el-select
          :model-value="issueLogFilters.status"
          clearable
          placeholder="结果"
          style="width: 120px;"
          @update:model-value="setIssueLogFilterValue('status', $event)"
          @change="loadIssueLogs"
        >
          <el-option label="成功" value="success" />
          <el-option label="失败" value="failed" />
        </el-select>
        <el-input
          :model-value="issueLogFilters.keyword"
          clearable
          placeholder="手机号/失败原因/操作人"
          style="width: 240px;"
          @update:model-value="setIssueLogFilterValue('keyword', $event)"
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
</template>

<script setup>
import PageStateAlert from '@/components/PageStateAlert.vue';

const props = defineProps({
  formatTime: {
    type: Function,
    required: true,
  },
  issueChannelText: {
    type: Function,
    required: true,
  },
  issueLogCoupon: {
    type: Object,
    required: true,
  },
  issueLogError: {
    type: String,
    default: '',
  },
  issueLogFilters: {
    type: Object,
    required: true,
  },
  issueLogLoading: {
    type: Boolean,
    default: false,
  },
  issueLogTotal: {
    type: Number,
    default: 0,
  },
  issueLogs: {
    type: Array,
    default: () => [],
  },
  loadIssueLogs: {
    type: Function,
    required: true,
  },
  onIssueLogPageChange: {
    type: Function,
    required: true,
  },
  onIssueLogPageSizeChange: {
    type: Function,
    required: true,
  },
  setIssueLogDialogVisible: {
    type: Function,
    required: true,
  },
  visible: {
    type: Boolean,
    default: false,
  },
});

function setIssueLogFilterValue(key, value) {
  props.issueLogFilters[key] = value;
}
</script>
