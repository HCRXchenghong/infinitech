<template>
  <el-card shadow="never">
    <template #header>
      <div class="card-title-row">
        <span>组局列表</span>
        <div class="inline-filters">
          <el-select v-model="partyFilters.status" clearable placeholder="状态" size="small" style="width: 120px;">
            <el-option
              v-for="option in partyStatusOptions"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            />
          </el-select>
          <el-select v-model="partyFilters.category" clearable placeholder="分类" size="small" style="width: 120px;">
            <el-option
              v-for="option in partyCategoryOptions"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            />
          </el-select>
          <el-input v-model="partyFilters.search" clearable placeholder="搜索标题/发起人" size="small" style="width: 220px;" />
          <el-button size="small" :loading="partiesLoading" @click="loadParties(true)">查询</el-button>
        </div>
      </div>
    </template>

    <el-table :data="parties" v-loading="partiesLoading" size="small" border>
      <el-table-column prop="title" label="组局标题" min-width="180" />
      <el-table-column prop="category" label="分类" width="100" />
      <el-table-column prop="host_name" label="发起人" width="120" />
      <el-table-column label="人数" width="100">
        <template #default="{ row }">{{ row.current_members || row.current || 0 }}/{{ row.max_people || row.max || 0 }}</template>
      </el-table-column>
      <el-table-column prop="status" label="状态" width="100" />
      <el-table-column prop="created_at" label="创建时间" width="180" />
      <el-table-column label="操作" width="280" fixed="right">
        <template #default="{ row }">
          <el-button size="small" text @click="openPartyDrawer(row)">详情</el-button>
          <el-button size="small" text @click="openMessageDrawer(row)">消息治理</el-button>
          <el-button
            v-if="row.status !== 'closed'"
            size="small"
            text
            type="danger"
            @click="changePartyStatus(row, 'close')"
          >
            关闭
          </el-button>
          <el-button
            v-else
            size="small"
            text
            type="success"
            @click="changePartyStatus(row, 'reopen')"
          >
            重开
          </el-button>
        </template>
      </el-table-column>
      <template #empty>
        <el-empty :description="partiesLoading ? '加载中...' : '暂无组局数据'" :image-size="90" />
      </template>
    </el-table>
  </el-card>
</template>

<script setup>
defineProps({
  partyFilters: {
    type: Object,
    required: true,
  },
  partyStatusOptions: {
    type: Array,
    default: () => [],
  },
  partyCategoryOptions: {
    type: Array,
    default: () => [],
  },
  parties: {
    type: Array,
    default: () => [],
  },
  partiesLoading: {
    type: Boolean,
    default: false,
  },
  loadParties: {
    type: Function,
    required: true,
  },
  openPartyDrawer: {
    type: Function,
    required: true,
  },
  openMessageDrawer: {
    type: Function,
    required: true,
  },
  changePartyStatus: {
    type: Function,
    required: true,
  },
})
</script>
