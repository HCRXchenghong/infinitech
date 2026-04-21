<template>
  <el-dialog
    :model-value="visible"
    :title="shopDialogTitle"
    width="90%"
    :close-on-click-modal="false"
    class="merchant-profile-shop-dialog"
    style="max-width: 1200px;"
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
import ShopEditor from '../ShopEditor.vue';

defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  shopDialogTitle: {
    type: String,
    default: '新增店铺',
  },
  currentShop: {
    type: Object,
    default: null,
  },
  merchantId: {
    type: [String, Number],
    default: '',
  },
  handleShopSave: {
    type: Function,
    required: true,
  },
});

const emit = defineEmits(['update:visible']);
</script>
