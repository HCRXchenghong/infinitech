<template>
  <div class="section-block">
    <div class="section-title">业务数据备份与恢复</div>
    <div class="settings-grid">
      <el-card v-for="card in businessCards" :key="card.key" class="card">
        <div class="card-title">{{ card.title }}</div>
        <el-form label-width="140px" size="small">
          <el-form-item :label="card.exportLabel">
            <el-button type="primary" :loading="card.exportLoading" @click="card.onExport">
              <el-icon><Download /></el-icon>
              {{ card.exportLabel }}
            </el-button>
            <div class="form-tip">{{ card.exportTip }}</div>
          </el-form-item>
          <el-form-item :label="card.importLabel">
            <el-upload
              :http-request="(options) => handleImport(options, card.key)"
              :show-file-list="false"
              accept=".json"
              :before-upload="beforeImport"
            >
              <el-button type="success" :loading="card.importLoading">
                <el-icon><Upload /></el-icon>
                {{ card.importLabel }}
              </el-button>
            </el-upload>
            <div class="form-tip">{{ card.importTip }}</div>
          </el-form-item>
        </el-form>
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
  businessCards: {
    type: Array,
    default: () => [],
  },
  handleImport: {
    type: Function,
    required: true,
  },
});
</script>
