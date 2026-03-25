<template>
  <div class="page">
    <div class="header-bar">
      <el-button size="small" @click="goBack" :icon="ArrowLeft">返回</el-button>
      <span class="page-title">API权限说明</span>
    </div>

    <div class="content-wrapper">
      <div class="intro-section">
        <p>不同的API权限决定了该接口可以访问哪些数据。请根据实际需求选择合适的权限组合。</p>
      </div>

      <div class="permissions-list">
        <div 
          class="permission-item" 
          v-for="permission in permissions" 
          :key="permission.key"
        >
          <div class="permission-header">
            <div class="header-info">
              <el-tag :type="permission.tagType" size="default">{{ permission.label }}</el-tag>
              <span class="permission-key">{{ permission.key }}</span>
              <span v-if="permission.apis && permission.apis.length > 0" class="status-badge">已实现</span>
            </div>
          </div>
          
          <div class="permission-body">
            <div class="desc-text">{{ permission.description }}</div>
            
            <div class="data-section">
              <div class="section-label">可访问的数据：</div>
              <ul class="data-list">
                <li v-for="item in permission.data" :key="item">{{ item }}</li>
              </ul>
            </div>
            
            <div class="api-section" v-if="permission.apis && permission.apis.length > 0">
              <div class="section-label">可访问的API端点：</div>
              <div class="api-list">
                <div class="api-item" v-for="api in permission.apis" :key="api.path">
                  <span class="api-method">{{ api.method }}</span>
                  <code class="api-path">{{ api.path }}</code>
                  <span class="api-desc">{{ api.description }}</span>
                </div>
              </div>
            </div>
            
            <div class="note-section" v-if="permission.note">
              <el-alert 
                :title="permission.note" 
                :type="permission.note.includes('已实现') ? 'success' : 'warning'" 
                :closable="false"
                show-icon
              />
            </div>
          </div>
        </div>
      </div>

      <div class="usage-section">
        <div class="section-title">使用说明</div>
        <div class="usage-list">
          <div class="usage-item">
            <strong>1. 权限组合：</strong>
            <p>可以为同一个API接口选择多个权限，例如同时选择"订单数据"和"用户数据"。</p>
          </div>
          <div class="usage-item">
            <strong>2. 全部数据权限：</strong>
            <p>选择"全部数据"权限后，将自动包含所有其他权限，可以访问所有已实现的API端点。</p>
          </div>
          <div class="usage-item">
            <strong>3. API Key验证：</strong>
            <p>所有公开API请求都需要在请求头中提供有效的API Key：</p>
            <div class="code-example">X-API-Key: YOUR_API_KEY</div>
          </div>
          <div class="usage-item">
            <strong>4. 权限检查：</strong>
            <p>系统会根据API Key对应的权限配置，验证是否有权限访问请求的数据。</p>
          </div>
        </div>
      </div>

      <div class="usage-section">
        <div class="section-title">快速开始指南</div>
        <div class="guide-content">
          <div class="guide-step">
            <div class="step-number">1</div>
            <div class="step-content">
              <h3>创建API接口配置</h3>
              <p>在"系统设置" → "对外API接口管理"中，点击"添加API接口"按钮：</p>
              <ul>
                <li>填写接口名称（如：我的网站API）</li>
                <li>填写接口路径（如：/api/public/orders）</li>
                <li>选择需要的权限（如：订单数据、用户数据等）</li>
                <li>系统会自动生成API Key，请保存好这个Key</li>
              </ul>
              <p class="tip">⚠️ 重要：API Key相当于密码，请妥善保管，不要泄露给他人！</p>
            </div>
          </div>

          <div class="guide-step">
            <div class="step-number">2</div>
            <div class="step-content">
              <h3>在其他网站中使用API</h3>
              <p>使用说明里的API端点，不需要自己创建新的API端点。你只需要：</p>
              <ul>
                <li>使用你在步骤1中创建的API Key</li>
                <li>调用说明中列出的API端点（如：/api/public/orders）</li>
                <li>在请求头中添加你的API Key</li>
              </ul>
              <div class="code-example">
                <div class="code-title">示例：获取订单列表</div>
                <code>GET https://your-domain.com/api/public/orders?page=1&limit=10</code>
                <div class="code-title">请求头：</div>
                <code>X-API-Key: 你的API_KEY</code>
              </div>
            </div>
          </div>

          <div class="guide-step">
            <div class="step-number">3</div>
            <div class="step-content">
              <h3>部署到服务器后使用</h3>
              <p>部署到域名服务器后，API仍然可以正常使用：</p>
              <ul>
                <li>将代码中的域名改为你的实际域名</li>
                <li>确保服务器可以访问数据库</li>
                <li>API Key和权限配置都保存在数据库中，部署后仍然有效</li>
              </ul>
              <div class="code-example">
                <div class="code-title">本地开发：</div>
                <code>/api/public/orders</code>
                <div class="code-title">部署后：</div>
                <code>https://your-domain.com/api/public/orders</code>
              </div>
            </div>
          </div>

          <div class="guide-step">
            <div class="step-number">4</div>
            <div class="step-content">
              <h3>实际代码示例</h3>
              <div class="code-example">
                <div class="code-title">JavaScript (fetch)：</div>
                <pre><code>fetch('https://your-domain.com/api/public/orders?page=1&limit=10', {
  method: 'GET',
  headers: {
    'X-API-Key': '你的API_KEY'
  }
})
.then(response => response.json())
.then(data => {
  console.log('订单列表:', data.data.orders);
});</code></pre>
              </div>
              <div class="code-example">
                <div class="code-title">PHP (cURL)：</div>
                <pre><code>$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'https://your-domain.com/api/public/orders?page=1&limit=10');
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'X-API-Key: 你的API_KEY'
]);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$response = curl_exec($ch);
curl_close($ch);
$data = json_decode($response, true);
print_r($data['data']['orders']);</code></pre>
              </div>
              <div class="code-example">
                <div class="code-title">Python (requests)：</div>
                <pre><code>import requests

