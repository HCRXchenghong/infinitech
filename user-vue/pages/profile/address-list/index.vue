<template>
  <view class="page address-page">
    <view class="toolbar">
      <text class="page-title">收货地址</text>
      <view class="toolbar-actions">
        <view v-if="!isSelectMode" class="toolbar-btn" @tap="toggleManage">{{ manageMode ? '完成' : '管理' }}</view>
        <view class="toolbar-btn primary" @tap="add">新增地址</view>
      </view>
    </view>

    <view v-if="isSelectMode" class="select-tip">请选择本次下单使用的收货地址</view>

    <view class="search-wrap">
      <text class="search-icon">搜</text>
      <input
        v-model.trim="keyword"
        class="search-input"
        placeholder="搜索姓名、手机号、地址"
        placeholder-class="search-ph"
      />
      <text v-if="keyword" class="search-clear" @tap="keyword = ''">清空</text>
    </view>

    <scroll-view scroll-y class="address-scroll">
      <view v-if="loading" class="empty-state">
        <text class="empty-title">正在加载地址</text>
        <text class="empty-desc">请稍候</text>
      </view>

      <view v-else-if="filteredAddresses.length === 0" class="empty-state">
        <text class="empty-title">{{ keyword ? '没有匹配地址' : '暂无收货地址' }}</text>
        <text class="empty-desc">{{ keyword ? '请尝试其他关键词' : '点击右上角新增地址' }}</text>
      </view>

      <view v-else class="list-panel">
        <view
          v-for="addr in filteredAddresses"
          :key="addr.id"
          class="address-card"
          :class="{ selected: selectedAddressId === addr.id, 'manage-mode': manageMode && !isSelectMode }"
          @tap="onCardTap(addr)"
        >
          <view class="card-head">
            <text class="addr-place">{{ addr.fullAddress }}</text>
            <view class="chip-row">
              <text v-if="addr.isDefault" class="chip primary">默认</text>
              <text v-if="isSelectMode && selectedAddressId === addr.id" class="chip active">已选中</text>
              <text v-if="addr.tag" class="chip">{{ addr.tag }}</text>
            </view>
          </view>

          <view class="contact-row">
            <text class="contact-name">{{ addr.name }}</text>
            <text class="contact-phone">{{ addr.phone }}</text>
          </view>

          <view v-if="manageMode && !isSelectMode" class="card-actions">
            <view class="action-btn secondary" @tap.stop="setDefault(addr)">{{ addr.isDefault ? '默认地址' : '设为默认' }}</view>
            <view class="action-btn edit" @tap.stop="edit(addr.id)">编辑</view>
            <view class="action-btn delete" @tap.stop="deleteAddress(addr.id)">删除</view>
          </view>
        </view>
      </view>

      <view class="bottom-gap"></view>
    </scroll-view>
  </view>
</template>

<script>
import { fetchUserAddresses, deleteUserAddress, setDefaultUserAddress } from '@/shared-ui/api.js'
import { normalizeErrorMessage } from '@/shared-ui/foundation/error.js'

function buildCacheAddress(addr) {
  const fullAddress = String(addr.fullAddress || addr.detail || addr.address || '').trim()
  return {
    id: String(addr.id || '').trim(),
    name: String(addr.name || '').trim(),
    phone: String(addr.phone || '').trim(),
    tag: String(addr.tag || '').trim(),
    address: String(addr.address || '').trim(),
    roomDetail: String(addr.roomDetail || '').trim(),
    detail: fullAddress,
    fullAddress,
    latitude: Number(addr.latitude || 0) || 0,
    longitude: Number(addr.longitude || 0) || 0,
    isDefault: Boolean(addr.isDefault)
  }
}

