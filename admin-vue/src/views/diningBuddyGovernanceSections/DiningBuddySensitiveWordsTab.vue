<template>
  <el-card shadow="never">
    <template #header>
      <div class="card-title-row">
        <span>敏感词管理</span>
        <div class="inline-filters">
          <el-button size="small" :loading="sensitiveLoading" @click="loadSensitiveWords(true)">刷新</el-button>
          <el-button size="small" type="primary" @click="openSensitiveDialog()">新增敏感词</el-button>
        </div>
      </div>
    </template>

    <el-table :data="sensitiveWords" v-loading="sensitiveLoading" size="small" border>
      <el-table-column prop="word" label="敏感词" min-width="180" />
      <el-table-column prop="description" label="说明" min-width="220" />
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <el-tag size="small" :type="row.enabled ? 'danger' : 'info'">{{ row.enabled ? '启用' : '停用' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="updated_at" label="更新时间" width="180" />
      <el-table-column label="操作" width="180">
        <template #default="{ row }">
          <el-button size="small" text @click="openSensitiveDialog(row)">编辑</el-button>
          <el-button size="small" text type="danger" @click="deleteSensitiveWord(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
  </el-card>
</template>

<script setup>
defineProps({
  sensitiveWords: {
    type: Array,
    default: () => [],
  },
  sensitiveLoading: {
    type: Boolean,
    default: false,
  },
  loadSensitiveWords: {
    type: Function,
    required: true,
  },
  openSensitiveDialog: {
    type: Function,
    required: true,
  },
  deleteSensitiveWord: {
    type: Function,
    required: true,
  },
})
</script>
