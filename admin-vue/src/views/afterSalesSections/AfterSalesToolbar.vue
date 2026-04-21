<template>
  <el-card class="toolbar-card" shadow="never">
    <div class="toolbar">
      <el-input
        :model-value="searchKeyword"
        clearable
        placeholder="搜索售后单号/订单号/手机号/用户ID"
        style="width: 340px"
        @update:model-value="emit('update:searchKeyword', $event)"
        @keyup.enter="handleSearch"
      />
      <el-select
        :model-value="statusFilter"
        clearable
        placeholder="全部状态"
        style="width: 160px"
        @update:model-value="emit('update:statusFilter', $event)"
      >
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
</template>

<script setup>
defineProps({
  searchKeyword: {
    type: String,
    default: '',
  },
  statusFilter: {
    type: String,
    default: '',
  },
  statusOptions: {
    type: Array,
    default: () => [],
  },
  clearing: {
    type: Boolean,
    default: false,
  },
  handleSearch: {
    type: Function,
    required: true,
  },
  handleReset: {
    type: Function,
    required: true,
  },
  openClearSelector: {
    type: Function,
    required: true,
  },
})

const emit = defineEmits(['update:searchKeyword', 'update:statusFilter'])
</script>