export default {
  data() {
    return {
      isSelectMode: false,
      manageMode: false,
      keyword: '',
      loading: false,
      addresses: [],
      selectedAddressId: ''
    }
  },
  computed: {
    filteredAddresses() {
      const key = String(this.keyword || '').trim().toLowerCase()
      if (!key) return this.addresses
      return this.addresses.filter((addr) => {
        const fields = [addr.name, addr.phone, addr.fullAddress, addr.tag]
        return fields.some((field) => String(field || '').toLowerCase().includes(key))
      })
    }
  },
  onLoad(options) {
    this.isSelectMode = options && options.select === '1'
  },
  onShow() {
    this.loadAddresses()
  },
  methods: {
    currentUserId() {
      const profile = uni.getStorageSync('userProfile') || {}
      return String(profile.id || profile.userId || profile.phone || '').trim()
    },
    normalizeAddress(addr) {
      if (!addr || typeof addr !== 'object') return null
      const id = String(addr.id || '').trim()
      const address = String(addr.address || '').trim()
      const roomDetail = String(addr.roomDetail || addr.detail || '').trim()
      const fullAddress = String(addr.fullAddress || [address, roomDetail].filter(Boolean).join(' ')).trim()
      const name = String(addr.name || '').trim()
      const phone = String(addr.phone || '').trim()
      if (!id || !fullAddress || !name) return null
      return {
        id,
        name,
        phone,
        tag: String(addr.tag || '').trim(),
        address,
        roomDetail,
        detail: fullAddress,
        fullAddress,
        latitude: Number(addr.latitude || 0) || 0,
        longitude: Number(addr.longitude || 0) || 0,
        isDefault: Boolean(addr.isDefault)
      }
    },
    normalizeAddresses(list) {
      if (!Array.isArray(list)) return []
      return list.map((item) => this.normalizeAddress(item)).filter(Boolean)
    },
    cacheAddresses(addresses) {
      const cached = addresses.map((item) => buildCacheAddress(item))
      uni.setStorageSync('addresses', cached)
      this.syncSelectedAddress(cached)
    },
    syncSelectedAddress(addresses = this.addresses) {
      const cached = this.normalizeAddresses(addresses)
      const selectedId = String(uni.getStorageSync('selectedAddressId') || '').trim()
      let matched = selectedId ? cached.find((item) => item.id === selectedId) : null
      if (!matched) {
        matched = cached.find((item) => item.isDefault) || null
      }
      if (!matched && cached.length === 1) {
        matched = cached[0]
      }

      if (!matched) {
        this.selectedAddressId = ''
        uni.removeStorageSync('selectedAddressId')
        uni.removeStorageSync('selectedAddress')
        uni.removeStorageSync('selectedAddressPayload')
        return
      }

      this.selectedAddressId = matched.id
      uni.setStorageSync('selectedAddressId', matched.id)
      uni.setStorageSync('selectedAddress', matched.fullAddress)
      uni.setStorageSync('selectedAddressPayload', buildCacheAddress(matched))
    },
    async loadAddresses() {
      const userId = this.currentUserId()
      if (!userId) {
        this.addresses = this.normalizeAddresses(uni.getStorageSync('addresses'))
        this.syncSelectedAddress(this.addresses)
        return
      }

      this.loading = true
      try {
        const list = await fetchUserAddresses(userId)
        this.addresses = this.normalizeAddresses(list)
        this.cacheAddresses(this.addresses)
      } catch (error) {
        this.addresses = this.normalizeAddresses(uni.getStorageSync('addresses'))
        this.syncSelectedAddress(this.addresses)
        uni.showToast({ title: normalizeErrorMessage(error, '加载地址失败'), icon: 'none' })
      } finally {
        this.loading = false
      }
    },
    toggleManage() {
      this.manageMode = !this.manageMode
    },
    onCardTap(addr) {
      if (this.manageMode && !this.isSelectMode) return
      this.selectAddress(addr)
    },
    add() {
      uni.navigateTo({ url: '/pages/profile/address-edit/index' })
    },
    edit(id) {
      uni.navigateTo({ url: `/pages/profile/address-edit/index?id=${encodeURIComponent(id)}` })
    },
    selectAddress(addr) {
      this.selectedAddressId = addr.id
      uni.setStorageSync('selectedAddressId', addr.id)
      uni.setStorageSync('selectedAddress', addr.fullAddress)
      uni.setStorageSync('selectedAddressPayload', buildCacheAddress(addr))
      uni.$emit('addressSelected', buildCacheAddress(addr))

      if (!this.isSelectMode) {
        this.edit(addr.id)
        return
      }

      uni.showToast({ title: '地址已切换', icon: 'success' })
      setTimeout(() => {
        uni.navigateBack()
      }, 300)
    },
    async setDefault(addr) {
      if (addr.isDefault) return
      const userId = this.currentUserId()
      if (!userId) return
      try {
        await setDefaultUserAddress(userId, addr.id)
        await this.loadAddresses()
        uni.showToast({ title: '已设为默认地址', icon: 'success' })
      } catch (error) {
        uni.showToast({ title: normalizeErrorMessage(error, '设置默认失败'), icon: 'none' })
      }
    },
    async deleteAddress(id) {
      const userId = this.currentUserId()
      if (!userId) return

      uni.showModal({
        title: '确认删除',
        content: '确定删除这个收货地址吗？',
        success: async (res) => {
          if (!res.confirm) return
          try {
            await deleteUserAddress(userId, id)
            await this.loadAddresses()
            uni.showToast({ title: '删除成功', icon: 'success' })
          } catch (error) {
            uni.showToast({ title: normalizeErrorMessage(error, '删除失败'), icon: 'none' })
          }
        }
      })
    }
  }
}
</script>

