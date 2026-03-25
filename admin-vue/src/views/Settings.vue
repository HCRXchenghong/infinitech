<template>
  <div class="page">
    <div class="page-header">
      <div class="page-title-wrap">
        <span class="page-title">系统设置</span>
        <span class="page-subtitle">平台配置与数据能力</span>
      </div>
      <el-button @click="loadAll" :loading="loading" size="small">刷新</el-button>
    </div>
    <PageStateAlert :message="pageError" />

    <div class="grid">

      <!-- 支付模式 -->
      <el-card class="card">
        <div class="card-title">支付模式</div>
        <el-form label-width="100px" size="small">
          <el-form-item label="当前模式">
            <el-switch
              v-model="payMode.isProd"
              active-text="生产模式"
              inactive-text="开发模式"
              :loading="savingPayMode"
              @change="savePayMode"
            />
            <div class="form-tip">开发模式：模拟支付成功 / 生产模式：真实调用</div>
          </el-form-item>
        </el-form>
      </el-card>

      <!-- 调试模式 -->
      <el-card class="card">
        <div class="card-title">调试模式</div>
        <el-form label-width="100px" size="small">
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
      </el-card>

      <!-- 短信 API -->
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
          <el-form-item>
            <el-button type="primary" :loading="saving" @click="saveSms">保存</el-button>
          </el-form-item>
        </el-form>
      </el-card>

      <!-- 天气 API -->
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

      <!-- 平台服务 -->
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
        <div class="card-title">会员中心配置</div>
        <el-form :model="vipSettings" label-width="120px" size="small">
          <el-form-item label="启用会员页">
            <el-switch v-model="vipSettings.enabled" />
            <span class="form-tip-inline">关闭后双端会员中心将显示未开放提示，不再展示占位权益。</span>
          </el-form-item>
          <el-form-item label="页面标题">
            <el-input v-model="vipSettings.page_title" placeholder="如：会员中心" />
          </el-form-item>
          <el-form-item label="规则标题">
            <el-input v-model="vipSettings.rules_title" placeholder="如：会员权益规则" />
          </el-form-item>
          <el-form-item label="权益区标题">
            <el-input v-model="vipSettings.benefit_section_title" placeholder="如：权益全景" />
          </el-form-item>
          <el-form-item label="权益区标签">
            <el-input v-model="vipSettings.benefit_section_tag" placeholder="如：VIP 专享" />
          </el-form-item>
          <el-form-item label="权益区提示">
            <el-input v-model="vipSettings.benefit_section_tip" placeholder="如：点击查看详情" />
          </el-form-item>
          <el-form-item label="任务区标题">
            <el-input v-model="vipSettings.tasks_section_title" placeholder="如：成长任务" />
          </el-form-item>
          <el-form-item label="任务区说明">
            <el-input v-model="vipSettings.tasks_section_tip" type="textarea" :rows="2" placeholder="如：完成任务，逐步解锁更多等级权益" />
          </el-form-item>
          <el-form-item label="积分区标题">
            <el-input v-model="vipSettings.points_section_title" placeholder="如：积分好礼" />
          </el-form-item>
          <el-form-item label="积分区说明">
            <el-input v-model="vipSettings.points_section_tip" type="textarea" :rows="2" placeholder="如：积分商品由积分商城实时维护" />
          </el-form-item>
          <el-form-item label="客服按钮">
            <el-input v-model="vipSettings.service_button_text" placeholder="如：联系客服" />
          </el-form-item>
          <el-form-item label="普通行动按钮">
            <el-input v-model="vipSettings.standard_action_text" placeholder="如：立即去下单" />
          </el-form-item>
          <el-form-item label="高阶行动按钮">
            <el-input v-model="vipSettings.premium_action_text" placeholder="如：联系专属客服" />
          </el-form-item>

          <el-divider content-position="left">积分规则</el-divider>
          <div style="display:grid;gap:12px;margin-bottom:18px;">
            <div style="display:flex;justify-content:flex-end;">
              <el-button size="small" @click="addVIPPointRule">新增规则</el-button>
            </div>
            <div v-if="!vipSettings.point_rules.length" class="form-tip">当前未配置积分规则，将回退到系统默认规则。</div>
            <div
              v-for="(rule, index) in vipSettings.point_rules"
              :key="`vip-rule-${index}`"
              style="display:grid;grid-template-columns:1fr auto;gap:12px;"
            >
              <el-input v-model="vipSettings.point_rules[index]" type="textarea" :rows="2" placeholder="输入积分规则说明" />
              <el-button type="danger" plain @click="removeVIPPointRule(index)">删除</el-button>
            </div>
          </div>

          <el-divider content-position="left">会员等级</el-divider>
          <div style="display:grid;gap:16px;margin-bottom:18px;">
            <div style="display:flex;justify-content:flex-end;">
              <el-button size="small" @click="addVIPLevel">新增等级</el-button>
            </div>
            <div v-if="!vipSettings.levels.length" class="form-tip">当前未配置等级信息，前台将回退到系统默认等级。</div>
            <div
              v-for="(level, levelIndex) in vipSettings.levels"
              :key="`vip-level-${levelIndex}`"
              style="display:grid;gap:12px;padding:16px;border:1px solid #ebeef5;border-radius:10px;"
            >
              <div style="display:grid;grid-template-columns:1fr 160px 160px auto;gap:12px;">
                <el-input v-model="level.name" placeholder="等级名称，如：黄金 VIP" />
                <el-input-number v-model="level.threshold_value" :min="1" :max="999999" style="width:100%;" />
                <el-input v-model="level.threshold_label" placeholder="如：成长值 3000" />
                <el-button type="danger" plain @click="removeVIPLevel(levelIndex)">删除等级</el-button>
              </div>
              <div style="display:grid;grid-template-columns:200px 160px 160px;gap:12px;">
                <el-input v-model="level.style_class" placeholder="样式类，如：level-gold" />
                <el-input-number v-model="level.multiplier" :min="1" :max="10" style="width:100%;" />
                <el-switch v-model="level.is_black_gold" active-text="黑金等级" />
              </div>
              <el-input v-model="level.tagline" type="textarea" :rows="2" placeholder="等级副标题" />

              <div style="display:grid;gap:12px;">
                <div style="display:flex;justify-content:space-between;align-items:center;">
                  <span class="form-tip-inline">等级权益</span>
                  <el-button size="small" @click="addVIPBenefit(levelIndex)">新增权益</el-button>
                </div>
                <div v-if="!level.benefits?.length" class="form-tip">当前等级还没有配置权益项。</div>
                <div
                  v-for="(benefit, benefitIndex) in level.benefits"
                  :key="`vip-benefit-${levelIndex}-${benefitIndex}`"
                  style="display:grid;gap:12px;padding:12px;border:1px solid #f0f2f5;border-radius:8px;"
                >
                  <div style="display:grid;grid-template-columns:220px 180px 220px auto;gap:12px;">
                    <el-input v-model="benefit.icon" placeholder="/static/icons/star.svg" />
                    <el-input v-model="benefit.title" placeholder="权益标题" />
                    <el-input v-model="benefit.desc" placeholder="权益短描述" />
                    <el-button type="danger" plain @click="removeVIPBenefit(levelIndex, benefitIndex)">删除权益</el-button>
                  </div>
                  <el-input v-model="benefit.detail" type="textarea" :rows="2" placeholder="权益详细说明" />
                </div>
              </div>
            </div>
          </div>

          <el-divider content-position="left">成长任务</el-divider>
          <div style="display:grid;gap:12px;margin-bottom:18px;">
            <div style="display:flex;justify-content:flex-end;">
              <el-button size="small" @click="addVIPTask">新增任务</el-button>
            </div>
            <div v-if="!vipSettings.growth_tasks.length" class="form-tip">当前未配置成长任务，前台将显示空状态。</div>
            <div
              v-for="(task, index) in vipSettings.growth_tasks"
              :key="`vip-task-${index}`"
              style="display:grid;grid-template-columns:1fr 220px 180px 140px auto;gap:12px;align-items:start;"
            >
              <el-input v-model="task.title" placeholder="任务标题" />
              <el-input v-model="task.description" placeholder="任务说明" />
              <el-input v-model="task.reward_text" placeholder="如：+80 成长值" />
              <el-input v-model="task.action_label" placeholder="如：去下单" />
              <el-button type="danger" plain @click="removeVIPTask(index)">删除</el-button>
            </div>
          </div>

          <el-form-item>
            <el-button type="primary" :loading="savingVipSettings" @click="saveVIPSettings">保存会员中心配置</el-button>
          </el-form-item>
        </el-form>
      </el-card>

      <el-card class="card full-width">
        <div class="card-title">公益配置</div>
        <el-form :model="charitySettings" label-width="120px" size="small">
          <el-form-item label="启用公益页">
            <el-switch v-model="charitySettings.enabled" />
            <span class="form-tip-inline">关闭后前台只显示未开放提示，不再展示占位内容。</span>
          </el-form-item>
          <el-form-item label="页面标题">
            <el-input v-model="charitySettings.page_title" placeholder="如：悦享公益" />
          </el-form-item>
          <el-form-item label="页面副标题">
            <el-input v-model="charitySettings.page_subtitle" placeholder="如：让每一份善意都被看见" />
          </el-form-item>
          <el-form-item label="头图地址">
            <el-input v-model="charitySettings.hero_image_url" placeholder="https://..." />
          </el-form-item>
          <el-form-item label="头图文案">
            <el-input v-model="charitySettings.hero_tagline" type="textarea" :rows="2" placeholder="公益头图说明文案" />
          </el-form-item>
          <el-form-item label="运行天数">
            <el-input-number v-model="charitySettings.hero_days_running" :min="0" :max="100000" />
          </el-form-item>
          <el-form-item label="资金池金额">
            <el-input-number v-model="charitySettings.fund_pool_amount" :min="0" :max="9999999999" :step="100" />
          </el-form-item>
          <el-form-item label="今日参与数">
            <el-input-number v-model="charitySettings.today_donation_count" :min="0" :max="9999999" />
          </el-form-item>
          <el-form-item label="项目状态">
            <el-input v-model="charitySettings.project_status_text" placeholder="如：筹备中 / 进行中 / 已完成" />
          </el-form-item>
          <el-form-item label="榜单标题">
            <el-input v-model="charitySettings.leaderboard_title" placeholder="如：善行榜单" />
          </el-form-item>
          <el-form-item label="资讯标题">
            <el-input v-model="charitySettings.news_title" placeholder="如：公益资讯" />
          </el-form-item>
          <el-form-item label="使命标题">
            <el-input v-model="charitySettings.mission_title" placeholder="如：初心" />
          </el-form-item>
          <el-form-item label="使命文案一">
            <el-input v-model="charitySettings.mission_paragraph_one" type="textarea" :rows="3" />
          </el-form-item>
          <el-form-item label="使命文案二">
            <el-input v-model="charitySettings.mission_paragraph_two" type="textarea" :rows="3" />
          </el-form-item>
          <el-form-item label="计划标题">
            <el-input v-model="charitySettings.matching_plan_title" placeholder="如：公益参与计划" />
          </el-form-item>
          <el-form-item label="计划说明">
            <el-input v-model="charitySettings.matching_plan_description" type="textarea" :rows="3" />
          </el-form-item>
          <el-form-item label="行动按钮">
            <el-input v-model="charitySettings.action_label" placeholder="如：了解参与方式" />
          </el-form-item>
          <el-form-item label="按钮备注">
            <el-input v-model="charitySettings.action_note" placeholder="如：OPERATED BY CHARITY OPS" />
          </el-form-item>
          <el-form-item label="参与链接">
            <el-input v-model="charitySettings.join_url" placeholder="https://..." />
            <span class="form-tip-inline">配置后前台将直接打开该链接；留空则展示参与说明。</span>
          </el-form-item>
          <el-form-item label="参与说明">
            <el-input v-model="charitySettings.participation_notice" type="textarea" :rows="3" />
          </el-form-item>

          <el-divider content-position="left">善行榜单</el-divider>
          <div style="display:grid;gap:12px;margin-bottom:18px;">
            <div style="display:flex;justify-content:flex-end;">
              <el-button size="small" @click="addCharityLeaderboardItem">新增榜单项</el-button>
            </div>
            <div v-if="!charitySettings.leaderboard.length" class="form-tip">当前未配置榜单数据，前台将显示空状态。</div>
            <div
              v-for="(item, index) in charitySettings.leaderboard"
              :key="`leaderboard-${index}`"
              style="display:grid;grid-template-columns:1fr 180px 180px auto;gap:12px;align-items:start;"
            >
              <el-input v-model="item.name" placeholder="姓名或匿名名称" />
              <el-input-number v-model="item.amount" :min="0" :max="9999999999" :step="10" style="width:100%;" />
              <el-input v-model="item.time_label" placeholder="如：今天 / 刚刚" />
              <el-button type="danger" plain @click="removeCharityLeaderboardItem(index)">删除</el-button>
            </div>
          </div>

          <el-divider content-position="left">公益资讯</el-divider>
          <div style="display:grid;gap:12px;">
            <div style="display:flex;justify-content:flex-end;">
              <el-button size="small" @click="addCharityNewsItem">新增资讯项</el-button>
            </div>
            <div v-if="!charitySettings.news_list.length" class="form-tip">当前未配置资讯数据，前台将显示空状态。</div>
            <div
              v-for="(item, index) in charitySettings.news_list"
              :key="`charity-news-${index}`"
              style="display:grid;gap:12px;padding:12px;border:1px solid #ebeef5;border-radius:8px;"
            >
              <div style="display:grid;grid-template-columns:1fr 220px auto;gap:12px;">
                <el-input v-model="item.title" placeholder="资讯标题" />
                <el-input v-model="item.time_label" placeholder="如：今天 / 3月活动" />
                <el-button type="danger" plain @click="removeCharityNewsItem(index)">删除</el-button>
              </div>
              <div style="display:grid;grid-template-columns:220px 1fr;gap:12px;">
                <el-input v-model="item.source" placeholder="来源，如：运营中心" />
                <el-input v-model="item.image_url" placeholder="封面图地址 https://..." />
              </div>
              <el-input v-model="item.summary" type="textarea" :rows="3" placeholder="资讯摘要" />
            </div>
          </div>

          <el-form-item style="margin-top: 18px;">
            <el-button type="primary" :loading="savingCharitySettings" @click="saveCharitySettings">保存公益配置</el-button>
          </el-form-item>
        </el-form>
      </el-card>

      <!-- APP 下载配置 -->
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

      <!-- 微信支付配置 -->
      <el-card class="card">
        <div class="card-title">微信支付配置</div>
        <el-form :model="wxpay" label-width="110px" size="small">
          <el-form-item label="AppID"><el-input v-model="wxpay.appId" placeholder="wx 开头的 AppID" /></el-form-item>
          <el-form-item label="商户号"><el-input v-model="wxpay.mchId" placeholder="微信支付商户号" /></el-form-item>
          <el-form-item label="API 密钥"><el-input v-model="wxpay.apiKey" type="password" show-password placeholder="32 位 API 密钥" /></el-form-item>
          <el-form-item label="APIv3 密钥"><el-input v-model="wxpay.apiV3Key" type="password" show-password placeholder="32 位 APIv3 密钥" /></el-form-item>
          <el-form-item label="证书序列号"><el-input v-model="wxpay.serialNo" placeholder="商户 API 证书序列号" /></el-form-item>
          <el-form-item label="回调地址"><el-input v-model="wxpay.notifyUrl" placeholder="https://yourdomain.com/api/pay/wxpay/notify" /></el-form-item>
          <el-form-item><el-button type="primary" :loading="savingWx" @click="saveWxpay">保存</el-button></el-form-item>
        </el-form>
      </el-card>

      <!-- 支付宝配置 -->
      <el-card class="card">
        <div class="card-title">支付宝配置</div>
        <el-form :model="alipay" label-width="110px" size="small">
          <el-form-item label="AppID"><el-input v-model="alipay.appId" placeholder="支付宝 AppID" /></el-form-item>
          <el-form-item label="应用私钥"><el-input v-model="alipay.privateKey" type="textarea" :rows="3" placeholder="RSA2 私钥（PKCS8 格式）" /></el-form-item>
          <el-form-item label="支付宝公钥"><el-input v-model="alipay.alipayPublicKey" type="textarea" :rows="3" placeholder="支付宝公钥" /></el-form-item>
          <el-form-item label="回调地址"><el-input v-model="alipay.notifyUrl" placeholder="https://yourdomain.com/api/pay/alipay/notify" /></el-form-item>
          <el-form-item label="沙箱模式">
            <el-switch v-model="alipay.sandbox" />
            <div class="form-tip">开启后使用支付宝沙箱环境</div>
          </el-form-item>
          <el-form-item><el-button type="primary" :loading="savingAli" @click="saveAlipay">保存</el-button></el-form-item>
        </el-form>
      </el-card>

      <!-- 微信登录 -->
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

      <!-- 对外 API 接口管理 -->
      <el-card class="card full-width">
        <div class="card-title">对外 API 接口管理</div>
        <el-alert type="info" :closable="false" style="margin-bottom: 14px;">
          <template #title>
            <span style="font-weight:600;">统一接口地址：</span>
            <code style="background:#f0f4f8;padding:2px 8px;border-radius:4px;font-size:13px;">POST 域名/api/v1/query</code>
          </template>
        </el-alert>
        <div style="display:flex;gap:8px;margin-bottom:14px;">
          <el-button size="small" type="primary" @click="showAddApiDialog">新增 API Key</el-button>
          <el-button size="small" type="success" @click="showApiDocumentation">开发文档</el-button>
          <el-button size="small" @click="loadApiList" :loading="apiListLoading">刷新</el-button>
        </div>
        <el-table :data="apiList" stripe size="small" v-loading="apiListLoading">
          <el-table-column prop="id" label="ID" width="60" />
          <el-table-column prop="name" label="配置名称" min-width="120" />
          <el-table-column prop="permissions" label="权限" min-width="180">
            <template #default="{ row }">
              <el-tag v-for="perm in row.permissions" :key="perm" size="small" style="margin-right:4px;">{{ getPermissionLabel(perm) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="api_key" label="API Key" min-width="200">
            <template #default="{ row }">
              <el-input :value="row.api_key" readonly size="small" style="width:250px;">
                <template #append><el-button @click="copyApiKey(row.api_key)" size="small">复制</el-button></template>
              </el-input>
            </template>
          </el-table-column>
          <el-table-column prop="is_active" label="状态" width="80">
            <template #default="{ row }">
              <el-tag :type="row.is_active ? 'success' : 'danger'" size="small">{{ row.is_active ? '启用' : '禁用' }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="180" fixed="right">
            <template #default="{ row }">
              <div style="display:flex;gap:4px;">
                <el-button size="small" type="primary" @click="editApi(row)">编辑</el-button>
                <el-button size="small" type="success" @click="showDownloadDialog(row)">文档</el-button>
                <el-button size="small" type="danger" @click="deleteApi(row)">删除</el-button>
              </div>
            </template>
          </el-table-column>
          <template #empty>
            <el-empty :description="apiListError ? '加载失败，暂无可显示数据' : '暂无 API 配置数据'" :image-size="90" />
          </template>
        </el-table>
      </el-card>

    </div>

    <!-- 对话框 -->
    <el-dialog v-model="downloadDialogVisible" title="下载 API 接口文档" width="480px" :close-on-click-modal="false">
      <el-form label-width="100px" size="small">
        <el-form-item label="选择语言">
          <el-radio-group v-model="downloadLanguage">
            <el-radio value="java">Java</el-radio>
            <el-radio value="python">Python</el-radio>
            <el-radio value="javascript">JavaScript</el-radio>
            <el-radio value="php">PHP</el-radio>
            <el-radio value="go">Go</el-radio>
            <el-radio value="markdown">Markdown</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="downloadDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="downloadApiDoc" :loading="downloadingApi">下载</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="apiDialogVisible" :title="editingApi ? '编辑 API Key 配置' : '新增 API Key 配置'" width="680px" :close-on-click-modal="false">
      <el-alert type="info" :closable="false" style="margin-bottom:14px;">
        <template #title><span style="font-size:12px;">统一 API 地址：<code>域名/api/v1/query</code></span></template>
      </el-alert>
      <el-form :model="apiForm" label-width="100px" size="small">
        <el-form-item label="配置名称" required><el-input v-model="apiForm.name" placeholder="如：合作伙伴订单查询" /></el-form-item>
        <el-form-item label="配置说明"><el-input v-model="apiForm.path" type="textarea" :rows="2" placeholder="可选：填写该 API Key 的主要用途说明" /></el-form-item>
        <el-form-item label="访问权限" required>
          <el-checkbox-group v-model="apiForm.permissions" @change="handleApiPermissionChange">
            <el-checkbox label="orders">订单数据</el-checkbox>
            <el-checkbox label="users">用户数据</el-checkbox>
            <el-checkbox label="riders">骑手数据</el-checkbox>
            <el-checkbox label="merchants">商户数据</el-checkbox>
            <el-checkbox label="products">商品数据</el-checkbox>
            <el-checkbox label="categories">分类数据</el-checkbox>
            <el-checkbox label="dashboard">仪表盘数据</el-checkbox>
          </el-checkbox-group>
        </el-form-item>
        <el-form-item label="启用状态"><el-switch v-model="apiForm.is_active" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="apiDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveApi" :loading="savingApi">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="clearAllDialogVisible" title="清空全部信息（二次验证）" width="460px">
      <el-form :model="clearAllVerifyForm" label-width="80px">
        <el-form-item label="账号">
          <el-input v-model="clearAllVerifyForm.verifyAccount" placeholder="请输入验证账号" />
        </el-form-item>
        <el-form-item label="密码">
          <el-input
            v-model="clearAllVerifyForm.verifyPassword"
            type="password"
            show-password
            placeholder="请输入验证密码"
            @keyup.enter="confirmClearAllData"
          />
        </el-form-item>
      </el-form>
      <div class="danger-dialog-tip">
        二次验证失败 2 次将锁定 24 小时；请谨慎操作。
      </div>
      <template #footer>
        <el-button @click="clearAllDialogVisible = false">取消</el-button>
        <el-button type="danger" :loading="clearingAllData" @click="confirmClearAllData">确认清空</el-button>
      </template>
    </el-dialog>

  </div>
</template>

<script setup>
import { Download, Upload } from '@element-plus/icons-vue';
import PageStateAlert from '@/components/PageStateAlert.vue';
import { useSettingsPage } from './settingsHelpers';

const {
  router,
  isMobile,
  loading,
  saving,
  loadError,
  apiListError,
  pageError,
  sms,
  DEFAULT_WEATHER_CONFIG,
  weather,
  serviceSettings,
  charitySettings,
  vipSettings,
  wechatLoginConfig,
  savingWechatLoginConfig,
  savingServiceSettings,
  savingCharitySettings,
  savingVipSettings,
  appDownloadConfig,
  savingAppDownload,
  uploadingPackage,
  exporting,
  importing,
  exportingRiders,
  importingRiders,
  exportingOrders,
  importingOrders,
  exportingMerchants,
  importingMerchants,
  exportingAll,
  importingAll,
  dataMgmtItems,
  debugMode,
  savingDebugMode,
  payMode,
  savingPayMode,
  wxpay,
  savingWx,
  alipay,
  savingAli,
  apiList,
  apiListLoading,
  apiDialogVisible,
  editingApi,
  apiForm,
  savingApi,
  downloadDialogVisible,
  downloadLanguage,
  downloadingApi,
  currentDownloadApi,
  clearAllDialogVisible,
  clearingAllData,
  clearAllVerifyForm,
  extractErrorMessage,
  mergeWeatherConfig,
  handleResize,
  loadAll,
  saveSms,
  saveWeather,
  saveServiceSettings,
  addRiderReportReason,
  removeRiderReportReason,
  addRiderInsuranceCoverage,
  removeRiderInsuranceCoverage,
  addRiderInsuranceClaimStep,
  removeRiderInsuranceClaimStep,
  saveCharitySettings,
  addCharityLeaderboardItem,
  removeCharityLeaderboardItem,
  addCharityNewsItem,
  removeCharityNewsItem,
  saveVIPSettings,
  addVIPLevel,
  removeVIPLevel,
  addVIPBenefit,
  removeVIPBenefit,
  addVIPTask,
  removeVIPTask,
  addVIPPointRule,
  removeVIPPointRule,
  saveWechatLoginConfig,
  saveAppDownload,
  beforePackageUpload,
  handlePackageUpload,
  openDownloadLink,
  openClearAllDataDialog,
  confirmClearAllData,
  savePayMode,
  saveDebugMode,
  saveWxpay,
  saveAlipay,
  handleLogout,
  exportUsers,
  beforeImport,
  handleImport,
  exportRiders,
  handleImportRiders,
  validateDataType,
  exportOrders,
  handleImportOrders,
  exportMerchants,
  handleImportMerchants,
  exportAllData,
  handleImportAllData,
  loadApiList,
  showAddApiDialog,
  editApi,
  deleteApi,
  saveApi,
  resetApiForm,
  generateApiKey,
  copyApiKey,
  getPermissionLabel,
  handleApiPermissionChange,
  showApiDocumentation,
  generateApiDocumentation,
  showDownloadDialog,
  generateMarkdownDoc,
  downloadApiDoc,
} = useSettingsPage();
</script>

<style scoped lang="css" src="./Settings.css"></style>
