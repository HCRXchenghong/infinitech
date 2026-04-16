import {
  getPublicApiPermissionLabel,
  PUBLIC_API_RESOURCE_PERMISSIONS,
} from "./api-management-resources.js";

function normalizeTrimmedText(value, fallback = "") {
  if (value === undefined || value === null) {
    return fallback;
  }
  const normalized = String(value).trim();
  return normalized || fallback;
}

function resolveGeneratedAtText(value) {
  const normalized = normalizeTrimmedText(value);
  if (normalized) {
    return normalized;
  }
  return new Date().toLocaleString("zh-CN", { hour12: false });
}

function normalizeBaseUrl(value) {
  const normalized = normalizeTrimmedText(value, API_DOCUMENTATION_DEFAULT_BASE_URL);
  return normalized.replace(/\/+$/, "");
}

function freezeRecords(items) {
  return Object.freeze(
    items.map((item) =>
      Object.freeze({
        ...item,
        ...(Array.isArray(item.permissions)
          ? { permissions: Object.freeze([...item.permissions]) }
          : {}),
        ...(Array.isArray(item.params)
          ? {
              params: Object.freeze(
                item.params.map((param) => Object.freeze({ ...param })),
              ),
            }
          : {}),
        ...(Array.isArray(item.endpoints)
          ? {
              endpoints: Object.freeze(
                item.endpoints.map((endpoint) =>
                  Object.freeze({
                    ...endpoint,
                    ...(Array.isArray(endpoint.params)
                      ? {
                          params: Object.freeze(
                            endpoint.params.map((param) =>
                              Object.freeze({ ...param }),
                            ),
                          ),
                        }
                      : {}),
                  }),
                ),
              ),
            }
          : {}),
        ...(Array.isArray(item.examples)
          ? { examples: Object.freeze([...item.examples]) }
          : {}),
      }),
    ),
  );
}

export const API_DOCUMENTATION_DEFAULT_BASE_URL = "https://your-domain.com";
export const API_DOCUMENTATION_AUTH_HEADER_EXAMPLE =
  "X-API-Key: your_api_key_here";

export const API_DOCUMENTATION_PERMISSION_ROWS = freezeRecords([
  {
    key: "orders",
    description: "订单数据访问权限",
    scope: "订单列表、订单详情、订单统计",
  },
  {
    key: "users",
    description: "用户数据访问权限",
    scope: "用户列表、用户详情、用户统计",
  },
  {
    key: "riders",
    description: "骑手数据访问权限",
    scope: "骑手列表、骑手详情、骑手统计",
  },
  {
    key: "dashboard",
    description: "仪表盘访问权限",
    scope: "平台统计、用户排名、骑手排名",
  },
  {
    key: "all",
    description: "全部数据访问权限",
    scope: "包含所有公开资源",
  },
]);

export const API_DOCUMENTATION_RESOURCE_TYPES = freezeRecords([
  {
    name: "orders",
    description: "订单数据，包括订单列表、详情和统计。",
    permissions: ["orders", "all"],
    icon: "ShoppingBag",
  },
  {
    name: "users",
    description: "用户数据，包括用户列表、详情和统计。",
    permissions: ["users", "all"],
    icon: "User",
  },
  {
    name: "riders",
    description: "骑手数据，包括骑手列表、详情和统计。",
    permissions: ["riders", "all"],
    icon: "UserFilled",
  },
  {
    name: "merchants",
    description: "商户数据，适用于统一查询接口。",
    permissions: ["all"],
    icon: "Shop",
  },
  {
    name: "products",
    description: "商品数据，适用于统一查询接口。",
    permissions: ["all"],
    icon: "Box",
  },
  {
    name: "categories",
    description: "分类数据，适用于统一查询接口。",
    permissions: ["all"],
    icon: "Collection",
  },
]);

