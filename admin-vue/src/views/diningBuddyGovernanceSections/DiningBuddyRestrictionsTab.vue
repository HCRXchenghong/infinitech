<template>
  <el-card shadow="never">
    <template #header>
      <div class="card-title-row">
        <span>用户限制</span>
        <div class="inline-filters">
          <el-button size="small" :loading="restrictionsLoading" @click="loadRestrictions(true)">刷新</el-button>
          <el-button size="small" type="primary" @click="openRestrictionDialog()">新增限制</el-button>
        </div>
      </div>
    </template>

    <el-table :data="restrictions" v-loading="restrictionsLoading" size="small" border>
      <el-table-column prop="user_name" label="用户" width="140" />
      <el-table-column prop="user_uid" label="用户 UID" width="170" />
      <el-table-column prop="restriction_type" label="限制类型" width="100" />
      <el-table-column prop="reason" label="原因" min-width="180" />
      <el-table-column prop="expires_at" label="到期时间" width="180" />
      <el-table-column prop="updated_at" label="更新时间" width="180" />
      <el-table-column label="操作" width="140">
        <template #default="{ row }">
          <el-button size="small" text @click="openRestrictionDialog(row)">编辑</el-button>
        </template>
      </el-table-column>
    </el-table>
  </el-card>
</template>

<script setup>
defineProps({
  restrictions: {
    type: Array,
    default: () => [],
  },
  restrictionsLoading: {
    type: Boolean,
    default: false,
  },
  loadRestrictions: {
    type: Function,
    required: true,
  },
  openRestrictionDialog: {
    type: Function,
    required: true,
  },
})
</script>
