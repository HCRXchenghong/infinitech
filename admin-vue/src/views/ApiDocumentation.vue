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
  API_DOCUMENTATION_AUTH_HEADER_EXAMPLE,
  API_DOCUMENTATION_ENDPOINT_GROUPS,
  API_DOCUMENTATION_ERROR_CODES,
  API_DOCUMENTATION_NOTES,
  API_DOCUMENTATION_PERMISSION_ROWS,
  API_DOCUMENTATION_RESOURCE_TYPES,
  buildApiDocumentationMarkdown,
  buildApiDocumentationQuickStartCurl,
  buildApiDocumentationRequestExamples,
} from '@infinitech/admin-core';
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

const authHeaderExample = API_DOCUMENTATION_AUTH_HEADER_EXAMPLE;

const quickStartCurl = computed(() => buildApiDocumentationQuickStartCurl(apiBaseUrl.value));
const permissionRows = API_DOCUMENTATION_PERMISSION_ROWS;
const resourceTypes = API_DOCUMENTATION_RESOURCE_TYPES;
const endpointGroups = API_DOCUMENTATION_ENDPOINT_GROUPS;
const requestExamples = computed(() => buildApiDocumentationRequestExamples(apiBaseUrl.value));
const errorCodes = API_DOCUMENTATION_ERROR_CODES;
const notes = API_DOCUMENTATION_NOTES;

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

function downloadFullDocumentation() {
  downloading.value = true;
  try {
    const blob = new Blob([
      buildApiDocumentationMarkdown({
        apiBaseUrl: apiBaseUrl.value,
        generatedAtText: new Date().toLocaleString('zh-CN', { hour12: false }),
      }),
    ], { type: 'text/markdown;charset=utf-8' });
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