export const API_DOCUMENTATION_ENDPOINT_GROUPS = freezeRecords([
  {
    title: "仪表盘数据",
    endpoints: [
      {
        method: "GET",
        path: "/api/public/dashboard/stats",
        description: "获取平台统计数据。",
        permission: "dashboard",
      },
      {
        method: "GET",
        path: "/api/public/dashboard/user-ranks",
        description: "获取用户下单排行。",
        permission: "dashboard",
        params: [
          {
            name: "period",
            type: "string",
            required: false,
            description: "week 或 month，默认 week",
          },
        ],
      },
      {
        method: "GET",
        path: "/api/public/dashboard/rider-ranks",
        description: "获取骑手排行。",
        permission: "dashboard",
        params: [
          {
            name: "period",
            type: "string",
            required: false,
            description: "day、week 或 month，默认 week",
          },
        ],
      },
    ],
  },
  {
    title: "订单数据",
    endpoints: [
      {
        method: "GET",
        path: "/api/public/orders",
        description: "获取订单列表，支持分页、搜索和状态筛选。",
        permission: "orders",
        params: [
          {
            name: "page",
            type: "number",
            required: false,
            description: "页码，默认 1",
          },
          {
            name: "limit",
            type: "number",
            required: false,
            description: "每页数量，默认 15，最大 100",
          },
          {
            name: "search",
            type: "string",
            required: false,
            description: "搜索关键词",
          },
          {
            name: "status",
            type: "string",
            required: false,
            description: "订单状态筛选",
          },
        ],
      },
      {
        method: "GET",
        path: "/api/public/orders/:id",
        description: "获取单个订单详情。",
        permission: "orders",
      },
      {
        method: "GET",
        path: "/api/public/orders/stats",
        description: "获取订单统计数据。",
        permission: "orders",
      },
    ],
  },
  {
    title: "用户数据",
    endpoints: [
      {
        method: "GET",
        path: "/api/public/users",
        description: "获取用户列表，支持分页和搜索。",
        permission: "users",
        params: [
          {
            name: "page",
            type: "number",
            required: false,
            description: "页码，默认 1",
          },
          {
            name: "limit",
            type: "number",
            required: false,
            description: "每页数量，默认 20",
          },
          {
            name: "search",
            type: "string",
            required: false,
            description: "搜索关键词",
          },
        ],
      },
      {
        method: "GET",
        path: "/api/public/users/:id",
        description: "获取单个用户详情。",
        permission: "users",
      },
      {
        method: "GET",
        path: "/api/public/users/stats",
        description: "获取用户统计数据。",
        permission: "users",
      },
    ],
  },
  {
    title: "骑手数据",
    endpoints: [
      {
        method: "GET",
        path: "/api/public/riders",
        description: "获取骑手列表，支持分页和搜索。",
        permission: "riders",
        params: [
          {
            name: "page",
            type: "number",
            required: false,
            description: "页码，默认 1",
          },
          {
            name: "limit",
            type: "number",
            required: false,
            description: "每页数量，默认 15",
          },
          {
            name: "search",
            type: "string",
            required: false,
            description: "搜索关键词",
          },
        ],
      },
      {
        method: "GET",
        path: "/api/public/riders/:id",
        description: "获取单个骑手详情。",
        permission: "riders",
      },
      {
        method: "GET",
        path: "/api/public/riders/stats",
        description: "获取骑手统计数据。",
        permission: "riders",
      },
    ],
  },
]);

export const API_DOCUMENTATION_ERROR_CODES = freezeRecords([
  { code: "200", message: "请求成功", action: "正常处理返回数据" },
  {
    code: "400",
    message: "请求参数错误",
    action: "检查 resource、action 和 params",
  },
  {
    code: "401",
    message: "未提供 API Key 或 Key 无效",
    action: "确认请求头里的 X-API-Key",
  },
  {
    code: "403",
    message: "Key 没有访问该资源的权限",
    action: "去 API 权限管理中补齐权限",
  },
  {
    code: "500",
    message: "服务端内部错误",
    action: "查看后台日志并联系技术支持",
  },
]);

export const API_DOCUMENTATION_NOTES = Object.freeze([
  "API Key 需要先在后台启用后才能生效。",
  "建议一套调用方对应一个 API Key，方便追踪和停用。",
  "建议优先使用 HTTPS，避免在公网明文传输 Key。",
  "分页接口建议将 limit 控制在 100 以内。",
  "接口文档页负责说明怎么调，Key 与权限分配应在权限管理页维护。",
]);

