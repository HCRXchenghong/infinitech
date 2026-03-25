<template src="./ApiDocumentation.template.html"></template>
<script setup>
import { ref, computed } from 'vue';
import { ElMessage } from 'element-plus';
import { 
  Document, Download, Refresh, DocumentCopy, InfoFilled, WarningFilled,
  ShoppingBag, User, UserFilled, Shop, Box, Collection, DataAnalysis
} from '@element-plus/icons-vue';
// 图标映射
const iconMap = {
  InfoFilled,
  Document,
  DataAnalysis,
  User,
  WarningFilled,
  DocumentCopy,
  ShoppingBag,
  UserFilled,
  Shop,
  Box,
  Collection
};

const apiBaseUrl = computed(() => {
  const protocol = window.location.protocol;
  const hostname = window.location.hostname;
  const port = window.location.port;
  if (port) {
    return `${protocol}//${hostname}:${port}`;
  }
  return `${protocol}//${hostname}`;
});

const downloading = ref(false);

const resourceTypes = [
  {
    name: 'orders',
    description: '订单数据，包括订单列表、订单详情、订单状态等',
    permissions: ['orders', 'all'],
    icon: 'ShoppingBag'
  },
  {
    name: 'users',
    description: '用户数据，包括用户列表、用户详情、用户类型等',
    permissions: ['users', 'all'],
    icon: 'User'
  },
  {
    name: 'riders',
    description: '骑手数据，包括骑手列表、骑手详情、骑手状态等',
    permissions: ['riders', 'all'],
    icon: 'UserFilled'
  },
  {
    name: 'merchants',
    description: '商户数据，包括商户列表、商户详情等',
    permissions: ['merchants', 'all'],
    icon: 'Shop'
  },
  {
    name: 'products',
    description: '商品数据，包括商品列表、商品详情、商品分类等',
    permissions: ['products', 'all'],
    icon: 'Box'
  },
  {
    name: 'categories',
    description: '分类数据，包括分类列表、分类详情等',
    permissions: ['categories', 'all'],
    icon: 'Collection'
  }
];


// 复制代码
function copyCode(codeId) {
  const codeElement = document.getElementById(codeId);
  if (codeElement) {
    const text = codeElement.textContent;
    navigator.clipboard.writeText(text).then(() => {
      ElMessage.success('代码已复制到剪贴板');
    }).catch(() => {
      ElMessage.error('复制失败');
    });
  }
}

// 刷新文档
function refreshDocumentation() {
  window.location.reload();
}

