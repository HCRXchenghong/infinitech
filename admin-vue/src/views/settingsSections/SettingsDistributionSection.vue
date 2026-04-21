<template>
  <el-card class="card">
    <div class="card-title">APP 下载配置</div>
    <el-form :model="appDownloadConfig" label-width="110px" size="small">
      <el-form-item label="iOS 安装包">
        <div class="package-row">
          <el-input v-model="appDownloadConfig.ios_url" placeholder="请输入 iOS 下载地址（http/https）" />
          <el-upload
            :show-file-list="false"
            :http-request="(options) => handlePackageUpload('ios', options)"
            :before-upload="beforePackageUpload"
            accept=".ipa"
          >
            <el-button :loading="uploadingPackage.ios">上传 IPA</el-button>
          </el-upload>
          <el-button @click="openDownloadLink(appDownloadConfig.ios_url, 'iOS')">测试</el-button>
        </div>
      </el-form-item>
      <el-form-item label="安卓安装包">
        <div class="package-row">
          <el-input v-model="appDownloadConfig.android_url" placeholder="请输入安卓下载地址（http/https）" />
          <el-upload
            :show-file-list="false"
            :http-request="(options) => handlePackageUpload('android', options)"
            :before-upload="beforePackageUpload"
            accept=".apk,.aab"
          >
            <el-button :loading="uploadingPackage.android">上传 APK/AAB</el-button>
          </el-upload>
          <el-button @click="openDownloadLink(appDownloadConfig.android_url, '安卓')">测试</el-button>
        </div>
      </el-form-item>
      <el-form-item label="小程序二维码">
        <div class="package-row">
          <el-input v-model="appDownloadConfig.mini_program_qr_url" placeholder="请输入小程序二维码图片地址（支持 /uploads/...）" />
          <el-upload
            :show-file-list="false"
            :http-request="handleMiniProgramQrUpload"
            :before-upload="beforeMiniProgramQrUpload"
            accept="image/*"
          >
            <el-button :loading="uploadingPackage.miniProgramQr">上传小程序码</el-button>
          </el-upload>
          <el-button @click="openDownloadLink(appDownloadConfig.mini_program_qr_url, '小程序二维码')">预览</el-button>
        </div>
        <div v-if="appDownloadConfig.mini_program_qr_url" style="margin-top: 12px;">
          <img
            :src="appDownloadConfig.mini_program_qr_url"
            alt="小程序二维码预览"
            style="width: 132px; height: 132px; object-fit: contain; border-radius: 12px; border: 1px solid #e5e7eb; background: #fff; padding: 8px;"
          />
        </div>
      </el-form-item>
      <el-form-item label="iOS 版本">
        <el-input v-model="appDownloadConfig.ios_version" placeholder="如：2.0.1" />
      </el-form-item>
      <el-form-item label="安卓版本">
        <el-input v-model="appDownloadConfig.android_version" placeholder="如：2.0.1" />
      </el-form-item>
      <el-form-item label="展示版本">
        <el-input v-model="appDownloadConfig.latest_version" placeholder="下载页展示版本（可选）" />
      </el-form-item>
      <el-form-item label="更新日期">
        <el-date-picker
          v-model="appDownloadConfig.updated_at"
          type="date"
          value-format="YYYY-MM-DD"
          format="YYYY-MM-DD"
          placeholder="选择日期"
          style="width: 100%;"
        />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" :loading="savingAppDownload" @click="saveAppDownload">保存下载配置</el-button>
      </el-form-item>
    </el-form>
  </el-card>

  <el-card class="card">
    <div class="card-title">支付渠道配置</div>
    <div style="display:grid;gap:12px;">
      <div style="font-size:14px;font-weight:600;color:#1f2937;">
        微信支付、支付宝、提现费、分账、保证金与银行卡提现配置已统一迁移到支付中心。
      </div>
      <div class="form-tip">
        为避免系统设置和支付中心出现双份配置导致联调混乱，这里只保留说明入口，不再维护渠道密钥与回调参数。
      </div>
      <div style="display:flex;justify-content:flex-end;">
        <el-button type="primary" @click="router.push('/payment-center')">前往支付中心</el-button>
      </div>
    </div>
  </el-card>

  <el-card class="card">
    <div class="card-title">微信登录</div>
    <el-form :model="wechatLoginConfig" label-width="110px" size="small">
      <el-form-item label="启用状态">
        <el-switch v-model="wechatLoginConfig.enabled" />
        <span class="form-tip-inline">只有在这里启用并填好凭据后，前台微信登录才会真正可用。</span>
      </el-form-item>
      <el-form-item label="AppID">
        <el-input v-model="wechatLoginConfig.app_id" placeholder="微信开放平台 / 服务号 AppID" />
      </el-form-item>
      <el-form-item label="AppSecret">
        <el-input
          v-model="wechatLoginConfig.app_secret"
          type="password"
          show-password
          :placeholder="wechatLoginConfig.has_app_secret ? '已配置，留空则保持不变' : '请输入微信 AppSecret'"
        />
      </el-form-item>
      <el-form-item label="回调地址">
        <el-input
          v-model="wechatLoginConfig.callback_url"
          placeholder="如：https://m.example.com/api/auth/wechat/callback"
        />
        <span class="form-tip-inline">必须和微信后台配置的 OAuth 回调地址完全一致。</span>
      </el-form-item>
      <el-form-item label="授权 Scope">
        <el-select v-model="wechatLoginConfig.scope" style="width: 220px;">
          <el-option label="snsapi_userinfo" value="snsapi_userinfo" />
          <el-option label="snsapi_base" value="snsapi_base" />
        </el-select>
        <span class="form-tip-inline">默认使用 `snsapi_userinfo`，可以拿到昵称和头像。</span>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" :loading="savingWechatLoginConfig" @click="saveWechatLoginConfig">保存</el-button>
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
  appDownloadConfig: {
    type: Object,
    required: true,
  },
  savingAppDownload: {
    type: Boolean,
    default: false,
  },
  uploadingPackage: {
    type: Object,
    required: true,
  },
  saveAppDownload: {
    type: Function,
    required: true,
  },
  beforePackageUpload: {
    type: Function,
    required: true,
  },
  handlePackageUpload: {
    type: Function,
    required: true,
  },
  beforeMiniProgramQrUpload: {
    type: Function,
    required: true,
  },
  handleMiniProgramQrUpload: {
    type: Function,
    required: true,
  },
  openDownloadLink: {
    type: Function,
    required: true,
  },
  wechatLoginConfig: {
    type: Object,
    required: true,
  },
  savingWechatLoginConfig: {
    type: Boolean,
    default: false,
  },
  saveWechatLoginConfig: {
    type: Function,
    required: true,
  },
})
</script>

<style scoped lang="css" src="../Settings.css"></style>