const API_KEY_RESOURCE_META = Object.freeze({
  orders: Object.freeze({
    label: "orders（订单）",
    exampleTitle: "获取订单列表",
    action: "list",
    params: Object.freeze({ page: 1, limit: 20 }),
    detailAction: "get",
    detailParams: Object.freeze({ id: 123 }),
  }),
  users: Object.freeze({
    label: "users（用户）",
    exampleTitle: "获取用户列表",
    action: "list",
    params: Object.freeze({ page: 1, limit: 20 }),
    detailAction: "get",
    detailParams: Object.freeze({ id: 123 }),
  }),
  riders: Object.freeze({
    label: "riders（骑手）",
    exampleTitle: "获取骑手列表",
    action: "list",
    params: Object.freeze({ page: 1, limit: 20 }),
    detailAction: "get",
    detailParams: Object.freeze({ id: 123 }),
  }),
  merchants: Object.freeze({
    label: "merchants（商户）",
    exampleTitle: "获取商户列表",
    action: "list",
    params: Object.freeze({ page: 1, limit: 20 }),
  }),
  products: Object.freeze({
    label: "products（商品）",
    exampleTitle: "获取商品列表",
    action: "list",
    params: Object.freeze({ page: 1, limit: 20 }),
  }),
  categories: Object.freeze({
    label: "categories（分类）",
    exampleTitle: "获取分类列表",
    action: "list",
    params: Object.freeze({ page: 1, limit: 20 }),
  }),
  dashboard: Object.freeze({
    label: "dashboard（仪表盘）",
    exampleTitle: "获取仪表盘统计",
    action: "stats",
    params: Object.freeze({}),
  }),
});

const API_KEY_RESOURCE_ORDER = Object.freeze([
  ...PUBLIC_API_RESOURCE_PERMISSIONS,
]);

function buildApiQueryRequestPayload(resource, action, params, apiKey = "") {
  return {
    api_key: apiKey,
    resource,
    action,
    params,
  };
}

function buildApiQueryRequestBody(resource, action, params, apiKey = "") {
  return JSON.stringify(
    buildApiQueryRequestPayload(resource, action, params, apiKey),
    null,
    2,
  );
}

function buildCurlCommand(apiBaseUrl, apiKey, body) {
  return `curl -X POST "${apiBaseUrl}/api/v1/query" \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: ${apiKey}" \\
  -d '${body}'`;
}

function buildJavascriptExample(apiBaseUrl, apiKey, payload) {
  return `fetch('${apiBaseUrl}/api/v1/query', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': '${apiKey}'
  },
  body: JSON.stringify(${JSON.stringify(payload, null, 2)})
})
  .then((response) => response.json())
  .then((result) => {
    if (result.success) {
      console.log('数据:', result.data);
      return;
    }
    console.error('错误:', result.error);
  })
  .catch((error) => {
    console.error('请求失败:', error);
  });`;
}

function buildPythonExample(apiBaseUrl, apiKey, payload) {
  return `import requests

base_url = "${apiBaseUrl}"
headers = {
    "Content-Type": "application/json",
    "X-API-Key": "${apiKey}"
}
payload = ${JSON.stringify(payload, null, 4)}

response = requests.post(f"{base_url}/api/v1/query", json=payload, headers=headers, timeout=10)
result = response.json()

if result.get("success"):
    print("数据:", result.get("data"))
else:
    print("错误:", result.get("error"))`;
}

function safeParsePermissions(value) {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeTrimmedText(item)).filter(Boolean);
  }

  if (typeof value !== "string") {
    return [];
  }

  const text = value.trim();
  if (!text) {
    return [];
  }

  try {
    const parsed = JSON.parse(text);
    return Array.isArray(parsed)
      ? parsed.map((item) => normalizeTrimmedText(item)).filter(Boolean)
      : [];
  } catch (_error) {
    return text
      .split(",")
      .map((item) => normalizeTrimmedText(item))
      .filter(Boolean);
  }
}

export function buildApiDocumentationQuickStartCurl(
  apiBaseUrl = API_DOCUMENTATION_DEFAULT_BASE_URL,
) {
  const baseUrl = normalizeBaseUrl(apiBaseUrl);
  return `curl -X POST "${baseUrl}/api/v1/query" \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: your_api_key_here" \\
  -d '{
    "resource": "orders",
    "action": "list",
    "params": {
      "page": 1,
      "limit": 20
    }
  }'`;
}

