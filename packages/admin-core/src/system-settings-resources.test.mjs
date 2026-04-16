import test from "node:test";
import assert from "node:assert/strict";

import {
  buildAlipayConfigPayload,
  buildAppDownloadConfigPayload,
  buildCharitySettingsPayload,
  buildDebugModePayload,
  buildPayModePayload,
  buildSMSConfigPayload,
  buildServiceSettingsPayload,
  buildVIPSettingsPayload,
  buildWeatherConfigPayload,
  buildWechatLoginConfigPayload,
  buildWxpayConfigPayload,
  createDefaultCharitySettings,
  createDefaultServiceSettings,
  createDefaultVIPSettings,
  createEmptyCharityLeaderboardItem,
  createEmptyCharityNewsItem,
  createEmptyRTCIceServer,
  createEmptyRiderInsuranceCoverage,
  normalizeAlipayConfig,
  normalizeAppDownloadConfig,
  normalizeCharitySettings,
  normalizeDebugModeConfig,
  normalizePayModeConfig,
  normalizeRTCIceServers,
  normalizeRiderInsuranceCoverages,
  normalizeSMSConfig,
  normalizeServiceSettings,
  normalizeServiceStringList,
  normalizeVIPSettings,
  normalizeWeatherConfig,
  normalizeWechatLoginConfig,
  normalizeWxpayConfig,
  resolveAdminServiceSoundPreviewUrl,
  validateAdminAudioFile,
  validateAdminMiniProgramQrFile,
  validateAdminPackageFile,
} from "./system-settings-resources.js";

test("system settings resources keep sms and weather semantics stable", () => {
  assert.deepEqual(
    normalizeSMSConfig({
      access_key: "  LTAI-demo  ",
      sign: " 平台签名 ",
      template_id: " SMS_001 ",
      user_enabled: "0",
    }),
    {
      provider: "aliyun",
      access_key_id: "LTAI-demo",
      access_key_secret: "",
      has_access_key_secret: false,
      sign_name: "平台签名",
      template_code: "SMS_001",
      region_id: "cn-hangzhou",
      endpoint: "",
      consumer_enabled: false,
      merchant_enabled: true,
      rider_enabled: true,
      admin_enabled: true,
    },
  );

  assert.deepEqual(buildSMSConfigPayload({ sign_name: " 平台 " }), {
    provider: "aliyun",
    access_key_id: "",
    access_key_secret: "",
    sign_name: "平台",
    template_code: "",
    region_id: "cn-hangzhou",
    endpoint: "",
    consumer_enabled: true,
    merchant_enabled: true,
    rider_enabled: true,
    admin_enabled: true,
  });

  assert.deepEqual(
    normalizeWeatherConfig({
      location: " 上海 ",
      refresh_interval_minutes: 99999,
      timeout_ms: 100,
      extended: "false",
    }),
    {
      api_base_url: "https://uapis.cn/api/v1/misc/weather",
      api_key: "",
      city: "上海",
      adcode: "",
      lang: "zh",
      extended: false,
      forecast: true,
      hourly: true,
      minutely: true,
      indices: true,
      timeout_ms: 1000,
      refresh_interval_minutes: 1440,
      location: " 上海 ",
    },
  );

  assert.deepEqual(
    buildWeatherConfigPayload({ city: " 北京 ", adcode: " 110000 " }),
    {
      api_base_url: "https://uapis.cn/api/v1/misc/weather",
      api_key: "",
      city: "北京",
      adcode: "110000",
      lang: "zh",
      extended: true,
      forecast: true,
      hourly: true,
      minutely: true,
      indices: true,
      timeout_ms: 8000,
      refresh_interval_minutes: 10,
    },
  );
});

