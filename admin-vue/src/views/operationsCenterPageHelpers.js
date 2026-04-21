import { computed, onMounted, ref, watch } from 'vue';
import {
  createOperationsGoodForm,
  createOperationsGoodFormState,
  extractOperationsCooperationPage,
  extractOperationsGoodsPage,
  extractOperationsInviteCodePage,
  extractOperationsInviteRecordPage,
  extractOperationsRedemptionPage,
  formatCooperationType,
  getCooperationTypeTagType,
} from '@infinitech/admin-core';
import { extractErrorMessage } from '@infinitech/contracts';

const COOPERATION_STATUS_OPTIONS = Object.freeze([
  { label: '待处理', value: 'pending' },
  { label: '跟进中', value: 'processing' },
  { label: '已完成', value: 'done' },
]);

const REDEMPTION_STATUS_OPTIONS = Object.freeze([
  { label: '待处理', value: 'pending' },
  { label: '已发货', value: 'shipped' },
  { label: '已完成', value: 'completed' },
  { label: '已取消', value: 'canceled' },
]);

const GOODS_TYPE_OPTIONS = Object.freeze([
  { label: '实物', value: 'goods' },
  { label: 'VIP', value: 'vip' },
]);

export function useOperationsCenterPage({ request, ElMessage, ElMessageBox }) {
  const activeTab = ref('cooperation');
  const loading = ref(false);
  const loadError = ref('');

  const cooperations = ref([]);
  const inviteCodes = ref([]);
  const inviteRecords = ref([]);
  const redemptions = ref([]);
  const goods = ref([]);

  const goodDialogVisible = ref(false);
  const goodForm = ref(createOperationsGoodForm());
  const savingGood = ref(false);

  const pageError = computed(() => loadError.value);

  function clearLoadError() {
    loadError.value = '';
  }

  async function refreshCurrent() {
    clearLoadError();
    if (activeTab.value === 'cooperation') {
      return loadCooperations();
    }
    if (activeTab.value === 'invite') {
      return loadInvites();
    }
    if (activeTab.value === 'redemption') {
      return loadRedemptions();
    }
    if (activeTab.value === 'goods') {
      return loadGoods();
    }
    return Promise.resolve();
  }

  async function loadCooperations() {
    clearLoadError();
    loading.value = true;
    try {
      const { data } = await request.get('/api/cooperations');
      cooperations.value = extractOperationsCooperationPage(data).items;
    } catch (error) {
      cooperations.value = [];
      loadError.value = extractErrorMessage(error, '加载反馈与合作失败，请稍后重试');
    } finally {
      loading.value = false;
    }
  }

  async function updateCooperation(row) {
    try {
      await request.put(`/api/cooperations/${row.id}`, {
        status: row.status,
        remark: row.admin_remark || '',
      });
      ElMessage.success('状态已更新');
    } catch (error) {
      await loadCooperations();
      ElMessage.error(`更新失败：${extractErrorMessage(error, '请求异常')}`);
    }
  }

  async function loadInvites() {
    clearLoadError();
    loading.value = true;
    try {
      const [codesRes, recordsRes] = await Promise.all([
        request.get('/api/invite/codes'),
        request.get('/api/invite/records'),
      ]);
      inviteCodes.value = extractOperationsInviteCodePage(codesRes.data).items;
      inviteRecords.value = extractOperationsInviteRecordPage(recordsRes.data).items;
    } catch (error) {
      inviteCodes.value = [];
      inviteRecords.value = [];
      loadError.value = extractErrorMessage(error, '加载邀请数据失败，请稍后重试');
    } finally {
      loading.value = false;
    }
  }

  async function loadRedemptions() {
    clearLoadError();
    loading.value = true;
    try {
      const { data } = await request.get('/api/points/redemptions');
      redemptions.value = extractOperationsRedemptionPage(data).items;
    } catch (error) {
      redemptions.value = [];
      loadError.value = extractErrorMessage(error, '加载兑换记录失败，请稍后重试');
    } finally {
      loading.value = false;
    }
  }

  async function updateRedemption(row) {
    try {
      await request.put(`/api/points/redemptions/${row.id}`, { status: row.status });
      ElMessage.success('状态已更新');
    } catch (error) {
      await loadRedemptions();
      ElMessage.error(`更新失败：${extractErrorMessage(error, '请求异常')}`);
    }
  }

  async function loadGoods() {
    clearLoadError();
    loading.value = true;
    try {
      const { data } = await request.get('/api/points/goods', { params: { all: 1 } });
      goods.value = extractOperationsGoodsPage(data).items;
    } catch (error) {
      goods.value = [];
      loadError.value = extractErrorMessage(error, '加载积分商品失败，请稍后重试');
    } finally {
      loading.value = false;
    }
  }

  function openGoodDialog(row) {
    goodForm.value = createOperationsGoodFormState(row);
    goodDialogVisible.value = true;
  }

  function closeGoodDialog() {
    goodDialogVisible.value = false;
    goodForm.value = createOperationsGoodForm();
  }

  async function saveGood() {
    if (savingGood.value) {
      return;
    }

    const payload = { ...goodForm.value };
    savingGood.value = true;
    try {
      if (payload.id) {
        await request.put(`/api/points/goods/${payload.id}`, payload);
      } else {
        await request.post('/api/points/goods', payload);
      }
      ElMessage.success('保存成功');
      closeGoodDialog();
      await loadGoods();
    } catch (error) {
      ElMessage.error(`保存失败：${extractErrorMessage(error, '请求异常')}`);
    } finally {
      savingGood.value = false;
    }
  }

  async function toggleGood(row) {
    const previousValue = !row.is_active;
    try {
      await request.put(`/api/points/goods/${row.id}`, { is_active: row.is_active });
      ElMessage.success('已更新');
    } catch (error) {
      row.is_active = previousValue;
      ElMessage.error(`更新失败：${extractErrorMessage(error, '请求异常')}`);
    }
  }

  function deleteGood(row) {
    ElMessageBox.confirm('确认删除该商品吗？', '提示', { type: 'warning' })
      .then(async () => {
        await request.delete(`/api/points/goods/${row.id}`);
        ElMessage.success('删除成功');
        await loadGoods();
      })
      .catch((error) => {
        if (error !== 'cancel' && error !== 'close') {
          ElMessage.error(`删除失败：${extractErrorMessage(error, '请求异常')}`);
        }
      });
  }

  onMounted(refreshCurrent);

  watch(activeTab, () => {
    refreshCurrent();
  });

  return {
    activeTab,
    cooperationStatusOptions: COOPERATION_STATUS_OPTIONS,
    cooperations,
    formatCooperationType,
    getCooperationTypeTagType,
    goodDialogVisible,
    goodForm,
    goods,
    goodsTypeOptions: GOODS_TYPE_OPTIONS,
    inviteCodes,
    inviteRecords,
    loadError,
    loading,
    openGoodDialog,
    pageError,
    redemptionStatusOptions: REDEMPTION_STATUS_OPTIONS,
    redemptions,
    refreshCurrent,
    saveGood,
    savingGood,
    toggleGood,
    deleteGood,
    updateCooperation,
    updateRedemption,
    closeGoodDialog,
  };
}
