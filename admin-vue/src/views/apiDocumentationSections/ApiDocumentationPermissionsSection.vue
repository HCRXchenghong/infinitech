<template>
  <section class="doc-section">
    <h1>权限模型</h1>
    <p>每个 API Key 只能访问自己被授权的数据范围。没有权限时会返回 `403`。</p>

    <table class="params-table">
      <thead>
        <tr>
          <th>权限标识</th>
          <th>说明</th>
          <th>可访问接口</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="permission in permissionRows" :key="permission.key">
          <td><code>{{ permission.key }}</code></td>
          <td>{{ permission.description }}</td>
          <td>{{ permission.scope }}</td>
        </tr>
      </tbody>
    </table>

    <div class="resource-grid">
      <div v-for="resource in resourceTypes" :key="resource.name" class="resource-card">
        <div class="resource-header">
          <el-icon><component :is="iconMap[resource.icon]" /></el-icon>
          <strong>{{ resource.name }}</strong>
        </div>
        <p>{{ resource.description }}</p>
        <div class="resource-permissions">
          <el-tag v-for="perm in resource.permissions" :key="perm" size="small">{{ perm }}</el-tag>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
defineProps({
  iconMap: {
    type: Object,
    required: true,
  },
  permissionRows: {
    type: Array,
    default: () => [],
  },
  resourceTypes: {
    type: Array,
    default: () => [],
  },
});
</script>
