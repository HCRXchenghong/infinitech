import { computed, reactive, ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { createShop, fetchShopDetail, updateShop, uploadImage } from '@/shared-ui/api'
import { resolveUploadAssetUrl } from '../../packages/contracts/src/http.js'
import { UPLOAD_DOMAINS } from '../../packages/contracts/src/upload.js'
import {
  clearMerchantContext,
  ensureMerchantShops,
  getCurrentShopId,
  getMerchantId,
  setCurrentShopId,
} from '@/shared-ui/merchantContext'
import {
  buildBusinessCategoryOptions,
  buildMerchantTypeOptions,
  resolveBusinessCategoryOption,
  resolveMerchantTypeOption,
} from '@/shared-ui/platform-schema'
import { loadPlatformRuntimeSettings } from '@/shared-ui/platform-runtime'

function toText(value: any) {
  return String(value ?? '').trim()
}

function resolveUploadedImageUrl(payload: any) {
  return toText(resolveUploadAssetUrl(payload))
}

function parseHours(text: any) {
  const hours = toText(text)
  if (!hours.includes('-')) {
    return { open: '09:00', close: '22:00' }
  }
  const [open, close] = hours.split('-').map((item) => toText(item))
  return {
    open: open || '09:00',
    close: close || '22:00',
  }
}

function splitByComma(text: string) {
  return String(text || '')
    .split(/[，,]/)
    .map((item) => item.trim())
    .filter(Boolean)
}

async function chooseImageAndUpload({
  isBusy,
  setBusy,
  onUploaded,
  successText = '上传成功',
  failText = '上传失败',
}: {
  isBusy: () => boolean
  setBusy: (value: boolean) => void
  onUploaded: (value: string) => void
  successText?: string
  failText?: string
}) {
  if (isBusy()) return

  uni.chooseImage({
    count: 1,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success: async (res: any) => {
      const filePath = toText(res?.tempFilePaths?.[0])
      if (!filePath) return

      setBusy(true)
      try {
        const uploaded: any = await uploadImage(filePath, {
          uploadDomain: UPLOAD_DOMAINS.SHOP_MEDIA,
        })
        const resourceUrl = resolveUploadedImageUrl(uploaded)
        if (!resourceUrl) {
          throw new Error('上传返回缺少资源地址')
        }
        onUploaded(resourceUrl)
        uni.showToast({ title: successText, icon: 'success' })
      } catch (error: any) {
        uni.showToast({ title: error?.error || error?.message || failText, icon: 'none' })
      } finally {
        setBusy(false)
      }
    },
    fail: (error: any) => {
      const message = toText(error?.errMsg).toLowerCase()
      if (message.includes('cancel')) return
      uni.showToast({ title: '选择图片失败', icon: 'none' })
    },
  })
}

function createCreateStoreForm(merchantTypeOptions: any[], businessCategoryOptions: any[]) {
  return {
    name: '',
    merchantType: merchantTypeOptions[0]?.key || 'takeout',
    orderType: merchantTypeOptions[0]?.orderTypeLabel || '外卖类',
    businessCategoryKey: businessCategoryOptions[0]?.key || 'food',
    businessCategory: businessCategoryOptions[0]?.label || '美食',
    phone: '',
    address: '',
    announcement: '',
    openTime: '09:00',
    closeTime: '22:00',
    minPrice: '0',
    deliveryPrice: '0',
    deliveryTime: '30分钟',
    tagsText: '',
    discountsText: '',
    logo: '',
    coverImage: '',
    backgroundImage: '',
    merchantQualification: '',
    foodBusinessLicense: '',
    isBrand: false,
    isFranchise: false,
    isActive: true,
    employeeName: '',
    employeeAge: '',
    employeePosition: '',
    idCardFrontImage: '',
    idCardBackImage: '',
    idCardExpireAt: '',
    healthCertFrontImage: '',
    healthCertBackImage: '',
    healthCertExpireAt: '',
  }
}

function createSettingsStoreForm(businessCategoryOptions: any[]) {
  return {
    name: '',
    businessCategoryKey: businessCategoryOptions[0]?.key || 'food',
    businessCategory: '',
    announcement: '',
    phone: '',
    address: '',
    logo: '',
    coverImage: '',
    minPrice: '0',
    deliveryPrice: '0',
    deliveryTime: '',
    isActive: true,
    openTime: '09:00',
    closeTime: '22:00',
  }
}

export function useMerchantStoreCreatePage() {
  const submitting = ref(false)
  const uploading = ref(false)

  const merchantTypeOptions = ref(buildMerchantTypeOptions())
  const businessCategoryOptions = ref(buildBusinessCategoryOptions())
  const form = reactive(createCreateStoreForm(merchantTypeOptions.value, businessCategoryOptions.value))

  const orderTypeOptions = computed(() => merchantTypeOptions.value.map((item) => item.orderTypeLabel))
  const categoryOptions = computed(() => businessCategoryOptions.value.map((item) => item.label))
  const currentOrderTypeLabel = computed(() => {
    const option = merchantTypeOptions.value.find((item) => item.key === form.merchantType) || merchantTypeOptions.value[0]
    return option?.orderTypeLabel || orderTypeOptions.value[0] || '外卖类'
  })
  const orderTypeIndex = computed(() => {
    const index = merchantTypeOptions.value.findIndex((item) => item.key === form.merchantType)
    return index >= 0 ? index : 0
  })
  const categoryIndex = computed(() => {
    const index = businessCategoryOptions.value.findIndex((item) => item.key === form.businessCategoryKey)
    return index >= 0 ? index : 0
  })

  function applyMerchantTypeSelection(value: string) {
    const selected = resolveMerchantTypeOption(value, {
      merchant_types: merchantTypeOptions.value,
    })
    form.merchantType = selected.key
    form.orderType = selected.legacyOrderTypeLabel
  }

  function applyBusinessCategorySelection(value: string) {
    const selected = resolveBusinessCategoryOption(value, {
      business_categories: businessCategoryOptions.value,
    })
    form.businessCategoryKey = selected.key
    form.businessCategory = selected.label
  }

  async function loadRuntimeTaxonomy() {
    try {
      const runtime = await loadPlatformRuntimeSettings()
      const taxonomy = runtime?.merchantTaxonomySettings || {}
      merchantTypeOptions.value = buildMerchantTypeOptions(taxonomy)
      businessCategoryOptions.value = buildBusinessCategoryOptions(taxonomy)
    } catch (_error) {
      merchantTypeOptions.value = buildMerchantTypeOptions()
      businessCategoryOptions.value = buildBusinessCategoryOptions()
    }
    applyMerchantTypeSelection(form.merchantType || form.orderType)
    applyBusinessCategorySelection(form.businessCategoryKey || form.businessCategory)
  }

  function onOrderTypeChange(event: any) {
    const option = merchantTypeOptions.value[Number(event?.detail?.value) || 0] || merchantTypeOptions.value[0]
    applyMerchantTypeSelection(option?.key || form.merchantType)
  }

  function onCategoryChange(event: any) {
    const option = businessCategoryOptions.value[Number(event?.detail?.value) || 0] || businessCategoryOptions.value[0]
    applyBusinessCategorySelection(option?.key || form.businessCategoryKey)
  }

  function onTimeChange(field: 'openTime' | 'closeTime', event: any) {
    form[field] = toText(event?.detail?.value)
  }

  function onDateChange(field: 'idCardExpireAt' | 'healthCertExpireAt', event: any) {
    form[field] = toText(event?.detail?.value)
  }

  function chooseAndUpload(field: keyof typeof form) {
    void chooseImageAndUpload({
      isBusy: () => uploading.value,
      setBusy: (value) => {
        uploading.value = value
      },
      onUploaded: (value) => {
        ;(form as any)[field] = value
      },
    })
  }

  async function submitCreate() {
    if (submitting.value || uploading.value) return

    const merchantId = toText(getMerchantId())
    const name = toText(form.name)
    if (!merchantId) {
      uni.showToast({ title: '未找到商户身份，请重新登录', icon: 'none' })
      return
    }
    if (!name) {
      uni.showToast({ title: '请填写店铺名称', icon: 'none' })
      return
    }

    submitting.value = true
    try {
      const payload: Record<string, any> = {
        merchant_id: merchantId,
        name,
        orderType: form.orderType,
        merchantType: form.merchantType,
        businessCategoryKey: form.businessCategoryKey,
        businessCategory: form.businessCategory,
        phone: toText(form.phone),
        address: toText(form.address),
        announcement: toText(form.announcement),
        businessHours: `${form.openTime || '09:00'}-${form.closeTime || '22:00'}`,
        minPrice: Number(form.minPrice || 0),
        deliveryPrice: Number(form.deliveryPrice || 0),
        deliveryTime: toText(form.deliveryTime),
        tags: splitByComma(form.tagsText),
        discounts: splitByComma(form.discountsText),
        logo: form.logo,
        coverImage: form.coverImage,
        backgroundImage: form.backgroundImage,
        merchantQualification: form.merchantQualification,
        foodBusinessLicense: form.foodBusinessLicense,
        isBrand: form.isBrand,
        isFranchise: form.isFranchise,
        isActive: form.isActive,
        employeeName: toText(form.employeeName),
        employeeAge: Number(form.employeeAge || 0),
        employeePosition: toText(form.employeePosition),
        idCardFrontImage: form.idCardFrontImage,
        idCardBackImage: form.idCardBackImage,
        idCardExpireAt: form.idCardExpireAt || null,
        healthCertFrontImage: form.healthCertFrontImage,
        healthCertBackImage: form.healthCertBackImage,
        healthCertExpireAt: form.healthCertExpireAt || null,
      }

      const response: any = await createShop(payload)
      const newShopId = toText(response?.shop?.id || response?.data?.shop?.id)

      clearMerchantContext()
      if (newShopId) {
        setCurrentShopId(newShopId)
      }

      uni.showToast({ title: '店铺创建成功', icon: 'success' })
      setTimeout(() => {
        uni.switchTab({ url: '/pages/store/index' })
      }, 250)
    } catch (error: any) {
      uni.showToast({ title: error?.error || error?.message || '创建失败', icon: 'none' })
    } finally {
      submitting.value = false
    }
  }

  onLoad(() => {
    void loadRuntimeTaxonomy()
  })

  return {
    submitting,
    uploading,
    form,
    orderTypeOptions,
    categoryOptions,
    currentOrderTypeLabel,
    orderTypeIndex,
    categoryIndex,
    onOrderTypeChange,
    onCategoryChange,
    onTimeChange,
    onDateChange,
    chooseAndUpload,
    submitCreate,
  }
}

export function useMerchantStoreSettingsPage() {
  const saving = ref(false)
  const uploadingLogo = ref(false)
  const uploadingCover = ref(false)
  const shops = ref<any[]>([])
  const currentShop = ref<any>(null)
  const businessCategoryOptions = ref(buildBusinessCategoryOptions())
  const form = reactive(createSettingsStoreForm(businessCategoryOptions.value))

  const currentShopName = computed(() => {
    const name = currentShop.value?.name
    return name ? String(name) : '未绑定店铺'
  })
  const uploadingAny = computed(() => uploadingLogo.value || uploadingCover.value)
  const categoryOptions = computed(() => businessCategoryOptions.value.map((item) => item.label))
  const categoryIndex = computed(() => {
    const index = businessCategoryOptions.value.findIndex((item) => item.key === form.businessCategoryKey)
    return index >= 0 ? index : 0
  })

  function applyBusinessCategorySelection(value: any) {
    const selected = resolveBusinessCategoryOption(value, {
      business_categories: businessCategoryOptions.value,
    })
    form.businessCategoryKey = selected.key
    form.businessCategory = selected.label
  }

  async function loadRuntimeTaxonomy() {
    try {
      const runtime = await loadPlatformRuntimeSettings()
      businessCategoryOptions.value = buildBusinessCategoryOptions(runtime?.merchantTaxonomySettings || {})
    } catch (_error) {
      businessCategoryOptions.value = buildBusinessCategoryOptions()
    }
    applyBusinessCategorySelection(form.businessCategoryKey || form.businessCategory)
  }

  function fillForm(source: any) {
    const value = source || {}
    const hours = parseHours(value.businessHours || value.business_hours)

    form.name = toText(value.name)
    applyBusinessCategorySelection(value.businessCategoryKey || value.business_category_key || value.businessCategory || value.category)
    form.announcement = toText(value.announcement)
    form.phone = toText(value.phone)
    form.address = toText(value.address)
    form.logo = toText(value.logo)
    form.coverImage = toText(value.coverImage || value.cover_image)
    form.minPrice = String(Number(value.minPrice || value.min_price || 0))
    form.deliveryPrice = String(Number(value.deliveryPrice || value.delivery_price || 0))
    form.deliveryTime = toText(value.deliveryTime || value.delivery_time)
    form.isActive = value.isActive !== undefined ? !!value.isActive : value.is_active !== undefined ? !!value.is_active : true
    form.openTime = hours.open
    form.closeTime = hours.close
  }

  async function loadData(force = false) {
    const context = await ensureMerchantShops(force)
    shops.value = context.shops || []

    const currentId = getCurrentShopId()
    currentShop.value = shops.value.find((item: any) => String(item.id) === String(currentId)) || context.currentShop || null

    if (!currentShop.value) {
      fillForm({})
      return
    }

    const detail: any = await fetchShopDetail(currentShop.value.id)
    fillForm(detail || currentShop.value)
  }

  function selectShop() {
    if (!shops.value.length) return
    uni.showActionSheet({
      itemList: shops.value.map((item: any) => item.name || `店铺${item.id}`),
      success: async (res: any) => {
        const selected = shops.value[res.tapIndex]
        if (!selected) return
        setCurrentShopId(selected.id)
        await loadData(true)
      },
    })
  }

  function onStatusChange(event: any) {
    form.isActive = !!event?.detail?.value
  }

  function onCategoryChange(event: any) {
    const selected = businessCategoryOptions.value[Number(event?.detail?.value) || 0] || businessCategoryOptions.value[0]
    applyBusinessCategorySelection(selected?.key || form.businessCategoryKey)
  }

  function onTimeChange(field: 'openTime' | 'closeTime', event: any) {
    form[field] = toText(event?.detail?.value)
  }

  function clearImage(field: 'logo' | 'coverImage') {
    form[field] = ''
  }

  function chooseAndUpload(field: 'logo' | 'coverImage') {
    void chooseImageAndUpload({
      isBusy: () => (field === 'logo' ? uploadingLogo.value : uploadingCover.value),
      setBusy: (value) => {
        if (field === 'logo') {
          uploadingLogo.value = value
        } else {
          uploadingCover.value = value
        }
      },
      onUploaded: (value) => {
        form[field] = value
      },
      successText: '图片上传成功',
      failText: '图片上传失败',
    })
  }

  async function saveSettings() {
    if (!currentShop.value || saving.value) return
    if (!toText(form.name)) {
      uni.showToast({ title: '请填写店铺名称', icon: 'none' })
      return
    }

    saving.value = true
    try {
      await updateShop(currentShop.value.id, {
        name: toText(form.name),
        businessCategoryKey: toText(form.businessCategoryKey),
        businessCategory: toText(form.businessCategory),
        announcement: toText(form.announcement),
        phone: toText(form.phone),
        address: toText(form.address),
        logo: toText(form.logo),
        coverImage: toText(form.coverImage),
        minPrice: Number(form.minPrice || 0),
        deliveryPrice: Number(form.deliveryPrice || 0),
        deliveryTime: toText(form.deliveryTime),
        businessHours: `${form.openTime || '09:00'}-${form.closeTime || '22:00'}`,
        isActive: !!form.isActive,
      })

      uni.showToast({ title: '保存成功', icon: 'success' })
      await loadData(true)
    } catch (error: any) {
      uni.showToast({ title: error?.error || error?.message || '保存失败', icon: 'none' })
    } finally {
      saving.value = false
    }
  }

  onShow(async () => {
    try {
      await loadRuntimeTaxonomy()
      await loadData()
    } catch (error: any) {
      uni.showToast({ title: error?.error || error?.message || '加载失败', icon: 'none' })
    }
  })

  return {
    saving,
    uploadingLogo,
    uploadingCover,
    currentShop,
    currentShopName,
    form,
    uploadingAny,
    categoryOptions,
    categoryIndex,
    selectShop,
    onStatusChange,
    onCategoryChange,
    onTimeChange,
    clearImage,
    chooseAndUpload,
    saveSettings,
  }
}
