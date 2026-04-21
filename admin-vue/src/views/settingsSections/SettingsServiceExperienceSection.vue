<template>
  <el-card class="card">
    <div class="card-title">平台服务</div>
    <el-form :model="serviceSettings" label-width="110px" size="small">
      <el-form-item label="客服电话">
        <el-input v-model="serviceSettings.service_phone" placeholder="如：400-000-0000（可选）" />
      </el-form-item>
      <el-form-item label="客服标题">
        <el-input
          v-model="serviceSettings.support_chat_title"
          placeholder="如：平台客服 / 客服中心"
        />
        <span class="form-tip-inline">用户端、App 端、骑手端默认客服会话标题都从这里读取。</span>
      </el-form-item>
      <el-form-item label="客服欢迎语">
        <el-input
          v-model="serviceSettings.support_chat_welcome_message"
          type="textarea"
          :rows="3"
          placeholder="如：您好！我是平台客服，有什么可以帮助您的吗？"
        />
        <span class="form-tip-inline">用于默认客服欢迎语；商家、骑手、门店定向会话仍可按业务覆盖。</span>
      </el-form-item>
      <el-form-item label="商家会话欢迎语">
        <el-input
          v-model="serviceSettings.merchant_chat_welcome_message"
          type="textarea"
          :rows="2"
          placeholder="如：欢迎光临，有什么可以帮您的？"
        />
      </el-form-item>
      <el-form-item label="骑手会话欢迎语">
        <el-input
          v-model="serviceSettings.rider_chat_welcome_message"
          type="textarea"
          :rows="2"
          placeholder="如：您好，您的骑手正在配送中。"
        />
      </el-form-item>
      <el-form-item label="消息提示音">
        <div style="display:grid;gap:12px;width:100%;">
          <el-input
            v-model="serviceSettings.message_notification_sound_url"
            placeholder="留空时各端回退到内置 chat.mp3"
          />
          <div style="display:flex;flex-wrap:wrap;gap:8px;">
            <el-upload
              :show-file-list="false"
              :auto-upload="true"
              accept=".mp3,.m4a,.aac,.wav,.ogg,.amr,audio/*"
              :http-request="(options) => handleServiceSoundUpload('message_notification_sound_url', options)"
            >
              <el-button :icon="Upload" :loading="uploadingServiceSounds.message">上传 / 替换</el-button>
            </el-upload>
            <el-button @click="previewServiceSound('message')">试听</el-button>
            <el-button
              type="danger"
              plain
              :disabled="!serviceSettings.message_notification_sound_url"
              @click="clearServiceSound('message_notification_sound_url')"
            >
              删除配置
            </el-button>
          </div>
          <span class="form-tip-inline">用户端、商家端、骑手端、后台聊天台收到消息时统一使用这里；删除配置后回退到内置 `chat.mp3`。</span>
        </div>
      </el-form-item>
      <el-form-item label="来单提示音">
        <div style="display:grid;gap:12px;width:100%;">
          <el-input
            v-model="serviceSettings.order_notification_sound_url"
            placeholder="留空时商家端和骑手端回退到内置 come.mp3"
          />
          <div style="display:flex;flex-wrap:wrap;gap:8px;">
            <el-upload
              :show-file-list="false"
              :auto-upload="true"
              accept=".mp3,.m4a,.aac,.wav,.ogg,.amr,audio/*"
              :http-request="(options) => handleServiceSoundUpload('order_notification_sound_url', options)"
            >
              <el-button :icon="Upload" :loading="uploadingServiceSounds.order">上传 / 替换</el-button>
            </el-upload>
            <el-button @click="previewServiceSound('order')">试听</el-button>
            <el-button
              type="danger"
              plain
              :disabled="!serviceSettings.order_notification_sound_url"
              @click="clearServiceSound('order_notification_sound_url')"
            >
              删除配置
            </el-button>
          </div>
          <span class="form-tip-inline">商家端、骑手端收到来单通知时统一使用这里；删除配置后回退到内置 `come.mp3`。</span>
        </div>
      </el-form-item>
      <el-form-item label="骑手端关于我们">
        <el-input
          v-model="serviceSettings.rider_about_summary"
          type="textarea"
          :rows="3"
          placeholder="如：骑手端聚焦接单、配送、收入与保障场景，帮助骑手稳定履约并提升效率。"
        />
        <span class="form-tip-inline">骑手设置页的“关于我们”说明统一读取这里，不再由前端写死。</span>
      </el-form-item>
      <el-form-item label="骑手登录标题">
        <el-input
          v-model="serviceSettings.rider_portal_title"
          placeholder="如：骑手登录"
        />
      </el-form-item>
      <el-form-item label="骑手登录副标题">
        <el-input
          v-model="serviceSettings.rider_portal_subtitle"
          placeholder="如：悦享e食 · 骑手端"
        />
      </el-form-item>
      <el-form-item label="骑手登录说明">
        <el-input
          v-model="serviceSettings.rider_portal_login_footer"
          type="textarea"
          :rows="2"
          placeholder="如：骑手账号由平台邀约开通"
        />
        <span class="form-tip-inline">骑手登录页与找回密码页的入口说明统一从这里维护。</span>
      </el-form-item>
      <el-form-item label="商家登录标题">
        <el-input
          v-model="serviceSettings.merchant_portal_title"
          placeholder="如：商户工作台"
        />
      </el-form-item>
      <el-form-item label="商家登录副标题">
        <el-input
          v-model="serviceSettings.merchant_portal_subtitle"
          placeholder="如：悦享e食 · Merchant Console"
        />
      </el-form-item>
      <el-form-item label="商家登录页说明">
        <el-input
          v-model="serviceSettings.merchant_portal_login_footer"
          type="textarea"
          :rows="2"
          placeholder="如：账号由平台管理员分配，登录后可直接管理订单和商品"
        />
      </el-form-item>
      <el-form-item label="商家隐私政策摘要">
        <el-input
          v-model="serviceSettings.merchant_privacy_policy"
          type="textarea"
          :rows="3"
          placeholder="如：我们会在必要范围内处理商户信息，用于订单履约、结算和风控。"
        />
      </el-form-item>
      <el-form-item label="商家用户协议摘要">
        <el-input
          v-model="serviceSettings.merchant_service_agreement"
          type="textarea"
          :rows="3"
          placeholder="如：使用商户端即表示你同意平台商户服务协议，包含店铺经营规范、结算与售后条款。"
        />
        <span class="form-tip-inline">商家登录页和应用设置页会读取这里的说明文案，不再在前端写死。</span>
      </el-form-item>
      <el-form-item label="用户登录门户标题">
        <el-input
          v-model="serviceSettings.consumer_portal_title"
          placeholder="如：欢迎使用悦享e食"
        />
      </el-form-item>
      <el-form-item label="用户登录门户副标题">
        <el-input
          v-model="serviceSettings.consumer_portal_subtitle"
          placeholder="如：一站式本地生活服务平台"
        />
      </el-form-item>
      <el-form-item label="用户登录页说明">
        <el-input
          v-model="serviceSettings.consumer_portal_login_footer"
          type="textarea"
          :rows="2"
          placeholder="如：登录后可同步订单、消息、地址与优惠权益"
        />
        <span class="form-tip-inline">用户端和 App 端的登录、注册、找回密码页面统一读取这里。</span>
      </el-form-item>
      <el-form-item label="用户端关于我们">
        <el-input
          v-model="serviceSettings.consumer_about_summary"
          type="textarea"
          :rows="3"
          placeholder="如：悦享e食专注本地生活即时服务，覆盖外卖、跑腿、到店和会员等场景。"
        />
      </el-form-item>
      <el-form-item label="用户端隐私政策摘要">
        <el-input
          v-model="serviceSettings.consumer_privacy_policy"
          type="textarea"
          :rows="3"
          placeholder="如：平台仅在提供服务所必需的范围内处理账号、定位和订单信息。"
        />
      </el-form-item>
      <el-form-item label="用户端用户协议摘要">
        <el-input
          v-model="serviceSettings.consumer_user_agreement"
          type="textarea"
          :rows="3"
          placeholder="如：使用平台服务前，请确认已阅读并同意用户协议、隐私政策及相关活动规则。"
        />
        <span class="form-tip-inline">用户端和 App 端的设置页会统一读取这里的关于、隐私和协议说明。</span>
      </el-form-item>
      <el-form-item label="医药热线">
        <el-input
          v-model="serviceSettings.medicine_support_phone"
          placeholder="为空时回落到客服电话"
        />
        <span class="form-tip-inline">用于看病买药首页的快捷呼叫卡片和弹窗。</span>
      </el-form-item>
      <el-form-item label="医药标题">
        <el-input
          v-model="serviceSettings.medicine_support_title"
          placeholder="如：一键医务室"
        />
      </el-form-item>
      <el-form-item label="热线副文案">
        <el-input
          v-model="serviceSettings.medicine_support_subtitle"
          type="textarea"
          :rows="2"
          placeholder="如：紧急连线#10;人工服务"
        />
      </el-form-item>
      <el-form-item label="配送文案">
        <el-input
          v-model="serviceSettings.medicine_delivery_description"
          type="textarea"
          :rows="2"
          placeholder="如：24小时配送#10;平均30分钟达"
        />
      </el-form-item>
      <el-form-item label="季节提醒">
        <el-input
          v-model="serviceSettings.medicine_season_tip"
          type="textarea"
          :rows="3"
          placeholder="如：近期流感高发，建议常备常用药。如遇高热不退请及时就医。"
        />
        <span class="form-tip-inline">运营和客服可按季节、活动、重点提醒动态调整。</span>
      </el-form-item>
      <el-form-item label="邀请落地页">
        <el-input
          v-model="serviceSettings.invite_landing_url"
          placeholder="如：https://m.yuexiang.com/register"
        />
        <span class="form-tip-inline">邀请页会拼接 inviteCode 参数，生成可直接分享的注册链接</span>
      </el-form-item>
      <el-form-item label="微信登录入口">
        <el-switch v-model="serviceSettings.wechat_login_enabled" />
        <span class="form-tip-inline">仅在配置了可用入口地址后，前台才展示微信登录入口</span>
      </el-form-item>
      <el-form-item label="入口地址">
        <el-input
          v-model="serviceSettings.wechat_login_entry_url"
          placeholder="如：https://auth.yuexiang.com/wechat/login"
        />
      </el-form-item>
      <el-form-item label="地图服务商">
        <el-select v-model="serviceSettings.map_provider" style="width: 180px;">
          <el-option label="代理服务（当前）" value="proxy" />
          <el-option label="天地图（管理端配置）" value="tianditu" />
          <el-option label="自定义接口" value="custom" />
        </el-select>
        <span class="form-tip-inline">移动端统一走后端地图入口，后续切天地图只改这里</span>
      </el-form-item>
      <el-form-item label="搜索接口">
        <el-input v-model="serviceSettings.map_search_url" placeholder="留空时按服务商使用默认搜索接口" />
      </el-form-item>
      <el-form-item label="逆地理接口">
        <el-input v-model="serviceSettings.map_reverse_url" placeholder="留空时按服务商使用默认逆地理接口" />
      </el-form-item>
      <el-form-item label="地图 Key">
        <el-input v-model="serviceSettings.map_api_key" type="password" show-password placeholder="天地图 TK / 第三方地图 Key（选择天地图时必填）" />
      </el-form-item>
      <el-form-item label="瓦片模板">
        <el-input v-model="serviceSettings.map_tile_template" placeholder="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
      </el-form-item>
      <el-form-item label="超时时间">
        <el-input-number v-model="serviceSettings.map_timeout_seconds" :min="1" :max="30" />
        <span class="form-tip-inline">单位：秒，统一用于地图搜索和逆地理请求</span>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" :loading="savingServiceSettings" @click="saveServiceSettings">保存</el-button>
      </el-form-item>
    </el-form>
  </el-card>

  <el-card class="card full-width">
    <div class="card-title">骑手履约配置</div>
    <el-form :model="serviceSettings" label-width="120px" size="small">
      <el-form-item label="异常上报原因">
        <div style="display:grid;gap:12px;width:100%;">
          <div style="display:flex;justify-content:flex-end;">
            <el-button size="small" @click="addRiderReportReason">新增原因</el-button>
          </div>
          <div v-if="!serviceSettings.rider_exception_report_reasons?.length" class="form-tip">当前未配置异常原因，将回退到系统默认项。</div>
          <div
            v-for="(reason, index) in serviceSettings.rider_exception_report_reasons"
            :key="`rider-report-reason-${index}`"
            style="display:grid;grid-template-columns:1fr auto;gap:12px;"
          >
            <el-input
              v-model="serviceSettings.rider_exception_report_reasons[index]"
              placeholder="如：商家出餐慢"
            />
            <el-button type="danger" plain @click="removeRiderReportReason(index)">删除</el-button>
          </div>
          <span class="form-tip-inline">骑手任务页和详情页会实时读取这里的异常上报原因，不再从前端静态写死。</span>
        </div>
      </el-form-item>

      <el-divider content-position="left">骑手保障页</el-divider>
      <el-form-item label="状态标题">
        <el-input v-model="serviceSettings.rider_insurance_status_title" placeholder="如：骑手意外保障已生效" />
      </el-form-item>
      <el-form-item label="状态说明">
        <el-input
          v-model="serviceSettings.rider_insurance_status_desc"
          type="textarea"
          :rows="2"
          placeholder="如：为您提供全方位安全保障"
        />
      </el-form-item>
      <el-form-item label="保单号">
        <el-input v-model="serviceSettings.rider_insurance_policy_number" placeholder="濡傦細PICC-2026-0001" />
      </el-form-item>
      <el-form-item label="保险公司">
        <el-input v-model="serviceSettings.rider_insurance_provider" placeholder="如：中国人保财险" />
      </el-form-item>
      <el-form-item label="生效日期">
        <el-input v-model="serviceSettings.rider_insurance_effective_date" placeholder="如：2026-01-01" />
      </el-form-item>
      <el-form-item label="失效日期">
        <el-input v-model="serviceSettings.rider_insurance_expire_date" placeholder="如：2026-12-31" />
      </el-form-item>
      <el-form-item label="理赔按钮文案">
        <el-input v-model="serviceSettings.rider_insurance_claim_button_text" placeholder="如：我要理赔" />
      </el-form-item>
      <el-form-item label="保单按钮文案">
        <el-input v-model="serviceSettings.rider_insurance_detail_button_text" placeholder="如：查看保单详情" />
      </el-form-item>
      <el-form-item label="理赔入口链接">
        <el-input
          v-model="serviceSettings.rider_insurance_claim_url"
          placeholder="如：https://m.yuexiang.com/rider/claim"
        />
      </el-form-item>
      <el-form-item label="保单详情链接">
        <el-input
          v-model="serviceSettings.rider_insurance_detail_url"
          placeholder="如：https://m.yuexiang.com/rider/policy"
        />
      </el-form-item>

      <el-form-item label="保障项目">
        <div style="display:grid;gap:12px;width:100%;">
          <div style="display:flex;justify-content:flex-end;">
            <el-button size="small" @click="addRiderInsuranceCoverage">新增项目</el-button>
          </div>
          <div v-if="!serviceSettings.rider_insurance_coverages?.length" class="form-tip">当前未配置保障项目，骑手端将显示空状态提示。</div>
          <div
            v-for="(coverage, index) in serviceSettings.rider_insurance_coverages"
            :key="`rider-insurance-coverage-${index}`"
            style="display:grid;grid-template-columns:160px 1fr 220px auto;gap:12px;"
          >
            <el-input
              v-model="serviceSettings.rider_insurance_coverages[index].icon"
              placeholder="如：图标 / /static/icons/insurance.svg"
            />
            <el-input
              v-model="serviceSettings.rider_insurance_coverages[index].name"
              placeholder="如：意外医疗"
            />
            <el-input
              v-model="serviceSettings.rider_insurance_coverages[index].amount"
              placeholder="如：最高 10 万元"
            />
            <el-button type="danger" plain @click="removeRiderInsuranceCoverage(index)">删除</el-button>
          </div>
        </div>
      </el-form-item>

      <el-form-item label="理赔步骤">
        <div style="display:grid;gap:12px;width:100%;">
          <div style="display:flex;justify-content:flex-end;">
            <el-button size="small" @click="addRiderInsuranceClaimStep">新增步骤</el-button>
          </div>
          <div
            v-for="(step, index) in serviceSettings.rider_insurance_claim_steps"
            :key="`rider-insurance-step-${index}`"
            style="display:grid;grid-template-columns:1fr auto;gap:12px;"
          >
            <el-input
              v-model="serviceSettings.rider_insurance_claim_steps[index]"
              type="textarea"
              :rows="2"
              :placeholder="`步骤 ${index + 1}`"
            />
            <el-button type="danger" plain @click="removeRiderInsuranceClaimStep(index)">删除</el-button>
          </div>
          <span class="form-tip-inline">骑手保障页会直接读取这里的保单信息、理赔步骤和按钮链接，不再展示静态占位保单号。</span>
        </div>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" :loading="savingServiceSettings" @click="saveServiceSettings">保存骑手履约配置</el-button>
      </el-form-item>
    </el-form>
  </el-card>

  <el-card class="card full-width">
    <div class="card-title">RTC 音频配置</div>
    <el-form :model="serviceSettings" label-width="120px" size="small">
      <el-form-item label="语音开关">
        <el-switch v-model="serviceSettings.rtc_enabled" />
        <span class="form-tip-inline">关闭后，双端联系弹窗将只保留在线聊天和系统电话。</span>
      </el-form-item>
      <el-form-item label="超时秒数">
        <el-input-number v-model="serviceSettings.rtc_timeout_seconds" :min="10" :max="120" />
        <span class="form-tip-inline">发起站内语音后，超过该秒数无人接听将自动超时结束。</span>
      </el-form-item>
      <el-form-item label="ICE / TURN">
        <div style="display:grid;gap:12px;width:100%;">
          <div style="display:flex;justify-content:flex-end;">
            <el-button size="small" @click="addRTCIceServer">新增 ICE / TURN</el-button>
          </div>
          <div v-if="!serviceSettings.rtc_ice_servers?.length" class="form-tip">
            当前未配置自定义 ICE / TURN，客户端会回退到默认 STUN。
          </div>
          <div
            v-for="(server, index) in serviceSettings.rtc_ice_servers"
            :key="`rtc-ice-server-${index}`"
            style="display:grid;grid-template-columns:1.2fr 1fr 1fr auto;gap:12px;"
          >
            <el-input
              v-model="serviceSettings.rtc_ice_servers[index].url"
              placeholder="如：turns:turn.example.com:5349?transport=tcp"
            />
            <el-input
              v-model="serviceSettings.rtc_ice_servers[index].username"
              placeholder="用户名（可选）"
            />
            <el-input
              v-model="serviceSettings.rtc_ice_servers[index].credential"
              type="password"
              show-password
              placeholder="凭证（可选）"
            />
            <el-button link type="danger" @click="removeRTCIceServer(index)">删除</el-button>
          </div>
        </div>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" :loading="savingServiceSettings" @click="saveServiceSettings">保存 RTC 配置</el-button>
      </el-form-item>
    </el-form>
  </el-card>
