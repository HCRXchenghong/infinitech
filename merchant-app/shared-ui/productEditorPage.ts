import { computed, reactive, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { resolveUploadAssetUrl } from '../../packages/contracts/src/http.js'
import { UPLOAD_DOMAINS } from '../../packages/contracts/src/upload.js'
import {
  createProduct,
  deleteProduct,
  fetchCategories,
  fetchProductDetail,
  updateProduct,
  uploadImage,
} from '@/shared-ui/api'
import { ensureMerchantShops, getCurrentShopId } from '@/shared-ui/merchantContext'

type ProductEditorMode = 'create' | 'edit'

function createInitialForm() {
  return {
    shopId: '',
    categoryId: '',
    name: '',
    price: '',
    stock: '999',
    description: '',
    image: '',
    isActive: true,
  }
}

function resetProductForm(target: Record<string, any>) {
  Object.assign(target, createInitialForm())
}

function getErrorMessage(error: any, fallback: string): string {
  return String(error?.error || error?.message || fallback)
}

export function useProductEditorPage(mode: ProductEditorMode) {
  const productId = ref('')
  const submitting = ref(false)
  const uploadingImage = ref(false)
  const categories = ref<any[]>([])
  const form = reactive(createInitialForm())

  const categoryNames = computed(() => categories.value.map((item: any) => item.name))
  const selectedCategoryName = computed(() => {
    const target = categories.value.find((item: any) => String(item.id) === String(form.categoryId))
    return target ? target.name : '请选择分类'
  })

  function onCategoryChange(event: any) {
    const index = Number(event?.detail?.value || 0)
    const item = categories.value[index]
    if (item) {
      form.categoryId = String(item.id)
    }
  }

  function onStatusChange(event: any) {
    form.isActive = !!event?.detail?.value
  }

  async function loadCategories(shopId: string) {
    const response: any = await fetchCategories(shopId)
    categories.value = Array.isArray(response) ? response : []
    if (!form.categoryId && categories.value.length > 0) {
      form.categoryId = String(categories.value[0].id)
    }
  }

  function clearProductImage() {
    form.image = ''
  }

  function chooseProductImage() {
    if (uploadingImage.value) return

    uni.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: async (result: any) => {
        const filePath = String(result?.tempFilePaths?.[0] || '').trim()
        if (!filePath) return

        uploadingImage.value = true
        try {
          const uploaded: any = await uploadImage(filePath, {
            uploadDomain: UPLOAD_DOMAINS.SHOP_MEDIA,
          })
          const nextImage = String(resolveUploadAssetUrl(uploaded) || '').trim()
          if (!nextImage) {
            throw new Error('上传返回缺少图片地址')
          }
          form.image = nextImage
          uni.showToast({ title: '图片上传成功', icon: 'success' })
        } catch (error: any) {
          uni.showToast({
            title: getErrorMessage(error, '图片上传失败'),
            icon: 'none',
          })
        } finally {
          uploadingImage.value = false
        }
      },
      fail: (error: any) => {
        const message = String(error?.errMsg || '').toLowerCase()
        if (message.includes('cancel')) return
        uni.showToast({ title: '选择图片失败', icon: 'none' })
      },
    })
  }

  async function initializeCreatePage(options: any = {}) {
    resetProductForm(form)

    const providedShopId = String(options?.shopId || getCurrentShopId() || '').trim()
    if (providedShopId) {
      form.shopId = providedShopId
    } else {
      const context = await ensureMerchantShops()
      form.shopId = String(context.currentShop?.id || '').trim()
    }

    if (!form.shopId) {
      uni.showToast({ title: '未找到店铺信息', icon: 'none' })
      return
    }

    form.categoryId = String(options?.categoryId || '').trim()
    await loadCategories(form.shopId)
  }

  async function initializeEditPage(options: any = {}) {
    resetProductForm(form)

    const id = String(options?.id || '').trim()
    if (!id) {
      uni.showToast({ title: '缺少商品ID', icon: 'none' })
      return
    }

    productId.value = id
    const detail: any = await fetchProductDetail(id)

    form.shopId = String(detail?.shopId || detail?.shop_id || '').trim()
    form.categoryId = String(detail?.categoryId || detail?.category_id || '').trim()
    form.name = String(detail?.name || '')
    form.price = String(detail?.price || '')
    form.stock = String(detail?.stock ?? 999)
    form.description = String(detail?.description || '')
    form.image = String(detail?.image || resolveUploadAssetUrl(detail) || '').trim()
    if (detail?.isActive !== undefined || detail?.is_active !== undefined) {
      form.isActive = !!(detail?.isActive ?? detail?.is_active)
    }

    if (form.shopId) {
      await loadCategories(form.shopId)
    }
  }

  function validateForm() {
    const name = String(form.name || '').trim()
    const price = Number(form.price || 0)
    const stock = Number(form.stock || 0)

    if (!name) {
      uni.showToast({ title: '请输入商品名称', icon: 'none' })
      return null
    }
    if (!form.categoryId) {
      uni.showToast({ title: '请选择商品分类', icon: 'none' })
      return null
    }
    if (!price || price <= 0) {
      uni.showToast({ title: '请输入正确售价', icon: 'none' })
      return null
    }

    return {
      shopId: String(form.shopId || '').trim(),
      categoryId: String(form.categoryId || '').trim(),
      name,
      price,
      stock: Number.isFinite(stock) ? stock : 999,
      description: form.description,
      image: form.image,
      isActive: form.isActive,
      unit: '份',
    }
  }

  async function handleSubmit() {
    if (submitting.value) return

    const payload = validateForm()
    if (!payload) return

    submitting.value = true
    try {
      if (mode === 'create') {
        await createProduct(payload)
        uni.showToast({ title: '商品创建成功', icon: 'success' })
      } else {
        await updateProduct(productId.value, payload)
        uni.showToast({ title: '保存成功', icon: 'success' })
      }
      setTimeout(() => uni.navigateBack(), 300)
    } catch (error: any) {
      uni.showToast({
        title: getErrorMessage(error, mode === 'create' ? '创建失败' : '保存失败'),
        icon: 'none',
      })
    } finally {
      submitting.value = false
    }
  }

  function handleDelete() {
    if (mode !== 'edit' || !productId.value || submitting.value) return

    uni.showModal({
      title: '删除商品',
      content: '删除后不可恢复，确定继续吗？',
      success: async (result: any) => {
        if (!result?.confirm) return
        submitting.value = true
        try {
          await deleteProduct(productId.value, {
            shopId: String(form.shopId || '').trim(),
            categoryId: String(form.categoryId || '').trim(),
          })
          uni.showToast({ title: '已删除', icon: 'success' })
          setTimeout(() => uni.navigateBack(), 300)
        } catch (error: any) {
          uni.showToast({
            title: getErrorMessage(error, '删除失败'),
            icon: 'none',
          })
        } finally {
          submitting.value = false
        }
      },
    })
  }

  onLoad(async (options: any = {}) => {
    try {
      if (mode === 'edit') {
        await initializeEditPage(options)
      } else {
        await initializeCreatePage(options)
      }
    } catch (error: any) {
      uni.showToast({ title: getErrorMessage(error, '加载失败'), icon: 'none' })
    }
  })

  return {
    form,
    categories,
    categoryNames,
    selectedCategoryName,
    productId,
    submitting,
    uploadingImage,
    onCategoryChange,
    onStatusChange,
    clearProductImage,
    chooseProductImage,
    handleSubmit,
    handleDelete,
  }
}