export function buildApiDocumentationRequestExamples(
  apiBaseUrl = API_DOCUMENTATION_DEFAULT_BASE_URL,
) {
  const baseUrl = normalizeBaseUrl(apiBaseUrl);
  const listPayload = buildApiQueryRequestPayload("orders", "list", {
    page: 1,
    limit: 20,
  });

  return [
    {
      id: "javascript",
      lang: "javascript",
      code: buildJavascriptExample(baseUrl, "your_api_key_here", listPayload),
    },
    {
      id: "python",
      lang: "python",
      code: buildPythonExample(baseUrl, "your_api_key_here", listPayload),
    },
    {
      id: "java",
      lang: "java",
      code: `OkHttpClient client = new OkHttpClient();
String json = "{\\"resource\\":\\"orders\\",\\"action\\":\\"list\\",\\"params\\":{\\"page\\":1,\\"limit\\":20}}";

Request request = new Request.Builder()
    .url("${baseUrl}/api/v1/query")
    .post(RequestBody.create(json, MediaType.parse("application/json")))
    .addHeader("Content-Type", "application/json")
    .addHeader("X-API-Key", "your_api_key_here")
    .build();`,
    },
  ];
}

export function buildApiDocumentationMarkdown(options = {}) {
  const source =
    typeof options === "string" ? { apiBaseUrl: options } : options || {};
  const apiBaseUrl = normalizeBaseUrl(source.apiBaseUrl);
  const generatedAtText = resolveGeneratedAtText(source.generatedAtText);
  const lines = [
    "# API 开发文档",
    "",
    `当前部署地址：${apiBaseUrl}`,
    "",
    "## 认证方式",
    "",
    `- 请求头：\`${API_DOCUMENTATION_AUTH_HEADER_EXAMPLE}\``,
    "",
    "## 权限模型",
    ...API_DOCUMENTATION_PERMISSION_ROWS.map(
      (item) => `- \`${item.key}\`：${item.description}，${item.scope}`,
    ),
    "",
    "## 公开接口",
    ...API_DOCUMENTATION_ENDPOINT_GROUPS.flatMap((group) => [
      "",
      `### ${group.title}`,
      ...group.endpoints.map(
        (endpoint) =>
          `- [${endpoint.method}] ${endpoint.path} (${endpoint.permission}) ${endpoint.description}`,
      ),
    ]),
    "",
    "## 注意事项",
    ...API_DOCUMENTATION_NOTES.map((item) => `- ${item}`),
    "",
    `生成时间：${generatedAtText}`,
  ];

  return lines.join("\n");
}