</template>

<script setup>
import { Upload } from '@element-plus/icons-vue'

defineProps({
  serviceSettings: {
    type: Object,
    required: true,
  },
  uploadingServiceSounds: {
    type: Object,
    required: true,
  },
  savingServiceSettings: {
    type: Boolean,
    default: false,
  },
  saveServiceSettings: {
    type: Function,
    required: true,
  },
  previewServiceSound: {
    type: Function,
    required: true,
  },
  handleServiceSoundUpload: {
    type: Function,
    required: true,
  },
  clearServiceSound: {
    type: Function,
    required: true,
  },
  addRiderReportReason: {
    type: Function,
    required: true,
  },
  removeRiderReportReason: {
    type: Function,
    required: true,
  },
  addRiderInsuranceCoverage: {
    type: Function,
    required: true,
  },
  removeRiderInsuranceCoverage: {
    type: Function,
    required: true,
  },
  addRiderInsuranceClaimStep: {
    type: Function,
    required: true,
  },
  removeRiderInsuranceClaimStep: {
    type: Function,
    required: true,
  },
  addRTCIceServer: {
    type: Function,
    required: true,
  },
  removeRTCIceServer: {
    type: Function,
    required: true,
  },
})
</script>

<style scoped lang="css" src="../Settings.css"></style>