test("system settings resources normalize service settings and avoid shared default mutation", () => {
  const defaultSettings = createDefaultServiceSettings();
  defaultSettings.rider_exception_report_reasons.push("临时原因");

  assert.equal(
    createDefaultServiceSettings().rider_exception_report_reasons.includes("临时原因"),
    false,
  );
  assert.deepEqual(createEmptyRiderInsuranceCoverage(), {
    icon: "",
    name: "",
    amount: "",
  });
  assert.deepEqual(createEmptyRTCIceServer(), {
    url: "",
    username: "",
    credential: "",
  });
  assert.deepEqual(
    normalizeServiceStringList(["  重复 ", "重复", "", "新项"], [], 20),
    ["重复", "新项"],
  );
  assert.deepEqual(
    normalizeRiderInsuranceCoverages([
      { icon: " shield ", name: " 医疗 ", amount: " 最高 10 万 " },
      {},
    ]),
    [{ icon: "shield", name: "医疗", amount: "最高 10 万" }],
  );
  assert.deepEqual(
    normalizeRTCIceServers([{ url: " stun:test ", username: "  u ", credential: " c " }]),
    [{ url: "stun:test", username: "u", credential: "c" }],
  );

  assert.deepEqual(
    normalizeServiceSettings({
      support_chat_title: "  客服中心 ",
      rider_exception_report_reasons: [" 出餐慢 ", "出餐慢", "联系不上顾客"],
      rider_insurance_claim_steps: [" 第一步 ", "", "第二步"],
      rtc_timeout_seconds: 999,
      map_timeout_seconds: 0,
      rtc_ice_servers: [{ url: " stun:test " }],
    }),
    {
      ...createDefaultServiceSettings(),
      support_chat_title: "客服中心",
      rider_exception_report_reasons: ["出餐慢", "联系不上顾客"],
      rider_insurance_claim_steps: ["第一步", "第二步"],
      rtc_timeout_seconds: 120,
      map_timeout_seconds: 1,
      rtc_ice_servers: [{ url: "stun:test", username: "", credential: "" }],
    },
  );

  assert.deepEqual(
    buildServiceSettingsPayload({
      message_notification_sound_url: " /audio/custom.mp3 ",
      wechat_login_enabled: "true",
      map_provider: " custom ",
    }).map_provider,
    "custom",
  );
});

test("system settings resources keep charity, wechat and app download payloads stable", () => {
  assert.deepEqual(createEmptyCharityLeaderboardItem(), {
    name: "",
    amount: 0,
    time_label: "",
  });
  assert.deepEqual(createEmptyCharityNewsItem(), {
    title: "",
    summary: "",
    source: "",
    time_label: "",
    image_url: "",
  });

  assert.deepEqual(
    normalizeCharitySettings({
      enabled: 0,
      page_title: " 公益页 ",
      leaderboard: [{ name: " 匿名用户 ", amount: "30", time_label: " 今天 " }],
      news_list: [{ title: " 头条 ", summary: " 摘要 ", source: " 运营 ", time_label: " 刚刚 " }],
    }),
    {
      ...createDefaultCharitySettings(),
      enabled: false,
      page_title: "公益页",
      leaderboard: [{ name: "匿名用户", amount: 30, time_label: "今天" }],
      news_list: [
        {
          title: "头条",
          summary: "摘要",
          source: "运营",
          time_label: "刚刚",
          image_url: "",
        },
      ],
    },
  );

  assert.equal(
    buildCharitySettingsPayload({ join_url: " https://example.com/charity " }).join_url,
    "https://example.com/charity",
  );

  assert.deepEqual(
    normalizeWechatLoginConfig({
      enabled: "1",
      app_id: " wx123 ",
      has_app_secret: 1,
      callback_url: " https://example.com/callback ",
      scope: "",
    }),
    {
      enabled: true,
      app_id: "wx123",
      app_secret: "",
      has_app_secret: true,
      callback_url: "https://example.com/callback",
      scope: "snsapi_userinfo",
    },
  );

  assert.deepEqual(
    buildWechatLoginConfigPayload({ app_secret: " secret ", scope: " snsapi_base " }),
    {
      enabled: false,
      app_id: "",
      app_secret: "secret",
      callback_url: "",
      scope: "snsapi_base",
    },
  );

  assert.deepEqual(
    normalizeAppDownloadConfig({
      ios_url: " https://example.com/ios ",
      mini_program_qr_url: " /uploads/qr.png ",
    }),
    {
      ios_url: "https://example.com/ios",
      android_url: "",
      ios_version: "",
      android_version: "",
      latest_version: "",
      updated_at: "",
      mini_program_qr_url: "/uploads/qr.png",
    },
  );

  assert.equal(
    buildAppDownloadConfigPayload({ latest_version: " 2.0.1 " }).latest_version,
    "2.0.1",
  );
});

