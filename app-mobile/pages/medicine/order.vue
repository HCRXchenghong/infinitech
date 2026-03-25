<template>
  <view class="page med-order">
    <view class="header">
      <view class="back" @tap="back">‹</view>
      <text class="title">极速买药</text>
    </view>

    <scroll-view scroll-y class="body">
      <view class="section">
        <text class="label">您想买什么药？</text>
        <textarea
          v-model="medOrderDesc"
          class="textarea"
          placeholder="例如：布洛芬缓释胶囊（芬必得）一盒，999感冒灵一盒"
          auto-height
          maxlength="200"
          show-confirm-bar="false"
        />
      </view>

      <view class="row space-between">
        <text class="label">预估药品费</text>
        <view class="price-input">
          <text class="price-prefix">¥</text>
          <input v-model="medPrice" class="price-field" type="digit" placeholder="0" />
        </view>
      </view>

      <view class="rx-card">
        <view class="row space-between">
          <text class="rx-title">包含处方药吗？</text>
          <switch color="#f97316" :checked="hasPrescription" @change="onRxChange" />
        </view>
        <text class="rx-sub">若包含处方药，请先上传电子处方或病历图片</text>
        <view v-if="hasPrescription" class="rx-upload" @tap="uploadPrescription">
          <text class="rx-upload-icon">📷</text>
          <text class="rx-upload-text">
            {{ uploadingPrescription ? '上传中...' : (prescriptionFileName || '点击上传处方/病历') }}
          </text>
        </view>
      </view>

      <view class="addr-card" @tap="selectAddress">
        <view class="addr-dot" />
        <view class="addr-main">
          <text class="addr-label">送药地址</text>
          <text class="addr-value">{{ deliveryAddress }}</text>
        </view>
        <text class="addr-arrow">›</text>
      </view>

      <view v-if="canEstimate" class="fee-card">
        <view class="fee-row">
          <text class="fee-label">跑腿费（夜间/加急）</text>
          <text class="fee-value">¥{{ serviceFee.toFixed(2) }}</text>
        </view>
        <view class="fee-row">
          <text class="fee-label">预估药品费</text>
          <text class="fee-value">¥{{ medPriceNumber.toFixed(2) }}</text>
        </view>
        <view class="fee-divider" />
        <view class="fee-row total">
          <text class="fee-total-label">预估总价</text>
          <text class="fee-total-value">¥{{ totalFee.toFixed(2) }}</text>
        </view>
      </view>

      <view style="height: 120px" />
    </scroll-view>

    <view class="footer">
      <view class="submit" :class="{ disabled: !canSubmit || submitting }" @tap="submit">
        {{ submitting ? '提交中...' : '立即叫药' }}
      </view>
    </view>
  </view>
</template>

<script>
import { createOrder, uploadCommonImage } from '@/shared-ui/api.js'
import { buildErrandOrderPayload, requireCurrentUserIdentity } from '@/shared-ui/errand.js'

const DEFAULT_ADDRESS = '请选择送药地址'

export default {
  data() {
    return {
      medOrderDesc: '',
      medPrice: '',
      hasPrescription: false,
      prescriptionFileName: '',
      prescriptionFileUrl: '',
      deliveryAddress: DEFAULT_ADDRESS,
      serviceFee: 18,
      uploadingPrescription: false,
      submitting: false
    }
  },
  computed: {
    medPriceNumber() {
      const n = Number(this.medPrice)
      return Number.isFinite(n) ? n : 0
    },
    canEstimate() {
      return (this.medOrderDesc || '').trim() && this.medPriceNumber > 0
    },
    canSubmit() {
      if (!this.canEstimate) return false
      if (!this.deliveryAddress || this.deliveryAddress === DEFAULT_ADDRESS) return false
      if (this.hasPrescription && !this.prescriptionFileUrl) return false
      return true
    },
    totalFee() {
      return this.serviceFee + this.medPriceNumber
    }
  },
  onLoad(query) {
    if (query && query.prefill) {
      const name = decodeURIComponent(query.prefill)
      this.medOrderDesc = `${name} 一盒`
    }
    this.syncAddress()
  },
  onShow() {
    this.syncAddress()
  },
  methods: {
    syncAddress() {
      const selectedAddress = String(uni.getStorageSync('selectedAddress') || '').trim()
      this.deliveryAddress = selectedAddress || DEFAULT_ADDRESS
    },
    back() {
      uni.navigateBack()
    },
    onRxChange(e) {
      this.hasPrescription = !!e.detail.value
      if (!this.hasPrescription) {
        this.prescriptionFileName = ''
        this.prescriptionFileUrl = ''
      }
    },
    selectAddress() {
      uni.navigateTo({ url: '/pages/profile/address-list/index?select=1' })
    },
    uploadPrescription() {
      if (this.uploadingPrescription) return
      uni.chooseImage({
        count: 1,
        success: async (res) => {
          const filePath = res.tempFilePaths && res.tempFilePaths[0]
          if (!filePath) return
          this.uploadingPrescription = true
          uni.showLoading({ title: '上传处方中...', mask: true })
          try {
            const uploaded = await uploadCommonImage(filePath)
            const url = String((uploaded && uploaded.url) || '')
            if (!url) {
              throw new Error('上传失败')
            }
            const parts = filePath.split(/[\\/]/)
            this.prescriptionFileName = parts[parts.length - 1] || '已上传'
            this.prescriptionFileUrl = url
          } catch (error) {
            uni.showToast({ title: '处方上传失败', icon: 'none' })
          } finally {
            uni.hideLoading()
            this.uploadingPrescription = false
          }
        }
      })
    },
    async submit() {
      if (!this.canSubmit || this.submitting) return
      const identity = requireCurrentUserIdentity()
      if (!identity) return

      this.submitting = true
      uni.showLoading({ title: '提交中...', mask: true })
      try {
        const payload = buildErrandOrderPayload(
          {
            serviceType: 'errand_buy',
            serviceName: '极速买药',
            shopName: '极速买药',
            pickup: '就近药房',
            dropoff: this.deliveryAddress,
            itemDescription: this.medOrderDesc,
            estimatedAmount: this.medPriceNumber,
            deliveryFee: this.serviceFee,
            totalPrice: this.totalFee,
            requestExtra: {
              category: 'medicine',
              hasPrescription: this.hasPrescription,
              prescriptionFileName: this.prescriptionFileName,
              prescriptionFileUrl: this.prescriptionFileUrl
            },
            requirementsExtra: {
              deliveryAddress: this.deliveryAddress
            }
          },
          identity
        )
        const result = await createOrder(payload)
        if (!result || !result.id) {
          throw new Error('订单创建失败')
        }
        uni.navigateTo({ url: `/pages/medicine/tracking?id=${encodeURIComponent(result.id)}` })
      } catch (error) {
        const message = (error && error.data && error.data.error) || error.error || error.message || '提交失败'
        uni.showToast({ title: message, icon: 'none' })
      } finally {
        uni.hideLoading()
        this.submitting = false
      }
    }
  }
}
</script>

