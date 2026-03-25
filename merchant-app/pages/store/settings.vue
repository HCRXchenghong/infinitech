<template>
  <view class="page">
    <view class="header">
      <view class="shop-area" @tap="selectShop">
        <text class="shop-name">{{ currentShop?.name || '未绑定店铺' }}</text>
        <text class="shop-hint">切换店铺</text>
      </view>
      <text class="header-title">店铺基础设置</text>
    </view>

    <scroll-view scroll-y class="content">
      <view class="section">
        <text class="section-title">品牌展示</text>

        <view class="form-item">
          <text class="form-label">店铺 Logo</text>
          <view class="upload-card" @tap="chooseAndUpload('logo')">
            <image v-if="form.logo" class="upload-image" :src="form.logo" mode="aspectFill" />
            <view v-else class="upload-empty">
              <text class="upload-empty-main">{{ uploadingLogo ? '上传中...' : '点击上传 Logo' }}</text>
              <text class="upload-empty-sub">支持相册和拍照</text>
            </view>
          </view>
          <view class="upload-actions">
            <button class="upload-btn" :disabled="uploadingLogo" @tap.stop="chooseAndUpload('logo')">
              {{ uploadingLogo ? '上传中...' : '重新上传' }}
            </button>
            <button
              v-if="form.logo"
              class="upload-clear-btn"
              :disabled="uploadingLogo"
              @tap.stop="clearImage('logo')"
            >
              清空
            </button>
          </view>
        </view>

        <view class="form-item">
          <text class="form-label">门头图</text>
          <view class="upload-card" @tap="chooseAndUpload('coverImage')">
            <image v-if="form.coverImage" class="upload-image" :src="form.coverImage" mode="aspectFill" />
            <view v-else class="upload-empty">
              <text class="upload-empty-main">{{ uploadingCover ? '上传中...' : '点击上传门头图' }}</text>
              <text class="upload-empty-sub">建议横图，展示效果更好</text>
            </view>
          </view>
          <view class="upload-actions">
            <button class="upload-btn" :disabled="uploadingCover" @tap.stop="chooseAndUpload('coverImage')">
              {{ uploadingCover ? '上传中...' : '重新上传' }}
            </button>
            <button
              v-if="form.coverImage"
              class="upload-clear-btn"
              :disabled="uploadingCover"
              @tap.stop="clearImage('coverImage')"
            >
              清空
            </button>
          </view>
        </view>
      </view>

      <view class="section">
        <text class="section-title">基础信息</text>

        <view class="form-item">
          <text class="form-label required">店铺名称</text>
          <input v-model="form.name" class="input" placeholder="请输入店铺名称" />
        </view>

        <view class="form-item">
          <text class="form-label">主营类目</text>
          <input v-model="form.businessCategory" class="input" placeholder="如：快餐便当" />
        </view>

        <view class="form-item">
          <text class="form-label">店铺公告</text>
          <textarea
            v-model="form.announcement"
            class="textarea"
            maxlength="120"
            placeholder="请输入公告内容"
          />
          <text class="count">{{ form.announcement.length }}/120</text>
        </view>
      </view>

      <view class="section">
        <text class="section-title">联系与配送</text>

        <view class="form-item">
          <text class="form-label">联系电话</text>
          <input v-model="form.phone" class="input" type="number" placeholder="请输入联系电话" />
        </view>

        <view class="form-item">
          <text class="form-label">店铺地址</text>
          <input v-model="form.address" class="input" placeholder="请输入店铺地址" />
        </view>

        <view class="split-row">
          <view class="half-item">
            <text class="form-label">起送价(元)</text>
            <input v-model="form.minPrice" class="input" type="digit" placeholder="0" />
          </view>
          <view class="half-item">
            <text class="form-label">配送费(元)</text>
            <input v-model="form.deliveryPrice" class="input" type="digit" placeholder="0" />
          </view>
        </view>

        <view class="form-item">
          <text class="form-label">配送时效</text>
          <input v-model="form.deliveryTime" class="input" placeholder="例如：30分钟" />
        </view>
      </view>

      <view class="section">
        <text class="section-title">营业设置</text>

        <view class="switch-row">
          <view>
            <text class="switch-title">营业状态</text>
            <text class="switch-desc">关闭后用户端无法下单</text>
          </view>
          <switch :checked="form.isActive" color="#009bf5" @change="onStatusChange" />
        </view>

        <view class="split-row">
          <view class="half-item">
            <text class="form-label">开门时间</text>
            <picker mode="time" :value="form.openTime" @change="onTimeChange('openTime', $event)">
              <view class="picker">{{ form.openTime || '09:00' }}</view>
            </picker>
          </view>
          <view class="half-item">
            <text class="form-label">打烊时间</text>
            <picker mode="time" :value="form.closeTime" @change="onTimeChange('closeTime', $event)">
              <view class="picker">{{ form.closeTime || '22:00' }}</view>
            </picker>
          </view>
        </view>
      </view>

      <view class="bottom-gap" />
    </scroll-view>

    <view class="footer">
      <button class="save-btn" :disabled="saving || !currentShop || uploadingAny" @tap="saveSettings">
        {{ saving ? '保存中...' : '保存并生效' }}
      </button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { fetchShopDetail, updateShop, uploadImage } from '@/shared-ui/api'
