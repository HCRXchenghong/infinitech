import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { createCategory, deleteCategory, fetchCategories, fetchProducts, updateProduct } from '@/shared-ui/api'
import { ensureMerchantShops, getCurrentShopId } from '@/shared-ui/merchantContext'

function toText(value: any) {
  return String(value ?? '').trim()
}

export function useMerchantMenuPage() {
  const currentShop = ref<any>(null)
  const categories = ref<any[]>([])
  const products = ref<any[]>([])
  const selectedCategoryId = ref('')

  const currentShopName = computed(() => toText(currentShop.value?.name) || '未绑定店铺')
  const filteredProducts = computed(() => {
    if (!selectedCategoryId.value) return products.value
    return products.value.filter((item: any) => toText(item?.categoryId || item?.category_id) === selectedCategoryId.value)
  })

  async function loadData(force = false) {
    const context = await ensureMerchantShops(force)
    const shops = context.shops || []
    const currentShopId = getCurrentShopId()
    currentShop.value = shops.find((shop: any) => String(shop?.id) === String(currentShopId)) || context.currentShop || null

    if (!currentShop.value) {
      categories.value = []
      products.value = []
      return
    }

    const shopId = toText(currentShop.value?.id)
    const [categoryRes, productRes]: any[] = await Promise.all([
      fetchCategories(shopId),
      fetchProducts({ shopId }),
    ])

    categories.value = Array.isArray(categoryRes) ? categoryRes : []
    products.value = Array.isArray(productRes) ? productRes : []

    if (!selectedCategoryId.value && categories.value.length > 0) {
      selectedCategoryId.value = toText(categories.value[0]?.id)
    }

    if (selectedCategoryId.value && !categories.value.find((cat: any) => toText(cat?.id) === selectedCategoryId.value)) {
      selectedCategoryId.value = categories.value[0] ? toText(categories.value[0]?.id) : ''
    }
  }

  function goAddProduct() {
    if (!currentShop.value) return
    uni.navigateTo({
      url: `/pages/menu/add?shopId=${currentShop.value.id}&categoryId=${selectedCategoryId.value || ''}`,
    })
  }

  function goEditProduct(id: string | number) {
    uni.navigateTo({ url: `/pages/menu/edit?id=${id}` })
  }

  function displayMetric(value: any) {
    return value === undefined || value === null || value === '' ? 0 : value
  }

  async function toggleActive(item: any) {
    if (!currentShop.value) return
    try {
      await updateProduct(item.id, {
        shopId: toText(currentShop.value?.id),
        categoryId: toText(item?.categoryId || item?.category_id),
        isActive: !item?.isActive,
      })
      item.isActive = !item?.isActive
      uni.showToast({ title: item.isActive ? '已上架' : '已下架', icon: 'success' })
    } catch (error: any) {
      uni.showToast({ title: error?.error || error?.message || '操作失败', icon: 'none' })
    }
  }

  async function createNewCategory() {
    if (!currentShop.value) return
    uni.showModal({
      title: '新增分类',
      editable: true,
      placeholderText: '输入分类名称',
      success: async (res: any) => {
        if (!res?.confirm) return
        const name = toText(res?.content)
        if (!name) return

        try {
          const shopId = Number(currentShop.value?.id || 0)
          if (!Number.isFinite(shopId) || shopId <= 0) {
            uni.showToast({ title: '店铺信息异常', icon: 'none' })
            return
          }

          await createCategory({
            shopId,
            name,
            sortOrder: categories.value.length + 1,
            isActive: true,
          })
          uni.showToast({ title: '新增成功', icon: 'success' })
          await loadData(true)
        } catch (error: any) {
          uni.showToast({ title: error?.error || error?.message || '新增失败', icon: 'none' })
        }
      },
    })
  }

  function confirmDeleteCategory(category: any) {
    uni.showModal({
      title: '删除分类',
      content: `确定删除分类“${category?.name || ''}”？`,
      success: async (res: any) => {
        if (!res?.confirm || !currentShop.value) return
        try {
          await deleteCategory(category.id, currentShop.value.id)
          uni.showToast({ title: '已删除', icon: 'success' })
          await loadData(true)
        } catch (error: any) {
          uni.showToast({ title: error?.error || error?.message || '删除失败', icon: 'none' })
        }
      },
    })
  }

  onShow(async () => {
    try {
      await loadData()
    } catch (error: any) {
      uni.showToast({ title: error?.error || error?.message || '加载失败', icon: 'none' })
    }
  })

  return {
    currentShop,
    categories,
    selectedCategoryId,
    currentShopName,
    filteredProducts,
    goAddProduct,
    goEditProduct,
    displayMetric,
    toggleActive,
    createNewCategory,
    confirmDeleteCategory,
  }
}
