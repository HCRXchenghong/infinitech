<template>
  <div class="section-block">
    <div class="section-title">平台配置备份与恢复</div>
    <div class="settings-grid">
      <el-card v-for="card in configCards" :key="card.key" class="card">
        <div class="card-title">{{ card.title }}</div>
        <div class="card-description">{{ card.description }}</div>
        <el-button type="primary" :loading="card.exportLoading" @click="card.onExport">
          <el-icon><Download /></el-icon>
          {{ card.exportLabel }}
        </el-button>
        <el-upload
          :http-request="(options) => handleConfigImport(options, card.key)"
          :show-file-list="false"
          accept=".json"
          :before-upload="beforeImport"
        >
          <el-button type="success" :loading="card.importLoading" style="margin-top: 12px;">
            <el-icon><Upload /></el-icon>
            {{ card.importLabel }}
          </el-button>
        </el-upload>
        <div class="form-tip" :class="{ warning: card.warning }">{{ card.importTip }}</div>
      </el-card>
    </div>
  </div>
</template>

<script setup>
import { Download, Upload } from '@element-plus/icons-vue';

defineProps({
  beforeImport: {
    type: Function,
    required: true,
  },
  configCards: {
    type: Array,
    default: () => [],
  },
  handleConfigImport: {
    type: Function,
    required: true,
  },
});
</script>