<style scoped lang="scss">
.address-page {
  min-height: 100vh;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f4f7fb;
  padding: 20rpx;
  box-sizing: border-box;
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.page-title {
  font-size: 42rpx;
  font-weight: 700;
  color: #183a6a;
}

.toolbar-actions {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.toolbar-btn {
  height: 64rpx;
  min-width: 112rpx;
  padding: 0 20rpx;
  border-radius: 16rpx;
  background: #ffffff;
  border: 1rpx solid #d9e2ef;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 25rpx;
  color: #334155;
}

.toolbar-btn.primary {
  color: #ffffff;
  border: none;
  background: #60a5fa;
}

.select-tip {
  margin-top: 14rpx;
  height: 72rpx;
  border-radius: 18rpx;
  background: #dbeaff;
  color: #275a95;
  font-size: 25rpx;
  display: flex;
  align-items: center;
  padding: 0 18rpx;
}

.search-wrap {
  margin-top: 14rpx;
  height: 82rpx;
  border-radius: 18rpx;
  background: #ffffff;
  border: 1rpx solid #d9e2ef;
  display: flex;
  align-items: center;
  padding: 0 18rpx;
}

.search-icon {
  font-size: 28rpx;
  color: #86a5cf;
}

.search-input {
  flex: 1;
  margin-left: 12rpx;
  font-size: 28rpx;
  color: #1d2f4a;
}

.search-ph {
  color: #9fb6d8;
}

.search-clear {
  font-size: 24rpx;
  color: #4a78b4;
}

.address-scroll {
  flex: 1;
  margin-top: 14rpx;
}

.list-panel {
  border-radius: 18rpx;
  background: #ffffff;
  border: 1rpx solid #d9e2ef;
  overflow: hidden;
}

.empty-state {
  margin-top: 80rpx;
  border-radius: 18rpx;
  background: #ffffff;
  border: 1rpx solid #d9e2ef;
  padding: 48rpx 20rpx;
  text-align: center;
}

.empty-title {
  display: block;
  font-size: 32rpx;
  color: #254a7a;
  font-weight: 600;
}

.empty-desc {
  display: block;
  margin-top: 8rpx;
  font-size: 24rpx;
  color: #7f9cc1;
}

.address-card {
  padding: 24rpx;
  background: #ffffff;
  border-bottom: 1rpx solid #e8edf4;
}

.address-card:last-child {
  border-bottom: none;
}

.address-card.selected {
  background: #f7fbff;
  border-left: 6rpx solid #60a5fa;
  padding-left: 18rpx;
}

.card-head {
  display: flex;
  justify-content: space-between;
  gap: 10rpx;
}

.addr-place {
  flex: 1;
  min-width: 0;
  font-size: 32rpx;
  line-height: 1.45;
  font-weight: 700;
  color: #1b2e49;
}

.chip-row {
  display: flex;
  gap: 8rpx;
  align-items: center;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.chip {
  height: 44rpx;
  line-height: 44rpx;
  padding: 0 14rpx;
  border-radius: 12rpx;
  background: #f1f5f9;
  color: #64748b;
  font-size: 22rpx;
}

.chip.primary {
  background: #e0f2fe;
  color: #0369a1;
}

.chip.active {
  background: #eff6ff;
  color: #1d4ed8;
}

.contact-row {
  margin-top: 14rpx;
  display: flex;
  align-items: center;
  gap: 14rpx;
}

.contact-name {
  font-size: 30rpx;
  color: #1f3455;
  font-weight: 600;
}

.contact-phone {
  font-size: 29rpx;
  color: #475569;
}

.card-actions {
  margin-top: 16rpx;
  padding-top: 16rpx;
  border-top: 1rpx solid #e8edf4;
  display: flex;
  justify-content: flex-end;
  gap: 12rpx;
  flex-wrap: wrap;
}

.action-btn {
  min-width: 124rpx;
  height: 64rpx;
  border-radius: 14rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26rpx;
}

.action-btn.secondary {
  color: #0369a1;
  background: #ecfeff;
}

.action-btn.edit {
  color: #1d4ed8;
  background: #eff6ff;
}

.action-btn.delete {
  color: #dc2626;
  background: #fef2f2;
}

.bottom-gap {
  height: calc(26rpx + env(safe-area-inset-bottom));
}
</style>
