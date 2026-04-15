<template>
  <div class="merchants-page">
    <div class="panel">
      <div class="panel-header">
        <div class="panel-title">商户管理</div>
        <div class="panel-actions">
          <el-input
            v-model="searchKeyword"
            placeholder="搜索商户名称/负责人/手机号"
            size="small"
            style="width: 260px"
            clearable
            @keyup.enter="handleSearch"
          />
          <el-button size="small" @click="handleSearch">搜索</el-button>
          <el-button size="small" @click="loadMerchants" :loading="loading">刷新</el-button>
          <el-button type="primary" size="small" @click="openCreateDialog">新增商户</el-button>
          <el-button type="success" size="small" @click="openInviteDialog">链接邀请</el-button>
        </div>
      </div>

      <PageStateAlert :message="loadError" />

      <el-table :data="merchants" stripe size="small" v-loading="loading">
        <el-table-column label="商户ID" width="150" show-overflow-tooltip>
          <template #default="{ row }">
            <span class="merchant-id-text">{{ row.id }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="name" label="商户名称" min-width="180" />
        <el-table-column prop="owner_name" label="负责人" min-width="140" />
        <el-table-column prop="phone" label="手机号" width="150" />
        <el-table-column label="店铺数量" width="100" align="center">
          <template #default="{ row }">
            <span class="shop-count">{{ row.shopCount }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="240" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" text size="small" @click="goDetail(row)">详情</el-button>
            <el-button type="primary" link size="small" @click="resetPassword(row)">重置密码</el-button>
            <el-button type="danger" link size="small" @click="deleteMerchant(row)">删除</el-button>
          </template>
        </el-table-column>
        <template #empty>
          <el-empty :description="loadError ? '加载失败，暂无可显示数据' : '暂无商户数据'" :image-size="90" />
        </template>
      </el-table>

      <div class="pagination-container">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 30, 50]"
          :total="total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handlePageChange"
        />
      </div>
    </div>

    <el-dialog v-model="createDialogVisible" title="新增商户" width="520px" :close-on-click-modal="false">
      <el-form :model="createForm" label-width="100px">
        <el-form-item label="商户名称" required>
          <el-input v-model="createForm.name" placeholder="请输入商户名称" />
        </el-form-item>
        <el-form-item label="负责人" required>
          <el-input v-model="createForm.owner_name" placeholder="请输入负责人姓名" />
        </el-form-item>
        <el-form-item label="手机号" required>
          <el-input v-model="createForm.phone" placeholder="请输入手机号" />
        </el-form-item>
        <el-form-item label="登录密码" required>
          <el-input v-model="createForm.password" type="password" placeholder="至少6位密码" show-password />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="creating" @click="submitCreate">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="inviteDialogVisible" title="商户邀请链接" width="620px" :close-on-click-modal="false">
      <el-form :model="inviteForm" label-width="110px">
        <el-form-item label="有效期(小时)">
          <el-input-number v-model="inviteForm.expires_hours" :min="1" :max="720" />
        </el-form-item>
        <el-form-item label="可用次数">
          <el-input-number v-model="inviteForm.max_uses" :min="1" :max="1000" />
        </el-form-item>
        <el-form-item label="邀请链接" v-if="inviteResult.invite_url">
          <el-input v-model="inviteResult.invite_url" readonly />
        </el-form-item>
        <el-form-item label="状态" v-if="inviteResult.invite_url">
          <span class="invite-meta">总次数：{{ inviteResult.max_uses || 1 }}，剩余：{{ getInviteRemainingUses() }}，过期时间：{{ formatDateTime(inviteResult.expires_at) }}</span>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="inviteDialogVisible = false">关闭</el-button>
        <el-button v-if="inviteResult.invite_url" @click="copyInviteUrl">复制链接</el-button>
        <el-button type="primary" :loading="creatingInvite" @click="createInviteLink">生成链接</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { extractTemporaryCredential } from '@infinitech/admin-core';
import {
  createDefaultInviteLinkForm,
  createEmptyInviteLinkResult,
  createOnboardingInviteApi,
  getInviteRemainingUses as resolveInviteRemainingUses,
} from '@infinitech/client-sdk';
import { extractErrorMessage } from '@infinitech/contracts';
import request from '@/utils/request';
import { downloadCredentialReceipt } from '@/utils/credentialReceipt';
import PageStateAlert from '@/components/PageStateAlert.vue';

const router = useRouter();

const loading = ref(false);
const loadError = ref('');
const merchants = ref([]);
const total = ref(0);
const currentPage = ref(1);
const pageSize = ref(10);
const searchKeyword = ref('');

const createDialogVisible = ref(false);
const creating = ref(false);
const createForm = ref({
  name: '',
  owner_name: '',
  phone: '',
  password: ''
});
const inviteDialogVisible = ref(false);
const creatingInvite = ref(false);
const inviteForm = ref(createDefaultInviteLinkForm());
const inviteResult = ref(createEmptyInviteLinkResult());
const onboardingInviteApi = createOnboardingInviteApi({
  get: (url, config) => request.get(url, config),
  post: (url, payload, config) => request.post(url, payload, config),
});

onMounted(() => {
  loadMerchants();
});

function normalizeMerchant(raw) {
  return {
    ...raw,
    owner_name: raw.owner_name || raw.name || '',
    shopCount: 0
  };
}

async function loadMerchants() {
  loading.value = true;
  loadError.value = '';
  try {
    const params = {
      page: currentPage.value,
      limit: pageSize.value
    };
    if (searchKeyword.value) {
      params.search = searchKeyword.value;
    }

    const { data } = await request.get('/api/merchants', { params });
    const list = Array.isArray(data?.merchants) ? data.merchants.map(normalizeMerchant) : [];

    const listWithCount = await Promise.all(
      list.map(async (merchant) => {
        try {
          const shopsRes = await request.get(`/api/merchants/${merchant.id}/shops`);
          const shops = shopsRes?.data?.shops || [];
          return {
            ...merchant,
            shopCount: Array.isArray(shops) ? shops.length : 0
          };
        } catch (err) {
          return {
            ...merchant,
            shopCount: 0
          };
        }
      })
    );

    merchants.value = listWithCount;
    total.value = Number(data?.total || 0);
  } catch (error) {
    console.error('加载商户列表失败:', error);
    loadError.value = error?.response?.data?.error || error?.message || '加载商户列表失败，请稍后重试';
    ElMessage.error(error?.response?.data?.error || '加载商户列表失败');
    merchants.value = [];
    total.value = 0;
  } finally {
    loading.value = false;
  }
}

function handleSearch() {
  currentPage.value = 1;
  loadMerchants();
}

function handlePageChange() {
  loadMerchants();
}

function handleSizeChange() {
  currentPage.value = 1;
  loadMerchants();
}

function goDetail(merchant) {
  router.push(`/merchants/${merchant.id}`);
}

function openCreateDialog() {
  createForm.value = {
    name: '',
    owner_name: '',
    phone: '',
    password: ''
  };
  createDialogVisible.value = true;
}

function openInviteDialog() {
  inviteForm.value = createDefaultInviteLinkForm();
  inviteResult.value = createEmptyInviteLinkResult();
  inviteDialogVisible.value = true;
}

async function submitCreate() {
  if (!createForm.value.name || !createForm.value.owner_name || !createForm.value.phone || !createForm.value.password) {
    ElMessage.warning('请完整填写商户信息');
    return;
  }
  if (!/^1[3-9]\d{9}$/.test(createForm.value.phone)) {
    ElMessage.warning('请输入正确的手机号');
    return;
  }
  if (createForm.value.password.length < 6) {
    ElMessage.warning('密码至少6位');
    return;
  }

  creating.value = true;
  try {
    await request.post('/api/merchants', createForm.value);
    ElMessage.success('商户创建成功');
    createDialogVisible.value = false;
    loadMerchants();
  } catch (error) {
    console.error('创建商户失败:', error);
    ElMessage.error(error?.response?.data?.error || '创建商户失败');
  } finally {
    creating.value = false;
  }
}

async function createInviteLink() {
  creatingInvite.value = true;
  try {
    inviteResult.value = await onboardingInviteApi.createAdminInvite({
      invite_type: 'merchant',
      expires_hours: Number(inviteForm.value.expires_hours || 72),
      max_uses: Number(inviteForm.value.max_uses || 1)
    });
    if (inviteResult.value.invite_url) {
      ElMessage.success('邀请链接生成成功');
    } else {
      ElMessage.error('邀请链接生成失败');
    }
  } catch (error) {
    ElMessage.error(extractErrorMessage(error, '邀请链接生成失败'));
  } finally {
    creatingInvite.value = false;
  }
}

async function copyInviteUrl() {
  const url = inviteResult.value.invite_url;
  if (!url) {
    ElMessage.warning('请先生成邀请链接');
    return;
  }
  try {
    await navigator.clipboard.writeText(url);
    ElMessage.success('邀请链接已复制');
  } catch (error) {
    ElMessage.error('复制失败，请手动复制');
  }
}

function formatDateTime(value) {
  if (!value) {
    return '-';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  const pad = (num) => String(num).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function getInviteRemainingUses() {
  return resolveInviteRemainingUses(inviteResult.value);
}

async function resetPassword(merchant) {
  try {
    await ElMessageBox.confirm(
      `确定重置商户“${merchant.name}”的密码？`,
      '重置密码',
      {
        type: 'warning',
        confirmButtonText: '确定',
        cancelButtonText: '取消'
      }
    );

    const { data } = await request.post(`/api/merchants/${merchant.id}/reset-password`);
    const credential = extractTemporaryCredential(data);
    if (!credential) {
      throw new Error('后端未返回新的临时密码，请检查重置口令流程');
    }
    const filename = downloadCredentialReceipt({
      scene: 'merchant-reset-password',
      subject: `商户 ${merchant.name || merchant.phone || merchant.id}`,
      account: merchant.phone || String(merchant.id || ''),
      temporaryPassword: credential.temporaryPassword,
    });
    ElMessage.success(`商户密码已重置，并已下载安全回执 ${filename}`);
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error?.response?.data?.error || '重置密码失败');
    }
  }
}

async function deleteMerchant(merchant) {
  try {
    await ElMessageBox.confirm(
      `删除商户“${merchant.name}”后将不可恢复，是否继续？`,
      '确认删除',
      {
        type: 'warning',
        confirmButtonText: '确定',
        cancelButtonText: '取消'
      }
    );
    await request.delete(`/api/merchants/${merchant.id}`);
    ElMessage.success('删除成功');
    loadMerchants();
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error?.response?.data?.error || '删除商户失败');
    }
  }
}
</script>

<style scoped>
.merchants-page {
  min-height: calc(100vh - 170px);
}

.panel {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
}

.panel-title {
  font-size: 18px;
  font-weight: 700;
}

.panel-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.pagination-container {
  margin-top: 14px;
  display: flex;
  justify-content: flex-end;
}

.shop-count {
  font-weight: 700;
  color: #409eff;
}

.merchant-id-text {
  display: inline-block;
  max-width: 100%;
  white-space: nowrap;
  word-break: normal;
}

.invite-meta {
  color: #606266;
  font-size: 13px;
}
</style>