export function buildApiDocumentationText() {
  return `# 悦享e食平台 - 统一API接口文档

## 📋 接口信息

- **接口地址**: \`POST /api/v1/query\` (相对路径，适用于任何部署域名)
- **完整地址示例**: \`POST 域名/api/v1/query\` (将"域名"替换为实际部署的域名)
- **请求方式**: POST
- **协议**: HTTP/HTTPS
- **数据格式**: JSON
- **认证方式**: API Key

> **💡 重要提示**: 接口地址使用相对路径 \`/api/v1/query\`，无论部署到哪个域名（如 \`https://your-domain.com\` 或 \`https://your-domain.com\`），都可以直接使用相对路径访问，系统会自动使用当前部署的域名。

## 🔐 认证方式

API Key可以通过以下三种方式提供（按优先级排序）：

### 方式一：请求头（推荐）

在HTTP请求头中提供API Key，这是最推荐的方式：

\`\`\`
X-API-Key: your_api_key_here
\`\`\`

> **注意**: 请求头中的键名不区分大小写，\`X-API-Key\` 和 \`x-api-key\` 都可以。**

### 方式二：请求体

在请求体的JSON中提供API Key：

\`\`\`json
{
  "api_key": "your_api_key_here",
  "resource": "orders",
  "action": "list",
  "params": {}
}
\`\`\`

### 方式三：查询参数

在URL查询参数中提供API Key（不推荐，安全性较低）：

\`\`\`
POST /api/v1/query?api_key=your_api_key_here
\`\`\`

## 📥 请求参数

### 基本参数

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| resource | string | 是 | 资源类型，见下方支持的资源类型列表 |
| action | string | 否 | 操作类型：\`list\`（列表，默认）、\`get\`（单个） |
| params | object | 否 | 查询参数，见下方说明 |
| api_key | string | 否* | API Key（如果未在请求头中提供，则必填） |

### 支持的资源类型

| 资源类型 | 说明 | 权限标识 |
|---------|------|---------|
| \`users\` | 用户数据 | \`users\` |
| \`riders\` | 骑手数据 | \`riders\` |
| \`orders\` | 订单数据 | \`orders\` |
| \`merchants\` | 商户数据 | \`merchants\` |
| \`products\` | 商品数据 | \`products\` |
| \`categories\` | 分类数据 | \`categories\` |

### params 参数说明

#### 列表查询（action: list 或未指定）

| 参数名 | 类型 | 必填 | 说明 | 适用资源 |
|--------|------|------|------|---------|
| page | number | 否 | 页码，默认 \`1\` | 所有资源 |
| limit | number | 否 | 每页数量，默认 \`20\`，最多 \`100\` | 所有资源 |
| search | string | 否 | 搜索关键词，支持模糊匹配 | 所有资源 |
| status | string | 否 | 状态筛选 | \`orders\` |
| type | string | 否 | 类型筛选 | \`users\` |

#### 单个查询（action: get）

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| id | number | 是 | 资源ID |

## 📤 响应格式

### 成功响应

#### 列表查询响应

\`\`\`json
{
  "success": true,
  "data": {
    "items": [...],
    "total": 100,
    "page": 1,
    "limit": 20,
    "totalPages": 5
  },
  "resource": "orders",
  "action": "list"
}
\`\`\`

#### 单个查询响应

\`\`\`json
{
  "success": true,
  "data": {
    "id": 123,
    "daily_order_id": "20240101001",
    "status": "pending",
    ...
  },
  "resource": "orders",
  "action": "get"
}
\`\`\`

> **注意**: 如果查询的资源不存在，\`data\` 字段为 \`null\`。

### 错误响应

\`\`\`json
{
  "success": false,
  "error": "错误信息描述"
}
\`\`\`

## 📚 资源类型详细说明

### users（用户）

**返回字段**:
- \`id\`: 用户ID
- \`phone\`: 手机号
- \`name\`: 姓名
- \`type\`: 用户类型（customer/merchant/rider等）
- \`created_at\`: 创建时间

**支持的查询参数**:
- \`search\`: 搜索姓名或手机号
- \`type\`: 按用户类型筛选

### riders（骑手）

**返回字段**:
- \`id\`: 骑手ID
- \`user_id\`: 关联用户ID
- \`name\`: 姓名（来自关联用户）
- \`phone\`: 手机号（来自关联用户）
- 其他骑手相关字段...

**支持的查询参数**:
- \`search\`: 搜索姓名或手机号

### orders（订单）

**返回字段**:
- \`id\`: 订单ID
- \`daily_order_id\`: 每日订单编号
- \`user_id\`: 用户ID
- \`customer_name\`: 客户姓名
- \`customer_phone\`: 客户手机号
- \`rider_id\`: 骑手ID
- \`rider_name\`: 骑手姓名
- \`rider_phone\`: 骑手手机号
- \`status\`: 订单状态
- \`created_at\`: 创建时间
- 其他订单相关字段...

**支持的查询参数**:
- \`search\`: 搜索订单号、客户姓名或骑手姓名
- \`status\`: 按订单状态筛选

### merchants（商户）

**返回字段**:
- \`id\`: 商户ID
- \`phone\`: 手机号
- \`name\`: 商户名称
- \`type\`: 类型（固定为 "merchant"）
- \`created_at\`: 创建时间

**支持的查询参数**:
- \`search\`: 搜索商户名称或手机号

### products（商品）

**返回字段**:
- \`id\`: 商品ID
- \`name\`: 商品名称
- \`description\`: 商品描述
- \`price\`: 价格
- \`created_at\`: 创建时间
- 其他商品相关字段...

**支持的查询参数**:
- \`search\`: 搜索商品名称或描述

> **注意**: 如果商品表不存在，将返回空列表或null，不会报错。

### categories（分类）

**返回字段**:
- \`id\`: 分类ID
- \`name\`: 分类名称
- \`description\`: 分类描述
- \`created_at\`: 创建时间
- 其他分类相关字段...

**支持的查询参数**:
- \`search\`: 搜索分类名称或描述

> **注意**: 如果分类表不存在，将返回空列表或null，不会报错。

## 💻 请求示例

### 示例1：获取订单列表（带筛选）

\`\`\`bash
curl -X POST "/api/v1/query" \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: your_api_key_here" \\
  -d '{
    "resource": "orders",
    "action": "list",
    "params": {
      "page": 1,
      "limit": 20,
      "search": "订单号",
      "status": "pending"
    }
  }'
\`\`\`

### 示例2：获取单个订单

\`\`\`bash
curl -X POST "/api/v1/query" \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: your_api_key_here" \\
  -d '{
    "resource": "orders",
    "action": "get",
    "params": {
      "id": 123
    }
  }'
\`\`\`

### 示例3：获取用户列表（按类型筛选）

\`\`\`bash
curl -X POST "/api/v1/query" \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: your_api_key_here" \\
  -d '{
    "resource": "users",
    "action": "list",
    "params": {
      "page": 1,
      "limit": 20,
      "search": "张三",
      "type": "customer"
    }
  }'
\`\`\`

### 示例4：获取商品列表

\`\`\`bash
curl -X POST "/api/v1/query" \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: your_api_key_here" \\
  -d '{
    "resource": "products",
    "action": "list",
    "params": {
      "page": 1,
      "limit": 50,
      "search": "美食"
    }
  }'
\`\`\`

### 示例5：JavaScript (fetch)

\`\`\`javascript
async function fetchOrders(apiKey, page = 1, limit = 20) {
  try {
    const response = await fetch('/api/v1/query', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey
      },
      body: JSON.stringify({
        resource: 'orders',
        action: 'list',
        params: {
          page: page,
          limit: limit,
          status: 'pending'
        }
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      console.log('订单列表:', data.data.items);
      console.log('总数:', data.data.total);
      return data.data;
    } else {
      console.error('错误:', data.error);
      throw new Error(data.error);
    }
  } catch (error) {
    console.error('请求失败:', error);
    throw error;
  }
}

fetchOrders('your_api_key_here', 1, 20);
\`\`\`

### 示例6：Python (requests)

\`\`\`python

def query_api(api_key, resource, action='list', params=None):
    """
    查询API的统一方法
    
    Args:
        api_key: API密钥
        resource: 资源类型 (users/riders/orders/merchants/products/categories)
        action: 操作类型 (list/get)
        params: 查询参数字典
    
    Returns:
        查询结果
    """
    base_url = "https://your-domain.com"
    url = f"{base_url}/api/v1/query"
    
    headers = {
        "Content-Type": "application/json",
        "X-API-Key": api_key
    }
    
    data = {
        "resource": resource,
        "action": action,
        "params": params or {}
    }
    
    response = requests.post(url, json=data, headers=headers)
    result = response.json()
    
    if result.get('success'):
        return result.get('data')
    else:
        raise Exception(result.get('error', '未知错误'))

api_key = "your_api_key_here"

orders = query_api(api_key, 'orders', 'list', {
    'page': 1,
    'limit': 20,
    'status': 'pending'
})
print(f"找到 {orders['total']} 条订单")

order = query_api(api_key, 'orders', 'get', {'id': 123})
print(f"订单详情: {order}")
\`\`\`

### 示例7：使用请求体提供API Key

\`\`\`bash
curl -X POST "/api/v1/query" \\
  -H "Content-Type: application/json" \\
  -d '{
    "api_key": "your_api_key_here",
    "resource": "orders",
    "action": "list",
    "params": {
      "page": 1,
      "limit": 20
    }
  }'
\`\`\`

## 🔑 权限说明

每个API Key可以配置不同的访问权限，权限与资源类型一一对应：

| 权限标识 | 说明 | 可访问的资源 |
|---------|------|------------|
| \`orders\` | 订单数据访问权限 | \`orders\` |
| \`users\` | 用户数据访问权限 | \`users\` |
| \`riders\` | 骑手数据访问权限 | \`riders\` |
| \`merchants\` | 商户数据访问权限 | \`merchants\` |
| \`products\` | 商品数据访问权限 | \`products\` |
| \`categories\` | 分类数据访问权限 | \`categories\` |
| \`all\` | 全部数据访问权限 | 所有资源类型 |

**权限规则**:
- 如果API Key配置了 \`all\` 权限，可以访问所有资源类型
- 如果API Key只配置了特定权限（如 \`orders\`），只能访问对应的资源类型
- 如果API Key没有某个资源的访问权限，请求该资源时会返回 \`403\` 错误

**示例**:
- API Key配置了 \`["orders", "users"]\` → 只能访问订单和用户数据
- API Key配置了 \`["all"]\` → 可以访问所有资源类型

## ⚠️ 错误码说明

| HTTP状态码 | 说明 | 响应示例 |
|-----------|------|---------|
| \`200\` | 请求成功 | \`{"success": true, "data": {...}}\` |
| \`400\` | 请求参数错误 | \`{"success": false, "error": "缺少resource参数..."}\` |
| \`401\` | 未提供API Key或API Key无效/已禁用 | \`{"success": false, "error": "缺少API Key..."}\` |
| \`403\` | API Key没有访问该资源的权限 | \`{"success": false, "error": "您的API Key没有访问 orders 资源的权限"}\` |
| \`500\` | 服务器内部错误 | \`{"success": false, "error": "服务器内部错误"}\` |

### 常见错误及解决方案

1. **401 - 缺少API Key**
   - 检查是否在请求头中提供了 \`X-API-Key\` 或在请求体中提供了 \`api_key\`
   - 确保API Key格式正确，没有多余的空格

2. **401 - 无效的API Key或API已被禁用**
   - 检查API Key是否正确
   - 在管理后台确认API Key是否已启用（\`is_active = 1\`）

3. **403 - 没有访问权限**
   - 在管理后台检查API Key的权限配置
   - 确认请求的资源类型是否在权限列表中

4. **400 - 请求参数错误**
   - 检查 \`resource\` 参数是否正确（必须是支持的资源类型之一）
   - 检查 \`params\` 中的参数是否符合要求（如 \`id\` 必须是数字）

## 📝 注意事项

1. **API Key管理**
   - API Key需要先在管理后台配置并启用
   - 每个API Key的权限是独立的，需要根据实际需求配置
   - 建议定期更换API Key以保证安全

2. **安全性**
   - 建议使用HTTPS协议以保证数据传输安全
   - 不要在客户端代码中硬编码API Key，建议使用环境变量或配置文件
   - 不要将API Key提交到版本控制系统（如Git）

3. **性能优化**
   - 请求频率建议控制在合理范围内，避免对服务器造成压力
   - 使用分页查询时，建议 \`limit\` 不要设置过大（最大100）
   - 对于大量数据查询，建议使用分页逐步获取

4. **数据查询**
   - 单个查询时，如果资源不存在，\`data\` 字段为 \`null\`，不会报错
   - 列表查询时，如果表不存在（如products、categories），会返回空列表
   - 搜索功能支持模糊匹配，会自动在相关字段中搜索

5. **最佳实践**
   - 优先使用请求头方式提供API Key（更安全）
   - 使用相对路径 \`/api/v1/query\` 以便适配不同部署环境
   - 在代码中实现错误处理和重试机制
   - 对API响应进行适当的缓存（注意数据时效性）

## 🔗 相关资源

- API Key管理：在管理后台的"设置" → "API管理"中配置
- 完整API文档：查看管理后台的"API文档"页面获取更多详细信息
`;
}

