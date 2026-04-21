import { computed, onMounted, reactive, ref } from 'vue';
import {
  ADMIN_MANAGEMENT_ROLE_OPTIONS,
  buildAdminManagementCredentialReceiptMeta,
  buildAdminManagementPayload,
  createAdminManagementFormRules,
  createAdminManagementFormState,
  extractTemporaryCredential,
  extractAdminManagementPage,
  filterAdminManagementRecords,
  formatAdminManagementTime,
  getAdminManagementDialogTitle,
  getAdminManagementRoleLabel,
  getAdminManagementRoleTagType,
  resolveAdminManagementId,
  validateAdminManagementPayload,
} from '@infinitech/admin-core';
import { extractErrorMessage } from '@infinitech/contracts';

export function useManagementCenterPage({
  request,
  ElMessage,
  ElMessageBox,
  downloadCredentialReceipt,
}) {
  const loading = ref(false);
  const loadingAdmins = ref(false);
  const admins = ref([]);
  const adminsError = ref('');
  const pageError = computed(() => adminsError.value || '');

  const keyword = ref('');
  const adminDialogVisible = ref(false);
  const editingAdmin = ref(null);
  const savingAdmin = ref(false);
  const adminForm = reactive(createAdminManagementFormState());
  const isEditingAdmin = computed(() => Boolean(editingAdmin.value));
  const adminRules = computed(() =>
    createAdminManagementFormRules({ requirePassword: !isEditingAdmin.value }),
  );
  const dialogTitle = computed(() => getAdminManagementDialogTitle(editingAdmin.value));
  const roleOptions = ADMIN_MANAGEMENT_ROLE_OPTIONS;

  const filteredAdmins = computed(() => {
    return filterAdminManagementRecords(admins.value, keyword.value);
  });

  function setKeyword(value) {
    keyword.value = String(value || '');
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
      admins.value = extractAdminManagementPage(data).items;
    } catch (error) {
      admins.value = [];
      adminsError.value = extractErrorMessage(error, '加载管理员账号失败，请稍后重试');
    } finally {
      loadingAdmins.value = false;
    }
  }

  function resetAdminForm() {
    Object.assign(adminForm, createAdminManagementFormState());
  }

  function closeAdminDialog() {
    adminDialogVisible.value = false;
    editingAdmin.value = null;
    resetAdminForm();
  }

  function showAddAdminDialog() {
    editingAdmin.value = null;
    resetAdminForm();
    adminDialogVisible.value = true;
  }

  function showEditAdminDialog(admin) {
    editingAdmin.value = admin;
    Object.assign(adminForm, createAdminManagementFormState(admin));
    adminDialogVisible.value = true;
  }

  async function saveAdmin(validateForm) {
    try {
      await validateForm?.();
    } catch (_error) {
      return;
    }

    const payload = buildAdminManagementPayload(adminForm, {
      includePassword: !isEditingAdmin.value,
    });
    const validationMessage = validateAdminManagementPayload(payload, {
      requirePassword: !isEditingAdmin.value,
    });
    if (validationMessage) {
      ElMessage.error(validationMessage);
      return;
    }

    savingAdmin.value = true;
    try {
      if (editingAdmin.value) {
        const adminId = resolveAdminManagementId(editingAdmin.value);
        if (!adminId) {
          ElMessage.error('管理员 ID 无效，无法更新');
          return;
        }
        await request.put(`/api/admins/${adminId}`, payload);
        ElMessage.success('管理员信息更新成功');
      } else {
        await request.post('/api/admins', payload);
        ElMessage.success('管理员账号创建成功');
      }
      closeAdminDialog();
      await loadAdmins();
    } catch (error) {
      ElMessage.error(extractErrorMessage(error, '操作失败'));
    } finally {
      savingAdmin.value = false;
    }
  }

  async function handleDeleteAdmin(admin) {
    const adminId = resolveAdminManagementId(admin);
    if (!adminId) {
      ElMessage.error('管理员 ID 无效，无法删除');
      return;
    }

    try {
      await ElMessageBox.confirm('确定要删除该管理员账号吗？', '提示', {
        type: 'warning',
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
    const adminId = resolveAdminManagementId(admin);
    if (!adminId) {
      ElMessage.error('管理员 ID 无效，无法重置密码');
      return;
    }

    try {
      await ElMessageBox.confirm(
        `确定重置 ${admin.name || admin.phone || '该管理员'} 的密码吗？`,
        '提示',
        { type: 'warning' },
      );
      const { data } = await request.post(`/api/admins/${adminId}/reset-password`, {});
      const credential = extractTemporaryCredential(data);
      if (credential) {
        const filename = downloadCredentialReceipt({
          ...buildAdminManagementCredentialReceiptMeta(admin),
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

  onMounted(() => {
    loadAll();
  });

  return {
    adminDialogVisible,
    adminForm,
    adminRules,
    adminsError,
    closeAdminDialog,
    dialogTitle,
    editingAdmin,
    filteredAdmins,
    formatTime: formatAdminManagementTime,
    handleDeleteAdmin,
    handleResetPassword,
    keyword,
    loadAll,
    loading,
    loadingAdmins,
    pageError,
    roleLabel: getAdminManagementRoleLabel,
    roleOptions,
    roleTagType: getAdminManagementRoleTagType,
    saveAdmin,
    savingAdmin,
    setKeyword,
    showAddAdminDialog,
    showEditAdminDialog,
  };
}
