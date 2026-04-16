import test from "node:test";
import assert from "node:assert/strict";

import {
  API_DOCUMENTATION_AUTH_HEADER_EXAMPLE,
  API_DOCUMENTATION_ENDPOINT_GROUPS,
  API_DOCUMENTATION_ERROR_CODES,
  API_DOCUMENTATION_NOTES,
  API_DOCUMENTATION_PERMISSION_ROWS,
  API_DOCUMENTATION_RESOURCE_TYPES,
  buildApiDocumentationMarkdown,
  buildApiDocumentationQuickStartCurl,
  buildApiDocumentationRequestExamples,
  buildApiDocumentationText,
  buildApiKeyMarkdownText,
} from "./api-documentation-resources.js";

test("api documentation resources expose stable metadata", () => {
  assert.equal(
    API_DOCUMENTATION_AUTH_HEADER_EXAMPLE,
    "X-API-Key: your_api_key_here",
  );
  assert.equal(API_DOCUMENTATION_PERMISSION_ROWS.length, 5);
  assert.equal(API_DOCUMENTATION_RESOURCE_TYPES[0].name, "orders");
  assert.equal(API_DOCUMENTATION_ENDPOINT_GROUPS[0].title, "仪表盘数据");
  assert.equal(API_DOCUMENTATION_ERROR_CODES.at(-1)?.code, "500");
  assert.equal(API_DOCUMENTATION_NOTES.length, 5);
});

test("api documentation resources build stable examples and markdown", () => {
  const curl = buildApiDocumentationQuickStartCurl("https://console.example.com/");
  assert.match(curl, /https:\/\/console\.example\.com\/api\/v1\/query/);

  const examples = buildApiDocumentationRequestExamples(
    "https://console.example.com",
  );
  assert.deepEqual(
    examples.map((item) => item.id),
    ["javascript", "python", "java"],
  );
  assert.match(examples[0].code, /fetch\('https:\/\/console\.example\.com\/api\/v1\/query'/);
  assert.match(examples[1].code, /base_url = "https:\/\/console\.example\.com"/);

  const markdown = buildApiDocumentationMarkdown({
    apiBaseUrl: "https://console.example.com",
    generatedAtText: "2026-04-16 18:00:00",
  });
  assert.match(markdown, /当前部署地址：https:\/\/console\.example\.com/);
  assert.match(markdown, /## 权限模型/);
  assert.match(markdown, /生成时间：2026-04-16 18:00:00/);

  const fullText = buildApiDocumentationText();
  assert.match(fullText, /# 悦享e食平台 - 统一API接口文档/);
  assert.match(fullText, /## 🔐 认证方式/);
  assert.match(fullText, /## 🔑 权限说明/);
});

test("api documentation resources build api key markdown consistently", () => {
  const doc = buildApiKeyMarkdownText(
    {
      name: "BI 中台",
      path: "/api/public/orders",
      permissions: '["orders","all"]',
      api_key: "secret-key",
      description: "对账使用",
      is_active: true,
    },
    (permission) => `权限:${permission}`,
    { generatedAtText: "2026-04-16 19:00:00" },
  );

  assert.match(doc, /# BI 中台 - 访问说明/);
  assert.match(doc, /- \*\*权限:all\*\*/);
  assert.match(doc, /此 API Key 拥有全部资源访问权限/);
  assert.match(doc, /X-API-Key: secret-key/);
  assert.match(doc, /生成时间\*\*: 2026-04-16 19:00:00/);

  const emptyPermissionDoc = buildApiKeyMarkdownText(
    {
      name: "No Scope",
      permissions: "",
      api_key: "",
      is_active: false,
    },
    undefined,
    { generatedAtText: "fixed-time" },
  );
  assert.match(emptyPermissionDoc, /当前未配置权限/);
  assert.match(emptyPermissionDoc, /当前没有可访问资源/);
});
