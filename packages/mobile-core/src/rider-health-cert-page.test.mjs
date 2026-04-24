import test from "node:test";
import assert from "node:assert/strict";

import {
  buildRiderHealthCertInfoRows,
  createRiderHealthCertPageLogic,
  DEFAULT_RIDER_HEALTH_CERT_RECORD,
  resolveRiderHealthCertStatusMeta,
} from "./rider-health-cert-page.js";

function instantiatePage(component) {
  const instance = {
    ...component.data(),
  };

  for (const [name, getter] of Object.entries(component.computed || {})) {
    Object.defineProperty(instance, name, {
      get: () => getter.call(instance),
      enumerable: true,
      configurable: true,
    });
  }

  for (const [name, handler] of Object.entries(component.methods || {})) {
    instance[name] = handler.bind(instance);
  }

  return instance;
}

async function flushMicrotasks() {
  await Promise.resolve();
  await Promise.resolve();
}

test("rider health cert helpers normalize status meta and info rows", () => {
  assert.equal(DEFAULT_RIDER_HEALTH_CERT_RECORD.certStatus, "valid");
  assert.deepEqual(resolveRiderHealthCertStatusMeta(" expiring ", { expireDate: " 2026-07-01 " }), {
    status: "expiring",
    icon: "⚠",
    title: "健康证即将过期",
    desc: "有效期至 2026-07-01，请及时更新健康证",
  });
  assert.deepEqual(resolveRiderHealthCertStatusMeta("expired"), {
    status: "expired",
    icon: "⚠",
    title: "健康证已过期",
    desc: "请立即更新健康证并重新提交审核",
  });
  assert.deepEqual(buildRiderHealthCertInfoRows({ certNumber: " HC-001 " }), [
    { label: "证件编号", value: "HC-001" },
    { label: "发证机关", value: "深圳市南山区疾控中心" },
    { label: "发证日期", value: "2024-06-30" },
    { label: "有效期至", value: "2025-06-30" },
  ]);
});

test("rider health cert page previews, uploads, and downloads through shared runtime", async () => {
  const previewCalls = [];
  const toasts = [];
  const loadingCalls = [];
  const downloads = [];
  let chooseImagePayload = null;

  const component = createRiderHealthCertPageLogic({
    uniApp: {
      previewImage(payload) {
        previewCalls.push(payload);
      },
      chooseImage(payload) {
        chooseImagePayload = payload;
      },
      showLoading(payload) {
        loadingCalls.push(["show", payload.title]);
      },
      hideLoading() {
        loadingCalls.push(["hide"]);
      },
      showToast(payload) {
        toasts.push(payload);
      },
    },
    async uploadHealthCertImage(filePath) {
      assert.equal(filePath, "/tmp/rider-health-cert.png");
      return {
        data: {
          asset_url: "https://cdn.example.com/rider-health-cert.png",
        },
      };
    },
    async downloadHealthCertImage(url) {
      downloads.push(url);
    },
  });
  const page = instantiatePage(component);

  page.previewImage();
  page.uploadImage();
  await chooseImagePayload.success({
    tempFilePaths: ["/tmp/rider-health-cert.png"],
  });
  await flushMicrotasks();
  await page.downloadImage();

  assert.deepEqual(previewCalls, [
    {
      urls: ["/static/placeholder-cert.jpg"],
      current: "/static/placeholder-cert.jpg",
    },
  ]);
  assert.equal(page.certImageUrl, "https://cdn.example.com/rider-health-cert.png");
  assert.deepEqual(loadingCalls, [["show", "上传中..."], ["hide"]]);
  assert.deepEqual(downloads, ["https://cdn.example.com/rider-health-cert.png"]);
  assert.deepEqual(toasts, [
    {
      title: "上传成功",
      icon: "success",
    },
    {
      title: "下载成功",
      icon: "success",
    },
  ]);
});

test("rider health cert page reports empty image states cleanly", async () => {
  const toasts = [];
  const component = createRiderHealthCertPageLogic({
    uniApp: {
      showToast(payload) {
        toasts.push(payload);
      },
    },
  });
  const page = instantiatePage(component);
  page.certImageUrl = "";

  page.previewImage();
  await page.downloadImage();

  assert.deepEqual(toasts, [
    {
      title: "暂无证件图片",
      icon: "none",
    },
    {
      title: "暂无可下载图片",
      icon: "none",
    },
  ]);
});