test("system settings resources keep debug, pay and upload validation semantics stable", () => {
  assert.deepEqual(
    normalizeDebugModeConfig({ enabled: "1", delivery: 0, coffee: "true" }),
    {
      enabled: true,
      delivery: false,
      phone_film: false,
      massage: false,
      coffee: true,
    },
  );
  assert.deepEqual(buildDebugModePayload({ massage: 1 }), {
    enabled: false,
    delivery: false,
    phone_film: false,
    massage: true,
    coffee: false,
  });
  assert.deepEqual(normalizePayModeConfig({ isProd: "1" }), { isProd: true });
  assert.deepEqual(buildPayModePayload({ is_prod: 0 }), { isProd: false });

  assert.deepEqual(
    normalizeWxpayConfig({ appId: " wx ", notifyUrl: " https://example.com/wx " }),
    {
      appId: "wx",
      mchId: "",
      apiKey: "",
      apiV3Key: "",
      serialNo: "",
      notifyUrl: "https://example.com/wx",
    },
  );
  assert.deepEqual(buildWxpayConfigPayload({ mchId: " 123 " }), {
    appId: "",
    mchId: "123",
    apiKey: "",
    apiV3Key: "",
    serialNo: "",
    notifyUrl: "",
  });

  assert.deepEqual(
    normalizeAlipayConfig({ appId: " ali ", sandbox: "0" }),
    {
      appId: "ali",
      privateKey: "",
      alipayPublicKey: "",
      notifyUrl: "",
      sandbox: false,
    },
  );
  assert.deepEqual(buildAlipayConfigPayload({ notifyUrl: " https://example.com/ali " }), {
    appId: "",
    privateKey: "",
    alipayPublicKey: "",
    notifyUrl: "https://example.com/ali",
    sandbox: true,
  });

  assert.equal(resolveAdminServiceSoundPreviewUrl("order"), "/audio/come.mp3");
  assert.deepEqual(validateAdminAudioFile({ name: "alert.mp3", size: 1024 }, 10), {
    valid: true,
    message: "",
  });
  assert.deepEqual(validateAdminPackageFile({ name: "app.zip", size: 1024 }, 300), {
    valid: false,
    message: "仅支持 .ipa / .apk / .aab 安装包",
  });
  assert.deepEqual(validateAdminMiniProgramQrFile({ name: "qr.txt", size: 10 }, 10), {
    valid: false,
    message: "仅支持上传图片格式的小程序二维码",
  });
});

test("system settings resources preserve vip semantics and isolate defaults", () => {
  const defaultVip = createDefaultVIPSettings();
  defaultVip.levels[0].name = "已修改";

  assert.notEqual(createDefaultVIPSettings().levels[0].name, "已修改");

  assert.deepEqual(
    normalizeVIPSettings({
      enabled: 0,
      point_rules: [" 规则一 ", "规则一", "规则二"],
      levels: [
        {
          name: " 黄金 VIP ",
          threshold_value: "3000",
          benefits: [{ title: " 双倍积分 ", desc: " 每单返 ", detail: " 详情 " }],
        },
      ],
      growth_tasks: [{ title: " 下单 ", description: " 完成订单 ", reward_text: " +10 ", action_label: "" }],
    }),
    {
      enabled: false,
      page_title: "会员中心",
      rules_title: "会员权益规则",
      benefit_section_title: "权益全景",
      benefit_section_tag: "VIP专享",
      benefit_section_tip: "点击查看详情",
      tasks_section_title: "成长任务",
      tasks_section_tip: "完成任务，逐步解锁更多等级权益",
      points_section_title: "积分好礼",
      points_section_tip: "积分商品由积分商城实时维护",
      service_button_text: "客服",
      standard_action_text: "立即去点餐升级",
      premium_action_text: "联系专属客服",
      point_rules: ["规则一", "规则二"],
      levels: [
        {
          name: "黄金 VIP",
          style_class: "level-quality",
          tagline: "",
          threshold_label: "",
          threshold_value: 3000,
          multiplier: 1,
          is_black_gold: false,
          benefits: [
            {
              icon: "/static/icons/star.svg",
              title: "双倍积分",
              desc: "每单返",
              detail: "详情",
            },
          ],
        },
      ],
      growth_tasks: [
        {
          title: "下单",
          description: "完成订单",
          reward_text: "+10",
          action_label: "去完成",
        },
      ],
    },
  );

  assert.equal(buildVIPSettingsPayload({ levels: [] }).levels.length > 0, true);
});
