<template>
  <view class="page">
    <view class="header">
      <text class="title">创建店铺</text>
      <text class="sub">首次入驻请先补全店铺与经营信息</text>
    </view>

    <scroll-view scroll-y class="content">
      <view class="section">
        <text class="section-title">基础信息</text>

        <view class="form-item">
          <text class="label required">店铺名称</text>
          <input v-model="form.name" class="input" placeholder="请输入店铺名称" />
        </view>

        <view class="split-row">
          <view class="half-item">
            <text class="label">订单类型</text>
            <picker :range="orderTypeOptions" :value="orderTypeIndex" @change="onOrderTypeChange">
              <view class="picker">{{ currentOrderTypeLabel }}</view>
            </picker>
          </view>
          <view class="half-item">
            <text class="label">业务分类</text>
            <picker :range="categoryOptions" :value="categoryIndex" @change="onCategoryChange">
              <view class="picker">{{ form.businessCategory || categoryOptions[0] }}</view>
            </picker>
          </view>
        </view>

        <view class="form-item">
          <text class="label">联系电话</text>
          <input v-model="form.phone" class="input" type="number" placeholder="请输入联系电话" />
        </view>

        <view class="form-item">
          <text class="label">店铺地址</text>
          <input v-model="form.address" class="input" placeholder="请输入店铺地址" />
        </view>

        <view class="split-row">
          <view class="half-item">
            <text class="label">营业时间</text>
            <picker mode="time" :value="form.openTime" @change="onTimeChange('openTime', $event)">
              <view class="picker">{{ form.openTime }}</view>
            </picker>
          </view>
          <view class="half-item">
            <text class="label">打烊时间</text>
            <picker mode="time" :value="form.closeTime" @change="onTimeChange('closeTime', $event)">
              <view class="picker">{{ form.closeTime }}</view>
            </picker>
          </view>
        </view>

        <view class="form-item">
          <text class="label">店铺公告</text>
          <textarea
            v-model="form.announcement"
            class="textarea"
            maxlength="120"
            placeholder="请输入店铺公告"
          />
        </view>
      </view>

      <view class="section">
        <text class="section-title">配送与展示</text>

        <view class="split-row">
          <view class="half-item">
            <text class="label">起送价(元)</text>
            <input v-model="form.minPrice" class="input" type="digit" placeholder="0" />
          </view>
          <view class="half-item">
            <text class="label">配送费(元)</text>
            <input v-model="form.deliveryPrice" class="input" type="digit" placeholder="0" />
          </view>
        </view>

        <view class="form-item">
          <text class="label">配送时效</text>
          <input v-model="form.deliveryTime" class="input" placeholder="例如：30分钟" />
        </view>

        <view class="form-item">
          <text class="label">标签（逗号分隔）</text>
          <input v-model="form.tagsText" class="input" placeholder="如：招牌,品牌,24小时" />
        </view>

        <view class="form-item">
          <text class="label">优惠信息（逗号分隔）</text>
          <input v-model="form.discountsText" class="input" placeholder="如：满20减5,新客立减" />
        </view>

        <view class="upload-row">
          <view class="upload-item" @tap="chooseAndUpload('logo')">
            <text class="upload-title">Logo</text>
            <image v-if="form.logo" :src="form.logo" class="upload-image" mode="aspectFill" />
            <text v-else class="upload-placeholder">点击上传</text>
          </view>
          <view class="upload-item" @tap="chooseAndUpload('coverImage')">
            <text class="upload-title">门头图</text>
            <image v-if="form.coverImage" :src="form.coverImage" class="upload-image" mode="aspectFill" />
            <text v-else class="upload-placeholder">点击上传</text>
          </view>
        </view>

        <view class="upload-row single">
          <view class="upload-item" @tap="chooseAndUpload('backgroundImage')">
            <text class="upload-title">详情背景图</text>
            <image v-if="form.backgroundImage" :src="form.backgroundImage" class="upload-image" mode="aspectFill" />
            <text v-else class="upload-placeholder">点击上传</text>
          </view>
        </view>
      </view>

      <view class="section">
        <text class="section-title">经营资质</text>

        <view class="upload-row">
          <view class="upload-item" @tap="chooseAndUpload('merchantQualification')">
            <text class="upload-title">营业执照</text>
            <image
              v-if="form.merchantQualification"
              :src="form.merchantQualification"
              class="upload-image"
              mode="aspectFill"
            />
            <text v-else class="upload-placeholder">点击上传</text>
          </view>
          <view class="upload-item" @tap="chooseAndUpload('foodBusinessLicense')">
            <text class="upload-title">食品经营许可</text>
            <image
              v-if="form.foodBusinessLicense"
              :src="form.foodBusinessLicense"
              class="upload-image"
              mode="aspectFill"
            />
            <text v-else class="upload-placeholder">点击上传</text>
          </view>
        </view>

        <view class="switch-row">
          <text class="label">品牌店</text>
          <switch :checked="form.isBrand" color="#009bf5" @change="form.isBrand = !!$event.detail.value" />
        </view>

        <view class="switch-row">
          <text class="label">加盟店</text>
          <switch
            :checked="form.isFranchise"
            color="#009bf5"
            @change="form.isFranchise = !!$event.detail.value"
          />
        </view>

        <view class="switch-row">
          <text class="label">立即营业</text>
          <switch :checked="form.isActive" color="#009bf5" @change="form.isActive = !!$event.detail.value" />
        </view>
      </view>

      <view class="section">
        <text class="section-title">人员与证件（可选）</text>

        <view class="split-row">
          <view class="half-item">
            <text class="label">员工姓名</text>
            <input v-model="form.employeeName" class="input" placeholder="姓名" />
          </view>
          <view class="half-item">
            <text class="label">员工年龄</text>
            <input v-model="form.employeeAge" class="input" type="number" placeholder="年龄" />
          </view>
        </view>

        <view class="form-item">
          <text class="label">岗位</text>
          <input v-model="form.employeePosition" class="input" placeholder="如：店长" />
        </view>

        <view class="split-row">
          <view class="half-item">
            <text class="label">身份证到期日</text>
            <picker mode="date" :value="form.idCardExpireAt" @change="onDateChange('idCardExpireAt', $event)">
              <view class="picker">{{ form.idCardExpireAt || '请选择日期' }}</view>
            </picker>
          </view>
          <view class="half-item">
            <text class="label">健康证到期日</text>
            <picker
              mode="date"
              :value="form.healthCertExpireAt"
              @change="onDateChange('healthCertExpireAt', $event)"
            >
              <view class="picker">{{ form.healthCertExpireAt || '请选择日期' }}</view>
            </picker>
          </view>
        </view>

        <view class="upload-row">
          <view class="upload-item" @tap="chooseAndUpload('idCardFrontImage')">
            <text class="upload-title">身份证正面</text>
            <image v-if="form.idCardFrontImage" :src="form.idCardFrontImage" class="upload-image" mode="aspectFill" />
            <text v-else class="upload-placeholder">点击上传</text>
          </view>
          <view class="upload-item" @tap="chooseAndUpload('idCardBackImage')">
            <text class="upload-title">身份证反面</text>
            <image v-if="form.idCardBackImage" :src="form.idCardBackImage" class="upload-image" mode="aspectFill" />
            <text v-else class="upload-placeholder">点击上传</text>
          </view>
        </view>

        <view class="upload-row">
          <view class="upload-item" @tap="chooseAndUpload('healthCertFrontImage')">
            <text class="upload-title">健康证正面</text>
            <image
              v-if="form.healthCertFrontImage"
              :src="form.healthCertFrontImage"
              class="upload-image"
              mode="aspectFill"
            />
            <text v-else class="upload-placeholder">点击上传</text>
          </view>
          <view class="upload-item" @tap="chooseAndUpload('healthCertBackImage')">
            <text class="upload-title">健康证反面</text>
            <image
              v-if="form.healthCertBackImage"
              :src="form.healthCertBackImage"
              class="upload-image"
              mode="aspectFill"
            />
            <text v-else class="upload-placeholder">点击上传</text>
          </view>
        </view>
      </view>

      <view class="bottom-space" />
    </scroll-view>

    <view class="footer">
      <button class="submit-btn" :disabled="submitting || uploading" @tap="submitCreate">
        {{ submitting ? '创建中...' : '创建店铺' }}
      </button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { createShop, uploadImage } from '@/shared-ui/api'