import { ensureMerchantShops, getCurrentShopId, setCurrentShopId } from '@/shared-ui/merchantContext'

const saving = ref(false)
const uploadingLogo = ref(false)
const uploadingCover = ref(false)
const shops = ref<any[]>([])
const currentShop = ref<any>(null)

const form = reactive({
  name: '',
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
})

const uploadingAny = computed(() => uploadingLogo.value || uploadingCover.value)

function toText(value: any) {
  return String(value ?? '').trim()
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

function fillForm(source: any) {
  const s = source || {}
  const hour = parseHours(s.businessHours || s.business_hours)

  form.name = toText(s.name)
  form.businessCategory = toText(s.businessCategory || s.category)
  form.announcement = toText(s.announcement)
  form.phone = toText(s.phone)
  form.address = toText(s.address)
  form.logo = toText(s.logo)
  form.coverImage = toText(s.coverImage || s.cover_image)
  form.minPrice = String(Number(s.minPrice || s.min_price || 0))
  form.deliveryPrice = String(Number(s.deliveryPrice || s.delivery_price || 0))
  form.deliveryTime = toText(s.deliveryTime || s.delivery_time)
  form.isActive = !!s.isActive
  form.openTime = hour.open
  form.closeTime = hour.close
}

async function loadData(force = false) {
  const ctx = await ensureMerchantShops(force)
  shops.value = ctx.shops || []

  const currentId = getCurrentShopId()
  currentShop.value = shops.value.find((item: any) => String(item.id) === String(currentId)) || ctx.currentShop || null

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

function onStatusChange(e: any) {
  form.isActive = !!e.detail.value
}

function onTimeChange(field: 'openTime' | 'closeTime', e: any) {
  form[field] = String(e.detail.value || '')
}

function clearImage(field: 'logo' | 'coverImage') {
  form[field] = ''
}

function chooseAndUpload(field: 'logo' | 'coverImage') {
  if (field === 'logo' && uploadingLogo.value) return
  if (field === 'coverImage' && uploadingCover.value) return

  uni.chooseImage({
    count: 1,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success: async (res: any) => {
      const filePath = String(res?.tempFilePaths?.[0] || '').trim()
      if (!filePath) return

      if (field === 'logo') {
        uploadingLogo.value = true
      } else {
        uploadingCover.value = true
      }

      try {
        const uploaded: any = await uploadImage(filePath)
        form[field] = toText(uploaded?.url)
        uni.showToast({ title: '图片上传成功', icon: 'success' })
      } catch (err: any) {
        uni.showToast({ title: err?.error || err?.message || '图片上传失败', icon: 'none' })
      } finally {
        if (field === 'logo') {
          uploadingLogo.value = false
        } else {
          uploadingCover.value = false
        }
      }
    },
    fail: (err: any) => {
      const msg = String(err?.errMsg || '').toLowerCase()
      if (msg.includes('cancel')) return
      uni.showToast({ title: '选择图片失败', icon: 'none' })
    },
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
  } catch (err: any) {
    uni.showToast({ title: err?.error || err?.message || '保存失败', icon: 'none' })
  } finally {
    saving.value = false
  }
}

onShow(async () => {
  try {
    await loadData()
  } catch (err: any) {
    uni.showToast({ title: err?.error || err?.message || '加载失败', icon: 'none' })
  }
})
</script>

<style scoped lang="scss" src="./settings.scss"></style>
