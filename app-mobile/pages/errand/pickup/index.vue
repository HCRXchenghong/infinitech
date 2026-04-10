<template>
  <view class="page errand-pickup">
    <PageHeader title="帮我取" />

    <scroll-view scroll-y class="content">
      <view class="form-group">
        <view class="form-title">取件码/单号</view>
        <input v-model="form.code" class="form-input" placeholder="输入取件码" />
      </view>

      <view class="form-group">
        <view class="form-title">送达地址</view>
        <input v-model="form.address" class="form-input" placeholder="楼栋号+门牌号" />
      </view>

      <view class="form-group">
        <view class="form-title">配送方式</view>
        <view class="type-tabs">
          <view
            class="type-tab"
            :class="{ active: form.type === 'now' }"
            @tap="form.type = 'now'"
          >
            <text class="tab-name">即时送</text>
            <text class="tab-price">¥14</text>
          </view>
          <view
            class="type-tab"
            :class="{ active: form.type === 'today' }"
            @tap="form.type = 'today'"
          >
            <text class="tab-name">当日达</text>
            <text class="tab-price">¥5</text>
          </view>
        </view>
      </view>

      <view class="fee-summary">
        <view class="fee-row">
          <text>跑腿费</text>
          <text>¥{{ totalPrice }}</text>
        </view>
        <view class="fee-row total">
          <text>合计</text>
          <text class="price">¥{{ totalPrice }}</text>
        </view>
      </view>
    </scroll-view>

    <view class="footer">
      <view class="footer-price">¥{{ totalPrice }}</view>
      <view class="footer-btn" :class="{ disabled: !canSubmit || submitting }" @tap="submitOrder">
        {{ submitting ? '提交中...' : '下单' }}
      </view>
    </view>
  </view>
</template>

<script>
import PageHeader from '@/components/PageHeader.vue'
import { createOrder } from '@/shared-ui/api.js'
import { buildErrandOrderPayload, requireCurrentUserIdentity } from '@/shared-ui/errand.js'
import { ensureErrandServiceOpen } from '@/shared-ui/errand-runtime.js'

export default {
  components: { PageHeader },
  data() {
    return {
      form: {
        code: '',
        address: '',
        type: 'now'
      },
      submitting: false
    }
  },
  computed: {
    serviceFee() {
      return this.form.type === 'today' ? 5 : 14
    },
    totalPrice() {
      return this.serviceFee.toFixed(2)
    },
    preferredTime() {
      return this.form.type === 'today' ? '今日20:00前' : '尽快送达'
    },
    canSubmit() {
      return Boolean(this.form.code && this.form.address)
    }
  },
  onLoad() {
    this.ensureOpen()
  },
  methods: {
    async ensureOpen() {
      await ensureErrandServiceOpen('pickup')
    },
    async submitOrder() {
      if (!this.canSubmit || this.submitting) return
      const identity = requireCurrentUserIdentity()
      if (!identity) return

      this.submitting = true
      uni.showLoading({ title: '提交中...' })
      try {
        const payload = buildErrandOrderPayload(
          {
            serviceType: 'errand_pickup',
            pickup: '快递站点',
            dropoff: this.form.address,
            itemDescription: `快递（取件码：${this.form.code}）`,
            deliveryFee: this.serviceFee,
            totalPrice: this.serviceFee,
            preferredTime: this.preferredTime,
            requestExtra: {
              pickupCode: this.form.code
            },
            requirementsExtra: {
              deliveryMode: this.form.type
            }
          },
          identity
        )
        const result = await createOrder(payload)
        if (!result || !result.id) {
          throw new Error('订单创建失败')
        }
        uni.navigateTo({ url: `/pages/errand/detail/index?id=${encodeURIComponent(result.id)}` })
      } catch (error) {
        const message = (error && error.data && error.data.error) || error.error || error.message || '下单失败'
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
.errand-pickup {
  min-height: 100vh;
  background: #f5f5f5;
}

.content {
  padding: 0 12px 100px;
  padding-top: calc(env(safe-area-inset-top, 0px) + 54px);
  min-height: 100vh;
  box-sizing: border-box;
}

.form-group {
  background: #fff;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 10px;
}

.form-title {
  font-size: 14px;
  color: #666;
  margin-bottom: 8px;
}

.form-input {
  width: 100%;
  height: 40px;
  font-size: 15px;
  border: 1px solid #eee;
  border-radius: 6px;
  padding: 0 10px;
  background: #f9f9f9;
  box-sizing: border-box;
}

.type-tabs {
  display: flex;
  gap: 8px;
}

.type-tab {
  flex: 1;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  text-align: center;
}

.type-tab.active {
  border-color: #ff6b00;
  background: #fff5f0;
}

.tab-name {
  display: block;
  font-size: 14px;
  color: #333;
  margin-bottom: 4px;
}

.tab-price {
  display: block;
  font-size: 16px;
  color: #ff6b00;
  font-weight: 600;
}

.fee-summary {
  background: #fff;
  border-radius: 8px;
  padding: 12px;
}

.fee-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  font-size: 14px;
  color: #666;
}

.fee-row.total {
  padding-top: 12px;
  border-top: 1px solid #eee;
}

.fee-row.total .price {
  font-size: 18px;
  color: #ff4d4f;
  font-weight: 600;
}

.footer {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  padding: 10px 12px;
  padding-bottom: calc(10px + env(safe-area-inset-bottom));
  background: #fff;
  border-top: 1px solid #eee;
}

.footer-price {
  font-size: 20px;
  color: #ff4d4f;
  font-weight: 600;
  margin-right: 12px;
}

.footer-btn {
  flex: 1;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #ff6b00;
  color: #fff;
  font-size: 15px;
  border-radius: 6px;
}

.footer-btn.disabled {
  background: #ccc;
}
</style>
