<template>
  <div class="section-card">
    <div class="section-head">
      <span>菜单</span>
      <div>
        <el-button type="primary" size="small" @click="goToMenuManage">管理菜单</el-button>
        <el-button type="primary" text size="small" @click="openMenuDialog">编辑说明</el-button>
      </div>
    </div>
    <div class="text-content">{{ shop.menuNotes || '暂无菜单说明' }}</div>
  </div>
</template>

<script setup>
defineProps({
  goToMenuManage: {
    type: Function,
    required: true,
  },
  openMenuDialog: {
    type: Function,
    required: true,
  },
  shop: {
    type: Object,
    required: true,
  },
});
</script>