// 下载完整文档
function downloadFullDocumentation() {
  downloading.value = true;
  
  try {
    const docContent = generateFullDocumentation();
    const blob = new Blob([docContent], { type: 'text/markdown;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `API开发文档_${new Date().toISOString().split('T')[0]}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    
    ElMessage.success('文档下载成功');
  } catch (error) {
    ElMessage.error('下载失败: ' + error.message);
  } finally {
    downloading.value = false;
  }
}

// 生成完整文档
function generateFullDocumentation() {
  const baseUrl = apiBaseUrl.value;
  
  return `# 悦享e食平台 - API开发文档

> 生成时间：${new Date().toLocaleString('zh-CN')}
> 当前部署地址：${baseUrl}
> 
> **重要提示**：所有API接口地址使用相对路径（如 \`/api/v1/query\`），无论部署到哪个域名，都可以直接使用相对路径访问，系统会自动使用当前部署的域名。无需硬编码修改接口地址。

## 目录

1. [简介](#简介)
2. [快速开始](#快速开始)
3. [统一查询接口](#统一查询接口)
4. [公开API端点](#公开API端点)
5. [权限说明](#权限说明)
6. [错误码说明](#错误码说明)
7. [代码示例](#代码示例)
8. [注意事项](#注意事项)

## 简介

欢迎使用悦享e食平台API开发文档。本文档提供了完整的API接口说明，帮助开发者快速集成平台数据。

### 重要提示

所有API接口都需要通过API Key进行认证。请在管理后台创建API Key并配置相应的访问权限。

## 快速开始

### 1. 获取API Key

在管理后台的"系统设置" → "对外API接口管理"中创建API Key，并配置相应的访问权限。

### 2. 基础请求示例

\`\`\`bash
curl -X POST "${baseUrl}/api/v1/query" \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: your_api_key_here" \\
  -d '{
    "resource": "orders",
    "action": "list",
    "params": {
      "page": 1,
      "limit": 20
    }
  }'
\`\`\`

### 3. 响应格式

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

## 统一查询接口

统一的API查询端点，支持多种资源类型的查询操作。

**接口地址**: \`POST /api/v1/query\` (相对路径，自动适应域名)

**当前部署地址示例**: \`${baseUrl}/api/v1/query\`

### 认证方式

#### 方式一：请求头（推荐）

\`\`\`
X-API-Key: your_api_key_here
\`\`\`

#### 方式二：请求参数

\`\`\`json
{
  "api_key": "your_api_key_here",
  "resource": "orders",
  "action": "list",
  "params": {}
}
\`\`\`

### 请求参数

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| resource | string | 是 | 资源类型：orders、users、riders、merchants、products、categories |
| action | string | 否 | 操作类型：list（列表，默认）、get（单个） |
| params | object | 否 | 查询参数，见下方说明 |

#### 列表查询参数（action: list）

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| page | number | 否 | 页码，默认1 |
| limit | number | 否 | 每页数量，默认20，最多100 |
| search | string | 否 | 搜索关键词 |
| status | string | 否 | 状态筛选（仅订单） |
| type | string | 否 | 类型筛选（仅用户） |

#### 单个查询参数（action: get）

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| id | number | 是 | 资源ID |

### 资源类型

- **orders**: 订单数据，包括订单列表、订单详情、订单状态等
- **users**: 用户数据，包括用户列表、用户详情、用户类型等
- **riders**: 骑手数据，包括骑手列表、骑手详情、骑手状态等
- **merchants**: 商户数据，包括商户列表、商户详情等
- **products**: 商品数据，包括商品列表、商品详情、商品分类等
- **categories**: 分类数据，包括分类列表、分类详情等

## 公开API端点

除了统一查询接口外，平台还提供了专门的公开API端点，用于获取特定类型的数据。

### 仪表盘数据

#### 获取平台统计数据

\`GET /api/public/dashboard/stats\` (相对路径，自动适应域名)

获取平台统计数据，包括今日订单、今日收入、本月收入等。

**需要权限**: dashboard

#### 获取用户排名

\`GET /api/public/dashboard/user-ranks\` (相对路径，自动适应域名)

获取用户下单排名（周/月）。

**查询参数**:
- period: string (可选) - 时间周期：week（周）、month（月），默认week

**需要权限**: dashboard

#### 获取骑手排名

\`GET /api/public/dashboard/rider-ranks\` (相对路径，自动适应域名)

获取骑手排名（日/周/月）。

**查询参数**:
- period: string (可选) - 时间周期：day（日）、week（周）、month（月），默认week

**需要权限**: dashboard

### 订单数据

#### 获取订单列表

\`GET /api/public/orders\` (相对路径，自动适应域名)

获取订单列表，支持分页、搜索和状态筛选。

**查询参数**:
- page: number (可选) - 页码，默认1
- limit: number (可选) - 每页数量，默认15
- search: string (可选) - 搜索关键词（订单号、客户姓名、骑手姓名）
- status: string (可选) - 订单状态：pending、confirmed、preparing、ready、delivering、completed、cancelled

**需要权限**: orders

#### 获取单个订单

\`GET /api/public/orders/:id\` (相对路径，自动适应域名)

获取单个订单详情。

**需要权限**: orders

#### 获取订单统计

\`GET /api/public/orders/stats\` (相对路径，自动适应域名)

获取订单统计数据。

**需要权限**: orders

### 用户数据

#### 获取用户列表

\`GET /api/public/users\` (相对路径，自动适应域名)

获取用户列表，支持分页和搜索。

**需要权限**: users

#### 获取单个用户

\`GET /api/public/users/:id\` (相对路径，自动适应域名)

获取单个用户详情。

**需要权限**: users

#### 获取用户统计

\`GET /api/public/users/stats\` (相对路径，自动适应域名)

获取用户统计数据。

**需要权限**: users

### 骑手数据

#### 获取骑手列表

\`GET /api/public/riders\` (相对路径，自动适应域名)

获取骑手列表，支持分页和搜索。

**需要权限**: riders

#### 获取单个骑手

\`GET /api/public/riders/:id\` (相对路径，自动适应域名)

获取单个骑手详情。

**需要权限**: riders

#### 获取骑手统计

\`GET /api/public/riders/stats\` (相对路径，自动适应域名)

获取骑手统计数据。

**需要权限**: riders

## 权限说明

每个API Key可以配置不同的访问权限，用于控制可以访问哪些类型的数据。

| 权限标识 | 说明 | 可访问的资源 |
|---------|------|------------|
| orders | 订单数据访问权限 | 订单列表、订单详情、订单统计 |
| users | 用户数据访问权限 | 用户列表、用户详情、用户统计 |
| riders | 骑手数据访问权限 | 骑手列表、骑手详情、骑手统计 |
| merchants | 商户数据访问权限 | 商户列表、商户详情 |
| products | 商品数据访问权限 | 商品列表、商品详情、商品分类 |
| categories | 分类数据访问权限 | 分类列表、分类详情 |
| dashboard | 仪表盘数据访问权限 | 平台统计、用户排名、骑手排名 |
| all | 全部数据访问权限 | 所有资源类型 |

### 权限限制

如果API Key没有某个资源的访问权限，请求该资源时会返回403错误。

## 错误码说明

| 状态码 | 说明 | 解决方案 |
|--------|------|---------|
| 200 | 请求成功 | - |
| 400 | 请求参数错误 | 检查请求参数格式和必填项 |
| 401 | 未提供API Key或API Key无效 | 检查API Key是否正确，是否已启用 |
| 403 | API Key没有访问该资源的权限 | 在管理后台为API Key配置相应权限 |
| 500 | 服务器内部错误 | 联系技术支持 |

## 代码示例

### JavaScript (fetch)

\`\`\`javascript
// 使用统一查询接口
fetch('/api/v1/query', {  // 使用相对路径，自动适应域名
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': 'your_api_key_here'
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
  console.log('Success:', data);
})
.catch(error => {
  console.error('Error:', error);
});
\`\`\`

### Python (requests)

\`\`\`python
import requests

# 使用环境变量或配置获取基础URL，支持自动适应不同部署环境
base_url = os.getenv('API_BASE_URL', '${baseUrl}')  # 默认使用当前部署地址
url = f'{base_url}/api/v1/query'
headers = {
    'Content-Type': 'application/json',
    'X-API-Key': 'your_api_key_here'
}
data = {
    'resource': 'orders',
    'action': 'list',
    'params': {
        'page': 1,
        'limit': 20
    }
}

response = requests.post(url, json=data, headers=headers)
result = response.json()
print(result)
\`\`\`

### Java (OkHttp)

\`\`\`java
import okhttp3.*;
import java.io.IOException;

public class ApiClient {
    // 从配置或环境变量获取基础URL，支持自动适应不同部署环境
    private static final String BASE_URL = System.getenv("API_BASE_URL") != null 
        ? System.getenv("API_BASE_URL") 
        : "${baseUrl}";  // 默认使用当前部署地址
    
    public static void main(String[] args) throws IOException {
        OkHttpClient client = new OkHttpClient();
        
        String json = "{\\"resource\\":\\"orders\\",\\"action\\":\\"list\\",\\"params\\":{\\"page\\":1,\\"limit\\":20}}";
        RequestBody body = RequestBody.create(json, MediaType.parse("application/json"));
        
        Request request = new Request.Builder()
            .url(BASE_URL + "/api/v1/query")
            .post(body)
            .addHeader("Content-Type", "application/json")
            .addHeader("X-API-Key", "your_api_key_here")
            .build();
        
        try (Response response = client.newCall(request).execute()) {
            System.out.println(response.body().string());
        }
    }
}
\`\`\`

## 注意事项

1. API Key需要先在管理后台配置并启用
2. 每个API Key的权限是独立的，需要根据实际需求配置
3. 建议使用HTTPS协议以保证数据传输安全
4. 请求频率建议控制在合理范围内，避免对服务器造成压力
5. 单个查询时，如果资源不存在，会返回null
6. 所有时间字段使用ISO 8601格式（YYYY-MM-DD HH:mm:ss）
7. 分页查询时，limit最大值为100

---

*本文档由系统自动生成，最后更新时间：${new Date().toLocaleString('zh-CN')}*
`;
}
</script>
<style scoped lang="css" src="./ApiDocumentation.css"></style>
