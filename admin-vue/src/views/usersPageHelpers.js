import { onMounted, ref } from 'vue';
import {
  ADMIN_USER_CACHE_LIMIT,
  buildAdminUserCreatePayload,
  createAdminUserCacheKey,
  createAdminUserListParams,
  createEmptyAdminUserForm,
  extractAdminUserPage,
  extractTemporaryCredential,
  formatAdminUserDateTime,
  getAdminUserVipLabel,
  getAdminUserVipTagType,
  validateAdminUserCreateForm,
} from '@infinitech/admin-core';
import {
  createDefaultInviteLinkForm,
  createEmptyInviteLinkResult,
  createOnboardingInviteApi,
  getInviteRemainingUses as resolveInviteRemainingUses,
} from '@infinitech/client-sdk';
import { extractErrorMessage } from '@infinitech/contracts';
import { formatRoleId } from '@/utils/format';
import { useResponsiveListPage } from '@/composables/useResponsiveListPage';

export function useUsersPage({
  request,
  ElMessage,
  ElMessageBox,
  downloadCredentialReceipt,
  navigatorClipboard,
}) {
  const loading = ref(false);
  const loadError = ref('');
  const users = ref([]);
  const currentPage = ref(1);
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
  const newUser = ref(createEmptyAdminUserForm());
  const inviteDialogVisible = ref(false);
  const creatingInvite = ref(false);
  const inviteForm = ref(createDefaultInviteLinkForm());
  const inviteResult = ref(createEmptyInviteLinkResult());
  const dataCache = ref(new Map());

  const { isMobile, pageSize } = useResponsiveListPage({
    onModeChange: () => {
      currentPage.value = 1;
      clearUserCache();
      loadUsers();
    },
  });

  const onboardingInviteApi = createOnboardingInviteApi({
    get: (url, config) => request.get(url, config),
    post: (url, payload, config) => request.post(url, payload, config),
  });

  function clearUserCache() {
    dataCache.value.clear();
  }

  function cacheKey() {
    return createAdminUserCacheKey({
      page: currentPage.value,
      limit: pageSize.value,
      searchKeyword: searchKeyword.value,
    });
  }

  async function loadUsers(forceRefresh = false) {
    loadError.value = '';
    const key = cacheKey();
    if (!forceRefresh && dataCache.value.has(key)) {
      const cached = dataCache.value.get(key);
      users.value = cached.users;
      total.value = cached.total;
      return;
    }

    loading.value = true;
    try {
      const params = createAdminUserListParams({
        page: currentPage.value,
        limit: pageSize.value,
        searchKeyword: searchKeyword.value,
      });
      const { data } = await request.get('/api/users', { params });
      const page = extractAdminUserPage(data);

      users.value = page.items;
      total.value = page.total || 0;

      dataCache.value.set(key, {
        users: [...page.items],
        total: page.total || 0,
      });
      if (dataCache.value.size > ADMIN_USER_CACHE_LIMIT) {
        const firstKey = dataCache.value.keys().next().value;
        dataCache.value.delete(firstKey);
      }
    } catch (error) {
      console.error('加载用户失败:', error);
      loadError.value = extractErrorMessage(error, '加载用户失败，请稍后重试');
      users.value = [];
      total.value = 0;
    } finally {
      loading.value = false;
    }
  }

  function handleSearch() {
    currentPage.value = 1;
    clearUserCache();
    loadUsers();
  }

  function handlePageChange(page) {
    currentPage.value = page;
    loadUsers();
  }

  function handleSizeChange(size) {
    pageSize.value = size;
    currentPage.value = 1;
    clearUserCache();
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
      default:
        break;
    }
  }

  function formatTime(timeStr) {
    return formatAdminUserDateTime(timeStr);
  }

  function vipTagType(level) {
    return getAdminUserVipTagType(level);
  }

  function vipLabel(level) {
    return getAdminUserVipLabel(level);
  }

  async function handleResetPassword(user) {
    try {
      await ElMessageBox.confirm(
        `确定要重置用户"${user.name || user.phone}"的密码吗？`,
        '确认重置密码',
        {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning',
        },
      );

      resettingPassword.value = user.id;
      try {
        const { data } = await request.post(`/api/users/${user.id}/reset-password`);
        const credential = extractTemporaryCredential(data);
        if (!data.success || !credential) {
          throw new Error('后端未返回一次性临时口令');
        }
        const filename = downloadCredentialReceipt({
          scene: 'user-reset-password',
          subject: `用户 ${user.name || user.phone || user.id}`,
          account: user.phone || formatRoleId(user.id, 'user'),
          temporaryPassword: credential.temporaryPassword,
        });
        ElMessage.success(`密码已重置，并已下载安全回执 ${filename}`);
      } catch (error) {
        console.error('重置密码失败:', error);
        ElMessage.error(extractErrorMessage(error, '重置密码失败'));
      } finally {
        resettingPassword.value = null;
      }
    } catch (_error) {
      // 用户取消操作
    }
  }

  function showAddDialog() {
    newUser.value = createEmptyAdminUserForm();
    addDialogVisible.value = true;
  }

  function handleAddDialogClosed() {
    newUser.value = createEmptyAdminUserForm();
  }

  function openInviteDialog() {
    inviteForm.value = createDefaultInviteLinkForm();
    inviteResult.value = createEmptyInviteLinkResult();
    inviteDialogVisible.value = true;
  }

  function handleInviteDialogClosed() {
    inviteForm.value = createDefaultInviteLinkForm();
    inviteResult.value = createEmptyInviteLinkResult();
  }

  async function createInviteLink() {
    creatingInvite.value = true;
    try {
      inviteResult.value = await onboardingInviteApi.createAdminInvite({
        invite_type: 'old_user',
        expires_hours: Number(inviteForm.value.expires_hours || 72),
        max_uses: Number(inviteForm.value.max_uses || 1),
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
    if (!navigatorClipboard?.writeText) {
      ElMessage.error('当前环境不支持自动复制，请手动复制');
      return;
    }
    try {
      await navigatorClipboard.writeText(url);
      ElMessage.success('邀请链接已复制');
    } catch (_error) {
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
    return resolveInviteRemainingUses(inviteResult.value);
  }

  async function handleAddUser() {
    const validation = validateAdminUserCreateForm(newUser.value);
    if (!validation.valid) {
      ElMessage.warning(validation.message);
      return;
    }

    addingUser.value = true;
    try {
      const payload = buildAdminUserCreatePayload(newUser.value);
      const { data } = await request.post('/api/users', payload);

      if (data.success) {
        ElMessage.success('新增用户成功');
        addDialogVisible.value = false;
        clearUserCache();
        await loadUsers(true);
      }
    } catch (error) {
      console.error('新增用户失败:', error);
      ElMessage.error(extractErrorMessage(error, '新增用户失败'));
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
          type: 'warning',
        },
      );

      reorganizing.value = true;
      try {
        const { data } = await request.post('/api/reorganize-role-ids/customer');
        if (data.success) {
          ElMessage.success(data.message || 'ID重组成功');
          clearUserCache();
          await loadUsers(true);
        }
      } catch (error) {
        console.error('ID重组失败:', error);
        ElMessage.error(extractErrorMessage(error, 'ID重组失败'));
      } finally {
        reorganizing.value = false;
      }
    } catch (_error) {
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
          type: 'warning',
        },
      );

      deletingOrders.value = user.id;
      try {
        const { data } = await request.post(`/api/users/${user.id}/delete-orders`);
        if (data.success) {
          ElMessage.success(data.message || `成功清除 ${data.deleted} 条订单`);
        } else {
          ElMessage.error(data.error || '清除订单失败');
        }
      } catch (error) {
        console.error('清除订单失败:', error);
        ElMessage.error(extractErrorMessage(error, '清除订单失败'));
      } finally {
        deletingOrders.value = null;
      }
    } catch (_error) {
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
          type: 'warning',
        },
      );

      deletingUser.value = user.id;
      try {
        const { data } = await request.delete(`/api/users/${user.id}`);
        if (data.success) {
          if (users.value.length === 1 && currentPage.value > 1) {
            currentPage.value -= 1;
          }
          ElMessage.success('删除用户成功');
          clearUserCache();
          await loadUsers(true);
        } else {
          ElMessage.error(data.error || '删除用户失败');
        }
      } catch (error) {
        console.error('删除用户失败:', error);
        ElMessage.error(extractErrorMessage(error, '删除用户失败'));
      } finally {
        deletingUser.value = null;
      }
    } catch (_error) {
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
          type: 'warning',
        },
      );

      clearing.value = true;
      try {
        const { data } = await request.post('/api/users/delete-all');
        if (data.success) {
          currentPage.value = 1;
          ElMessage.success(`成功清空 ${data.deleted || 0} 个用户`);
          clearUserCache();
          await loadUsers(true);
        }
      } catch (error) {
        console.error('清空用户失败:', error);
        ElMessage.error(extractErrorMessage(error, '清空用户失败'));
      } finally {
        clearing.value = false;
      }
    } catch (_error) {
      // 用户取消操作
    }
  }

  onMounted(() => {
    loadUsers();
  });

  return {
    addDialogVisible,
    addingUser,
    clearing,
    copyInviteUrl,
    createInviteLink,
    creatingInvite,
    currentPage,
    deletingOrders,
    deletingUser,
    detail,
    detailVisible,
    formatInviteDateTime,
    formatTime,
    getInviteRemainingUses,
    handleAddDialogClosed,
    handleAddUser,
    handleClearAllUsers,
    handleDeleteUser,
    handleDeleteUserOrders,
    handleInviteDialogClosed,
    handleMobileAction,
    handlePageChange,
    handleReorganizeIds,
    handleResetPassword,
    handleSearch,
    handleSizeChange,
    inviteDialogVisible,
    inviteForm,
    inviteResult,
    isMobile,
    loadError,
    loadUsers,
    loading,
    newUser,
    openDetail,
    openInviteDialog,
    pageSize,
    reorganizing,
    resettingPassword,
    searchKeyword,
    showAddDialog,
    total,
    users,
    vipLabel,
    vipTagType,
  };
}
