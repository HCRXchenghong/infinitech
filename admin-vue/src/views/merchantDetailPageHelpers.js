import { computed, ref } from 'vue'
import {
  buildAdminMerchantShopCreatePayload,
  createAdminMerchantShopDraft,
} from '@infinitech/admin-core'
import { extractErrorMessage } from '@infinitech/contracts'

function normalizeMerchantId(merchant) {
  return String(merchant?.id || '').trim()
}

export function useMerchantDetailPage({
  props,
  emit,
  request,
  ElMessage,
  ElMessageBox,
}) {
  const activeTab = ref('basic')
  const loadError = ref('')
  const shopDialogVisible = ref(false)
  const shopDialogTitle = ref('新增店铺')
  const currentShop = ref(null)

  const merchantId = computed(() => normalizeMerchantId(props?.merchant))
  const shops = computed(() => {
    return Array.isArray(props?.merchant?.shops) ? props.merchant.shops : []
  })

  function openShopDialog(title, shop) {
    shopDialogTitle.value = title
    currentShop.value = shop
    shopDialogVisible.value = true
  }

  function handleShopDialogVisibleChange(visible) {
    shopDialogVisible.value = visible
    if (!visible) {
      currentShop.value = null
    }
  }

  function addShop() {
    openShopDialog('新增店铺', createAdminMerchantShopDraft())
  }

  function editShop(shop) {
    openShopDialog('编辑店铺', { ...shop })
  }

  async function handleShopSave(shopData) {
    loadError.value = ''
    const payload = buildAdminMerchantShopCreatePayload(shopData, merchantId.value)

    try {
      if (shopData?.id) {
        await request.put(`/api/shops/${shopData.id}`, payload)
        ElMessage.success('更新店铺成功')
      } else {
        await request.post('/api/shops', payload)
        ElMessage.success('新增店铺成功')
      }

      handleShopDialogVisibleChange(false)
      emit('refresh')
    } catch (error) {
      const message = extractErrorMessage(error, '保存店铺失败，请稍后重试')
      loadError.value = message
      ElMessage.error(message)
    }
  }

  async function deleteShop(shop) {
    loadError.value = ''

    try {
      await ElMessageBox.confirm(
        `确定要删除店铺"${shop.name}"吗？此操作不可恢复！`,
        '确认删除',
        {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning',
        },
      )

      await request.delete(`/api/shops/${shop.id}`)
      ElMessage.success('删除店铺成功')
      emit('refresh')
    } catch (error) {
      if (error !== 'cancel') {
        const message = extractErrorMessage(error, '删除店铺失败，请稍后重试')
        loadError.value = message
        ElMessage.error(message)
      }
    }
  }

  return {
    activeTab,
    addShop,
    currentShop,
    deleteShop,
    editShop,
    handleShopDialogVisibleChange,
    handleShopSave,
    loadError,
    merchantId,
    shopDialogTitle,
    shopDialogVisible,
    shops,
  }
}
