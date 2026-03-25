<template>
  <view class="page">
    <scroll-view scroll-y class="content">
      <view class="card">
        <text class="title">基础信息</text>

        <view class="field">
          <text class="label">商品名称 *</text>
          <input v-model="form.name" class="input" placeholder="例如：招牌猪脚饭" />
        </view>

        <view class="field">
          <text class="label">商品分类 *</text>
          <picker :range="categoryNames" @change="onCategoryChange">
            <view class="picker">{{ selectedCategoryName }}</view>
          </picker>
        </view>

        <view class="field row">
          <view class="half">
            <text class="label">售价 *</text>
            <input v-model="form.price" class="input" type="digit" placeholder="0.00" />
          </view>
          <view class="half">
            <text class="label">库存</text>
            <input v-model="form.stock" class="input" type="number" placeholder="999" />
          </view>
        </view>

        <view class="field">
          <text class="label">描述</text>
          <textarea v-model="form.description" class="textarea" maxlength="200" placeholder="描述口味、分量、食材" />
        </view>

        <view class="field">
          <text class="label">商品图片（可选）</text>
          <view class="upload-card" @tap="chooseProductImage">
            <image v-if="form.image" class="upload-image" :src="form.image" mode="aspectFill" />
            <view v-else class="upload-empty">
              <text class="upload-empty-main">{{ uploadingImage ? '上传中...' : '点击上传商品图' }}</text>
              <text class="upload-empty-sub">支持相册和拍照</text>
            </view>
          </view>
          <view class="upload-actions">
            <button class="upload-btn" :disabled="uploadingImage" @tap.stop="chooseProductImage">
              {{ uploadingImage ? '上传中...' : '重新上传' }}
            </button>
            <button v-if="form.image" class="upload-clear-btn" :disabled="uploadingImage" @tap.stop="clearProductImage">
              清空
            </button>
          </view>
        </view>

        <view class="field row middle">
          <text class="label">是否上架</text>
          <switch :checked="form.isActive" color="#009bf5" @change="(e:any)=> (form.isActive = !!e.detail.value)" />
        </view>
      </view>

      <view class="space" />
    </scroll-view>

    <view class="footer">
      <button class="submit" :disabled="submitting || uploadingImage" @tap="handleSubmit">
        {{ submitting ? '保存中...' : '保存商品' }}
      </button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { createProduct, fetchCategories, uploadImage } from '@/shared-ui/api'
import { ensureMerchantShops, getCurrentShopId } from '@/shared-ui/merchantContext'

const submitting = ref(false)
const uploadingImage = ref(false)
const categories = ref<any[]>([])

const form = reactive({
  shopId: '',
  categoryId: '',
  name: '',
  price: '',
  stock: '999',
  description: '',
  image: '',
  isActive: true,
})

const categoryNames = computed(() => categories.value.map((item: any) => item.name))
const selectedCategoryName = computed(() => {
  const target = categories.value.find((item: any) => String(item.id) === String(form.categoryId))
  return target ? target.name : '请选择分类'
})

function onCategoryChange(e: any) {
  const index = Number(e.detail.value || 0)
  const item = categories.value[index]
  if (item) form.categoryId = String(item.id)
}

async function loadCategories(shopId: string) {
  const res: any = await fetchCategories(shopId)
  categories.value = Array.isArray(res) ? res : []
  if (!form.categoryId && categories.value.length) {
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
    success: async (res: any) => {
      const filePath = String(res?.tempFilePaths?.[0] || '').trim()
      if (!filePath) return
      uploadingImage.value = true
      try {
        const uploaded: any = await uploadImage(filePath)
        form.image = String(uploaded?.url || '').trim()
        uni.showToast({ title: '图片上传成功', icon: 'success' })
      } catch (err: any) {
        uni.showToast({ title: err?.error || err?.message || '图片上传失败', icon: 'none' })
      } finally {
        uploadingImage.value = false
      }
    },
    fail: (err: any) => {
      const msg = String(err?.errMsg || '').toLowerCase()
      if (msg.includes('cancel')) return
      uni.showToast({ title: '选择图片失败', icon: 'none' })
    },
  })
}

onLoad(async (options: any) => {
  try {
    const shopId = String(options?.shopId || getCurrentShopId())
    if (!shopId) {
      const ctx = await ensureMerchantShops()
      form.shopId = String(ctx.currentShop?.id || '')
    } else {
      form.shopId = shopId
    }

    if (!form.shopId) {
      uni.showToast({ title: '未找到店铺信息', icon: 'none' })
      return
    }

    await loadCategories(form.shopId)

    if (options?.categoryId) {
      form.categoryId = String(options.categoryId)
    }
  } catch (err: any) {
    uni.showToast({ title: err?.error || err?.message || '加载失败', icon: 'none' })
  }
})