headers = {
    'X-API-Key': '你的API_KEY'
}
response = requests.get(
    'https://your-domain.com/api/public/orders',
    params={'page': 1, 'limit': 10},
    headers=headers
)
data = response.json()
print(data['data']['orders'])</code></pre>
              </div>
            </div>
          </div>

          <div class="guide-step">
            <div class="step-number">5</div>
            <div class="step-content">
              <h3>常见问题</h3>
              <div class="faq-item">
                <strong>Q: 我需要自己创建API端点吗？</strong>
                <p>A: 不需要！你只需要在后台创建API接口配置，然后使用说明中列出的API端点即可。这些端点已经由系统提供。</p>
              </div>
              <div class="faq-item">
                <strong>Q: 自己创建的API接口配置能用吗？</strong>
                <p>A: 可以！你在后台创建的每个API接口配置都会生成一个唯一的API Key，这个Key可以用来访问对应的API端点。</p>
              </div>
              <div class="faq-item">
                <strong>Q: 部署到服务器后还能用吗？</strong>
                <p>A: 可以！部署后只需要将API请求的域名改为你的实际域名即可。API Key和权限配置都保存在数据库中，会一起部署。</p>
              </div>
              <div class="faq-item">
                <strong>Q: 一个API Key可以访问所有接口吗？</strong>
                <p>A: 取决于你创建API接口时选择的权限。如果选择了"全部数据"权限，就可以访问所有接口；如果只选择了"订单数据"，就只能访问订单相关的接口。</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ArrowLeft } from '@element-plus/icons-vue';

const router = useRouter();

onMounted(() => {
  // 页面加载时滚动到顶部
  window.scrollTo(0, 0);
});

