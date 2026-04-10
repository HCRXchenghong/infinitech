<template>
  <div class="api-documentation-page">
    <div class="doc-header">
      <div class="header-content">
        <div class="header-left">
          <h1 class="doc-title">
            <el-icon><Document /></el-icon>
            API 开发文档
          </h1>
          <p class="doc-subtitle">对外 API 的认证方式、权限模型、接口清单与代码示例</p>
        </div>
        <div class="header-actions">
          <el-button type="primary" @click="downloadFullDocumentation" :loading="downloading">
            <el-icon><Download /></el-icon>
            下载完整文档
          </el-button>
          <el-button @click="refreshDocumentation">
            <el-icon><Refresh /></el-icon>
            刷新
          </el-button>
        </div>
      </div>
    </div>

    <div class="doc-container">
      <div class="doc-main">
        <div class="markdown-body">
          <section class="doc-section">
            <h1>简介</h1>
            <p>这里集中说明对外开放 API 的调用方式、权限要求和示例代码。</p>
            <div class="info-box">
              <el-icon><InfoFilled /></el-icon>
              <div>
                <strong>页面职责</strong>
                <p>API 文档页负责解释接口怎么调；API Key 的创建、用途备注和权限分配，应放在 API 权限管理中维护。</p>
              </div>
            </div>

            <div class="endpoint-card">
              <div class="endpoint-method post">POST</div>
              <div class="endpoint-path">/api/v1/query</div>
            </div>
            <p>统一查询接口的当前部署地址示例：<code>{{ apiBaseUrl }}/api/v1/query</code></p>
          </section>

          <section class="doc-section">
            <h1>快速开始</h1>
            <h2>1. 准备 API Key</h2>
            <p>先在管理后台的 API 权限管理中创建一个 API Key，并为它勾选对应权限。</p>

            <h2>2. 请求头认证</h2>
            <div class="code-block">
              <div class="code-header">
                <span>http</span>
                <el-button text @click="copyText(authHeaderExample)">
                  <el-icon><DocumentCopy /></el-icon>
                  复制
                </el-button>
              </div>
              <pre><code>{{ authHeaderExample }}</code></pre>
            </div>

            <h2>3. 基础调用示例</h2>
            <div class="code-block">
              <div class="code-header">
                <span>bash</span>
                <el-button text @click="copyText(quickStartCurl)">
                  <el-icon><DocumentCopy /></el-icon>
                  复制
                </el-button>
              </div>
              <pre><code>{{ quickStartCurl }}</code></pre>
            </div>
          </section>

          <section class="doc-section">
            <h1>权限模型</h1>
            <p>每个 API Key 只能访问自己被授权的数据范围。没有权限时会返回 `403`。</p>

            <table class="params-table">
              <thead>
                <tr>
                  <th>权限标识</th>
                  <th>说明</th>
                  <th>可访问接口</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="permission in permissionRows" :key="permission.key">
                  <td><code>{{ permission.key }}</code></td>
                  <td>{{ permission.description }}</td>
                  <td>{{ permission.scope }}</td>
                </tr>
              </tbody>
            </table>

            <div class="resource-grid">
              <div class="resource-card" v-for="resource in resourceTypes" :key="resource.name">
                <div class="resource-header">
                  <el-icon><component :is="iconMap[resource.icon]" /></el-icon>
                  <strong>{{ resource.name }}</strong>
                </div>
                <p>{{ resource.description }}</p>
                <div class="resource-permissions">
                  <el-tag v-for="perm in resource.permissions" :key="perm" size="small">{{ perm }}</el-tag>
                </div>
              </div>
            </div>
          </section>

          <section class="doc-section">
            <h1>公开接口清单</h1>
            <p>以下是当前已经对外开放的主要接口分组。</p>

            <div class="api-group" v-for="group in endpointGroups" :key="group.title">
              <h2>{{ group.title }}</h2>
              <div class="api-endpoint" v-for="endpoint in group.endpoints" :key="`${group.title}-${endpoint.path}`">
                <div class="endpoint-card">
                  <div class="endpoint-method" :class="endpoint.method.toLowerCase()">
                    {{ endpoint.method }}
                  </div>
                  <div class="endpoint-path">{{ endpoint.path }}</div>
                </div>
                <p>{{ endpoint.description }}</p>
                <table v-if="endpoint.params?.length" class="params-table">
                  <thead>
                    <tr>
                      <th>参数名</th>
                      <th>类型</th>
                      <th>必填</th>
                      <th>说明</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="param in endpoint.params" :key="`${endpoint.path}-${param.name}`">
                      <td><code>{{ param.name }}</code></td>
                      <td>{{ param.type }}</td>
                      <td>{{ param.required ? '是' : '否' }}</td>
                      <td>{{ param.description }}</td>
                    </tr>
                  </tbody>
                </table>
                <p class="permission-required">
                  需要权限：
                  <el-tag size="small">{{ endpoint.permission }}</el-tag>
                </p>
              </div>
            </div>
          </section>

          <section class="doc-section">
            <h1>代码示例</h1>
            <div class="code-block" v-for="example in requestExamples" :key="example.id">
              <div class="code-header">
                <span>{{ example.lang }}</span>
                <el-button text @click="copyText(example.code)">
                  <el-icon><DocumentCopy /></el-icon>
                  复制
                </el-button>
              </div>
              <pre><code>{{ example.code }}</code></pre>
            </div>
          </section>

          <section class="doc-section">
            <h1>错误码说明</h1>
            <table class="params-table">
              <thead>
                <tr>
                  <th>状态码</th>
                  <th>说明</th>
                  <th>建议处理方式</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="errorCode in errorCodes" :key="errorCode.code">
                  <td><code>{{ errorCode.code }}</code></td>
                  <td>{{ errorCode.message }}</td>
                  <td>{{ errorCode.action }}</td>
                </tr>
              </tbody>
            </table>
          </section>

          <section class="doc-section">
            <h1>注意事项</h1>
            <ul class="notes-list">
              <li v-for="note in notes" :key="note">{{ note }}</li>
            </ul>
            <div class="warning-box">
              <el-icon><WarningFilled /></el-icon>
              <div>
                <strong>安全提示</strong>
                <p>API Key 相当于密钥，请按调用方分配，避免多个系统共用同一个 Key。</p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue';
