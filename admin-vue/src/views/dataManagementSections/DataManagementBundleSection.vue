<template>
  <div class="section-block">
    <div class="section-title">完整平台备份</div>
    <div class="settings-grid">
      <el-card class="card full-width">
        <div class="card-title">综合数据管理</div>
        <el-form label-width="140px" size="small">
          <el-form-item label="导出到文件夹">
            <el-button type="primary" :loading="exportingToFolder" @click="exportAllToFolder">
              <el-icon><FolderOpened /></el-icon>
              导出所有数据到文件夹
            </el-button>
            <div class="form-tip">桌面端可将 4 类业务数据和 4 类平台配置分别导出成多个 JSON 文件。</div>
          </el-form-item>
          <el-form-item label="完整平台备份">
            <el-button type="primary" :loading="exportingAll" @click="exportAllData">
              <el-icon><Download /></el-icon>
              打包完整平台备份
            </el-button>
            <div class="form-tip">打包用户、骑手、订单、商户，以及系统、内容、API、支付配置快照。</div>
          </el-form-item>
          <el-form-item label="上传综合数据">
            <el-upload
              :http-request="handleImportAll"
              :show-file-list="false"
              accept=".json"
              :before-upload="beforeImport"
            >
              <el-button type="success" :loading="importingAll">
                <el-icon><Upload /></el-icon>
                上传综合数据
              </el-button>
            </el-upload>
            <div class="form-tip">会按备份包内容自动恢复业务数据以及系统、内容、API、支付配置。</div>
          </el-form-item>
        </el-form>
      </el-card>
    </div>
  </div>
</template>

<script setup>
import { Download, FolderOpened, Upload } from '@element-plus/icons-vue';

defineProps({
  beforeImport: {
    type: Function,
    required: true,
  },
  exportAllData: {
    type: Function,
    required: true,
  },
  exportAllToFolder: {
    type: Function,
    required: true,
  },
  exportingAll: {
    type: Boolean,
    default: false,
  },
  exportingToFolder: {
    type: Boolean,
    default: false,
  },
  handleImportAll: {
    type: Function,
    required: true,
  },
  importingAll: {
    type: Boolean,
    default: false,
  },
});
</script>
