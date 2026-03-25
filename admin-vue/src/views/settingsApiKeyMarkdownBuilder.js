export function buildApiKeyMarkdownText(api, getPermissionLabel) {
  // 解析权限列表
  const permissions = typeof api.permissions === 'string' 
    ? JSON.parse(api.permissions || '[]') 
    : (api.permissions || []);
  const hasAllPermission = permissions.includes('all');
  
  // 生成可用资源列表
  const availableResources = [];
  if (hasAllPermission || permissions.includes('orders')) availableResources.push('orders（订单）');
  if (hasAllPermission || permissions.includes('users')) availableResources.push('users（用户）');
  if (hasAllPermission || permissions.includes('riders')) availableResources.push('riders（骑手）');
  if (hasAllPermission || permissions.includes('merchants')) availableResources.push('merchants（商户）');
  if (hasAllPermission || permissions.includes('products')) availableResources.push('products（商品）');
  if (hasAllPermission || permissions.includes('categories')) availableResources.push('categories（分类）');
  
  return `# ${api.name} - API Key配置文档

## 📋 配置信息

- **配置名称**: ${api.name}
- **配置说明**: ${api.path || '无说明'}
- **API Key**: \`${api.api_key}\`
- **状态**: ${api.is_active ? '✅ 已启用' : '❌ 已禁用'}
${api.description ? `- **接口描述**: ${api.description}` : ''}

## 🔗 统一API接口地址

**相对路径**（推荐，适用于任何部署域名）：
\`\`\`
POST /api/v1/query
\`\`\`

**完整地址示例**：
\`\`\`
POST https://your-domain.com/api/v1/query
\`\`\`

> **💡 提示**: 使用相对路径 \`/api/v1/query\` 可以确保无论部署到哪个域名都能正常工作。将 \`your-domain.com\` 替换为实际部署的域名即可。

## 🔐 认证方式

### 方式一：请求头（推荐）

在HTTP请求头中提供API Key：

\`\`\`
X-API-Key: ${api.api_key}
\`\`\`

### 方式二：请求体

在请求体的JSON中提供API Key：

\`\`\`json
{
  "api_key": "${api.api_key}",
  "resource": "orders",
  "action": "list",
  "params": {}
}
\`\`\`

## 🔑 访问权限

当前API Key配置的权限：

${permissions.length > 0 ? permissions.map(p => `- **${getPermissionLabel(p)}**`).join('\n') : '- 无权限配置'}

${hasAllPermission ? '\n> **注意**: 此API Key拥有全部权限，可以访问所有资源类型。' : ''}

## 📚 可用资源类型

根据您的权限配置，可以访问以下资源：

${availableResources.length > 0 
  ? availableResources.map(r => `- **${r}**`).join('\n')
  : '- 无可用资源（请检查权限配置）'}

## 💻 请求示例

### 示例1：获取订单列表

\`\`\`bash
curl -X POST "/api/v1/query" \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: ${api.api_key}" \\
  -d '{
    "resource": "orders",
    "action": "list",
    "params": {
      "page": 1,
      "limit": 20
    }
  }'
\`\`\`

### 示例2：获取单个订单

\`\`\`bash
curl -X POST "/api/v1/query" \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: ${api.api_key}" \\
  -d '{
    "resource": "orders",
    "action": "get",
    "params": {
      "id": 123
    }
  }'
\`\`\`

### 示例3：JavaScript (fetch)

\`\`\`javascript
fetch('/api/v1/query', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': '${api.api_key}'
  },
  body: JSON.stringify({
    resource: 'orders',
    action: 'list',
    params: {
      page: 1,
      limit: 20
    }
  })
})
.then(response => response.json())
.then(data => {
  if (data.success) {
    console.log('数据:', data.data);
  } else {
    console.error('错误:', data.error);
  }
})
.catch(error => {
  console.error('请求失败:', error);
});
\`\`\`

### 示例4：Python (requests)

\`\`\`python

url = "https://your-domain.com/api/v1/query"  # 替换为实际域名
headers = {
    "Content-Type": "application/json",
    "X-API-Key": "${api.api_key}"
}
data = {
    "resource": "orders",
    "action": "list",
    "params": {
        "page": 1,
        "limit": 20
    }
}

response = requests.post(url, json=data, headers=headers)
result = response.json()

if result.get('success'):
    print('数据:', result.get('data'))
else:
    print('错误:', result.get('error'))
\`\`\`

## 📤 响应格式

### 成功响应（列表查询）

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

### 成功响应（单个查询）

\`\`\`json
{
  "success": true,
  "data": {
    "id": 123,
    ...
  },
  "resource": "orders",
  "action": "get"
}
\`\`\`

### 错误响应

\`\`\`json
{
  "success": false,
  "error": "错误信息描述"
}
\`\`\`

## ⚠️ 错误码说明

| HTTP状态码 | 说明 |
|-----------|------|
| \`200\` | 请求成功 |
| \`400\` | 请求参数错误 |
| \`401\` | 未提供API Key或API Key无效/已禁用 |
| \`403\` | API Key没有访问该资源的权限 |
| \`500\` | 服务器内部错误 |

## 📝 注意事项

1. **API Key安全**
   - 请妥善保管此API Key，不要泄露给他人
   - 建议使用HTTPS协议以保证数据传输安全
   - 不要在客户端代码中硬编码API Key

2. **权限限制**
   - 此API Key只能访问上述列出的资源类型
   - 如果尝试访问未授权的资源，将返回 \`403\` 错误
   - 如需访问更多资源，请在管理后台修改权限配置

3. **使用建议**
   - 优先使用请求头方式提供API Key（更安全）
   - 使用相对路径 \`/api/v1/query\` 以便适配不同部署环境
   - 实现适当的错误处理和重试机制

## 🔗 相关资源

- **完整API文档**: 查看管理后台的"API文档"页面获取更多详细信息
- **API Key管理**: 在管理后台的"设置" → "API管理"中修改配置

---
**生成时间**: ${new Date().toLocaleString('zh-CN')}
**API Key状态**: ${api.is_active ? '✅ 已启用' : '❌ 已禁用'}
`;
}
