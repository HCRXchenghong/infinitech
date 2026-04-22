<template>
  <el-card class="card">
    <div class="toolbar">
      <el-select
        :model-value="filters.source"
        size="small"
        style="width: 140px"
        @update:model-value="setFilterValue('source', $event)"
        @change="handleSearch"
      >
        <el-option
          v-for="option in systemLogSourceOptions"
          :key="option.value"
          :label="option.label"
          :value="option.value"
        />
      </el-select>
      <el-select
        :model-value="filters.action"
        size="small"
        style="width: 140px"
        @update:model-value="setFilterValue('action', $event)"
        @change="handleSearch"
      >
        <el-option
          v-for="option in systemLogActionOptions"
          :key="option.value"
          :label="option.label"
          :value="option.value"
        />
      </el-select>
      <el-input
        :model-value="filters.keyword"
        size="small"
        clearable
        placeholder="搜索操作、接口、原始日志"
        style="width: 280px"
        @update:model-value="setFilterValue('keyword', $event)"
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
            {{ row.actionLabel || '-' }}
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
          <span v-else class="muted-text">{{ row.message || '-' }}</span>
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
      :current-page="pagination.page"
      :page-size="pagination.limit"
      :total="pagination.total"
      :page-sizes="[20, 50, 100, 200]"
      layout="total, sizes, prev, pager, next, jumper"
      style="margin-top: 18px; justify-content: center"
      @current-change="handleCurrentChange"
      @size-change="handleSizeChange"
    />
  </el-card>
</template>

<script setup>
import PageStateAlert from '@/components/PageStateAlert.vue';

const props = defineProps({
  actionTagType: {
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
  handlePageSizeChange: {
    type: Function,
    required: true,
  },
  handleSearch: {
    type: Function,
    required: true,
  },
  loadError: {
    type: String,
    default: '',
  },
  loadLogs: {
    type: Function,
    required: true,
  },
  loading: {
    type: Boolean,
    default: false,
  },
  logs: {
    type: Array,
    default: () => [],
  },
  openDeleteDialog: {
    type: Function,
    required: true,
  },
  openDetail: {
    type: Function,
    required: true,
  },
  pagination: {
    type: Object,
    required: true,
  },
  resetFilters: {
    type: Function,
    required: true,
  },
  systemLogActionOptions: {
    type: Array,
    default: () => [],
  },
  systemLogSourceOptions: {
    type: Array,
    default: () => [],
  },
});

function setFilterValue(key, value) {
  props.filters[key] = value;
}

function handleCurrentChange(value) {
  props.pagination.page = value;
  props.loadLogs();
}

function handleSizeChange(value) {
  props.pagination.limit = value;
  props.handlePageSizeChange();
}
</script>
