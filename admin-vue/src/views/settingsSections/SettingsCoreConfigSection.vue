<template>
  <el-card class="card">
    <div class="card-title">支付环境</div>
    <div style="display:grid;gap:12px;">
      <div style="font-size:14px;font-weight:600;color:#1f2937;">
        支付环境切换也已统一迁移到支付中心。
      </div>
      <div class="form-tip">
        生产模式、沙箱模式、微信支付和支付宝联调请统一在支付中心维护，避免系统设置与支付中心状态不一致。
      </div>
      <div style="display:flex;justify-content:flex-end;">
        <el-button type="primary" @click="router.push('/payment-center')">前往支付中心</el-button>
      </div>
    </div>
  </el-card>

  <el-card class="card">
    <div class="card-title">调试模式</div>
    <el-form v-if="debugModeFeatureEnabled" label-width="100px" size="small">
      <el-form-item label="全局调试">
        <el-switch
          v-model="debugMode.enabled"
          :loading="savingDebugMode"
          @change="saveDebugMode"
        />
        <div class="form-tip">开启后，用户端会统一显示维护提示页。</div>
      </el-form-item>
      <el-divider />
      <el-form-item label="生活服务">
        <el-switch
          v-model="debugMode.delivery"
          :loading="savingDebugMode"
          @change="saveDebugMode"
        />
      </el-form-item>
      <el-form-item label="手机贴膜">
        <el-switch
          v-model="debugMode.phone_film"
          :loading="savingDebugMode"
          @change="saveDebugMode"
        />
      </el-form-item>
      <el-form-item label="拔罐推拿">
        <el-switch
          v-model="debugMode.massage"
          :loading="savingDebugMode"
          @change="saveDebugMode"
        />
      </el-form-item>
      <el-form-item label="小众咖啡">
        <el-switch
          v-model="debugMode.coffee"
          :loading="savingDebugMode"
          @change="saveDebugMode"
        />
      </el-form-item>
    </el-form>
    <div v-else style="display:grid;gap:12px;">
      <div style="font-size:14px;font-weight:600;color:#1f2937;">
        调试模式入口已按安全基线默认关闭。
      </div>
      <div class="form-tip">
        如需在受控环境临时启用，请为 Go API 与 BFF 同时显式配置
        <code>ENABLE_ADMIN_DEBUG_MODE_SETTINGS=true</code>，未开启时该入口不会暴露路由。
      </div>
    </div>
  </el-card>

  <el-card class="card">
    <div class="card-title">短信 API</div>
    <el-form :model="sms" label-width="100px" size="small">
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
        <el-input v-model="sms.endpoint" placeholder="可选，如：dysmsapi.aliyuncs.com" />
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
    <div class="card-title">天气 API</div>
    <el-form :model="weather" label-width="100px" size="small">
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
</template>

<script setup>
defineProps({
  router: {
    type: Object,
    required: true,
  },
  debugMode: {
    type: Object,
    required: true,
  },
  debugModeFeatureEnabled: {
    type: Boolean,
    default: false,
  },
  savingDebugMode: {
    type: Boolean,
    default: false,
  },
  saveDebugMode: {
    type: Function,
    required: true,
  },
  sms: {
    type: Object,
    required: true,
  },
  saving: {
    type: Boolean,
    default: false,
  },
  saveSms: {
    type: Function,
    required: true,
  },
  weather: {
    type: Object,
    required: true,
  },
  saveWeather: {
    type: Function,
    required: true,
  },
})
</script>

<style scoped lang="css" src="../Settings.css"></style>