import { clearMerchantContext, setCurrentShopId } from '@/shared-ui/merchantContext'
import {
  buildBusinessCategoryOptions,
  buildMerchantTypeOptions,
  resolveBusinessCategoryOption,
  resolveMerchantTypeOption,
} from '@/shared-ui/platform-schema'
import { loadPlatformRuntimeSettings } from '@/shared-ui/platform-runtime'

const submitting = ref(false)
const uploading = ref(false)

const merchantTypeOptions = ref(buildMerchantTypeOptions())
const businessCategoryOptions = ref(buildBusinessCategoryOptions())

const form = reactive({
  name: '',
  merchantType: merchantTypeOptions.value[0]?.key || 'takeout',
  orderType: merchantTypeOptions.value[0]?.orderTypeLabel || '外卖类',
  businessCategoryKey: businessCategoryOptions.value[0]?.key || 'food',
  businessCategory: businessCategoryOptions.value[0]?.label || '美食',
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
})

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
    merchant_types: merchantTypeOptions.value
  })
  form.merchantType = selected.key
  form.orderType = selected.legacyOrderTypeLabel
}

function applyBusinessCategorySelection(value: string) {
  const selected = resolveBusinessCategoryOption(value, {
    business_categories: businessCategoryOptions.value
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

function onOrderTypeChange(e: any) {
  const option = merchantTypeOptions.value[Number(e.detail.value) || 0] || merchantTypeOptions.value[0]
  applyMerchantTypeSelection(option?.key || form.merchantType)
}

function onCategoryChange(e: any) {
  const option = businessCategoryOptions.value[Number(e.detail.value) || 0] || businessCategoryOptions.value[0]
  applyBusinessCategorySelection(option?.key || form.businessCategoryKey)
}

function onTimeChange(field: 'openTime' | 'closeTime', e: any) {
  form[field] = String(e.detail.value || '')
}

function onDateChange(field: 'idCardExpireAt' | 'healthCertExpireAt', e: any) {
  form[field] = String(e.detail.value || '')
}

function splitByComma(text: string) {
  return String(text || '')
    .split(/[，,]/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function toMerchantId() {
  const profile: any = uni.getStorageSync('merchantProfile') || {}
  return String(profile.id || profile.role_id || profile.userId || '').trim()
}

function chooseAndUpload(field: keyof typeof form) {
  if (uploading.value) return
  uni.chooseImage({
    count: 1,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success: async (res: any) => {
      const filePath = String(res?.tempFilePaths?.[0] || '').trim()
      if (!filePath) return

      uploading.value = true
      try {
        const uploaded: any = await uploadImage(filePath)
        ;(form as any)[field] = String(uploaded?.url || '')
        uni.showToast({ title: '上传成功', icon: 'success' })
      } catch (err: any) {
        uni.showToast({ title: err?.error || err?.message || '上传失败', icon: 'none' })
      } finally {
        uploading.value = false
      }
    },
    fail: (err: any) => {
      const msg = String(err?.errMsg || '').toLowerCase()
      if (msg.includes('cancel')) return
      uni.showToast({ title: '选择图片失败', icon: 'none' })
    },
  })
}

async function submitCreate() {
  if (submitting.value || uploading.value) return

  const name = String(form.name || '').trim()
  if (!name) {
    uni.showToast({ title: '请填写店铺名称', icon: 'none' })
    return
  }

  submitting.value = true
  try {
    const payload: Record<string, any> = {
      merchant_id: toMerchantId(),
      name,
      orderType: form.orderType,
      merchantType: form.merchantType,
      businessCategoryKey: form.businessCategoryKey,
      businessCategory: form.businessCategory,
      phone: String(form.phone || '').trim(),
      address: String(form.address || '').trim(),
      announcement: String(form.announcement || '').trim(),
      businessHours: `${form.openTime || '09:00'}-${form.closeTime || '22:00'}`,
      minPrice: Number(form.minPrice || 0),
      deliveryPrice: Number(form.deliveryPrice || 0),
      deliveryTime: String(form.deliveryTime || '').trim(),
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
      employeeName: String(form.employeeName || '').trim(),
      employeeAge: Number(form.employeeAge || 0),
      employeePosition: String(form.employeePosition || '').trim(),
      idCardFrontImage: form.idCardFrontImage,
      idCardBackImage: form.idCardBackImage,
      idCardExpireAt: form.idCardExpireAt || null,
      healthCertFrontImage: form.healthCertFrontImage,
      healthCertBackImage: form.healthCertBackImage,
      healthCertExpireAt: form.healthCertExpireAt || null,
    }

    const res: any = await createShop(payload)
    const newShopId = String(res?.shop?.id || '').trim()

    clearMerchantContext()
    if (newShopId) {
      setCurrentShopId(newShopId)
    }

    uni.showToast({ title: '店铺创建成功', icon: 'success' })
    setTimeout(() => {
      uni.switchTab({ url: '/pages/store/index' })
    }, 250)
  } catch (err: any) {
    uni.showToast({ title: err?.error || err?.message || '创建失败', icon: 'none' })
  } finally {
    submitting.value = false
  }
}

onLoad(() => {
  void loadRuntimeTaxonomy()
})
</script>

<style scoped lang="scss" src="./create.scss"></style>
