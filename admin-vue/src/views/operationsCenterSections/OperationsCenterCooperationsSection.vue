<template>
  <el-table :data="cooperations" size="small" stripe v-loading="loading">
    <el-table-column prop="id" label="ID" width="70" />
    <el-table-column prop="company" label="主题" min-width="160" />
    <el-table-column label="类型" width="120">
      <template #default="{ row }">
        <el-tag size="small" :type="getCooperationTypeTagType(row.cooperation_type)">
          {{ formatCooperationType(row.cooperation_type) }}
        </el-tag>
      </template>
    </el-table-column>
    <el-table-column prop="contact_name" label="联系人" width="100" />
    <el-table-column prop="contact_phone" label="电话" width="140" />
    <el-table-column prop="description" label="内容" min-width="220" show-overflow-tooltip />
    <el-table-column prop="created_at" label="提交时间" width="160" />
    <el-table-column label="状态" width="120">
      <template #default="{ row }">
        <el-select v-model="row.status" size="small" @change="updateCooperation(row)">
          <el-option
            v-for="option in cooperationStatusOptions"
            :key="option.value"
            :label="option.label"
            :value="option.value"
          />
        </el-select>
      </template>
    </el-table-column>
    <template #empty>
      <el-empty
        :description="loadError ? '加载失败，暂无可显示数据' : '暂无反馈与合作记录'"
        :image-size="90"
      />
    </template>
  </el-table>
</template>

<script setup>
defineProps({
  cooperations: {
    type: Array,
    default: () => [],
  },
  loading: {
    type: Boolean,
    default: false,
  },
  loadError: {
    type: String,
    default: '',
  },
  cooperationStatusOptions: {
    type: Array,
    default: () => [],
  },
  formatCooperationType: {
    type: Function,
    required: true,
  },
  getCooperationTypeTagType: {
    type: Function,
    required: true,
  },
  updateCooperation: {
    type: Function,
    required: true,
  },
});
</script>
