<template>
  <view class="page errand-do">
    <PageHeader title="帮我办" />

    <scroll-view scroll-y class="content">
      <view class="form-group">
        <view class="form-title">服务地址</view>
        <input v-model="form.address" class="form-input" placeholder="楼栋号+门牌号" />
      </view>

      <view class="form-group">
        <view class="form-title">代办事项</view>
        <textarea
          v-model="form.desc"
          class="form-textarea"
          placeholder="需要帮你做什么？写清楚时间、地点"
          :maxlength="200"
        />
      </view>

      <view class="form-group">
        <view class="form-title">打赏骑手</view>
        <view class="tip-chips">
          <view
            v-for="t in tipOptions"
            :key="t.value"
            class="tip-chip"
            :class="{ active: Number(form.tipAmount) === t.value }"
            @tap="form.tipAmount = t.value"
          >
            {{ t.label }}
          </view>
        </view>
      </view>

      <view class="fee-summary">
        <view class="fee-row">
          <text>服务费</text>
          <text>¥{{ serviceFee.toFixed(2) }}</text>
        </view>
        <view class="fee-row" v-if="Number(form.tipAmount) > 0">
          <text>打赏</text>
          <text>¥{{ Number(form.tipAmount).toFixed(2) }}</text>
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

export default {
  components: { PageHeader },
  data() {
    return {
      form: {
        address: '',
        desc: '',
        tipAmount: 0
      },
      tipOptions: [
        { value: 0, label: '不打赏' },
        { value: 2, label: '¥2' },
        { value: 5, label: '¥5' }
      ],
      serviceFee: 2,
      submitting: false
    }
  },
  computed: {
    totalPrice() {
      const tip = Number(this.form.tipAmount) || 0
      return (this.serviceFee + tip).toFixed(2)
    },
    canSubmit() {
      return Boolean(this.form.address && this.form.desc)
    }
  },
  methods: {
    async submitOrder() {
      if (!this.canSubmit || this.submitting) return
      const identity = requireCurrentUserIdentity()
      if (!identity) return

      this.submitting = true
      uni.showLoading({ title: '提交中...' })
      try {
        const payload = buildErrandOrderPayload(
          {
            serviceType: 'errand_do',
            pickup: this.form.address,
            dropoff: '',
            itemDescription: this.form.desc,
            deliveryFee: this.serviceFee,
            tipAmount: Number(this.form.tipAmount) || 0,
            totalPrice: Number(this.totalPrice) || 0,
            requestExtra: {
              taskDescription: this.form.desc
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
.errand-do {
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

.form-textarea {
  width: 100%;
  min-height: 100px;
  font-size: 15px;
  border: 1px solid #eee;
  border-radius: 6px;
  padding: 10px;
  background: #f9f9f9;
  box-sizing: border-box;
}

.tip-chips {
  display: flex;
  gap: 8px;
}

.tip-chip {
  flex: 1;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  color: #666;
}

.tip-chip.active {
  border-color: #8b5cf6;
  color: #8b5cf6;
  background: #f5f3ff;
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
  background: #8b5cf6;
  color: #fff;
  font-size: 15px;
  border-radius: 6px;
}

.footer-btn.disabled {
  background: #ccc;
}
</style>