import { ElMessage } from 'element-plus';
import {
  Box,
  Collection,
  Document,
  DocumentCopy,
  Download,
  InfoFilled,
  Refresh,
  Shop,
  ShoppingBag,
  User,
  UserFilled,
  WarningFilled,
} from '@element-plus/icons-vue';

const iconMap = {
  ShoppingBag,
  User,
  UserFilled,
  Shop,
  Box,
  Collection,
};

const downloading = ref(false);

const apiBaseUrl = computed(() => {
  if (typeof window === 'undefined') {
    return '';
  }
  return window.location.origin;
});

const authHeaderExample = 'X-API-Key: your_api_key_here';

const quickStartCurl = computed(() => `curl -X POST "${apiBaseUrl.value}/api/v1/query" \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: your_api_key_here" \\
  -d '{
    "resource": "orders",
    "action": "list",
    "params": {
      "page": 1,
      "limit": 20
    }
  }'`);

const permissionRows = [
  { key: 'orders', description: '订单数据访问权限', scope: '订单列表、订单详情、订单统计' },
  { key: 'users', description: '用户数据访问权限', scope: '用户列表、用户详情、用户统计' },
  { key: 'riders', description: '骑手数据访问权限', scope: '骑手列表、骑手详情、骑手统计' },
  { key: 'dashboard', description: '仪表盘访问权限', scope: '平台统计、用户排名、骑手排名' },
  { key: 'all', description: '全部数据访问权限', scope: '包含所有公开资源' },
];

const resourceTypes = [
  { name: 'orders', description: '订单数据，包括订单列表、详情和统计。', permissions: ['orders', 'all'], icon: 'ShoppingBag' },
  { name: 'users', description: '用户数据，包括用户列表、详情和统计。', permissions: ['users', 'all'], icon: 'User' },
  { name: 'riders', description: '骑手数据，包括骑手列表、详情和统计。', permissions: ['riders', 'all'], icon: 'UserFilled' },
  { name: 'merchants', description: '商户数据，适用于统一查询接口。', permissions: ['all'], icon: 'Shop' },
  { name: 'products', description: '商品数据，适用于统一查询接口。', permissions: ['all'], icon: 'Box' },
  { name: 'categories', description: '分类数据，适用于统一查询接口。', permissions: ['all'], icon: 'Collection' },
];

const endpointGroups = [
  {
    title: '仪表盘数据',
    endpoints: [
      { method: 'GET', path: '/api/public/dashboard/stats', description: '获取平台统计数据。', permission: 'dashboard' },
      {
        method: 'GET',
        path: '/api/public/dashboard/user-ranks',
        description: '获取用户下单排行。',
        permission: 'dashboard',
        params: [{ name: 'period', type: 'string', required: false, description: 'week 或 month，默认 week' }],
      },
      {
        method: 'GET',
        path: '/api/public/dashboard/rider-ranks',
        description: '获取骑手排行。',
        permission: 'dashboard',
        params: [{ name: 'period', type: 'string', required: false, description: 'day、week 或 month，默认 week' }],
      },
    ],
  },
  {
    title: '订单数据',
    endpoints: [
      {
        method: 'GET',
        path: '/api/public/orders',
        description: '获取订单列表，支持分页、搜索和状态筛选。',
        permission: 'orders',
        params: [
          { name: 'page', type: 'number', required: false, description: '页码，默认 1' },
          { name: 'limit', type: 'number', required: false, description: '每页数量，默认 15，最大 100' },
          { name: 'search', type: 'string', required: false, description: '搜索关键词' },
          { name: 'status', type: 'string', required: false, description: '订单状态筛选' },
        ],
      },
      { method: 'GET', path: '/api/public/orders/:id', description: '获取单个订单详情。', permission: 'orders' },
      { method: 'GET', path: '/api/public/orders/stats', description: '获取订单统计数据。', permission: 'orders' },
    ],
  },
  {
    title: '用户数据',
    endpoints: [
      {
        method: 'GET',
        path: '/api/public/users',
        description: '获取用户列表，支持分页和搜索。',
        permission: 'users',
        params: [
          { name: 'page', type: 'number', required: false, description: '页码，默认 1' },
          { name: 'limit', type: 'number', required: false, description: '每页数量，默认 20' },
          { name: 'search', type: 'string', required: false, description: '搜索关键词' },
        ],
      },
      { method: 'GET', path: '/api/public/users/:id', description: '获取单个用户详情。', permission: 'users' },
      { method: 'GET', path: '/api/public/users/stats', description: '获取用户统计数据。', permission: 'users' },
    ],
  },
  {
    title: '骑手数据',
    endpoints: [
      {
        method: 'GET',
        path: '/api/public/riders',
        description: '获取骑手列表，支持分页和搜索。',
        permission: 'riders',
        params: [
          { name: 'page', type: 'number', required: false, description: '页码，默认 1' },
          { name: 'limit', type: 'number', required: false, description: '每页数量，默认 15' },
          { name: 'search', type: 'string', required: false, description: '搜索关键词' },
        ],
      },
      { method: 'GET', path: '/api/public/riders/:id', description: '获取单个骑手详情。', permission: 'riders' },
      { method: 'GET', path: '/api/public/riders/stats', description: '获取骑手统计数据。', permission: 'riders' },
    ],
  },
];

