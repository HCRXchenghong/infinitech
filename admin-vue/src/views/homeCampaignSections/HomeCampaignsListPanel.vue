<template>
  <div class="home-campaigns-panel">
    <div class="home-campaigns-panel-header">
      <div class="home-campaigns-panel-title">首页推广</div>
      <div class="home-campaigns-panel-actions">
        <el-button size="small" :loading="loading" @click="loadAll">刷新</el-button>
        <el-button size="small" @click="openDialog(null, true)">锁定位次</el-button>
        <el-button type="primary" size="small" @click="openDialog()">新建推广计划</el-button>
      </div>
    </div>

    <PageStateAlert :message="pageError" />

    <div class="home-campaigns-filters">
      <el-select
        v-model="filters.objectType"
        clearable
        placeholder="对象类型"
        size="small"
        style="width: 140px"
      >
        <el-option label="商户" value="shop" />
        <el-option label="商品" value="product" />
      </el-select>
      <el-select
        v-model="filters.status"
        clearable
        placeholder="投放状态"
        size="small"
        style="width: 140px"
      >
        <el-option label="草稿" value="draft" />
        <el-option label="已审核" value="approved" />
        <el-option label="投放中" value="active" />
        <el-option label="已排期" value="scheduled" />
        <el-option label="已暂停" value="paused" />
        <el-option label="已驳回" value="rejected" />
        <el-option label="已结束" value="ended" />
      </el-select>
      <el-input v-model.trim="filters.city" clearable size="small" placeholder="城市" style="width: 160px" />
      <el-input
        v-model.trim="filters.businessCategory"
        clearable
        size="small"
        placeholder="业务分类"
        style="width: 160px"
      />
      <el-button size="small" type="primary" @click="handleFilterQuery">查询</el-button>
    </div>

    <el-table :data="campaigns" size="small" stripe v-loading="loading">
      <el-table-column prop="objectType" label="对象类型" width="100">
        <template #default="{ row }">
          <el-tag size="small" :type="objectTypeTagType(row.objectType)">
            {{ objectTypeLabel(row.objectType) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="targetName" label="投放对象" min-width="180" />
      <el-table-column prop="slotPosition" label="目标位次" width="100" align="center" />
      <el-table-column prop="city" label="城市" width="120">
        <template #default="{ row }">
          {{ row.city || '全局' }}
        </template>
      </el-table-column>
      <el-table-column prop="businessCategory" label="业务分类" width="140">
        <template #default="{ row }">
          {{ row.businessCategory || '全部' }}
        </template>
      </el-table-column>
      <el-table-column label="状态" width="120">
        <template #default="{ row }">
          <el-tag size="small" :type="statusTagType(row.effectiveStatus || row.status)">
            {{ formatStatus(row.effectiveStatus || row.status) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="锁位" width="80" align="center">
        <template #default="{ row }">
          <el-tag size="small" :type="lockTagType(row.isPositionLocked)">
            {{ lockLabel(row.isPositionLocked) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="promoteLabel" label="前台标识" width="120" />
      <el-table-column prop="startAt" label="开始时间" width="170" />
      <el-table-column prop="endAt" label="结束时间" width="170" />
      <el-table-column label="操作" width="260" fixed="right">
        <template #default="{ row }">
          <el-button type="primary" link size="small" @click="openDialog(row)">编辑</el-button>
          <el-button
            v-if="canAction(row, 'approve')"
            type="success"
            link
            size="small"
            @click="changeStatus(row, 'approve')"
          >
            审核
          </el-button>
          <el-button
            v-if="canAction(row, 'reject')"
            type="danger"
            link
            size="small"
            @click="changeStatus(row, 'reject')"
          >
            驳回
          </el-button>
          <el-button
            v-if="canAction(row, 'pause')"
            type="warning"
            link
            size="small"
            @click="changeStatus(row, 'pause')"
          >
            暂停
          </el-button>
          <el-button
            v-if="canAction(row, 'resume')"
            type="primary"
            link
            size="small"
            @click="changeStatus(row, 'resume')"
          >
            恢复
          </el-button>
        </template>
      </el-table-column>
      <template #empty>
        <el-empty :description="pageError ? '加载失败，暂无可显示数据' : '暂无首页推广计划'" :image-size="90" />
      </template>
    </el-table>
  </div>
</template>

<script setup>
import PageStateAlert from '@/components/PageStateAlert.vue';

defineProps({
  loading: {
    type: Boolean,
    default: false,
  },
  pageError: {
    type: String,
    default: '',
  },
  filters: {
    type: Object,
    required: true,
  },
  campaigns: {
    type: Array,
    default: () => [],
  },
  loadAll: {
    type: Function,
    required: true,
  },
  openDialog: {
    type: Function,
    required: true,
  },
  handleFilterQuery: {
    type: Function,
    required: true,
  },
  objectTypeTagType: {
    type: Function,
    required: true,
  },
  objectTypeLabel: {
    type: Function,
    required: true,
  },
  statusTagType: {
    type: Function,
    required: true,
  },
  formatStatus: {
    type: Function,
    required: true,
  },
  lockTagType: {
    type: Function,
    required: true,
  },
  lockLabel: {
    type: Function,
    required: true,
  },
  canAction: {
    type: Function,
    required: true,
  },
  changeStatus: {
    type: Function,
    required: true,
  },
});
</script>