export function buildApiKeyMarkdownText(
  api,
  getPermissionLabel = getPublicApiPermissionLabel,
  options = {},
) {
  const permissions = safeParsePermissions(api?.permissions);
  const hasAllPermission = permissions.includes("all");
  const allowedResources = hasAllPermission
    ? API_KEY_RESOURCE_ORDER
    : API_KEY_RESOURCE_ORDER.filter((permission) =>
        permissions.includes(permission),
      );
  const visiblePermissions = hasAllPermission
    ? ["all"]
    : permissions.filter((permission) => permission !== "all");
  const primaryResource = allowedResources[0] || "orders";
  const primaryMeta = API_KEY_RESOURCE_META[primaryResource];
  const apiKey = normalizeTrimmedText(api?.api_key);
  const mainPath = normalizeTrimmedText(api?.path, "未填写");
  const description = normalizeTrimmedText(api?.description);
  const generatedAt = resolveGeneratedAtText(options.generatedAtText);
  const listPayload = buildApiQueryRequestPayload(
    primaryResource,
    primaryMeta.action,
    primaryMeta.params,
    apiKey,
  );
  const listBody = JSON.stringify(listPayload, null, 2);
  const detailBody = primaryMeta.detailAction
    ? buildApiQueryRequestBody(
        primaryResource,
        primaryMeta.detailAction,
        primaryMeta.detailParams,
        apiKey,
      )
    : "";

  return `# ${api?.name || "API Key"} - 访问说明

## 配置信息

- **调用方名称**: ${api?.name || "未命名"}
- **主要 API URL / 路径**: ${mainPath}
- **API Key**: \`${apiKey}\`
- **状态**: ${api?.is_active ? "已启用" : "已禁用"}
${description ? `- **用途说明**: ${description}` : ""}

## 调用入口

- **统一查询接口**: \`POST /api/v1/query\`
- **完整地址示例**: \`POST https://your-domain.com/api/v1/query\`
- **当前登记的主要 API URL / 路径**: \`${mainPath}\`

## 认证方式

推荐在请求头中传入 API Key：

\`\`\`
X-API-Key: ${apiKey}
\`\`\`

也可以在请求体中同时带上 \`api_key\` 字段，便于部分集成方做转发校验。

## 权限范围

${
  visiblePermissions.length > 0
    ? visiblePermissions
        .map((permission) => `- **${getPermissionLabel(permission)}**`)
        .join("\n")
    : "- 当前未配置权限"
}

${hasAllPermission ? "\n> 此 API Key 拥有全部资源访问权限。" : ""}

## 可访问资源

${
  allowedResources.length > 0
    ? allowedResources
        .map((resource) => `- **${API_KEY_RESOURCE_META[resource].label}**`)
        .join("\n")
    : "- 当前没有可访问资源，请先在 API 权限管理页分配权限"
}

## 请求示例

以下示例基于当前权限中可访问的资源 **${primaryMeta.label}** 生成。

### 示例 1：${primaryMeta.exampleTitle}

\`\`\`bash
${buildCurlCommand("https://your-domain.com", apiKey, listBody)}
\`\`\`

${
  primaryMeta.detailAction
    ? `### 示例 2：获取单条资源详情

\`\`\`bash
${buildCurlCommand("https://your-domain.com", apiKey, detailBody)}
\`\`\`

`
    : ""
}### 示例 3：JavaScript（fetch）

