<template>
  <section class="doc-section">
    <h1>公开接口清单</h1>
    <p>以下是当前已经对外开放的主要接口分组。</p>

    <div v-for="group in endpointGroups" :key="group.title" class="api-group">
      <h2>{{ group.title }}</h2>
      <div
        v-for="endpoint in group.endpoints"
        :key="`${group.title}-${endpoint.path}`"
        class="api-endpoint"
      >
        <div class="endpoint-card">
          <div class="endpoint-method" :class="endpoint.method.toLowerCase()">
            {{ endpoint.method }}
          </div>
          <div class="endpoint-path">{{ endpoint.path }}</div>
        </div>
        <p>{{ endpoint.description }}</p>
        <table v-if="endpoint.params?.length" class="params-table">
          <thead>
            <tr>
              <th>参数名</th>
              <th>类型</th>
              <th>必填</th>
              <th>说明</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="param in endpoint.params" :key="`${endpoint.path}-${param.name}`">
              <td><code>{{ param.name }}</code></td>
              <td>{{ param.type }}</td>
              <td>{{ param.required ? '是' : '否' }}</td>
              <td>{{ param.description }}</td>
            </tr>
          </tbody>
        </table>
        <p class="permission-required">
          需要权限：
          <el-tag size="small">{{ endpoint.permission }}</el-tag>
        </p>
      </div>
    </div>
  </section>
</template>

<script setup>
defineProps({
  endpointGroups: {
    type: Array,
    default: () => [],
  },
});
</script>
