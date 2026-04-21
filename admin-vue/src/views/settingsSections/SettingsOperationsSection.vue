<template>
  <el-card class="card full-width">
    <div class="card-title">数据管理</div>
    <div class="data-mgmt-grid">
      <div class="data-mgmt-item" v-for="item in dataMgmtItems" :key="item.label">
        <span class="data-mgmt-label">{{ item.label }}</span>
        <div class="data-mgmt-actions">
          <el-button size="small" type="primary" @click="item.onExport" :loading="item.exporting">
            <el-icon><Download /></el-icon> 导出
          </el-button>
          <el-upload :http-request="item.onImport" :show-file-list="false" accept=".json" :before-upload="beforeImport">
            <el-button size="small" type="success" :loading="item.importing">
              <el-icon><Upload /></el-icon> 导入
            </el-button>
          </el-upload>
        </div>
      </div>
    </div>
  </el-card>

  <el-card class="card full-width danger-card">
    <div class="card-title danger-title">危险操作</div>
    <div class="danger-body">
      <div class="danger-tip">
        清空全部信息会删除业务数据与日志，保留管理员账号与系统基础配置，操作不可恢复。
      </div>
      <el-button type="danger" :loading="clearingAllData" @click="openClearAllDataDialog">
        清空全部信息
      </el-button>
    </div>
  </el-card>

  <el-card class="card full-width">
    <div class="card-title">对外 API 能力</div>
    <el-alert type="info" :closable="false" style="margin-bottom: 14px;">
      <template #title>
        API 文档负责说明接口怎么调用；API 权限管理负责维护 Key、主要 API URL / 路径和权限分配；API 管理仅保留第三方服务配置。
      </template>
    </el-alert>
    <div style="display:flex;gap:8px;flex-wrap:wrap;">
      <el-button type="primary" @click="router.push('/api-permissions')">打开 API 权限管理</el-button>
      <el-button @click="router.push('/api-documentation')">打开 API 文档</el-button>
      <el-button @click="router.push('/api-management')">打开第三方 API 配置</el-button>
    </div>
  </el-card>
</template>

<script setup>
import { Download, Upload } from '@element-plus/icons-vue'

defineProps({
  router: {
    type: Object,
    required: true,
  },
  dataMgmtItems: {
    type: Array,
    required: true,
  },
  beforeImport: {
    type: Function,
    required: true,
  },
  clearingAllData: {
    type: Boolean,
    default: false,
  },
  openClearAllDataDialog: {
    type: Function,
    required: true,
  },
})
</script>

<style scoped lang="css" src="../Settings.css"></style>