async function handleSubmit() {
  if (submitting.value) return

  const name = String(form.name || '').trim()
  const price = Number(form.price || 0)
  const stock = Number(form.stock || 0)

  if (!name) {
    uni.showToast({ title: '请输入商品名称', icon: 'none' })
    return
  }
  if (!form.categoryId) {
    uni.showToast({ title: '请选择商品分类', icon: 'none' })
    return
  }
  if (!price || price <= 0) {
    uni.showToast({ title: '请输入正确售价', icon: 'none' })
    return
  }

  submitting.value = true
  try {
    await createProduct({
      shopId: String(form.shopId || '').trim(),
      categoryId: String(form.categoryId || '').trim(),
      name,
      price,
      stock: Number.isFinite(stock) ? stock : 999,
      description: form.description,
      image: form.image,
      isActive: form.isActive,
      unit: '份',
    })
    uni.showToast({ title: '商品创建成功', icon: 'success' })
    setTimeout(() => uni.navigateBack(), 300)
  } catch (err: any) {
    uni.showToast({ title: err?.error || err?.message || '创建失败', icon: 'none' })
  } finally {
    submitting.value = false
  }
}
</script>

<style lang="scss" scoped>
.page {
  height: 100vh;
  background: #f4f7fb;
  display: flex;
  flex-direction: column;
}

.content {
  flex: 1;
  min-height: 0;
  padding: 20rpx;
  box-sizing: border-box;
}

.card {
  background: #fff;
  border: 1rpx solid #e6eef7;
  border-radius: 18rpx;
  padding: 20rpx;
}

.title {
  display: block;
  margin-bottom: 14rpx;
  font-size: 30rpx;
  font-weight: 700;
  color: #10304d;
}

.field {
  margin-bottom: 16rpx;
}

.label {
  display: block;
  font-size: 24rpx;
  color: #43607e;
  margin-bottom: 8rpx;
}

.input,
.picker {
  width: 100%;
  height: 82rpx;
  line-height: 82rpx;
  border-radius: 14rpx;
  border: 1rpx solid #dce8f5;
  background: #f7fbff;
  padding: 0 20rpx;
  box-sizing: border-box;
  font-size: 26rpx;
  color: #163553;
}

.textarea {
  width: 100%;
  min-height: 160rpx;
  border-radius: 14rpx;
  border: 1rpx solid #dce8f5;
  background: #f7fbff;
  padding: 16rpx 20rpx;
  box-sizing: border-box;
  font-size: 26rpx;
  color: #163553;
}

.upload-card {
  position: relative;
  width: 100%;
  height: 190rpx;
  border: 1rpx dashed #bfd5ea;
  border-radius: 14rpx;
  background: #f7fbff;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.upload-image {
  width: 100%;
  height: 100%;
}

.upload-empty {
  text-align: center;
}

.upload-empty-main {
  display: block;
  font-size: 24rpx;
  color: #2c557e;
}

.upload-empty-sub {
  display: block;
  margin-top: 6rpx;
  font-size: 21rpx;
  color: #88a1b9;
}

.upload-actions {
  margin-top: 10rpx;
  display: flex;
  gap: 10rpx;
}

.upload-btn,
.upload-clear-btn {
  flex: 1;
  height: 62rpx;
  line-height: 62rpx;
  border-radius: 10rpx;
  font-size: 23rpx;
  border: 1rpx solid #d8e4f2;
  background: #ffffff;
  color: #345a7f;
}

.upload-clear-btn {
  border-color: #f0d3d3;
  color: #b94b4b;
  background: #fff8f8;
}

.row {
  display: flex;
  gap: 12rpx;
}

.half {
  flex: 1;
}

.middle {
  align-items: center;
  justify-content: space-between;
}

.space {
  height: calc(180rpx + env(safe-area-inset-bottom));
}

.footer {
  padding: 16rpx 20rpx calc(16rpx + env(safe-area-inset-bottom));
  background: linear-gradient(to top, #f4f7fb 70%, transparent);
}

.submit {
  width: 100%;
  height: 88rpx;
  line-height: 88rpx;
  border-radius: 14rpx;
  border: none;
  color: #fff;
  font-size: 30rpx;
  font-weight: 700;
  background: linear-gradient(135deg, #009bf5, #0077c2);
}
</style>
