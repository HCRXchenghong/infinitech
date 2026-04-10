const RESOURCE_META = {
  orders: {
    label: 'orders（订单）',
    exampleTitle: '获取订单列表',
    action: 'list',
    params: { page: 1, limit: 20 },
    detailAction: 'get',
    detailParams: { id: 123 },
  },
  users: {
    label: 'users（用户）',
    exampleTitle: '获取用户列表',
    action: 'list',
    params: { page: 1, limit: 20 },
    detailAction: 'get',
    detailParams: { id: 123 },
  },
  riders: {
    label: 'riders（骑手）',
    exampleTitle: '获取骑手列表',
    action: 'list',
    params: { page: 1, limit: 20 },
    detailAction: 'get',
    detailParams: { id: 123 },
  },
  merchants: {
    label: 'merchants（商户）',
    exampleTitle: '获取商户列表',
    action: 'list',
    params: { page: 1, limit: 20 },
  },
  products: {
    label: 'products（商品）',
    exampleTitle: '获取商品列表',
    action: 'list',
    params: { page: 1, limit: 20 },
  },
  categories: {
    label: 'categories（分类）',
    exampleTitle: '获取分类列表',
    action: 'list',
    params: { page: 1, limit: 20 },
  },
  dashboard: {
    label: 'dashboard（仪表盘）',
    exampleTitle: '获取仪表盘统计',
    action: 'stats',
    params: {},
  },
};

const RESOURCE_ORDER = Object.keys(RESOURCE_META);

function safeParsePermissions(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || '').trim()).filter(Boolean);
  }

  if (typeof value !== 'string') {
    return [];
  }

  const text = value.trim();
  if (!text) {
    return [];
  }

  try {
    const parsed = JSON.parse(text);
    return Array.isArray(parsed)
      ? parsed.map((item) => String(item || '').trim()).filter(Boolean)
      : [];
  } catch (_error) {
    return text.split(',').map((item) => item.trim()).filter(Boolean);
  }
}

function buildRequestBody(resource, action, params, apiKey = '') {
  return JSON.stringify({
    api_key: apiKey,
    resource,
    action,
    params,
  }, null, 2);
}

function buildCurlCommand(apiKey, body) {
  return `curl -X POST "https://your-domain.com/api/v1/query" \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: ${apiKey}" \\
  -d '${body}'`;
}

function buildJavascriptExample(apiKey, body) {
  return `fetch('/api/v1/query', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': '${apiKey}'
  },
  body: JSON.stringify(${body})
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

function buildPythonExample(apiKey, body) {
  return `import requests

url = "https://your-domain.com/api/v1/query"
headers = {
    "Content-Type": "application/json",
    "X-API-Key": "${apiKey}"
}
payload = ${body}

response = requests.post(url, json=payload, headers=headers, timeout=10)
result = response.json()

if result.get("success"):
    print("数据:", result.get("data"))
else:
    print("错误:", result.get("error"))`;
}

export function buildApiKeyMarkdownText(api, getPermissionLabel) {
  const permissions = safeParsePermissions(api?.permissions);
  const hasAllPermission = permissions.includes('all');
  const allowedResources = hasAllPermission
    ? RESOURCE_ORDER
    : RESOURCE_ORDER.filter((permission) => permissions.includes(permission));
  const visiblePermissions = hasAllPermission ? ['all'] : permissions.filter((permission) => permission !== 'all');
  const primaryResource = allowedResources[0] || 'orders';
  const primaryMeta = RESOURCE_META[primaryResource];
  const listBody = buildRequestBody(primaryResource, primaryMeta.action, primaryMeta.params, api?.api_key || '');
  const detailBody = primaryMeta.detailAction
    ? buildRequestBody(primaryResource, primaryMeta.detailAction, primaryMeta.detailParams, api?.api_key || '')
    : '';
  const mainPath = String(api?.path || '').trim() || '未填写';
  const description = String(api?.description || '').trim();
  const generatedAt = new Date().toLocaleString('zh-CN', { hour12: false });

  return `# ${api?.name || 'API Key'} - 访问说明

## 配置信息

- **调用方名称**: ${api?.name || '未命名'}
- **主要 API URL / 路径**: ${mainPath}
- **API Key**: \`${api?.api_key || ''}\`
- **状态**: ${api?.is_active ? '已启用' : '已禁用'}
${description ? `- **用途说明**: ${description}` : ''}

## 调用入口

- **统一查询接口**: \`POST /api/v1/query\`
- **完整地址示例**: \`POST https://your-domain.com/api/v1/query\`
- **当前登记的主要 API URL / 路径**: \`${mainPath}\`

## 认证方式

推荐在请求头中传入 API Key：

\`\`\`
X-API-Key: ${api?.api_key || ''}
\`\`\`

也可以在请求体中同时带上 \`api_key\` 字段，便于部分集成方做转发校验。

## 权限范围

${visiblePermissions.length > 0 ? visiblePermissions.map((permission) => `- **${getPermissionLabel(permission)}**`).join('\n') : '- 当前未配置权限'}

${hasAllPermission ? '\n> 此 API Key 拥有全部资源访问权限。' : ''}

## 可访问资源

${allowedResources.length > 0
  ? allowedResources.map((resource) => `- **${RESOURCE_META[resource].label}**`).join('\n')
  : '- 当前没有可访问资源，请先在 API 权限管理页分配权限'}

## 请求示例

以下示例基于当前权限中可访问的资源 **${primaryMeta.label}** 生成。

### 示例 1：${primaryMeta.exampleTitle}

\`\`\`bash
${buildCurlCommand(api?.api_key || '', listBody)}
\`\`\`

${primaryMeta.detailAction ? `### 示例 2：获取单条资源详情

\`\`\`bash
${buildCurlCommand(api?.api_key || '', detailBody)}
\`\`\`

` : ''}### 示例 3：JavaScript（fetch）

\`\`\`javascript
${buildJavascriptExample(api?.api_key || '', listBody)}
\`\`\`

### 示例 4：Python（requests）

\`\`\`python
${buildPythonExample(api?.api_key || '', listBody)}
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
**API Key 状态**: ${api?.is_active ? '已启用' : '已禁用'}
`;
}
