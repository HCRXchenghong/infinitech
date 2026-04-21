import { onMounted, ref } from 'vue';
import {
  extractAdminMerchantPage,
  extractMerchantShopPage,
  extractTemporaryCredential,
} from '@infinitech/admin-core';
import {
  createDefaultInviteLinkForm,
  createEmptyInviteLinkResult,
  createOnboardingInviteApi,
  getInviteRemainingUses as resolveInviteRemainingUses,
} from '@infinitech/client-sdk';
import { extractErrorMessage } from '@infinitech/contracts';

function createEmptyMerchantForm() {
  return {
    name: '',
    owner_name: '',
    phone: '',
    password: '',
  };
}

function normalizeMerchantCreateForm(form = {}) {
  return {
    name: String(form.name || '').trim(),
    owner_name: String(form.owner_name || '').trim(),
    phone: String(form.phone || '').trim(),
    password: String(form.password || ''),
  };
}

function validateMerchantCreateForm(form = {}) {
  const normalized = normalizeMerchantCreateForm(form);
  if (
    !normalized.name ||
    !normalized.owner_name ||
    !normalized.phone ||
    !normalized.password
  ) {
    return {
      valid: false,
      message: '请完整填写商户信息',
      normalized,
    };
  }
  if (!/^1[3-9]\d{9}$/.test(normalized.phone)) {
    return {
      valid: false,
      message: '请输入正确的手机号',
      normalized,
    };
  }
  if (normalized.password.length < 6) {
    return {
      valid: false,
      message: '密码至少6位',
      normalized,
    };
  }
  return {
    valid: true,
    message: '',
    normalized,
  };
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

export function useMerchantsPage({
  router,
  request,
  ElMessage,
  ElMessageBox,
  downloadCredentialReceipt,
  navigatorClipboard,
}) {
  const loading = ref(false);
  const loadError = ref('');
  const merchants = ref([]);
  const total = ref(0);
  const currentPage = ref(1);
  const pageSize = ref(10);
  const searchKeyword = ref('');

  const createDialogVisible = ref(false);
  const creating = ref(false);
  const createForm = ref(createEmptyMerchantForm());
  const inviteDialogVisible = ref(false);
  const creatingInvite = ref(false);
  const inviteForm = ref(createDefaultInviteLinkForm());
  const inviteResult = ref(createEmptyInviteLinkResult());

  const onboardingInviteApi = createOnboardingInviteApi({
    get: (url, config) => request.get(url, config),
    post: (url, payload, config) => request.post(url, payload, config),
  });

  function setSearchKeyword(value) {
    searchKeyword.value = String(value || '');
  }

  async function resolveMerchantShopCount(merchant = {}) {
    const normalizedCount = Number(merchant.shopCount || merchant.shop_count || 0);
    if (normalizedCount > 0 || merchant.shop_count !== undefined) {
      return normalizedCount;
    }

    try {
      const shopsRes = await request.get(`/api/merchants/${merchant.id}/shops`);
      const page = extractMerchantShopPage(shopsRes.data);
      return Number(page.total || page.items.length || 0);
    } catch (_error) {
      return normalizedCount;
    }
  }

  async function hydrateMerchantShopCounts(items = []) {
    if (!Array.isArray(items) || items.length === 0) {
      return [];
    }

    return Promise.all(
      items.map(async (merchant) => ({
        ...merchant,
        shopCount: await resolveMerchantShopCount(merchant),
      })),
    );
  }

  async function loadMerchants() {
    loading.value = true;
    loadError.value = '';

    try {
      const params = {
        page: currentPage.value,
        limit: pageSize.value,
      };
      const keyword = String(searchKeyword.value || '').trim();
      if (keyword) {
        params.search = keyword;
      }

      const { data } = await request.get('/api/merchants', { params });
      const page = extractAdminMerchantPage(data);
      merchants.value = await hydrateMerchantShopCounts(page.items);
      total.value = Number(page.total || 0);
    } catch (error) {
      loadError.value = extractErrorMessage(error, '加载商户列表失败，请稍后重试');
      merchants.value = [];
      total.value = 0;
      ElMessage.error(loadError.value);
    } finally {
      loading.value = false;
    }
  }

  function handleSearch() {
    currentPage.value = 1;
    loadMerchants();
  }

  function handlePageChange(page) {
    currentPage.value = page;
    loadMerchants();
  }

  function handleSizeChange(size) {
    pageSize.value = size;
    currentPage.value = 1;
    loadMerchants();
  }

  function goDetail(merchant) {
    router.push(`/merchants/${merchant.id}`);
  }

  function openCreateDialog() {
    createForm.value = createEmptyMerchantForm();
    createDialogVisible.value = true;
  }

  function closeCreateDialog() {
    createDialogVisible.value = false;
    createForm.value = createEmptyMerchantForm();
  }

  function openInviteDialog() {
    inviteForm.value = createDefaultInviteLinkForm();
    inviteResult.value = createEmptyInviteLinkResult();
    inviteDialogVisible.value = true;
  }

  function closeInviteDialog() {
    inviteDialogVisible.value = false;
    inviteForm.value = createDefaultInviteLinkForm();
    inviteResult.value = createEmptyInviteLinkResult();
  }

  async function submitCreate() {
    const validation = validateMerchantCreateForm(createForm.value);
    if (!validation.valid) {
      ElMessage.warning(validation.message);
      return;
    }

    creating.value = true;
    try {
      await request.post('/api/merchants', validation.normalized);
      ElMessage.success('商户创建成功');
      closeCreateDialog();
      await loadMerchants();
    } catch (error) {
      ElMessage.error(extractErrorMessage(error, '创建商户失败'));
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
          cancelButtonText: '取消',
        },
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
        ElMessage.error(extractErrorMessage(error, '重置密码失败'));
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
          cancelButtonText: '取消',
        },
      );
      await request.delete(`/api/merchants/${merchant.id}`);
      if (merchants.value.length === 1 && currentPage.value > 1) {
        currentPage.value -= 1;
      }
      ElMessage.success('删除成功');
      await loadMerchants();
    } catch (error) {
      if (error !== 'cancel') {
        ElMessage.error(extractErrorMessage(error, '删除商户失败'));
      }
    }
  }

  onMounted(() => {
    loadMerchants();
  });

  return {
    closeCreateDialog,
    closeInviteDialog,
    copyInviteUrl,
    createDialogVisible,
    createForm,
    createInviteLink,
    creating,
    creatingInvite,
    currentPage,
    deleteMerchant,
    formatDateTime,
    getInviteRemainingUses,
    goDetail,
    handlePageChange,
    handleSearch,
    handleSizeChange,
    inviteDialogVisible,
    inviteForm,
    inviteResult,
    loadError,
    loadMerchants,
    loading,
    merchants,
    openCreateDialog,
    openInviteDialog,
    pageSize,
    resetPassword,
    searchKeyword,
    setSearchKeyword,
    submitCreate,
    total,
  };
}
