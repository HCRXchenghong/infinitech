<template>
  <el-dialog
    :model-value="visible"
    :title="shopDialogTitle"
    width="90%"
    :close-on-click-modal="false"
    class="merchant-detail-shop-dialog"
    @update:model-value="emit('update:visible', $event)"
  >
    <ShopEditor
      v-if="visible"
      :shop="currentShop"
      :merchant-id="merchantId"
      @save="handleShopSave"
      @cancel="emit('update:visible', false)"
    />
  </el-dialog>
</template>

<script setup>
import ShopEditor from '../ShopEditor.vue'

defineProps({
  currentShop: {
    type: Object,
    default: null,
  },
  handleShopSave: {
    type: Function,
    required: true,
  },
  merchantId: {
    type: [String, Number],
    default: '',
  },
  shopDialogTitle: {
    type: String,
    default: '新增店铺',
  },
  visible: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['update:visible'])
</script>
