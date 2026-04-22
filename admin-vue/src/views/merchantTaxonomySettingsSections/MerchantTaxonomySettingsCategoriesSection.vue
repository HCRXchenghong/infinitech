<template>
  <el-card shadow="never">
    <template #header>
      <div class="card-title-row">
        <span>业务分类</span>
        <span class="card-tip">历史别名会在保存和读取时自动收敛到标准 key。</span>
      </div>
    </template>
    <el-table :data="businessCategories" size="small" v-loading="loading" border>
      <el-table-column prop="key" label="内部 key" width="180" />
      <el-table-column label="显示名称" min-width="140">
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
  businessCategories: {
    type: Array,
    default: () => [],
  },
  loading: {
    type: Boolean,
    default: false,
  },
});
</script>
