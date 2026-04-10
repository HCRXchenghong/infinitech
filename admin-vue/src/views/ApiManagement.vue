<template>
  <div class="page">
    <div class="title-row">
      <div>
        <div class="title">API 管理</div>
        <div class="title-subtitle">这里只维护第三方服务对接配置，对外 API Key 与权限分配已迁移到专门页面。</div>
      </div>
      <el-button size="small" @click="loadAll(true)" :loading="loading">刷新</el-button>
    </div>

    <PageStateAlert :message="pageError" />

    <el-card class="card full-span-card">
      <div class="card-title">对外 API 能力导航</div>
      <p class="route-tip">API 文档负责说明接口怎么调用；API 权限管理负责配置主要 API URL、API Key 和对应权限。</p>
      <div class="route-actions">
        <el-button type="primary" @click="go('/api-permissions')">打开 API 权限管理</el-button>
        <el-button @click="go('/api-documentation')">查看 API 文档</el-button>
      </div>
    </el-card>

    <div class="settings-grid">
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
          <el-form-item label="适用端">
            <div class="sms-target-grid">
              <div class="sms-target-item">
                <span class="sms-target-label">用户端</span>
                <el-switch v-model="sms.consumer_enabled" />
              </div>
              <div class="sms-target-item">
                <span class="sms-target-label">商户端</span>
                <el-switch v-model="sms.merchant_enabled" />
              </div>
              <div class="sms-target-item">
                <span class="sms-target-label">骑手端</span>
                <el-switch v-model="sms.rider_enabled" />
              </div>
              <div class="sms-target-item">
                <span class="sms-target-label">管理端</span>
                <el-switch v-model="sms.admin_enabled" />
              </div>
            </div>
            <div class="form-tip">默认全开。关闭某个端后，该端将无法再发送登录、注册、找回密码等短信验证码。</div>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" :loading="saving" @click="saveSms">保存</el-button>
          </el-form-item>
        </el-form>
      </el-card>

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
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router';
import PageStateAlert from '@/components/PageStateAlert.vue';
import { useApiManagementPage } from './apiManagementHelpers';

const router = useRouter();

const {
  isMobile,
  loading,
  saving,
  pageError,
  sms,
  weather,
  loadAll,
  saveSms,
  saveWeather,
} = useApiManagementPage({ includeExternalApiManagement: false });

function go(path) {
  router.push(path);
}
</script>

<style scoped lang="css" src="./ApiManagement.css"></style>
