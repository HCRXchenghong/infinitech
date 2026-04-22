<template>
  <el-dialog
    :model-value="visible"
    title="订单详情"
    width="800px"
    :close-on-click-modal="false"
    class="orders-detail-dialog"
    @update:model-value="handleVisibleChange"
  >
    <div class="orders-detail-container">
      <el-descriptions title="基本信息" :column="2" size="small" border>
        <el-descriptions-item label="订单ID">{{ detail.id || '-' }}</el-descriptions-item>
        <el-descriptions-item label="订单号">{{ detail.daily_order_id || '-' }}</el-descriptions-item>
        <el-descriptions-item label="状态" :span="2">
          <el-tag :type="getStatusTagType(detail.status)" size="small">
            {{ getStatusText(detail.status, detail) }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="订单类型">{{ getOrderTypeText(detail) }}</el-descriptions-item>
        <el-descriptions-item label="每日订单序号">{{ detail.daily_order_number || '-' }}</el-descriptions-item>
      </el-descriptions>

      <el-descriptions title="客户信息" :column="2" size="small" border class="orders-detail-section">
        <el-descriptions-item label="客户姓名">{{ detail.customer_name || '-' }}</el-descriptions-item>
        <el-descriptions-item label="客户手机">{{ detail.customer_phone || detail.phone || '-' }}</el-descriptions-item>
        <el-descriptions-item label="客户ID">{{ detail.user_id || '-' }}</el-descriptions-item>
        <el-descriptions-item label="宿舍号">{{ detail.dorm_number || '-' }}</el-descriptions-item>
      </el-descriptions>

      <el-descriptions
        v-if="hasRiderInfo(detail)"
        title="骑手信息"
        :column="2"
        size="small"
        border
        class="orders-detail-section"
      >
        <el-descriptions-item label="骑手姓名">{{ detail.rider_name || '-' }}</el-descriptions-item>
        <el-descriptions-item label="骑手手机">{{ detail.rider_phone || '-' }}</el-descriptions-item>
        <el-descriptions-item label="骑手ID">{{ detail.rider_id || '-' }}</el-descriptions-item>
      </el-descriptions>

      <el-descriptions title="订单内容" :column="2" size="small" border class="orders-detail-section">
        <template v-if="detail.service_type === 'phone_film'">
          <el-descriptions-item label="服务类型">📱 手机贴膜</el-descriptions-item>
          <el-descriptions-item v-if="detail.package_price" label="套餐价格">
            <span class="orders-detail-price">¥{{ detail.package_price }}</span>
          </el-descriptions-item>
          <el-descriptions-item v-if="detail.package_name" label="套餐名称" :span="detail.package_price ? 1 : 2">
            {{ detail.package_name }}
          </el-descriptions-item>
          <el-descriptions-item v-if="detail.phone_model" label="手机型号">{{ detail.phone_model }}</el-descriptions-item>
          <el-descriptions-item v-if="detail.service_description" label="服务描述" :span="2">
            {{ detail.service_description }}
          </el-descriptions-item>
          <el-descriptions-item v-if="detail.special_notes" label="特殊要求" :span="2">
            {{ detail.special_notes }}
          </el-descriptions-item>
          <el-descriptions-item v-if="detail.preferred_time" label="期望时间" :span="2">
            {{ detail.preferred_time }}
          </el-descriptions-item>
        </template>

        <template v-else-if="detail.service_type === 'massage'">
          <el-descriptions-item label="服务类型">💆 推拿按摩</el-descriptions-item>
          <el-descriptions-item v-if="detail.package_name" label="套餐名称">{{ detail.package_name }}</el-descriptions-item>
          <el-descriptions-item v-if="detail.service_description" label="服务描述" :span="2">
            {{ detail.service_description }}
          </el-descriptions-item>
          <el-descriptions-item v-if="detail.special_notes" label="特殊要求" :span="2">
            {{ detail.special_notes }}
          </el-descriptions-item>
          <el-descriptions-item v-if="detail.preferred_time" label="期望时间" :span="2">
            {{ detail.preferred_time }}
          </el-descriptions-item>
        </template>

        <template v-else-if="detail.food_request">
          <el-descriptions-item label="餐食请求" :span="2">{{ detail.food_request }}</el-descriptions-item>
          <el-descriptions-item v-if="detail.food_shop" label="餐厅">{{ detail.food_shop }}</el-descriptions-item>
          <el-descriptions-item v-if="detail.food_allergies" label="过敏信息">{{ detail.food_allergies }}</el-descriptions-item>
          <el-descriptions-item v-if="detail.taste_notes" label="口味备注" :span="2">
            {{ detail.taste_notes }}
          </el-descriptions-item>
          <el-descriptions-item v-if="detail.preferred_time" label="期望时间" :span="2">
            {{ detail.preferred_time }}
          </el-descriptions-item>
        </template>

        <template v-else-if="detail.drink_request">
          <el-descriptions-item label="饮品请求" :span="2">{{ detail.drink_request }}</el-descriptions-item>
          <el-descriptions-item v-if="detail.drink_pickup_code" label="取餐码">{{ detail.drink_pickup_code }}</el-descriptions-item>
          <el-descriptions-item v-if="detail.drink_sugar" label="糖度要求">{{ detail.drink_sugar }}</el-descriptions-item>
          <el-descriptions-item v-if="detail.drink_pickup_qr_image" label="取餐二维码" :span="2">
            <img :src="detail.drink_pickup_qr_image" alt="取餐二维码" class="orders-detail-media" />
          </el-descriptions-item>
          <el-descriptions-item v-if="detail.preferred_time" label="期望时间" :span="2">
            {{ detail.preferred_time }}
          </el-descriptions-item>
        </template>

        <template v-else-if="detail.delivery_request">
          <el-descriptions-item label="快递请求" :span="2">{{ detail.delivery_request }}</el-descriptions-item>
          <el-descriptions-item v-if="detail.delivery_name" label="收件人">{{ detail.delivery_name }}</el-descriptions-item>
          <el-descriptions-item v-if="detail.delivery_phone" label="收件电话">{{ detail.delivery_phone }}</el-descriptions-item>
          <el-descriptions-item v-if="detail.delivery_codes" label="快递单号" :span="2">
            {{ detail.delivery_codes }}
          </el-descriptions-item>
          <el-descriptions-item v-if="detail.delivery_photo" label="送达照片" :span="2">
            <img :src="detail.delivery_photo" alt="送达照片" class="orders-detail-media" />
          </el-descriptions-item>
          <el-descriptions-item v-if="detail.delivery_message" label="送达留言" :span="2">
            {{ detail.delivery_message }}
          </el-descriptions-item>
          <el-descriptions-item v-if="detail.delivery_photo_time" label="拍照时间">
            {{ detail.delivery_photo_time }}
          </el-descriptions-item>
          <el-descriptions-item v-if="detail.preferred_time" label="期望时间">
            {{ detail.preferred_time }}
          </el-descriptions-item>
        </template>

        <template v-else-if="detail.errand_request">
          <el-descriptions-item label="跑腿请求" :span="2">{{ detail.errand_request }}</el-descriptions-item>
          <el-descriptions-item v-if="detail.errand_location" label="地点">{{ detail.errand_location }}</el-descriptions-item>
          <el-descriptions-item v-if="detail.errand_requirements" label="要求" :span="2">
            {{ detail.errand_requirements }}
          </el-descriptions-item>
          <el-descriptions-item v-if="detail.preferred_time" label="期望时间" :span="2">
            {{ detail.preferred_time }}
          </el-descriptions-item>
        </template>

        <template v-else>
          <el-descriptions-item label="内容" :span="2">
            <span class="orders-detail-muted">暂无详细内容</span>
          </el-descriptions-item>
        </template>
      </el-descriptions>

      <el-descriptions
        v-if="shouldShowPriceSection(detail)"
        title="价格信息"
        :column="2"
        size="small"
        border
        class="orders-detail-section"
      >
        <el-descriptions-item label="骑手报价（总价）">
          <span v-if="detail.total_price" class="orders-detail-price">¥{{ detail.total_price }}</span>
          <span v-else-if="detail.rider_quoted_price" class="orders-detail-price">¥{{ detail.rider_quoted_price }}</span>
          <span v-else>-</span>
        </el-descriptions-item>
        <el-descriptions-item label="运费">
          <span v-if="detail.delivery_fee">¥{{ detail.delivery_fee }}</span>
          <span v-else>-</span>
        </el-descriptions-item>
        <el-descriptions-item label="商品金额">
          <span v-if="detail.product_price">¥{{ detail.product_price }}</span>
          <span v-else>-</span>
        </el-descriptions-item>
      </el-descriptions>

      <el-descriptions title="时间信息" :column="2" size="small" border class="orders-detail-section">
        <el-descriptions-item label="创建时间">{{ detail.created_at || '-' }}</el-descriptions-item>
        <el-descriptions-item label="接单时间">{{ detail.accepted_at || '-' }}</el-descriptions-item>
        <el-descriptions-item label="付款时间">{{ detail.paid_at || '-' }}</el-descriptions-item>
        <el-descriptions-item label="完成时间">{{ detail.completed_at || '-' }}</el-descriptions-item>
      </el-descriptions>
    </div>

    <template #footer>
      <el-button
        v-if="canQuickDispatch(detail)"
        type="warning"
        :loading="dispatchingOrderId === detail.id"
        @click="handleQuickDispatch(detail)"
      >
        一键派单
      </el-button>
      <el-button @click="handleVisibleChange(false)">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
const emit = defineEmits(['update:visible']);

defineProps({
  canQuickDispatch: {
    type: Function,
    required: true,
  },
  detail: {
    type: Object,
    required: true,
  },
  dispatchingOrderId: {
    type: [Number, String, null],
    default: null,
  },
  getOrderTypeText: {
    type: Function,
    required: true,
  },
  getStatusTagType: {
    type: Function,
    required: true,
  },
  getStatusText: {
    type: Function,
    required: true,
  },
  handleQuickDispatch: {
    type: Function,
    required: true,
  },
  visible: {
    type: Boolean,
    default: false,
  },
});

function handleVisibleChange(value) {
  emit('update:visible', value);
}

function hasRiderInfo(order) {
  return Boolean(order?.rider_id || order?.rider_name || order?.rider_phone);
}

function shouldShowPriceSection(order) {
  return order?.service_type !== 'phone_film' && order?.service_type !== 'massage';
}
</script>
