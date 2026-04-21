<template>
  <div class="home-campaigns-panel">
    <div class="home-campaigns-panel-header">
      <div class="home-campaigns-panel-title">当前生效位次</div>
    </div>

    <div class="home-campaigns-preview-grid">
      <div class="home-campaigns-preview-block">
        <div class="home-campaigns-preview-title">商品区</div>
        <el-table :data="slotProducts" size="small" stripe>
          <el-table-column label="位次" width="80" align="center">
            <template #default="{ $index }">
              <el-tag size="small">{{ $index + 1 }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="name" label="名称" min-width="160" />
          <el-table-column label="来源" width="120">
            <template #default="{ row }">
              <el-tag size="small" :type="positionSourceTagType(row.positionSource)">
                {{ formatPositionSource(row.positionSource) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="前台标识" width="120">
            <template #default="{ row }">
              {{ promoteLabel(row) }}
            </template>
          </el-table-column>
        </el-table>
      </div>

      <div class="home-campaigns-preview-block">
        <div class="home-campaigns-preview-title">商户区</div>
        <el-table :data="slotShops" size="small" stripe>
          <el-table-column label="位次" width="80" align="center">
            <template #default="{ $index }">
              <el-tag size="small">{{ $index + 1 }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="name" label="名称" min-width="160" />
          <el-table-column label="来源" width="120">
            <template #default="{ row }">
              <el-tag size="small" :type="positionSourceTagType(row.positionSource)">
                {{ formatPositionSource(row.positionSource) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="前台标识" width="120">
            <template #default="{ row }">
              {{ promoteLabel(row) }}
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  slotProducts: {
    type: Array,
    default: () => [],
  },
  slotShops: {
    type: Array,
    default: () => [],
  },
  positionSourceTagType: {
    type: Function,
    required: true,
  },
  formatPositionSource: {
    type: Function,
    required: true,
  },
  promoteLabel: {
    type: Function,
    required: true,
  },
});
</script>
