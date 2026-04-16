<template>
  <div class="page">
    <div class="title-row">
      <div>
        <div class="title">API 权限管理</div>
        <div class="title-subtitle">为每个调用方配置主要 API URL、API Key 和可访问的数据权限。</div>
      </div>
      <div class="title-actions">
        <el-button @click="goToDocumentation">API 文档</el-button>
        <el-button @click="loadApiList" :loading="apiListLoading">刷新</el-button>
        <el-button type="primary" @click="showAddApiDialog">新建 Key</el-button>
      </div>
    </div>

    <PageStateAlert :message="apiListError" />

    <div class="summary-grid">
      <el-card class="summary-card">
        <span class="summary-label">Key 总数</span>
        <strong>{{ summary.total }}</strong>
        <small>当前登记的全部调用方</small>
      </el-card>
      <el-card class="summary-card">
        <span class="summary-label">启用中</span>
        <strong>{{ summary.active }}</strong>
        <small>可正常调用对外接口</small>
      </el-card>
      <el-card class="summary-card">
        <span class="summary-label">全权限</span>
        <strong>{{ summary.allScoped }}</strong>
        <small>拥有 `all` 权限的 Key</small>
      </el-card>
      <el-card class="summary-card">
        <span class="summary-label">已填 API URL</span>
        <strong>{{ summary.withPath }}</strong>
        <small>记录了主要入口或用途路径</small>
      </el-card>
    </div>

    <div class="content-grid">
      <el-card class="card management-card">
        <template #header>
          <div class="card-header">
            <span>Key 与权限分配</span>
            <el-tag size="small" type="info">主入口 + Key + 权限</el-tag>
          </div>
        </template>

        <div v-if="!isMobile" class="table-wrap">
          <el-table :data="apiList" stripe size="small" v-loading="apiListLoading">
            <el-table-column prop="name" label="调用方 / Key 名称" min-width="150" />
            <el-table-column label="主要 API URL / 路径" min-width="220">
              <template #default="{ row }">
                <code class="mono-text">{{ row.path || '未填写' }}</code>
              </template>
            </el-table-column>
            <el-table-column prop="description" label="用途说明" min-width="200" show-overflow-tooltip>
              <template #default="{ row }">
                <span>{{ row.description || '—' }}</span>
              </template>
            </el-table-column>
            <el-table-column label="权限分配" min-width="220">
              <template #default="{ row }">
                <div class="permission-tags">
                  <el-tag
                    v-for="perm in normalizePublicApiPermissionList(row.permissions)"
                    :key="`${row.id}-${perm}`"
                    size="small"
                  >
                    {{ getPermissionLabel(perm) }}
                  </el-tag>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="API Key" min-width="240">
              <template #default="{ row }">
                <div class="key-cell">
                  <code class="mono-text key-text">{{ row.api_key }}</code>
                  <el-button link type="primary" @click="copyApiKey(row.api_key)">复制</el-button>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="状态" width="90">
              <template #default="{ row }">
                <el-tag :type="row.is_active ? 'success' : 'danger'" size="small">
                  {{ row.is_active ? '启用' : '禁用' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="220" fixed="right">
              <template #default="{ row }">
                <div class="row-actions">
                  <el-button size="small" type="primary" @click="editApi(row)">编辑</el-button>
                  <el-button size="small" @click="downloadKeyDoc(row)">下载说明</el-button>
                  <el-button size="small" type="danger" @click="deleteApi(row)">删除</el-button>
                </div>
              </template>
            </el-table-column>
            <template #empty>
              <el-empty :description="apiListError ? '加载失败，暂无可显示数据' : '还没有配置任何 API Key'" :image-size="90" />
            </template>
          </el-table>
        </div>

        <div v-else class="mobile-list" v-loading="apiListLoading">
          <div v-if="apiList.length === 0" class="mobile-empty">
            <el-empty :description="apiListError ? '加载失败，暂无可显示数据' : '还没有配置任何 API Key'" :image-size="90" />
          </div>
          <div v-for="row in apiList" :key="row.id" class="mobile-card">
            <div class="mobile-card-header">
              <div>
                <div class="mobile-card-title">{{ row.name }}</div>
                <div class="mobile-card-subtitle">{{ row.path || '未填写主要 API URL / 路径' }}</div>
              </div>
              <el-tag :type="row.is_active ? 'success' : 'danger'" size="small">
                {{ row.is_active ? '启用' : '禁用' }}
              </el-tag>
            </div>
            <div class="mobile-card-body">
              <div class="mobile-label">用途说明</div>
              <div class="mobile-value">{{ row.description || '—' }}</div>
              <div class="mobile-label">权限分配</div>
              <div class="permission-tags">
                <el-tag
                  v-for="perm in normalizePublicApiPermissionList(row.permissions)"
                  :key="`${row.id}-${perm}`"
                  size="small"
                >
                  {{ getPermissionLabel(perm) }}
                </el-tag>
              </div>
              <div class="mobile-label">API Key</div>
              <div class="mobile-key-wrap">
                <code class="mono-text key-text">{{ row.api_key }}</code>
                <el-button size="small" @click="copyApiKey(row.api_key)">复制</el-button>
              </div>
            </div>
            <div class="mobile-card-actions">
              <el-button size="small" type="primary" @click="editApi(row)">编辑</el-button>
              <el-button size="small" @click="downloadKeyDoc(row)">下载说明</el-button>
              <el-button size="small" type="danger" @click="deleteApi(row)">删除</el-button>
            </div>
          </div>
        </div>
      </el-card>

      <el-card class="card guide-card">
        <template #header>
          <div class="card-header">
            <span>权限选择指引</span>
            <el-button link type="primary" @click="goToDocumentation">查看完整 API 文档</el-button>
          </div>
        </template>

        <div class="guide-intro">
          这里负责“谁拿什么 Key，可以访问哪些接口”。如果要看接口参数、返回值和代码示例，请去 API 文档页。
        </div>

        <div class="permission-guide-list">
          <div v-for="permission in permissionCatalog" :key="permission.key" class="permission-guide-item">
            <div class="permission-guide-top">
              <el-tag :type="permission.type" size="small">{{ permission.label }}</el-tag>
              <code class="mono-text">{{ permission.key }}</code>
            </div>
            <div class="permission-guide-desc">{{ permission.description }}</div>
            <div class="permission-guide-example">典型接口：{{ permission.examples.join('、') }}</div>
          </div>
        </div>
      </el-card>
    </div>

    <el-dialog
      v-model="apiDialogVisible"
      :title="editingApi ? '编辑 API Key 权限' : '新建 API Key 权限'"
      :width="isMobile ? '94%' : '720px'"
      :close-on-click-modal="false"
    >
      <el-form :model="apiForm" label-width="120px" size="small">
        <el-form-item label="调用方名称" required>
          <el-input v-model="apiForm.name" placeholder="如：合作伙伴官网 / BI 报表服务" />
          <div class="form-tip">用于区分不同的调用方或不同用途的 Key。</div>
        </el-form-item>
        <el-form-item label="主要 API URL / 路径">
          <el-input
            v-model="apiForm.path"
            placeholder="如：/api/public/orders 或 /api/v1/query"
          />
          <div class="form-tip">记录该 Key 主要使用的接口入口，便于后续排查与审计。</div>
        </el-form-item>
        <el-form-item label="权限分配" required>
          <el-checkbox-group v-model="apiForm.permissions" @change="handleApiPermissionChange">
            <el-checkbox
              v-for="permission in permissionOptions"
              :key="permission.value"
              :label="permission.value"
            >
              {{ permission.label }}
            </el-checkbox>
          </el-checkbox-group>
          <div class="form-tip">勾选后系统会按权限校验该 Key 能访问的公开接口。</div>
        </el-form-item>
        <el-form-item label="API Key" required>
          <el-input v-model="apiForm.api_key" readonly placeholder="点击生成新的 API Key">
            <template #append>
              <el-button @click="generateApiKey">生成</el-button>
            </template>
          </el-input>
          <div class="form-tip">API Key 相当于访问凭证，建议一个调用方分配一个独立 Key。</div>
        </el-form-item>
        <el-form-item label="用途说明">
          <el-input
            v-model="apiForm.description"
            type="textarea"
            :rows="3"
            placeholder="补充说明这个 Key 的业务用途、调用频率或责任人"
          />
        </el-form-item>
        <el-form-item label="状态">
          <el-switch v-model="apiForm.is_active" />
          <span class="switch-text">{{ apiForm.is_active ? '启用' : '禁用' }}</span>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="apiDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveApi" :loading="savingApi">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { extractErrorMessage } from '@infinitech/contracts';
import {
  buildPublicApiSummary,
  normalizePublicApiPermissionList,
  PUBLIC_API_PERMISSION_CATALOG,
  PUBLIC_API_PERMISSION_OPTIONS,
} from '@infinitech/admin-core';
import PageStateAlert from '@/components/PageStateAlert.vue';
import request from '@/utils/request';
import { useSettingsApiManagement } from './settingsApiManagementHelpers';

const router = useRouter();
const isMobile = ref(typeof window !== 'undefined' ? window.innerWidth <= 768 : false);
const permissionCatalog = PUBLIC_API_PERMISSION_CATALOG;
const permissionOptions = PUBLIC_API_PERMISSION_OPTIONS;

const {
  apiListError,
  apiList,
  apiListLoading,
  apiDialogVisible,
  editingApi,
  apiForm,
  savingApi,
  loadApiList,
  showAddApiDialog,
  editApi,
  deleteApi,
  saveApi,
  generateApiKey,
  copyApiKey,
  getPermissionLabel,
  handleApiPermissionChange,
  generateMarkdownDoc,
} = useSettingsApiManagement({
  request,
  router,
  ElMessage,
  ElMessageBox,
});

const summary = computed(() => {
  return buildPublicApiSummary(apiList.value);
});

function handleResize() {
  isMobile.value = window.innerWidth <= 768;
}

function goToDocumentation() {
  router.push('/api-documentation');
}

function downloadKeyDoc(row) {
  try {
    const content = generateMarkdownDoc(row);
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${row.name || 'api-key'}_说明.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    ElMessage.success('Key 说明已下载');
  } catch (error) {
    ElMessage.error(extractErrorMessage(error, '下载失败'));
  }
}

onMounted(() => {
  loadApiList();
  window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
});
</script>

<style scoped lang="css" src="./ApiPermissions.css"></style>