const permissions = ref([
  {
    key: 'orders',
    label: '订单数据',
    tagType: 'primary',
    description: '允许访问订单相关的所有数据，包括订单列表、订单详情、订单统计等。',
    data: [
      '订单列表（支持分页、搜索、状态筛选）',
      '订单详情（订单ID、用户信息、骑手信息、订单状态、价格、时间等）',
      '订单状态信息（pending待接单、priced已报价、accepted已接单、completed已完成等）',
      '订单统计信息'
    ],
    apis: [
      {
        method: 'GET',
        path: '/api/public/orders?page=1&limit=15&search=&status=',
        description: '获取订单列表，支持分页、搜索、状态筛选'
      },
      {
        method: 'GET',
        path: '/api/public/orders/:id',
        description: '获取订单详情，包含完整的订单信息'
      },
      {
        method: 'GET',
        path: '/api/public/orders/stats',
        description: '获取订单统计信息，包含各状态订单数量'
      }
    ],
    note: '该权限的公开API端点已实现，可以直接使用。'
  },
  {
    key: 'users',
    label: '用户数据',
    tagType: 'success',
    description: '允许访问用户（客户）相关的所有数据，包括用户列表、用户信息、用户统计等。',
    data: [
      '用户列表（客户列表）',
      '用户基本信息（ID、姓名、手机号、注册时间等）',
      '用户统计信息（总用户数等）'
    ],
    apis: [
      {
        method: 'GET',
        path: '/api/public/users?page=1&limit=20&search=',
        description: '获取用户列表，支持分页和搜索'
      },
      {
        method: 'GET',
        path: '/api/public/users/:id',
        description: '获取用户详情，包含用户基本信息'
      },
      {
        method: 'GET',
        path: '/api/public/users/stats',
        description: '获取用户统计信息，包含总用户数'
      }
    ],
    note: '该权限的公开API端点已实现，可以直接使用。'
  },
  {
    key: 'riders',
    label: '骑手数据',
    tagType: 'warning',
    description: '允许访问骑手相关的所有数据，包括骑手列表、骑手信息、骑手统计等。',
    data: [
      '骑手列表',
      '骑手基本信息（ID、姓名、手机号、注册时间、在线状态等）',
      '骑手统计信息（总骑手数、在线骑手数等）'
    ],
    apis: [
      {
        method: 'GET',
        path: '/api/public/riders?page=1&limit=15&search=',
        description: '获取骑手列表，支持分页和搜索'
      },
      {
        method: 'GET',
        path: '/api/public/riders/:id',
        description: '获取骑手详情，包含骑手基本信息'
      },
      {
        method: 'GET',
        path: '/api/public/riders/stats',
        description: '获取骑手统计信息，包含总骑手数、在线骑手数等'
      }
    ],
    note: '该权限的公开API端点已实现，可以直接使用。'
  },
  {
    key: 'dashboard',
    label: '仪表盘数据',
    tagType: 'info',
    description: '允许访问仪表盘统计数据和排名信息，包括订单统计、用户排名、骑手排名等。',
    data: [
      '注册客户数 (customerCount)',
      '总订单数 (totalOrders)',
      '今日订单数 (todayOrders)',
      '员工总数 (riderCount)',
      '在线骑手数 (onlineRiderCount)',
      '待接单数 (pendingOrdersCount)',
      '总收入 (totalRevenue)',
      '用户下单排名（周榜/月榜前10名）',
      '骑手送单排名（周榜/月榜前10名）'
    ],
    apis: [
      {
        method: 'GET',
        path: '/api/public/dashboard/stats',
        description: '获取仪表盘统计数据，包含所有统计指标'
      },
      {
        method: 'GET',
        path: '/api/public/dashboard/user-ranks?period=week|month',
        description: '获取用户下单排名，支持周榜(week)和月榜(month)'
      },
      {
        method: 'GET',
        path: '/api/public/dashboard/rider-ranks?period=week|month',
        description: '获取骑手送单排名，支持周榜(week)和月榜(month)'
      }
    ],
    note: '该权限的公开API端点已实现，可以直接使用。'
  },
  {
    key: 'all',
    label: '全部数据',
    tagType: 'danger',
    description: '包含所有权限，可以访问所有已实现的公开API端点。',
    data: [
      '订单数据（orders权限）',
      '用户数据（users权限）',
      '骑手数据（riders权限）',
      '仪表盘数据（dashboard权限）'
    ],
    apis: [
      {
        method: 'GET',
        path: '/api/public/orders',
        description: '获取订单列表'
      },
      {
        method: 'GET',
        path: '/api/public/orders/:id',
        description: '获取订单详情'
      },
      {
        method: 'GET',
        path: '/api/public/orders/stats',
        description: '获取订单统计'
      },
      {
        method: 'GET',
        path: '/api/public/users',
        description: '获取用户列表'
      },
      {
        method: 'GET',
        path: '/api/public/users/:id',
        description: '获取用户详情'
      },
      {
        method: 'GET',
        path: '/api/public/users/stats',
        description: '获取用户统计'
      },
      {
        method: 'GET',
        path: '/api/public/riders',
        description: '获取骑手列表'
      },
      {
        method: 'GET',
        path: '/api/public/riders/:id',
        description: '获取骑手详情'
      },
      {
        method: 'GET',
        path: '/api/public/riders/stats',
        description: '获取骑手统计'
      },
      {
        method: 'GET',
        path: '/api/public/dashboard/stats',
        description: '获取仪表盘统计数据'
      },
      {
        method: 'GET',
        path: '/api/public/dashboard/user-ranks?period=week|month',
        description: '获取用户下单排名'
      },
      {
        method: 'GET',
        path: '/api/public/dashboard/rider-ranks?period=week|month',
        description: '获取骑手送单排名'
      }
    ],
    note: '选择此权限后，将自动包含所有其他权限，可以访问所有API端点。'
  }
]);

function goBack() {
  router.push('/settings');
}
</script>

<style scoped lang="css" src="./ApiPermissions.css"></style>
