<template>
  <div class="page">
    <div class="title-row">
      <span class="title">数据管理</span>
      <el-button size="small" @click="refreshAll" :loading="loading">刷新</el-button>
    </div>

    <div class="settings-grid">
      <!-- 用户数据管理 -->
      <el-card class="card">
        <div class="card-title">用户数据管理</div>
        <el-form label-width="140px" size="small">
          <el-form-item label="导出用户数据">
            <el-button type="primary" @click="exportUsers" :loading="exporting">
              <el-icon><Download /></el-icon>
              导出用户数据
            </el-button>
            <div class="form-tip">导出所有用户数据（包括密码哈希），可用于备份和恢复</div>
          </el-form-item>
          <el-form-item label="导入用户数据">
            <el-upload
              :http-request="(options) => handleImport(options, 'users')"
              :show-file-list="false"
              accept=".json"
              :before-upload="beforeImport"
            >
              <el-button type="success" :loading="importing">
                <el-icon><Upload /></el-icon>
                导入用户数据
              </el-button>
            </el-upload>
            <div class="form-tip">导入用户数据（支持恢复已删除的用户），将覆盖或创建用户</div>
          </el-form-item>
        </el-form>
      </el-card>

      <!-- 骑手数据管理 -->
      <el-card class="card">
        <div class="card-title">骑手数据管理</div>
        <el-form label-width="140px" size="small">
          <el-form-item label="导出骑手数据">
            <el-button type="primary" @click="exportRiders" :loading="exportingRiders">
              <el-icon><Download /></el-icon>
              导出骑手数据
            </el-button>
            <div class="form-tip">导出所有骑手数据（包括密码哈希），可用于备份和恢复</div>
          </el-form-item>
          <el-form-item label="导入骑手数据">
            <el-upload
              :http-request="(options) => handleImport(options, 'riders')"
              :show-file-list="false"
              accept=".json"
              :before-upload="beforeImport"
            >
              <el-button type="success" :loading="importingRiders">
                <el-icon><Upload /></el-icon>
                导入骑手数据
              </el-button>
            </el-upload>
            <div class="form-tip">导入骑手数据（支持恢复已删除的骑手），将覆盖或创建骑手</div>
          </el-form-item>
        </el-form>
      </el-card>

      <!-- 订单数据管理 -->
      <el-card class="card">
        <div class="card-title">订单数据管理</div>
        <el-form label-width="140px" size="small">
          <el-form-item label="导出订单数据">
            <el-button type="primary" @click="exportOrders" :loading="exportingOrders">
              <el-icon><Download /></el-icon>
              导出订单数据
            </el-button>
            <div class="form-tip">导出所有订单数据，可用于备份和恢复</div>
          </el-form-item>
          <el-form-item label="导入订单数据">
            <el-upload
              :http-request="(options) => handleImport(options, 'orders')"
              :show-file-list="false"
              accept=".json"
              :before-upload="beforeImport"
            >
              <el-button type="success" :loading="importingOrders">
                <el-icon><Upload /></el-icon>
                导入订单数据
              </el-button>
            </el-upload>
            <div class="form-tip">导入订单数据（支持恢复已删除的订单），将覆盖或创建订单</div>
          </el-form-item>
        </el-form>
      </el-card>

      <!-- 商户数据管理 -->
      <el-card class="card">
        <div class="card-title">商户数据管理</div>
        <el-form label-width="140px" size="small">
          <el-form-item label="导出商户数据">
            <el-button type="primary" @click="exportMerchants" :loading="exportingMerchants">
              <el-icon><Download /></el-icon>
              导出商户数据
            </el-button>
            <div class="form-tip">导出所有商户数据（包括密码哈希），可用于备份和恢复</div>
          </el-form-item>
          <el-form-item label="导入商户数据">
            <el-upload
              :http-request="(options) => handleImport(options, 'merchants')"
              :show-file-list="false"
              accept=".json"
              :before-upload="beforeImport"
            >
              <el-button type="success" :loading="importingMerchants">
                <el-icon><Upload /></el-icon>
                导入商户数据
              </el-button>
            </el-upload>
            <div class="form-tip">导入商户数据（支持恢复已删除的商户），将覆盖或创建商户</div>
          </el-form-item>
        </el-form>
      </el-card>

      <!-- 综合数据管理 -->
      <el-card class="card full-width">
        <div class="card-title">综合数据管理</div>
        <el-form label-width="140px" size="small">
          <el-form-item label="导出到文件夹">
            <el-button type="primary" @click="exportAllToFolder" :loading="exportingToFolder">
              <el-icon><FolderOpened /></el-icon>
              导出所有数据到文件夹
            </el-button>
            <div class="form-tip">将所有数据（用户、骑手、订单、商户）分别导出到指定文件夹，每个类型一个文件</div>
          </el-form-item>
          <el-form-item label="打包所有数据">
            <el-button type="primary" @click="exportAllData" :loading="exportingAll">
              <el-icon><Download /></el-icon>
              打包所有数据
            </el-button>
            <div class="form-tip">打包所有数据（用户、骑手、订单、商户），生成一个完整的备份文件</div>
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
            <div class="form-tip">上传综合数据包，将自动识别并导入所有类型的数据</div>
          </el-form-item>
        </el-form>
      </el-card>
    </div>
  </div>
</template>

<script setup>
import { Download, Upload, FolderOpened } from '@element-plus/icons-vue';
import { useDataManagementPage } from './dataManagementHelpers';

const {
  loading,
  exporting,
  importing,
  exportingRiders,
  importingRiders,
  exportingOrders,
  importingOrders,
  exportingMerchants,
  importingMerchants,
  exportingAll,
  exportingToFolder,
  importingAll,
  refreshAll,
  exportUsers,
  beforeImport,
  handleImport,
  exportRiders,
  exportOrders,
  exportMerchants,
  exportAllToFolder,
  exportAllData,
  handleImportAll
} = useDataManagementPage();
</script>

<style scoped lang="css" src="./DataManagement.css"></style>
