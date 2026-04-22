<template>
  <el-table :data="ranks" stripe size="small" v-loading="loading">
    <el-table-column type="index" label="排名" width="80" :index="indexMethod" />
    <el-table-column prop="name" label="骑手姓名" />
    <el-table-column prop="level" label="段位" width="120">
      <template #default="{ row }">
        <el-tag :type="getRankType(row.level)" size="small">
          {{ getRankName(row.level, riderRankLevels) }}
        </el-tag>
      </template>
    </el-table-column>
    <el-table-column prop="value" label="配送次数" width="120" align="right">
      <template #default="{ row }">
        <strong>{{ row.value }}</strong>
      </template>
    </el-table-column>

    <template #empty>
      <el-empty
        :description="loadError ? '加载失败，暂无可显示数据' : '暂无骑手排名数据'"
        :image-size="90"
      />
    </template>
  </el-table>
</template>

<script setup>
defineProps({
  getRankName: {
    type: Function,
    required: true,
  },
  getRankType: {
    type: Function,
    required: true,
  },
  indexMethod: {
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
  ranks: {
    type: Array,
    default: () => [],
  },
  riderRankLevels: {
    type: Array,
    default: () => [],
  },
})
</script>
