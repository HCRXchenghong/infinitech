<template>
  <div class="page">
    <div class="title-row">
      <span class="title">API 管理</span>
      <el-button size="small" @click="loadAll(true)" :loading="loading">刷新</el-button>
    </div>
    <PageStateAlert :message="pageError" />

    <div class="settings-grid">
      <!-- 短信 API 对接 -->
      <el-card class="card">
        <div class="card-title">短信 API 对接</div>
        <el-form :model="sms" :label-width="isMobile ? '80px' : '140px'" size="small">
          <el-form-item label="AccessKey ID">
            <el-input v-model="sms.access_key_id" placeholder="LTAI..." />
            <div class="form-tip">从阿里云 RAM AccessKey 获取。</div>
          </el-form-item>
          <el-form-item label="AccessKey Secret">
            <el-input
              v-model="sms.access_key_secret"
              type="password"
              show-password
              :placeholder="sms.has_access_key_secret ? '已配置，留空则保持不变' : '请输入阿里云 AccessKey Secret'"
            />
            <div class="form-tip">当前仅支持阿里云短信服务。</div>
          </el-form-item>
          <el-form-item label="签名">
            <el-input v-model="sms.sign_name" placeholder="短信签名名称" />
          </el-form-item>
          <el-form-item label="模板 Code">
            <el-input v-model="sms.template_code" placeholder="SMS_123456789" />
          </el-form-item>
          <el-form-item label="区域">
            <el-input v-model="sms.region_id" placeholder="cn-hangzhou" />
          </el-form-item>
          <el-form-item label="Endpoint">
            <el-input v-model="sms.endpoint" placeholder="可选，如 dysmsapi.aliyuncs.com" />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" :loading="saving" @click="saveSms">保存</el-button>
          </el-form-item>
        </el-form>
      </el-card>

      <!-- 天气 API 管理 -->
      <el-card class="card">
        <div class="card-title">天气 API 管理</div>
        <el-form :model="weather" :label-width="isMobile ? '80px' : '140px'" size="small">
          <el-form-item label="API地址">
            <el-input v-model="weather.api_base_url" placeholder="https://uapis.cn/api/v1/misc/weather" />
          </el-form-item>
          <el-form-item label="API Key">
            <el-input v-model="weather.api_key" placeholder="天气 API Key" />
          </el-form-item>
          <el-form-item label="默认城市">
            <el-input v-model="weather.city" placeholder="如：北京 / Tokyo（全端统一使用）" />
          </el-form-item>
          <el-form-item label="行政区编码">
            <el-input v-model="weather.adcode" placeholder="如：110000（优先级高于城市）" />
          </el-form-item>
          <el-form-item label="返回语言">
            <el-select v-model="weather.lang" style="width: 160px;">
              <el-option label="中文 (zh)" value="zh" />
              <el-option label="英文 (en)" value="en" />
            </el-select>
          </el-form-item>
          <el-form-item label="扩展数据">
            <el-switch v-model="weather.extended" />
            <span class="form-tip-inline">体感温度、气压、AQI及污染物</span>
          </el-form-item>
          <el-form-item label="多天预报">
            <el-switch v-model="weather.forecast" />
          </el-form-item>
          <el-form-item label="逐小时预报">
            <el-switch v-model="weather.hourly" />
          </el-form-item>
          <el-form-item label="分钟降水">
            <el-switch v-model="weather.minutely" />
          </el-form-item>
          <el-form-item label="生活指数">
            <el-switch v-model="weather.indices" />
          </el-form-item>
          <el-form-item label="刷新间隔">
            <el-input-number v-model="weather.refresh_interval_minutes" :min="1" :max="1440" />
            <span class="form-tip-inline">单位：分钟，控制天气缓存与刷新周期</span>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" :loading="saving" @click="saveWeather">保存</el-button>
          </el-form-item>
        </el-form>
      </el-card>

      <!-- 对外API接口管理 -->
      <el-card class="card api-management-card">
        <div class="card-title">对外API接口管理</div>
        
        <!-- PC端操作和表格 -->
        <template v-if="!isMobile">
          <div class="api-actions">
            <el-button size="small" type="primary" @click="showAddApiDialog">添加API接口</el-button>
            <el-button size="small" type="info" @click="goToApiPermissions">API权限说明</el-button>
            <el-button size="small" @click="loadApiList(true)" :loading="apiListLoading">刷新</el-button>
          </div>
          
          <el-table :data="apiList" stripe size="small" v-loading="apiListLoading">
          <el-table-column prop="id" label="ID" width="60" />
          <el-table-column prop="name" label="接口名称" min-width="120" />
          <el-table-column prop="path" label="接口说明" min-width="150">
            <template #default="{ row }">
              <span v-if="row.path" style="color: #606266;">{{ row.path }}</span>
              <span v-else style="color: #c0c4cc;">无说明</span>
            </template>
          </el-table-column>
          <el-table-column prop="permissions" label="访问权限" min-width="150">
            <template #default="{ row }">
              <el-tag 
                v-for="perm in row.permissions" 
                :key="perm" 
                size="small" 
                style="margin-right: 4px;"
              >
                {{ getPermissionLabel(perm) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="api_key" label="API Key" min-width="120">
            <template #default="{ row }">
              <el-input 
                :value="row.api_key" 
                readonly 
                size="small"
                style="width: 200px;"
              >
                <template #append>
                  <el-button @click="copyApiKey(row.api_key)" size="small">复制</el-button>
                </template>
              </el-input>
            </template>
          </el-table-column>
          <el-table-column prop="is_active" label="状态" width="80">
            <template #default="{ row }">
              <el-tag :type="row.is_active ? 'success' : 'danger'" size="small">
                {{ row.is_active ? '启用' : '禁用' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="240" fixed="right">
            <template #default="{ row }">
              <div style="display: flex; gap: 4px; flex-wrap: nowrap;">
                <el-button size="small" type="primary" @click="editApi(row)">编辑</el-button>
                <el-button size="small" type="success" @click="showDownloadDialog(row)">下载文档</el-button>
                <el-button size="small" type="danger" @click="deleteApi(row)">删除</el-button>
              </div>
            </template>
          </el-table-column>
          <template #empty>
            <el-empty :description="apiListError ? '加载失败，暂无可显示数据' : '暂无API接口数据'" :image-size="90" />
          </template>
        </el-table>
        </template>

        <!-- 移动端提示 -->
        <div v-else class="mobile-pc-only-tip">
          <div class="tip-icon">💻</div>
          <div class="tip-text">请移步电脑端使用此功能</div>
          <div class="tip-desc">API接口管理功能需要在PC端进行操作</div>
        </div>
      </el-card>
    </div>

    <!-- 下载文档对话框 -->
    <el-dialog
      v-model="downloadDialogVisible"
      title="下载API接口文档"
      width="500px"
      :close-on-click-modal="false"
    >
      <el-form label-width="120px" size="small">
        <el-form-item label="选择语言">
          <el-radio-group v-model="downloadLanguage">
            <el-radio value="java">Java</el-radio>
            <el-radio value="python">Python</el-radio>
            <el-radio value="javascript">JavaScript</el-radio>
            <el-radio value="php">PHP</el-radio>
            <el-radio value="go">Go</el-radio>
            <el-radio value="markdown">Markdown</el-radio>
          </el-radio-group>
          <div class="form-tip">选择要生成的接口文档语言格式</div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="downloadDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="downloadApiDoc" :loading="downloadingApi">下载</el-button>
      </template>
    </el-dialog>

    <!-- 添加/编辑API接口对话框 -->
    <el-dialog
      v-model="apiDialogVisible"
      :title="editingApi ? '编辑API接口' : '添加API接口'"
      width="700px"
      :close-on-click-modal="false"
    >
      <el-form :model="apiForm" label-width="120px" size="small">
        <el-form-item label="接口名称" required>
          <el-input v-model="apiForm.name" placeholder="如：获取订单列表" />
          <div class="form-tip">用于标识此API接口的用途</div>
        </el-form-item>
        <el-form-item label="接口说明">
          <el-input 
            v-model="apiForm.path" 
            placeholder="可选：填写此API Key的主要用途说明（如：用于合作伙伴网站获取订单数据）"
            type="textarea"
            :rows="2"
          />
          <div class="form-tip">可选字段，仅用于备注说明，不影响API功能</div>
        </el-form-item>
        <el-form-item label="访问权限" required>
          <el-checkbox-group v-model="apiForm.permissions" @change="handleApiPermissionChange">
            <el-checkbox label="orders">订单数据</el-checkbox>
            <el-checkbox label="users">用户数据</el-checkbox>
            <el-checkbox label="riders">骑手数据</el-checkbox>
            <el-checkbox label="dashboard">仪表盘数据</el-checkbox>
            <el-checkbox label="all">全部数据</el-checkbox>
          </el-checkbox-group>
        </el-form-item>
        <el-form-item label="API Key">
          <el-input 
            v-model="apiForm.api_key" 
            placeholder="自动生成或手动输入"
            readonly
          >
            <template #append>
              <el-button @click="generateApiKey">生成</el-button>
            </template>
          </el-input>
          <div class="form-tip">用于API访问认证的密钥，其他网站调用时需要提供此Key</div>
        </el-form-item>
        <el-form-item label="接口描述">
          <el-input 
            v-model="apiForm.description" 
            type="textarea" 
            :rows="3"
            placeholder="请输入接口的详细描述和使用说明" 
          />
        </el-form-item>
        <el-form-item label="状态">
          <el-switch v-model="apiForm.is_active" />
          <span style="margin-left: 10px; color: #909399; font-size: 12px;">
            {{ apiForm.is_active ? '启用' : '禁用' }}
          </span>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="apiDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveApi" :loading="savingApi">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import PageStateAlert from '@/components/PageStateAlert.vue';
import { useApiManagementPage } from './apiManagementHelpers';

const {
  isMobile,
  loading,
  saving,
  pageError,
  sms,
  weather,
  apiList,
  apiListLoading,
  apiDialogVisible,
  editingApi,
  apiForm,
  savingApi,
  downloadDialogVisible,
  downloadLanguage,
  downloadingApi,
  loadAll,
  saveSms,
  saveWeather,
  loadApiList,
  showAddApiDialog,
  editApi,
  deleteApi,
  saveApi,
  generateApiKey,
  copyApiKey,
  getPermissionLabel,
  handleApiPermissionChange,
  goToApiPermissions,
  showDownloadDialog,
  downloadApiDoc
} = useApiManagementPage();
</script>

<style scoped lang="css" src="./ApiManagement.css"></style>