\`\`\`javascript
${buildJavascriptExample("https://your-domain.com", apiKey, listPayload)}
\`\`\`

### 示例 4：Python（requests）

\`\`\`python
${buildPythonExample("https://your-domain.com", apiKey, listPayload)}
\`\`\`

## 响应格式

### 成功响应

\`\`\`json
{
  "success": true,
  "data": {},
  "resource": "${primaryResource}",
  "action": "${primaryMeta.action}"
}
\`\`\`

### 错误响应

\`\`\`json
{
  "success": false,
  "error": "错误信息描述"
}
\`\`\`

## 错误码说明

| HTTP状态码 | 说明 |
|-----------|------|
| \`200\` | 请求成功 |
| \`400\` | 请求参数错误 |
| \`401\` | 未提供 API Key，或 API Key 无效 / 已禁用 |
| \`403\` | API Key 没有访问该资源的权限 |
| \`500\` | 服务器内部错误 |

## 使用建议

1. 请按调用方分配独立 API Key，不要多个系统共用同一个 Key。
2. 请优先使用 HTTPS，并将 API Key 保存在服务端，不要硬编码到客户端代码中。
3. 如需新增资源访问范围，请前往管理后台的“API 权限管理”页面调整权限。

## 相关入口

- **完整 API 文档**: 管理后台 -> API 文档
- **Key / 权限维护**: 管理后台 -> API 权限管理

---
**生成时间**: ${generatedAt}
**API Key 状态**: ${api?.is_active ? "已启用" : "已禁用"}
`;
}
