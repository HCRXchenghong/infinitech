<template>
  <view class="page address-page">
    <view class="toolbar">
      <text class="page-title">收货地址</text>
      <view class="toolbar-actions">
        <view v-if="!isSelectMode" class="toolbar-btn" @tap="toggleManage">{{ manageMode ? '完成' : '管理' }}</view>
        <view class="toolbar-btn primary" @tap="add">新增地址</view>
      </view>
    </view>

    <view v-if="isSelectMode" class="select-tip">请选择用于下单的收货地址</view>

    <view class="search-wrap">
      <text class="search-icon">⌕</text>
      <input
        v-model.trim="keyword"
        class="search-input"
        placeholder="搜索姓名、手机号、地址"
        placeholder-class="search-ph"
      />
      <text v-if="keyword" class="search-clear" @tap="keyword = ''">清空</text>
    </view>

    <scroll-view scroll-y class="address-scroll">
      <view v-if="filteredAddresses.length === 0" class="empty-state">
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
            <text class="addr-place">{{ detailParts(addr).place }}</text>
            <view class="chip-row">
              <text v-if="selectedAddressId === addr.id" class="chip primary">默认</text>
              <text v-if="addr.tag" class="chip">{{ addr.tag }}</text>
            </view>
          </view>

          <text class="addr-area">{{ detailParts(addr).area }}</text>

          <view class="contact-row">
            <text class="contact-name">{{ addr.name }}</text>
            <text class="contact-phone">{{ addr.phone }}</text>
          </view>

          <view v-if="manageMode && !isSelectMode" class="card-actions">
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
export default {
  data() {
    return {
      isSelectMode: false,
      manageMode: false,
      keyword: '',
      addresses: [],
      selectedAddressId: null
    }
  },
  computed: {
    filteredAddresses() {
      const key = String(this.keyword || '').trim().toLowerCase()
      if (!key) return this.addresses
      return this.addresses.filter((addr) => {
        const fields = [addr.name, addr.phone, addr.detail, addr.tag]
        return fields.some((field) => String(field || '').toLowerCase().includes(key))
      })
    }
  },
  onLoad(options) {
    this.isSelectMode = options && options.select === '1'
    this.loadAddresses()
    this.syncSelectedAddress()
  },
  onShow() {
    this.loadAddresses()
    this.syncSelectedAddress()
  },
  methods: {
    loadAddresses() {
      this.addresses = this.normalizeAddresses(uni.getStorageSync('addresses'))
    },
    normalizeAddresses(raw) {
      if (!Array.isArray(raw)) return []
      return raw
        .map((addr) => this.normalizeAddress(addr))
        .filter(Boolean)
    },
    normalizeAddress(addr) {
      if (!addr || typeof addr !== 'object') return null
      const id = String(addr.id || '').trim()
      const detail = String(addr.detail || '').trim()
      const name = String(addr.name || '').trim()
      const phone = String(addr.phone || '').trim()
      const tag = String(addr.tag || '').trim()
      if (!id || !detail || !name) return null
      return { id, detail, name, phone, tag }
    },
    syncSelectedAddress() {
      const selectedAddress = String(uni.getStorageSync('selectedAddress') || '').trim()
      if (!selectedAddress) {
        this.selectedAddressId = null
        return
      }
      const matched = this.addresses.find((addr) => addr.detail === selectedAddress)
      if (!matched) {
        this.selectedAddressId = null
        uni.removeStorageSync('selectedAddress')
        return
      }
      this.selectedAddressId = matched.id
    },
    detailParts(addr) {
      const text = String((addr && addr.detail) || '').trim()
      if (!text) {
        return { area: '地址信息待补充', place: '请完善门牌号' }
      }
      const firstGap = text.indexOf(' ')
      if (firstGap === -1) {
        return { area: '收货地址', place: text }
      }
      const area = text.slice(0, firstGap).trim()
      const place = text.slice(firstGap + 1).trim() || area
      return { area, place }
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
      uni.navigateTo({ url: '/pages/profile/address-edit/index?id=' + id })
    },
    selectAddress(addr) {
      if (this.isSelectMode) {
        uni.setStorageSync('selectedAddress', addr.detail)
        this.selectedAddressId = addr.id
        uni.$emit('addressSelected')
        uni.showToast({ title: '地址已切换', icon: 'success' })
        setTimeout(() => {
          uni.navigateBack()
        }, 350)
        return
      }
      this.edit(addr.id)
    },
    deleteAddress(id) {
      uni.showModal({
        title: '确认删除',
        content: '确定要删除这个地址吗？',
        success: (res) => {
          if (res.confirm) {
            this.addresses = this.addresses.filter((addr) => addr.id !== id)
            uni.setStorageSync('addresses', this.addresses)
            if (this.selectedAddressId === id) {
              this.selectedAddressId = null
              uni.removeStorageSync('selectedAddress')
            }
            uni.showToast({ title: '删除成功', icon: 'success' })
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
  font-size: 30rpx;
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
  font-size: 36rpx;
  line-height: 1.35;
  font-weight: 700;
  color: #1b2e49;
}

.chip-row {
  display: flex;
  gap: 8rpx;
  align-items: center;
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

.addr-area {
  display: block;
  margin-top: 10rpx;
  font-size: 25rpx;
  line-height: 1.45;
  color: #6d86aa;
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
