<template>
  <div v-if="!isOnline" class="network-status-offline">
    <el-alert
      :title="'与服务器失去连接'"
      type="warning"
      :closable="false"
      show-icon
    >
      <template #default>
        <div class="network-status-content">
          <p>当前无法连接到服务器，系统已切换到离线模式。</p>
          <p class="network-status-tip">
            • 您可以查看已缓存的数据<br/>
            • 可以导出已缓存的数据<br/>
            • 无法执行新增、修改、删除等操作<br/>
            • 请检查网络连接后刷新页面
          </p>
        </div>
      </template>
    </el-alert>
  </div>
  <div v-else-if="isOnline && serverConnected === false" class="network-status-offline">
    <el-alert
      :title="'服务器连接异常'"
      type="error"
      :closable="false"
      show-icon
    >
      <template #default>
        <div class="network-status-content">
          <p>网络已连接，但无法访问服务器。</p>
          <p class="network-status-tip">
            请检查服务器地址配置或联系管理员
          </p>
        </div>
      </template>
    </el-alert>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { onNetworkStatusChange, checkServerConnection } from '@/utils/networkStatus';
import { baseURL } from '@/utils/request';

const isOnline = ref(navigator.onLine);
const serverConnected = ref(true);
let unsubscribe = null;
let checkInterval = null;

// 检查服务器连接
async function checkConnection() {
  if (isOnline.value) {
    const connected = await checkServerConnection(baseURL);
    serverConnected.value = connected;
  } else {
    serverConnected.value = false;
  }
}

onMounted(() => {
  // 订阅网络状态变化
  unsubscribe = onNetworkStatusChange((online) => {
    isOnline.value = online;
    checkConnection();
  });
  
  // 定期检查服务器连接（每30秒）
  checkInterval = setInterval(checkConnection, 30000);
  
  // 立即检查一次
  checkConnection();
});

onBeforeUnmount(() => {
  if (unsubscribe) {
    unsubscribe();
  }
  if (checkInterval) {
    clearInterval(checkInterval);
  }
});
</script>

<style scoped>
.network-status-offline {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 9999;
  padding: 10px;
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.network-status-content {
  margin-top: 8px;
}

.network-status-content p {
  margin: 4px 0;
  font-size: 14px;
}

.network-status-tip {
  margin-top: 8px;
  color: #606266;
  font-size: 13px;
  line-height: 1.6;
}
</style>

