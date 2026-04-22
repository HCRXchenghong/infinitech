<template>
  <el-card class="panel">
    <div class="filters">
      <el-select :model-value="filters.source" clearable placeholder="来源" style="width: 150px;" @update:model-value="setFilterValue('source', $event)">
        <el-option label="商户券" value="merchant" />
        <el-option label="客服券" value="customer_service" />
        <el-option label="平台" value="port_1788" />
      </el-select>
      <el-select :model-value="filters.status" clearable placeholder="状态" style="width: 120px;" @update:model-value="setFilterValue('status', $event)">
        <el-option label="上架" value="active" />
        <el-option label="下架" value="inactive" />
      </el-select>
      <el-input
        :model-value="filters.keyword"
        clearable
        placeholder="按名称或描述搜索"
        style="width: 220px;"
        @update:model-value="setFilterValue('keyword', $event)"
        @keyup.enter="loadCoupons"
      />
      <el-input
        :model-value="filters.shopId"
        clearable
        placeholder="店铺ID（可选）"
        style="width: 160px;"
        @update:model-value="setFilterValue('shopId', $event)"
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
</template>

<script setup>
import PageStateAlert from '@/components/PageStateAlert.vue';

const props = defineProps({
  copyLink: {
    type: Function,
    required: true,
  },
  couponRuleText: {
    type: Function,
    required: true,
  },
  coupons: {
    type: Array,
    default: () => [],
  },
  displayRemainingCount: {
    type: Function,
    required: true,
  },
  displayTotalCount: {
    type: Function,
    required: true,
  },
  fen2yuan: {
    type: Function,
    required: true,
  },
  filters: {
    type: Object,
    required: true,
  },
  formatTime: {
    type: Function,
    required: true,
  },
  loadCoupons: {
    type: Function,
    required: true,
  },
  loadError: {
    type: String,
    default: '',
  },
  loading: {
    type: Boolean,
    default: false,
  },
  onCurrentPageChange: {
    type: Function,
    required: true,
  },
  onPageSizeChange: {
    type: Function,
    required: true,
  },
  openIssueDialog: {
    type: Function,
    required: true,
  },
  openIssueLogDialog: {
    type: Function,
    required: true,
  },
  removeCoupon: {
    type: Function,
    required: true,
  },
  shortLink: {
    type: Function,
    required: true,
  },
  sourceTagType: {
    type: Function,
    required: true,
  },
  sourceText: {
    type: Function,
    required: true,
  },
  toggleStatus: {
    type: Function,
    required: true,
  },
  total: {
    type: Number,
    default: 0,
  },
});

function setFilterValue(key, value) {
  props.filters[key] = value;
}
</script>
