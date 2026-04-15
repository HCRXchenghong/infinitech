<template>
  <div class="management-page">
    <div class="page-header">
      <div class="title-wrap">
        <span class="page-title">管理员账号管理</span>
        <span class="page-subtitle">管理中心仅保留管理员账号维护</span>
      </div>
      <div class="header-actions">
        <el-button size="small" @click="loadAll" :loading="loading">
          <el-icon><RefreshRight /></el-icon>
          刷新
        </el-button>
        <el-button type="primary" size="small" @click="showAddAdminDialog">
          <el-icon><Plus /></el-icon>
          添加管理员
        </el-button>
      </div>
    </div>

    <PageStateAlert :message="pageError" />

    <el-card class="panel-card">
      <template #header>
        <div class="account-toolbar">
          <div class="panel-title">管理员账号列表</div>
          <el-input
            v-model="keyword"
            size="small"
            clearable
            placeholder="按姓名或手机号搜索"
            style="width: 240px;"
          />
        </div>
      </template>

      <el-table :data="filteredAdmins" size="small" stripe v-loading="loadingAdmins" style="width: 100%;">
        <el-table-column type="index" label="#" width="60" />
        <el-table-column prop="phone" label="手机号" min-width="140" />
        <el-table-column prop="name" label="姓名" min-width="120" />
        <el-table-column label="角色" width="140">
          <template #default="{ row }">
            <el-tag :type="resolveRoleTagType(row.type)">{{ resolveRoleLabel(row.type) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="创建时间" min-width="170">
          <template #default="{ row }">
            {{ formatTime(row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="250">
          <template #default="{ row }">
            <div class="table-actions">
              <el-button size="small" @click="showEditAdminDialog(row)">编辑</el-button>
              <el-button size="small" type="warning" @click="handleResetPassword(row)">重置密码</el-button>
              <el-button size="small" type="danger" @click="handleDeleteAdmin(row)">删除</el-button>
            </div>
          </template>
        </el-table-column>
        <template #empty>
          <el-empty :description="adminsError ? '加载失败，暂无可显示数据' : '暂无管理员账号'" :image-size="90" />
        </template>
      </el-table>
    </el-card>

    <el-dialog
      v-model="adminDialogVisible"
      :title="editingAdmin ? '编辑管理员' : '添加管理员'"
      width="480px"
      :close-on-click-modal="false"
    >
      <el-form ref="adminFormRef" :model="adminForm" :rules="adminRules" label-width="80px">
        <el-form-item label="手机号" prop="phone">
          <el-input v-model="adminForm.phone" placeholder="请输入手机号" maxlength="11" />
        </el-form-item>
        <el-form-item label="姓名" prop="name">
          <el-input v-model="adminForm.name" placeholder="请输入姓名" />
        </el-form-item>
        <el-form-item v-if="!editingAdmin" label="密码" prop="password">
          <el-input v-model="adminForm.password" type="password" show-password placeholder="请输入密码" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="adminDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="savingAdmin" @click="handleSaveAdmin">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Plus, RefreshRight } from '@element-plus/icons-vue';
import { extractTemporaryCredential } from '@infinitech/admin-core';
import request from '@/utils/request';
import { downloadCredentialReceipt } from '@/utils/credentialReceipt';
import PageStateAlert from '@/components/PageStateAlert.vue';

const loading = ref(false);
const loadingAdmins = ref(false);
const admins = ref([]);
const adminsError = ref('');
const pageError = computed(() => adminsError.value || '');

const keyword = ref('');
const adminDialogVisible = ref(false);
const editingAdmin = ref(null);
const savingAdmin = ref(false);
const adminFormRef = ref();
const adminForm = reactive({
  phone: '',
  name: '',
  password: ''
});
const adminRules = {
  phone: [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '手机号格式不正确', trigger: 'blur' }
  ],
  name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
};

const filteredAdmins = computed(() => {
  const k = keyword.value.trim().toLowerCase();
  if (!k) return admins.value;
  return admins.value.filter((item) => {
    const phone = String(item?.phone || '').toLowerCase();
    const name = String(item?.name || '').toLowerCase();
    return phone.includes(k) || name.includes(k);
  });
});

onMounted(() => {
  loadAll();
});

function extractErrorMessage(error, fallback) {
  return error?.response?.data?.error || error?.response?.data?.message || error?.message || fallback;
}

function resolveAdminId(admin) {
  const id = admin?.id ?? admin?.legacyId;
  if (id === undefined || id === null || id === '') {
    return '';
  }
  return String(id);
}

function resolveRoleLabel(type) {
  const roleType = String(type || '').trim().toLowerCase();
  if (roleType === 'super_admin') return '超级管理员';
  if (roleType === 'admin') return '管理员';
  return roleType || '管理员';
}

function resolveRoleTagType(type) {
  const roleType = String(type || '').trim().toLowerCase();
  if (roleType === 'super_admin') return 'danger';
  if (roleType === 'admin') return '';
  return 'info';
}

async function loadAll() {
  loading.value = true;
  try {
    await loadAdmins();
  } finally {
    loading.value = false;
  }
}

async function loadAdmins() {
  adminsError.value = '';
  loadingAdmins.value = true;
  try {
    const { data } = await request.get('/api/admins');
    const payload = data?.data ?? data;
    admins.value = Array.isArray(payload) ? payload : [];
  } catch (error) {
    admins.value = [];
    adminsError.value = extractErrorMessage(error, '加载管理员账号失败，请稍后重试');
  } finally {
    loadingAdmins.value = false;
  }
}

function formatTime(raw) {
  if (!raw) return '-';
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const h = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${d} ${h}:${min}`;
}

function resetAdminForm() {
  adminForm.phone = '';
  adminForm.name = '';
  adminForm.password = '';
}

function showAddAdminDialog() {
  editingAdmin.value = null;
  resetAdminForm();
  adminDialogVisible.value = true;
}

function showEditAdminDialog(admin) {
  editingAdmin.value = admin;
  adminForm.phone = admin.phone;
  adminForm.name = admin.name;
  adminForm.password = '';
  adminDialogVisible.value = true;
}

async function handleSaveAdmin() {
  try {
    await adminFormRef.value?.validate();
  } catch (error) {
    return;
  }

  savingAdmin.value = true;
  try {
    if (editingAdmin.value) {
      const adminId = resolveAdminId(editingAdmin.value);
      if (!adminId) {
        ElMessage.error('管理员 ID 无效，无法更新');
        return;
      }
      await request.put(`/api/admins/${adminId}`, {
        phone: adminForm.phone,
        name: adminForm.name
      });
      ElMessage.success('管理员信息更新成功');
    } else {
      await request.post('/api/admins', {
        phone: adminForm.phone,
        name: adminForm.name,
        password: adminForm.password
      });
      ElMessage.success('管理员账号创建成功');
    }
    adminDialogVisible.value = false;
    await loadAdmins();
  } catch (error) {
    ElMessage.error(extractErrorMessage(error, '操作失败'));
  } finally {
    savingAdmin.value = false;
  }
}

async function handleDeleteAdmin(admin) {
  const adminId = resolveAdminId(admin);
  if (!adminId) {
    ElMessage.error('管理员 ID 无效，无法删除');
    return;
  }

  try {
    await ElMessageBox.confirm('确定要删除该管理员账号吗？', '提示', {
      type: 'warning'
    });
    await request.delete(`/api/admins/${adminId}`);
    ElMessage.success('管理员账号删除成功');
    await loadAdmins();
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(extractErrorMessage(error, '删除失败'));
    }
  }
}

async function handleResetPassword(admin) {
  const adminId = resolveAdminId(admin);
  if (!adminId) {
    ElMessage.error('管理员 ID 无效，无法重置密码');
    return;
  }

  try {
    await ElMessageBox.confirm(
      `确定重置 ${admin.name || admin.phone || '该管理员'} 的密码吗？`,
      '提示',
      { type: 'warning' }
    );
    const { data } = await request.post(`/api/admins/${adminId}/reset-password`, {});
    const credential = extractTemporaryCredential(data);
    if (credential) {
      const filename = downloadCredentialReceipt({
        scene: 'admin-reset-password',
        subject: `管理员 ${admin.name || admin.phone || adminId}`,
        account: admin.phone || String(adminId || ''),
        temporaryPassword: credential.temporaryPassword,
      });
      ElMessage.success(`管理员密码已重置，并已下载安全回执 ${filename}`);
    } else {
      ElMessage.success('密码重置成功');
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(extractErrorMessage(error, '重置密码失败'));
    }
  }
}
</script>

<style scoped>
.management-page {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  padding: 18px 20px;
  border-radius: 16px;
  background: linear-gradient(135deg, #f7fbff 0%, #edf4ff 52%, #f4f8ff 100%);
  border: 1px solid #dbe7ff;
}

.title-wrap {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.page-title {
  font-size: 22px;
  font-weight: 800;
  color: #1e293b;
  line-height: 1.2;
}

.page-subtitle {
  font-size: 13px;
  color: #64748b;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.panel-card {
  border-radius: 14px;
}

.panel-title {
  font-size: 15px;
  font-weight: 700;
  color: #1f2937;
}

.account-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}

.table-actions {
  display: flex;
  gap: 4px;
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .header-actions {
    width: 100%;
    justify-content: flex-end;
  }

  .account-toolbar {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
