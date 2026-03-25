<template>
  <view class="page address-edit">
    <view class="page-head">
      <text class="head-title">{{ form.id ? '编辑收货地址' : '新增收货地址' }}</text>
      <text class="head-subtitle">信息完整可提升骑手送达效率</text>
    </view>

    <view class="form-block">
      <text class="block-title">联系人信息</text>

      <view class="form-item">
        <text class="label">联系人</text>
        <input v-model.trim="form.name" class="input" placeholder="请填写收货人姓名" placeholder-class="ph" />
      </view>

      <view class="form-item no-border">
        <text class="label">手机号</text>
        <input
          v-model.trim="form.phone"
          class="input"
          type="number"
          maxlength="11"
          placeholder="请填写收货手机号码"
          placeholder-class="ph"
        />
      </view>
    </view>

    <view class="form-block">
      <text class="block-title">地址信息</text>

      <view class="form-item" @tap="chooseLocation">
        <text class="label">地址</text>
        <view class="value-wrap">
          <text v-if="form.address" class="value">{{ form.address }}</text>
          <text v-else class="ph">点击选择收货地址</text>
        </view>
        <text class="arrow">›</text>
      </view>

      <view class="form-item">
        <text class="label">门牌号</text>
        <input v-model.trim="form.detail" class="input" placeholder="例：A 座 307 室" placeholder-class="ph" />
      </view>

      <view class="form-item no-border tags-row">
        <text class="label">标签</text>
        <view class="tags">
          <text
            v-for="tag in tags"
            :key="tag"
            class="tag"
            :class="{ active: form.tag === tag }"
            @tap="form.tag = tag"
          >{{ tag }}</text>
        </view>
      </view>
    </view>

    <view class="bottom-bar">
      <button class="save-btn" :disabled="submitting" :loading="submitting" @tap="save">
        {{ form.id ? '保存修改' : '保存地址' }}
      </button>
    </view>
  </view>
</template>

<script>
import { chooseLocation, getCurrentLocation } from '@/shared-ui/location.js'

export default {
  data() {
    return {
      submitting: false,
      form: {
        id: '',
        name: '',
        phone: '',
        address: '',
        detail: '',
        tag: '',
        lat: null,
        lng: null
      },
      tags: ['家', '公司', '学校']
    }
  },
  onLoad(query) {
    if (!query || !query.id) return

    this.form.id = String(query.id || '').trim()
    const savedAddresses = uni.getStorageSync('addresses') || []
    const address = savedAddresses.find((addr) => String(addr.id || '') === this.form.id)
    if (!address) return

    this.form.name = address.name
    this.form.phone = address.phone
    const parts = this.parseDetail(address.detail)
    this.form.address = parts.address
    this.form.detail = parts.room
    this.form.tag = address.tag || '家'
  },
  methods: {
    parseDetail(detail) {
      const text = String(detail || '').trim()
      if (!text) return { address: '', room: '' }
      const firstGap = text.indexOf(' ')
      if (firstGap === -1) return { address: text, room: '' }
      return {
        address: text.slice(0, firstGap).trim(),
        room: text.slice(firstGap + 1).trim()
      }
    },
    chooseLocation() {
      uni.showLoading({ title: '定位中...' })
      chooseLocation()
        .then((res) => {
          this.form.address = res.address || res.name || ''
          this.form.lat = res.latitude
          this.form.lng = res.longitude
        })
        .catch(() => {
          getCurrentLocation()
            .then((data) => {
              const displayAddress =
                data.address || `${data.latitude.toFixed(6)},${data.longitude.toFixed(6)}`
              this.form.address = displayAddress
              this.form.lat = data.latitude
              this.form.lng = data.longitude
            })
            .catch(() => {
              uni.showToast({ title: '定位失败', icon: 'none' })
            })
        })
        .finally(() => {
          uni.hideLoading()
        })
    },
    save() {
      if (this.submitting) return
      if (!this.form.name || !this.form.phone || !this.form.address) {
        uni.showToast({ title: '请填写完整信息', icon: 'none' })
        return
      }
      if (!/^1\d{10}$/.test(this.form.phone)) {
        uni.showToast({ title: '手机号格式不正确', icon: 'none' })
        return
      }

      this.submitting = true
      const savedAddresses = uni.getStorageSync('addresses') || []
      const formattedDetail = `${this.form.address} ${this.form.detail}`.trim()

      if (this.form.id) {
        const index = savedAddresses.findIndex((addr) => String(addr.id || '') === this.form.id)
        if (index !== -1) {
          savedAddresses[index] = {
            id: this.form.id,
            tag: this.form.tag || '家',
            name: this.form.name,
            phone: this.form.phone,
            detail: formattedDetail
          }
        }
      } else {
        const newId = `addr_${Date.now()}_${Math.floor(Math.random() * 1000)}`
        savedAddresses.push({
          id: newId,
          tag: this.form.tag || '家',
          name: this.form.name,
          phone: this.form.phone,
          detail: formattedDetail
        })
      }

      uni.setStorageSync('addresses', savedAddresses)
      uni.showToast({ title: '保存成功', icon: 'success' })
      setTimeout(() => {
        this.submitting = false
        uni.navigateBack()
      }, 700)
    }
  }
}
</script>

