<template>
  <div class="page">
    <div class="title-row">
      <div>
        <span class="title">数据管理</span>
        <div class="page-subtitle">校验真实导入导出链路，备份核心业务数据与平台配置，并支持无损回灌</div>
      </div>
      <el-button size="small" @click="refreshAll()" :loading="loading">
        <el-icon><RefreshRight /></el-icon>
        刷新校验
      </el-button>
    </div>

    <el-card class="overview-panel">
      <div class="overview-head">
        <div>
          <div class="section-title">导出校验概览</div>
          <div class="section-tip">刷新会请求真实后台接口，并更新当前可导出的业务数据与配置数量。</div>
        </div>
        <div class="overview-time">上次校验：{{ lastCheckedAt || '未校验' }}</div>
      </div>
      <div class="overview-grid">
        <div v-for="item in summaryCards" :key="item.label" class="overview-card">
          <div class="overview-value">{{ item.value }}</div>
          <div class="overview-label">{{ item.label }}</div>
          <div class="overview-tip">{{ item.tip }}</div>
        </div>
      </div>
    </el-card>

    <el-alert
      type="info"
      :closable="false"
      show-icon
      title="当前页面会同时校验业务数据与平台配置的真实导入导出链路。单项导出支持单项回灌，完整平台备份包也会一并恢复业务数据和系统/内容/API/支付配置。"
    />

    <div class="section-block">
      <div class="section-title">业务数据备份与恢复</div>
      <div class="settings-grid">
        <el-card class="card">
          <div class="card-title">用户数据管理</div>
          <el-form label-width="140px" size="small">
            <el-form-item label="导出用户数据">
              <el-button type="primary" @click="exportUsers" :loading="exporting">
                <el-icon><Download /></el-icon>
                导出用户数据
              </el-button>
              <div class="form-tip">导出当前用户核心字段快照，可用于业务恢复和批量迁移。</div>
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
              <div class="form-tip">自动按用户记录覆盖或创建，支持恢复已删除的业务数据。</div>
            </el-form-item>
          </el-form>
        </el-card>

        <el-card class="card">
          <div class="card-title">骑手数据管理</div>
          <el-form label-width="140px" size="small">
            <el-form-item label="导出骑手数据">
              <el-button type="primary" @click="exportRiders" :loading="exportingRiders">
                <el-icon><Download /></el-icon>
                导出骑手数据
              </el-button>
              <div class="form-tip">导出当前骑手核心字段快照，可用于账号与履约资料恢复。</div>
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
              <div class="form-tip">自动按骑手记录覆盖或创建，支持恢复已删除的业务数据。</div>
            </el-form-item>
          </el-form>
        </el-card>

        <el-card class="card">
          <div class="card-title">订单数据管理</div>
          <el-form label-width="140px" size="small">
            <el-form-item label="导出订单数据">
              <el-button type="primary" @click="exportOrders" :loading="exportingOrders">
                <el-icon><Download /></el-icon>
                导出订单数据
              </el-button>
              <div class="form-tip">导出当前订单核心字段快照，可用于回溯与批量导入。</div>
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
              <div class="form-tip">自动按订单记录覆盖或创建，支持恢复已删除的业务数据。</div>
            </el-form-item>
          </el-form>
        </el-card>

        <el-card class="card">
          <div class="card-title">商户数据管理</div>
          <el-form label-width="140px" size="small">
            <el-form-item label="导出商户数据">
              <el-button type="primary" @click="exportMerchants" :loading="exportingMerchants">
                <el-icon><Download /></el-icon>
                导出商户数据
              </el-button>
              <div class="form-tip">导出当前商户核心字段快照，可用于账号与资质信息恢复。</div>
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
              <div class="form-tip">自动按商户记录覆盖或创建，支持恢复已删除的业务数据。</div>
            </el-form-item>
          </el-form>
        </el-card>
      </div>
    </div>

    <div class="section-block">
      <div class="section-title">平台配置备份与恢复</div>
      <div class="settings-grid">
        <el-card class="card">
          <div class="card-title">系统配置</div>
          <div class="card-description">包含调试模式、服务开关、公益设置、会员设置、金币比例和 App 下载配置。</div>
          <el-button type="primary" @click="exportSystemSettings" :loading="exportingSystemSettings">
            <el-icon><Download /></el-icon>
            导出系统配置
          </el-button>
          <el-upload
            :http-request="(options) => handleConfigImport(options, 'system_settings')"
            :show-file-list="false"
            accept=".json"
            :before-upload="beforeImport"
          >
            <el-button type="success" :loading="importingSystemSettings" style="margin-top: 12px;">
              <el-icon><Upload /></el-icon>
              导入系统配置
            </el-button>
          </el-upload>
          <div class="form-tip">用于保留并恢复管理端生效中的系统配置快照。</div>
        </el-card>

        <el-card class="card">
          <div class="card-title">内容运营</div>
          <div class="card-description">包含轮播设置、轮播图、推送消息和首页投放活动数据。</div>
          <el-button type="primary" @click="exportContentConfig" :loading="exportingContentConfig">
            <el-icon><Download /></el-icon>
            导出内容配置
          </el-button>
          <el-upload
            :http-request="(options) => handleConfigImport(options, 'content_config')"
            :show-file-list="false"
            accept=".json"
            :before-upload="beforeImport"
          >
            <el-button type="success" :loading="importingContentConfig" style="margin-top: 12px;">
              <el-icon><Upload /></el-icon>
              导入内容配置
            </el-button>
          </el-upload>
          <div class="form-tip">适合备份并恢复首页运营位和消息推送素材配置。</div>
        </el-card>

        <el-card class="card">
          <div class="card-title">API 配置</div>
          <div class="card-description">包含短信、天气、微信登录和开放 API Key 配置。</div>
          <el-button type="primary" @click="exportApiConfig" :loading="exportingApiConfig">
            <el-icon><Download /></el-icon>
            导出 API 配置
          </el-button>
          <el-upload
            :http-request="(options) => handleConfigImport(options, 'api_config')"
            :show-file-list="false"
            accept=".json"
            :before-upload="beforeImport"
          >
            <el-button type="success" :loading="importingApiConfig" style="margin-top: 12px;">
              <el-icon><Upload /></el-icon>
              导入 API 配置
            </el-button>
          </el-upload>
          <div class="form-tip warning">此导出包含密钥与接口凭证，请按敏感文件妥善保管。</div>
        </el-card>

        <el-card class="card">
          <div class="card-title">支付配置</div>
          <div class="card-description">包含支付模式、微信支付、支付宝和支付提示文案。</div>
          <el-button type="primary" @click="exportPaymentConfig" :loading="exportingPaymentConfig">
            <el-icon><Download /></el-icon>
            导出支付配置
          </el-button>
          <el-upload
            :http-request="(options) => handleConfigImport(options, 'payment_config')"
            :show-file-list="false"
            accept=".json"
            :before-upload="beforeImport"
          >
            <el-button type="success" :loading="importingPaymentConfig" style="margin-top: 12px;">
              <el-icon><Upload /></el-icon>
              导入支付配置
            </el-button>
          </el-upload>
          <div class="form-tip warning">此导出包含支付密钥与回调配置，请按敏感文件妥善保管。</div>
        </el-card>
      </div>
    </div>

    <div class="section-block">
      <div class="section-title">完整平台备份</div>
      <div class="settings-grid">
        <el-card class="card full-width">
          <div class="card-title">综合数据管理</div>
          <el-form label-width="140px" size="small">
            <el-form-item label="导出到文件夹">
              <el-button type="primary" @click="exportAllToFolder" :loading="exportingToFolder">
                <el-icon><FolderOpened /></el-icon>
                导出所有数据到文件夹
              </el-button>
              <div class="form-tip">桌面端可将 4 类业务数据和 4 类平台配置分别导出成多个 JSON 文件。</div>
            </el-form-item>
            <el-form-item label="完整平台备份">
              <el-button type="primary" @click="exportAllData" :loading="exportingAll">
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
  </div>
</template>

<script setup>
import { onMounted } from 'vue';
import { Download, Upload, FolderOpened, RefreshRight } from '@element-plus/icons-vue';
import { useDataManagementPage } from './dataManagementHelpers';

const {
  loading,
  summaryCards,
  lastCheckedAt,
  exporting,
  importing,
  exportingRiders,
  importingRiders,
  exportingOrders,
  importingOrders,
  exportingMerchants,
  importingMerchants,
  exportingSystemSettings,
  importingSystemSettings,
  exportingContentConfig,
  importingContentConfig,
  exportingApiConfig,
  importingApiConfig,
  exportingPaymentConfig,
  importingPaymentConfig,
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
  exportSystemSettings,
  exportContentConfig,
  exportApiConfig,
  exportPaymentConfig,
  handleConfigImport,
  exportAllToFolder,
  exportAllData,
  handleImportAll,
} = useDataManagementPage();

onMounted(() => {
  refreshAll(false);
});
</script>

<style scoped lang="css" src="./DataManagement.css"></style>