const requestExamples = computed(() => [
  {
    id: 'javascript',
    lang: 'javascript',
    code: `fetch('${apiBaseUrl.value}/api/v1/query', {
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
  .then((response) => response.json())
  .then((data) => console.log(data));`,
  },
  {
    id: 'python',
    lang: 'python',
    code: `import requests

base_url = '${apiBaseUrl.value}'
headers = {
    'Content-Type': 'application/json',
    'X-API-Key': 'your_api_key_here'
}
payload = {
    'resource': 'orders',
    'action': 'list',
    'params': {
        'page': 1,
        'limit': 20
    }
}

response = requests.post(f'{base_url}/api/v1/query', json=payload, headers=headers)
print(response.json())`,
  },
  {
    id: 'java',
    lang: 'java',
    code: `OkHttpClient client = new OkHttpClient();
String json = "{\\"resource\\":\\"orders\\",\\"action\\":\\"list\\",\\"params\\":{\\"page\\":1,\\"limit\\":20}}";

Request request = new Request.Builder()
    .url("${apiBaseUrl.value}/api/v1/query")
    .post(RequestBody.create(json, MediaType.parse("application/json")))
    .addHeader("Content-Type", "application/json")
    .addHeader("X-API-Key", "your_api_key_here")
    .build();`,
  },
]);

const errorCodes = [
  { code: '200', message: '请求成功', action: '正常处理返回数据' },
  { code: '400', message: '请求参数错误', action: '检查 resource、action 和 params' },
  { code: '401', message: '未提供 API Key 或 Key 无效', action: '确认请求头里的 X-API-Key' },
  { code: '403', message: 'Key 没有访问该资源的权限', action: '去 API 权限管理中补齐权限' },
  { code: '500', message: '服务端内部错误', action: '查看后台日志并联系技术支持' },
];

const notes = [
  'API Key 需要先在后台启用后才能生效。',
  '建议一套调用方对应一个 API Key，方便追踪和停用。',
  '建议优先使用 HTTPS，避免在公网明文传输 Key。',
  '分页接口建议将 limit 控制在 100 以内。',
  '接口文档页负责说明怎么调，Key 与权限分配应在权限管理页维护。',
];

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    ElMessage.success('已复制到剪贴板');
  } catch (_error) {
    ElMessage.error('复制失败');
  }
}

function refreshDocumentation() {
  if (typeof window !== 'undefined') {
    window.location.reload();
  }
}

function buildMarkdown() {
  const sections = [
    '# API 开发文档',
    '',
    `当前部署地址：${apiBaseUrl.value}`,
    '',
    '## 认证方式',
    '',
    `- 请求头：\`${authHeaderExample}\``,
    '',
    '## 权限模型',
    ...permissionRows.map((item) => `- \`${item.key}\`：${item.description}，${item.scope}`),
    '',
    '## 公开接口',
    ...endpointGroups.flatMap((group) => [
      '',
      `### ${group.title}`,
      ...group.endpoints.map((endpoint) => `- [${endpoint.method}] ${endpoint.path} (${endpoint.permission}) ${endpoint.description}`),
    ]),
    '',
    '## 注意事项',
    ...notes.map((item) => `- ${item}`),
    '',
    `生成时间：${new Date().toLocaleString('zh-CN')}`,
  ];
  return sections.join('\n');
}

function downloadFullDocumentation() {
  downloading.value = true;
  try {
    const blob = new Blob([buildMarkdown()], { type: 'text/markdown;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `API开发文档_${new Date().toISOString().slice(0, 10)}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    ElMessage.success('文档下载成功');
  } catch (error) {
    ElMessage.error(`下载失败: ${error?.message || '未知错误'}`);
  } finally {
    downloading.value = false;
  }
}
</script>

<style scoped lang="css" src="./ApiDocumentation.css"></style>
