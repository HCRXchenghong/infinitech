import test from "node:test";
import assert from "node:assert/strict";

import {
  buildRiderInsuranceSettings,
  createRiderInsurancePageLogic,
  DEFAULT_RIDER_INSURANCE_SETTINGS,
  displayRiderInsuranceValue,
  openRiderInsuranceExternalLink,
} from "./rider-insurance-page.js";

function instantiatePage(component) {
  const instance = {
    ...component.data(),
  };

  if (typeof component.onShow === "function") {
    instance.onShow = component.onShow.bind(instance);
  }

  for (const [name, handler] of Object.entries(component.methods || {})) {
    instance[name] = handler.bind(instance);
  }

  return instance;
}

test("rider insurance helpers normalize payloads, defaults, and display copy", () => {
  const settings = buildRiderInsuranceSettings({
    data: {
      rider_insurance_status_title: " 平台保障 ",
      rider_insurance_claim_steps: [" 第一步 ", "", "第二步", "第二步"],
      rider_insurance_coverages: [
        { icon: "🩺", name: "医疗", amount: " 5 万 " },
        { icon: "", name: "", amount: "" },
      ],
    },
  });

  assert.equal(DEFAULT_RIDER_INSURANCE_SETTINGS.claimButtonText, "联系平台处理");
  assert.deepEqual(settings, {
    statusTitle: "平台保障",
    statusDesc: "保障内容、承保信息和理赔入口以平台发布为准",
    policyNumber: "",
    provider: "",
    effectiveDate: "",
    expireDate: "",
    claimUrl: "",
    detailUrl: "",
    claimButtonText: "联系平台处理",
    detailButtonText: "查看保障说明",
    claimSteps: ["第一步", "第二步"],
    coverages: [
      {
        icon: "🩺",
        name: "医疗",
        amount: "5 万",
      },
    ],
  });
  assert.equal(displayRiderInsuranceValue(" "), "以平台发布为准");
  assert.equal(displayRiderInsuranceValue(" 2026-04-23 "), "2026-04-23");
});

test("rider insurance page loads runtime settings and falls back on failure", async () => {
  let requestCount = 0;
  const component = createRiderInsurancePageLogic({
    async fetchPublicRuntimeSettings() {
      requestCount += 1;
      if (requestCount === 1) {
        return {
          data: {
            rider_insurance_policy_number: "PN-001",
            rider_insurance_provider: "无限保险",
          },
        };
      }
      throw new Error("network");
    },
  });
  const page = instantiatePage(component);

  await page.loadSettings();
  assert.equal(page.settings.policyNumber, "PN-001");
  assert.equal(page.settings.provider, "无限保险");

  await page.loadSettings();
  assert.equal(page.settings.statusTitle, DEFAULT_RIDER_INSURANCE_SETTINGS.statusTitle);
  assert.equal(page.loading, false);
});

test("rider insurance external link uses empty toast, window, plus runtime, and clipboard fallbacks", () => {
  const toasts = [];
  const windowCalls = [];
  const plusCalls = [];
  const clipboardCalls = [];

  assert.equal(
    openRiderInsuranceExternalLink({
      url: "",
      emptyMessage: "理赔入口暂未开放",
      uniApp: {
        showToast(payload) {
          toasts.push(payload);
        },
      },
    }),
    false,
  );

  assert.equal(
    openRiderInsuranceExternalLink({
      url: "https://claim.example.com",
      windowObject: {
        open(url, target) {
          windowCalls.push({ url, target });
        },
      },
    }),
    true,
  );

  assert.equal(
    openRiderInsuranceExternalLink({
      url: "https://detail.example.com",
      plusRuntime: {
        openURL(url) {
          plusCalls.push(url);
        },
      },
    }),
    true,
  );

  assert.equal(
    openRiderInsuranceExternalLink({
      url: "https://clipboard.example.com",
      uniApp: {
        setClipboardData(payload) {
          clipboardCalls.push(payload.data);
          payload.success();
        },
        showToast(payload) {
          toasts.push(payload);
        },
      },
    }),
    true,
  );

  assert.deepEqual(toasts, [
    {
      title: "理赔入口暂未开放",
      icon: "none",
    },
    {
      title: "链接已复制，请在浏览器打开",
      icon: "none",
    },
  ]);
  assert.deepEqual(windowCalls, [
    {
      url: "https://claim.example.com",
      target: "_blank",
    },
  ]);
  assert.deepEqual(plusCalls, ["https://detail.example.com"]);
  assert.deepEqual(clipboardCalls, ["https://clipboard.example.com"]);
});

test("rider insurance page open actions delegate to shared external link helper", () => {
  const component = createRiderInsurancePageLogic();
  const page = instantiatePage(component);
  const actions = [];
  page.openExternalLink = (url, emptyMessage) => {
    actions.push({ url, emptyMessage });
    return true;
  };
  page.settings.claimUrl = "https://claim.example.com";
  page.settings.detailUrl = "https://detail.example.com";

  page.openClaim();
  page.openDetail();

  assert.deepEqual(actions, [
    {
      url: "https://claim.example.com",
      emptyMessage: "理赔入口暂未开放",
    },
    {
      url: "https://detail.example.com",
      emptyMessage: "保障详情暂未发布",
    },
  ]);
});
