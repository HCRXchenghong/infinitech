<template>
  <div class="center-tab-shell">
    <div class="center-tab-head">
      <div>
        <div class="center-tab-title">官网商务合作线索</div>
        <div class="center-tab-subtitle">官网提交的合作方向、联系方式和备注都集中在这里持续跟进。</div>
      </div>
    </div>

    <div class="table-toolbar center-toolbar">
      <el-select v-model="cooperationFilters.status" size="small" clearable placeholder="跟进状态">
        <el-option
          v-for="option in OFFICIAL_SITE_COOPERATION_STATUS_OPTIONS"
          :key="option.value"
          :label="option.label"
          :value="option.value"
        />
      </el-select>
      <el-button size="small" @click="loadCooperations">筛选</el-button>
    </div>

    <div class="official-site-table-card">
      <el-table :data="cooperations" size="small" stripe v-loading="cooperationLoading">
        <el-table-column prop="contact_name" label="昵称" width="120" />
        <el-table-column prop="contact_phone" label="联系方式" width="180" />
        <el-table-column prop="description" label="合作方向" min-width="260" show-overflow-tooltip />
        <el-table-column prop="created_at" label="提交时间" width="170">
          <template #default="{ row }">{{ formatDateTime(row.created_at) }}</template>
        </el-table-column>
        <el-table-column label="状态" width="150">
          <template #default="{ row }">
            <el-select v-model="row.status" size="small">
              <el-option
                v-for="option in OFFICIAL_SITE_COOPERATION_STATUS_OPTIONS"
                :key="option.value"
                :label="option.label"
                :value="option.value"
              />
            </el-select>
          </template>
        </el-table-column>
        <el-table-column label="备注" min-width="220">
          <template #default="{ row }">
            <el-input v-model="row.admin_remark" size="small" maxlength="200" placeholder="管理员备注" />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="90" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="saveCooperation(row)">保存</el-button>
          </template>
        </el-table-column>
        <template #empty>
          <el-empty description="暂无官网商务合作线索" :image-size="80" />
        </template>
      </el-table>
    </div>
  </div>
</template>

<script setup>
import { OFFICIAL_SITE_COOPERATION_STATUS_OPTIONS } from '@infinitech/admin-core';
import { formatDateTime } from '@/utils/officialSiteApi';

defineProps({
  cooperationFilters: {
    type: Object,
    required: true,
  },
  cooperations: {
    type: Array,
    default: () => [],
  },
  cooperationLoading: {
    type: Boolean,
    default: false,
  },
  loadCooperations: {
    type: Function,
    required: true,
  },
  saveCooperation: {
    type: Function,
    required: true,
  },
});
</script>