<style scoped lang="scss">
.address-edit {
  min-height: 100vh;
  background: #f4f7fb;
  padding: 20rpx;
  box-sizing: border-box;
  padding-bottom: calc(150rpx + env(safe-area-inset-bottom));
}

.page-head {
  padding: 10rpx 6rpx 4rpx;
}

.head-title {
  display: block;
  font-size: 42rpx;
  font-weight: 700;
  color: #173a6a;
}

.head-subtitle {
  display: block;
  margin-top: 4rpx;
  font-size: 25rpx;
  color: #64748b;
}

.form-block {
  margin-top: 14rpx;
  border-radius: 18rpx;
  background: #ffffff;
  border: 1rpx solid #d9e2ef;
  padding: 0 20rpx;
}

.block-title {
  height: 76rpx;
  line-height: 76rpx;
  font-size: 27rpx;
  font-weight: 700;
  color: #26456f;
}

.form-item {
  min-height: 96rpx;
  border-bottom: 1rpx solid #e8edf4;
  display: flex;
  align-items: center;
}

.form-item.no-border {
  border-bottom: none;
}

.label {
  width: 132rpx;
  font-size: 27rpx;
  color: #475569;
}

.input {
  flex: 1;
  font-size: 29rpx;
  color: #1f2937;
}

.value-wrap {
  flex: 1;
  min-width: 0;
}

.value {
  font-size: 28rpx;
  color: #1f2937;
  line-height: 1.4;
}

.ph {
  font-size: 27rpx;
  color: #94a3b8;
}

.arrow {
  margin-left: 8rpx;
  font-size: 30rpx;
  color: #94a3b8;
}

.tags-row {
  align-items: flex-start;
  padding-top: 18rpx;
  padding-bottom: 18rpx;
}

.tags {
  flex: 1;
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}

.tag {
  min-width: 96rpx;
  height: 58rpx;
  line-height: 58rpx;
  border-radius: 14rpx;
  text-align: center;
  font-size: 25rpx;
  color: #475569;
  background: #f1f5f9;
}

.tag.active {
  color: #ffffff;
  background: #60a5fa;
  font-weight: 600;
}

.bottom-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 14rpx 20rpx calc(14rpx + env(safe-area-inset-bottom));
  background: #f4f7fb;
  border-top: 1rpx solid #e8edf4;
}

.save-btn {
  width: 100%;
  height: 92rpx;
  border-radius: 16rpx;
  background: #60a5fa;
  color: #ffffff;
  font-size: 31rpx;
  font-weight: 700;
}

.save-btn[disabled] {
  opacity: 0.72;
}
</style>