<style scoped lang="scss">
.med-order {
  min-height: 100vh;
  background: #fff;
  display: flex;
  flex-direction: column;
}

.header {
  padding-top: 45px;
  padding-left: 12px;
  padding-right: 12px;
  padding-bottom: 10px;
  display: flex;
  align-items: center;
  gap: 10px;
  border-bottom: 1px solid #f1f5f9;
  background: #fff;
}

.back {
  width: 36px;
  height: 36px;
  border-radius: 999px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f8fafc;
  color: #334155;
}

.title {
  font-size: 16px;
  font-weight: 900;
  color: #0f172a;
}

.body {
  flex: 1;
  padding: 16px;
  box-sizing: border-box;
}

.section {
  margin-bottom: 18px;
}

.label {
  font-size: 13px;
  font-weight: 900;
  color: #334155;
  display: block;
  margin-bottom: 10px;
}

.textarea {
  width: 100%;
  background: #f8fafc;
  border-radius: 18px;
  padding: 12px;
  font-size: 13px;
  box-sizing: border-box;
}

.row {
  display: flex;
  align-items: center;
}

.space-between {
  justify-content: space-between;
}

.price-input {
  display: flex;
  align-items: center;
  gap: 6px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  padding: 8px 10px;
  width: 140px;
  box-sizing: border-box;
}

.price-prefix {
  color: #94a3b8;
}

.price-field {
  flex: 1;
  text-align: right;
  font-weight: 900;
  color: #0f172a;
}

.rx-card {
  margin-top: 16px;
  background: #fff7ed;
  border: 1px solid #ffedd5;
  border-radius: 18px;
  padding: 12px;
}

.rx-title {
  font-size: 13px;
  font-weight: 900;
  color: #9a3412;
}

.rx-sub {
  display: block;
  margin-top: 6px;
  font-size: 11px;
  color: rgba(154, 52, 18, 0.7);
}

.rx-upload {
  margin-top: 10px;
  height: 88px;
  border-radius: 14px;
  background: #fff;
  border: 2px dashed #fed7aa;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.rx-upload-icon {
  font-size: 22px;
  color: #fb923c;
}

.rx-upload-text {
  font-size: 12px;
  color: #fb923c;
  font-weight: 900;
}

.addr-card {
  margin-top: 16px;
  background: #f8fafc;
  border-radius: 18px;
  padding: 12px;
  display: flex;
  gap: 10px;
  align-items: center;
}

.addr-dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  background: #14b8a6;
}

.addr-main {
  flex: 1;
  min-width: 0;
}

.addr-label {
  display: block;
  font-size: 11px;
  color: #94a3b8;
  margin-bottom: 4px;
}

.addr-value {
  display: block;
  font-size: 13px;
  font-weight: 900;
  color: #0f172a;
  word-break: break-all;
}

.addr-arrow {
  font-size: 18px;
  color: #94a3b8;
}

.fee-card {
  margin-top: 16px;
  background: #ecfeff;
  border: 1px solid #ccfbf1;
  border-radius: 18px;
  padding: 12px;
}

.fee-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 6px 0;
}

.fee-label {
  font-size: 12px;
  color: #0f766e;
}

.fee-value {
  font-size: 12px;
  font-weight: 900;
  color: #0f172a;
}

.fee-divider {
  height: 1px;
  background: rgba(15, 118, 110, 0.12);
  margin: 10px 0;
}

.fee-total-label {
  font-size: 14px;
  font-weight: 900;
  color: #0f172a;
}

.fee-total-value {
  font-size: 18px;
  font-weight: 900;
  color: #14b8a6;
}

.footer {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 12px 16px;
  padding-bottom: calc(12px + env(safe-area-inset-bottom));
  background: rgba(255, 255, 255, 0.96);
  border-top: 1px solid #eef2f7;
}

.submit {
  height: 48px;
  border-radius: 999px;
  background: linear-gradient(135deg, #14b8a6, #0d9488);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  font-weight: 900;
}

.submit.disabled {
  background: #cbd5e1;
}
</style>
