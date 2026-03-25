<template src="./Users.template.html"></template>
<script setup>
import { ref, onMounted } from 'vue';
import request from '@/utils/request';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Search, Refresh, More, Delete, Sort, Plus } from '@element-plus/icons-vue';
import { formatRoleId } from '@/utils/format';
import PageStateAlert from '@/components/PageStateAlert.vue';
import ResponsiveActions from '@/components/ResponsiveActions.vue';
import { useResponsiveListPage } from '@/composables/useResponsiveListPage';

// 移动端检测
const loading = ref(false);
const loadError = ref('');
const users = ref([]);
const currentPage = ref(1);
const { isMobile, pageSize } = useResponsiveListPage({
  onModeChange: () => {
    currentPage.value = 1;
    dataCache.value.clear();
    loadUsers();
  }
});
const total = ref(0);
const searchKeyword = ref('');
const resettingPassword = ref(null);
const deletingUser = ref(null);
const deletingOrders = ref(null);
const addDialogVisible = ref(false);
const addingUser = ref(false);
const reorganizing = ref(false);
const clearing = ref(false);
const detailVisible = ref(false);
const detail = ref({});
const newUser = ref({
  phone: '',
  name: '',
  password: ''
});
const inviteDialogVisible = ref(false);
const creatingInvite = ref(false);
const inviteForm = ref({
  expires_hours: 72,
  max_uses: 1
});
const inviteResult = ref({
  invite_url: '',
  expires_at: '',
  max_uses: 1,
  used_count: 0,
  remaining_uses: 1
});

// 数据缓存：避免重复加载相同页面的数据
const dataCache = ref(new Map());
const cacheKey = () => {
  return `${currentPage.value}-${pageSize.value}-${searchKeyword.value || ''}`;
};

onMounted(async () => {
  loadUsers();
});

async function loadUsers(forceRefresh = false) {
  loadError.value = '';
  // 检查缓存，如果已有数据且不是强制刷新，则直接使用缓存
  const key = cacheKey();
  if (!forceRefresh && dataCache.value.has(key)) {
    const cached = dataCache.value.get(key);
    users.value = cached.users;
    total.value = cached.total;
    return;
  }
  
  loading.value = true;
  try {
    const params = {
      page: currentPage.value,
      limit: pageSize.value,
      type: 'customer' // 只获取客户类型
    };
    
    if (searchKeyword.value) {
      params.search = searchKeyword.value;
    }
    
    const { data } = await request.get('/api/users', { params });
    
    if (data && data.users) {
      users.value = data.users;
      total.value = data.total || 0;
      // 缓存数据
      dataCache.value.set(key, {
        users: [...data.users],
        total: data.total || 0
      });
      // 限制缓存大小，最多缓存20页数据
      if (dataCache.value.size > 20) {
        const firstKey = dataCache.value.keys().next().value;
        dataCache.value.delete(firstKey);
      }
    } else {
      users.value = [];
      total.value = 0;
    }
  } catch (e) {
    console.error('加载用户失败:', e);
    loadError.value = e?.response?.data?.error || e?.message || '加载用户失败，请稍后重试';
    users.value = [];
    total.value = 0;
  } finally {
    loading.value = false;
  }
}

function handleSearch() {
  currentPage.value = 1;
  dataCache.value.clear(); // 搜索时清空缓存
  loadUsers();
}

function handlePageChange(page) {
  currentPage.value = page;
  loadUsers(); // 使用缓存，如果该页已加载过则直接显示
}

function handleSizeChange(size) {
  pageSize.value = size;
  currentPage.value = 1;
  dataCache.value.clear(); // 分页大小改变时清空缓存
  loadUsers();
}

function handleMobileAction(command) {
  switch (command) {
    case 'reorganize':
      handleReorganizeIds();
      break;
    case 'add':
      showAddDialog();
      break;
    case 'invite':
      openInviteDialog();
      break;
    case 'clear':
      handleClearAllUsers();
      break;
  }
}

