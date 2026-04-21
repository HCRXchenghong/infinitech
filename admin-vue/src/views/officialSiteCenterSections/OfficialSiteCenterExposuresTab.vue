<template>
  <div class="center-tab-shell">
    <div class="center-tab-head">
      <div>
        <div class="center-tab-title">曝光审核与处理</div>
        <div class="center-tab-subtitle">审核通过后会在官网曝光板展示，处理完成后保留 30 天自动下线。</div>
      </div>
    </div>

    <div class="table-toolbar center-toolbar">
      <el-select v-model="exposureFilters.review_status" size="small" clearable placeholder="审核状态">
        <el-option
          v-for="option in OFFICIAL_SITE_EXPOSURE_REVIEW_STATUS_OPTIONS"
          :key="option.value"
          :label="option.label"
          :value="option.value"
        />
      </el-select>
      <el-select v-model="exposureFilters.process_status" size="small" clearable placeholder="处理状态">
        <el-option
          v-for="option in OFFICIAL_SITE_EXPOSURE_PROCESS_STATUS_OPTIONS"
          :key="option.value"
          :label="option.label"
          :value="option.value"
        />
      </el-select>
      <el-button size="small" @click="loadExposures">筛选</el-button>
    </div>

    <div class="official-site-table-card">
      <el-table :data="exposures" size="small" stripe v-loading="exposureLoading">
        <el-table-column prop="content" label="问题描述" min-width="220" show-overflow-tooltip />
        <el-table-column label="金额" width="110">
          <template #default="{ row }">¥{{ formatCurrency(row.amount) }}</template>
        </el-table-column>
        <el-table-column prop="contact_phone" label="联系电话" width="150" />
        <el-table-column label="审核" width="110">
          <template #default="{ row }">
            <el-tag :type="reviewTagType(row.review_status)" size="small">{{ reviewLabel(row.review_status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="处理" width="110">
          <template #default="{ row }">
            <el-tag :type="processTagType(row.process_status)" size="small">{{ processLabel(row.process_status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="提交时间" width="170">
          <template #default="{ row }">{{ formatDateTime(row.created_at) }}</template>
        </el-table-column>
        <el-table-column prop="handled_at" label="处理完成" width="170">
          <template #default="{ row }">{{ formatDateTime(row.handled_at) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="90" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="openExposureDialog(row)">处理</el-button>
          </template>
        </el-table-column>
        <template #empty>
          <el-empty description="暂无曝光记录" :image-size="80" />
        </template>
      </el-table>
    </div>
  </div>
</template>

<script setup>
import {
  OFFICIAL_SITE_EXPOSURE_PROCESS_STATUS_OPTIONS,
  OFFICIAL_SITE_EXPOSURE_REVIEW_STATUS_OPTIONS,
  officialSiteExposureProcessLabel as processLabel,
  officialSiteExposureProcessTagType as processTagType,
  officialSiteExposureReviewLabel as reviewLabel,
  officialSiteExposureReviewTagType as reviewTagType,
} from '@infinitech/admin-core';
import { formatCurrency, formatDateTime } from '@/utils/officialSiteApi';

defineProps({
  exposureFilters: {
    type: Object,
    required: true,
  },
  exposures: {
    type: Array,
    default: () => [],
  },
  exposureLoading: {
    type: Boolean,
    default: false,
  },
  loadExposures: {
    type: Function,
    required: true,
  },
  openExposureDialog: {
    type: Function,
    required: true,
  },
});
</script>
