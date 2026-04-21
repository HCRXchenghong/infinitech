<template>
  <div class="rank-row">
    <div class="panel rank-panel">
      <div class="panel-title">
        <span>用户消费排名</span>
        <div class="panel-actions">
          <el-radio-group :model-value="userTab" size="small" @update:model-value="handleUserTabUpdate">
            <el-radio-button value="week">周榜</el-radio-button>
            <el-radio-button value="month">月榜</el-radio-button>
          </el-radio-group>
          <el-button size="small" :loading="loading" @click="refreshData">刷新</el-button>
        </div>
      </div>

      <el-table :data="userRanks[userTab] || []" size="small" stripe>
        <el-table-column type="index" label="排名" width="70" />
        <el-table-column prop="name" label="用户" />
        <el-table-column prop="value" label="消费金额" width="120" align="right">
          <template #default="{ row }">
            <span>￥{{ row.value }}</span>
          </template>
        </el-table-column>
        <template #empty>
          <el-empty :description="rankError ? '加载失败，暂无可显示数据' : '暂无用户排名数据'" :image-size="90" />
        </template>
      </el-table>
    </div>

    <div class="panel rank-panel">
      <div class="panel-title">
        <span>骑手配送排名</span>
        <div class="panel-actions">
          <el-radio-group :model-value="riderTab" size="small" @update:model-value="handleRiderTabUpdate">
            <el-radio-button value="week">周榜</el-radio-button>
            <el-radio-button value="month">月榜</el-radio-button>
          </el-radio-group>
          <el-button size="small" :loading="loading" @click="refreshData">刷新</el-button>
        </div>
      </div>

      <el-table :data="displayedRiderRanks" size="small" stripe>
        <el-table-column type="index" label="排名" width="70" />
        <el-table-column prop="name" label="骑手" />
        <el-table-column prop="level" label="段位" width="120">
          <template #default="{ row }">
            <el-tag :type="getRankType(row.level)" size="small">{{ getRankName(row.level, riderRankLevels) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="value" label="配送次数" width="120" align="right" />
        <template #empty>
          <el-empty :description="rankError ? '加载失败，暂无可显示数据' : '暂无骑手排名数据'" :image-size="90" />
        </template>
      </el-table>

      <div v-if="allRiderRanks[riderTab] && allRiderRanks[riderTab].length > 10" class="panel-footer">
        <el-button link type="primary" @click="viewAllRiders">
          查看全部（{{ allRiderRanks[riderTab].length }}）
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup>
function coerceTab(value) {
  return value === 'month' ? 'month' : 'week'
}

const props = defineProps({
  userTab: {
    type: String,
    default: 'week',
  },
  riderTab: {
    type: String,
    default: 'week',
  },
  userRanks: {
    type: Object,
    required: true,
  },
  displayedRiderRanks: {
    type: Array,
    default: () => [],
  },
  allRiderRanks: {
    type: Object,
    required: true,
  },
  riderRankLevels: {
    type: Array,
    default: () => [],
  },
  loading: {
    type: Boolean,
    default: false,
  },
  rankError: {
    type: String,
    default: '',
  },
  setUserTab: {
    type: Function,
    required: true,
  },
  setRiderTab: {
    type: Function,
    required: true,
  },
  loadOrders: {
    type: Function,
    required: true,
  },
  refreshData: {
    type: Function,
    required: true,
  },
  getRankType: {
    type: Function,
    required: true,
  },
  getRankName: {
    type: Function,
    required: true,
  },
  viewAllRiders: {
    type: Function,
    required: true,
  },
})

function handleUserTabUpdate(value) {
  props.setUserTab(coerceTab(value))
  void props.loadOrders()
}

function handleRiderTabUpdate(value) {
  props.setRiderTab(coerceTab(value))
  void props.loadOrders()
}
</script>
