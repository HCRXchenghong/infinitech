<template>
  <el-card shadow="never">
    <template #header>
      <div class="card-title-row">
        <span>商户类型</span>
        <span class="card-tip">内部 key 固定，展示 label 可调整。</span>
      </div>
    </template>
    <el-table :data="merchantTypes" size="small" v-loading="loading" border>
      <el-table-column prop="key" label="内部 key" width="120" />
      <el-table-column label="显示名称" min-width="160">
        <template #default="{ row }">
          <el-input v-model="row.label" />
        </template>
      </el-table-column>
      <el-table-column label="别名兼容" min-width="220">
        <template #default="{ row }">
          <el-select
            v-model="row.aliases"
            multiple
            filterable
            allow-create
            default-first-option
            collapse-tags
            style="width: 100%;"
          >
            <el-option
              v-for="alias in row.aliases"
              :key="alias"
              :label="alias"
              :value="alias"
            />
          </el-select>
        </template>
      </el-table-column>
      <el-table-column label="排序" width="110">
        <template #default="{ row }">
          <el-input-number v-model="row.sort_order" :min="0" :step="10" style="width: 100%;" />
        </template>
      </el-table-column>
      <el-table-column label="启用" width="90">
        <template #default="{ row }">
          <el-switch v-model="row.enabled" />
        </template>
      </el-table-column>
    </el-table>
  </el-card>
</template>

<script setup>
defineProps({
  loading: {
    type: Boolean,
    default: false,
  },
  merchantTypes: {
    type: Array,
    default: () => [],
  },
});
</script>
