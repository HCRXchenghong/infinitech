<template>
  <el-card class="card guide-card">
    <template #header>
      <div class="card-header">
        <span>权限选择指引</span>
        <el-button link type="primary" @click="goToDocumentation">查看完整 API 文档</el-button>
      </div>
    </template>

    <div class="guide-intro">
      这里负责“谁拿什么 Key，可以访问哪些接口”。如果要看接口参数、返回值和代码示例，请去 API 文档页。
    </div>

    <div class="permission-guide-list">
      <div
        v-for="permission in permissionCatalog"
        :key="permission.key"
        class="permission-guide-item"
      >
        <div class="permission-guide-top">
          <el-tag :type="permission.type" size="small">{{ permission.label }}</el-tag>
          <code class="mono-text">{{ permission.key }}</code>
        </div>
        <div class="permission-guide-desc">{{ permission.description }}</div>
        <div class="permission-guide-example">典型接口：{{ permission.examples.join('、') }}</div>
      </div>
    </div>
  </el-card>
</template>

<script setup>
defineProps({
  goToDocumentation: {
    type: Function,
    required: true,
  },
  permissionCatalog: {
    type: Array,
    default: () => [],
  },
});
</script>