function formatTime(timeStr) {
  if (!timeStr) return '-';
  const date = new Date(timeStr);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

function vipTagType(level) {
  switch (level) {
    case '至尊VIP':
      return 'warning';
    case '尊贵VIP':
      return 'danger';
    case '黄金VIP':
      return 'success';
    case '优质VIP':
      return 'info';
    default:
      return '';
  }
}

async function handleResetPassword(user) {
  try {
    await ElMessageBox.confirm(
      `确定要重置用户"${user.name || user.phone}"的密码吗？`,
      '确认重置密码',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    );

    resettingPassword.value = user.id;
    try {
      const { data } = await request.post(`/api/users/${user.id}/reset-password`);
      
      if (data.success) {
        ElMessageBox.alert(
          `密码重置成功！新密码为：<strong style="font-size: 20px; color: #409eff;">${data.newPassword}</strong><br/><br/>请告知用户使用新密码登录。`,
          '密码重置成功',
          {
            confirmButtonText: '确定',
            dangerouslyUseHTMLString: true,
            type: 'success'
          }
        );
      }
    } catch (e) {
      console.error('重置密码失败:', e);
      ElMessage.error(e.response?.data?.error || '重置密码失败');
    } finally {
      resettingPassword.value = null;
    }
  } catch (e) {
    // 用户取消操作
  }
}

function showAddDialog() {
  newUser.value = {
    phone: '',
    name: '',
    password: ''
  };
  addDialogVisible.value = true;
}

function openInviteDialog() {
  inviteForm.value = {
    expires_hours: 72,
    max_uses: 1
  };
  inviteResult.value = {
    invite_url: '',
    expires_at: '',
    max_uses: 1,
    used_count: 0,
    remaining_uses: 1
  };
  inviteDialogVisible.value = true;
}

async function createInviteLink() {
  creatingInvite.value = true;
  try {
    const { data } = await request.post('/api/admin/onboarding/invites', {
      invite_type: 'old_user',
      expires_hours: Number(inviteForm.value.expires_hours || 72),
      max_uses: Number(inviteForm.value.max_uses || 1)
    });
    const payload = data?.data || {};
    inviteResult.value = {
      invite_url: payload.invite_url || '',
      expires_at: payload.expires_at || '',
      max_uses: Number(payload.max_uses || inviteForm.value.max_uses || 1),
      used_count: Number(payload.used_count || 0),
      remaining_uses: Number(payload.remaining_uses || 0)
    };
    if (inviteResult.value.invite_url) {
      ElMessage.success('邀请链接生成成功');
    } else {
      ElMessage.error('邀请链接生成失败');
    }
  } catch (error) {
    ElMessage.error(error?.response?.data?.error || '邀请链接生成失败');
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

function formatInviteDateTime(value) {
  if (!value) {
    return '-';
  }
  return formatTime(value);
}

function getInviteRemainingUses() {
  if (Number.isFinite(Number(inviteResult.value.remaining_uses))) {
    return Number(inviteResult.value.remaining_uses);
  }
  const maxUses = Number(inviteResult.value.max_uses || 1);
  const usedCount = Number(inviteResult.value.used_count || 0);
  return Math.max(0, maxUses - usedCount);
}

async function handleAddUser() {
  if (!newUser.value.phone || !newUser.value.name || !newUser.value.password) {
    ElMessage.warning('请填写完整信息');
    return;
  }

  if (!/^1[3-9]\d{9}$/.test(newUser.value.phone)) {
    ElMessage.warning('请输入正确的手机号');
    return;
  }

  if (newUser.value.password.length < 6) {
    ElMessage.warning('密码至少需要6位');
    return;
  }

  addingUser.value = true;
  try {
    const { data } = await request.post('/api/users', {
      phone: newUser.value.phone,
      name: newUser.value.name,
      password: newUser.value.password,
      type: 'customer'
    });

      if (data.success) {
        ElMessage.success('新增用户成功');
        addDialogVisible.value = false;
        dataCache.value.clear(); // 新增用户后清空缓存
        await loadUsers(true);
      }
  } catch (e) {
    console.error('新增用户失败:', e);
    ElMessage.error(e.response?.data?.error || '新增用户失败');
  } finally {
    addingUser.value = false;
  }
}

async function handleReorganizeIds() {
  try {
    await ElMessageBox.confirm(
      '此操作将重新排列所有客户的ID（从1开始），按注册时间排序。是否继续？',
      '确认ID重组',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    );

    reorganizing.value = true;
    try {
      const { data } = await request.post('/api/reorganize-role-ids/customer');
      
      if (data.success) {
        ElMessage.success(data.message || 'ID重组成功');
        dataCache.value.clear(); // ID重组后清空缓存
        await loadUsers(true);
      }
    } catch (e) {
      console.error('ID重组失败:', e);
      ElMessage.error(e.response?.data?.error || 'ID重组失败');
    } finally {
      reorganizing.value = false;
    }
  } catch (e) {
    // 用户取消操作
  }
}

async function handleDeleteUserOrders(user) {
  try {
    await ElMessageBox.confirm(
      `确定要清除用户"${user.name || user.phone}"的所有相关订单吗？此操作不可恢复！`,
      '确认清除订单',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    );

    deletingOrders.value = user.id;
    try {
      const { data } = await request.post(`/api/users/${user.id}/delete-orders`);
      if (data.success) {
        ElMessage.success(data.message || `成功清除 ${data.deleted} 条订单`);
      } else {
        ElMessage.error(data.error || '清除订单失败');
      }
    } catch (e) {
      console.error('清除订单失败:', e);
      const errorMessage = e.response?.data?.error || e.message || '清除订单失败';
      ElMessage.error(errorMessage);
    } finally {
      deletingOrders.value = null;
    }
  } catch (e) {
    // 用户取消操作
  }
}

async function handleDeleteUser(user) {
  try {
    await ElMessageBox.confirm(
      `确定要删除用户"${user.name || user.phone}"吗？此操作不可恢复！`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    );

    deletingUser.value = user.id;
    try {
      const { data } = await request.delete(`/api/users/${user.id}`);
      if (data.success) {
        ElMessage.success('删除用户成功');
        dataCache.value.clear(); // 删除用户后清空缓存
        await loadUsers(true);
      } else {
        ElMessage.error(data.error || '删除用户失败');
      }
    } catch (e) {
      console.error('删除用户失败:', e);
      const errorMessage = e.response?.data?.error || e.message || '删除用户失败';
      ElMessage.error(errorMessage);
    } finally {
      deletingUser.value = null;
    }
  } catch (e) {
    // 用户取消操作
  }
}

function openDetail(row) {
  detail.value = { ...row };
  detailVisible.value = true;
}

async function handleClearAllUsers() {
  try {
    await ElMessageBox.confirm(
      '确定要清空所有用户吗？此操作将删除所有客户账户，不可恢复！',
      '确认清空',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    );

    clearing.value = true;
    try {
      const { data } = await request.post('/api/users/delete-all');
      if (data.success) {
        ElMessage.success(`成功清空 ${data.deleted || 0} 个用户`);
        dataCache.value.clear(); // 清空用户后清空缓存
        await loadUsers(true);
      }
    } catch (e) {
      console.error('清空用户失败:', e);
      ElMessage.error(e.response?.data?.error || '清空用户失败');
    } finally {
      clearing.value = false;
    }
  } catch (e) {
    // 用户取消操作
  }
}

</script>

<style scoped lang="css" src="./Users.css"></style>
