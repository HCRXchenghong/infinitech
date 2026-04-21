<template>
  <el-dialog
    :model-value="visible"
    :title="dialogTitle"
    width="800px"
    :close-on-click-modal="false"
    @update:model-value="emit('update:visible', $event)"
  >
    <el-form :model="productForm" label-width="100px">
      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="商品名称" required>
            <el-input v-model="productForm.name" placeholder="请输入商品名称" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="价格" required>
            <el-input-number v-model="productForm.price" :min="0" :precision="2" class="shop-menu-dialog-number" />
          </el-form-item>
        </el-col>
      </el-row>

      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="原价">
            <el-input-number v-model="productForm.originalPrice" :min="0" :precision="2" class="shop-menu-dialog-number" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="库存">
            <el-input-number v-model="productForm.stock" :min="0" class="shop-menu-dialog-number" />
          </el-form-item>
        </el-col>
      </el-row>

      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="单位">
            <el-input v-model="productForm.unit" placeholder="例如：份、个、杯" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="月销量">
            <el-input-number v-model="productForm.monthlySales" :min="0" class="shop-menu-dialog-number" />
          </el-form-item>
        </el-col>
      </el-row>

      <el-form-item label="商品描述">
        <el-input v-model="productForm.description" type="textarea" :rows="3" />
      </el-form-item>

      <el-form-item label="商品主图">
        <ImageUpload v-model="productForm.image" upload-domain="shop_media" />
      </el-form-item>

      <el-form-item label="标签">
        <el-input
          v-model="productForm.tagsText"
          type="textarea"
          :rows="2"
          placeholder="多个标签用逗号分隔，例如：招牌,热销,新品"
        />
      </el-form-item>

      <el-row :gutter="16">
        <el-col :span="8">
          <el-form-item label="排序">
            <el-input-number v-model="productForm.sortOrder" :min="0" class="shop-menu-dialog-number" />
          </el-form-item>
        </el-col>
        <el-col :span="8">
          <el-form-item label="店内推荐">
            <el-switch v-model="productForm.isRecommend" />
          </el-form-item>
        </el-col>
        <el-col :span="8">
          <el-form-item label="上架状态">
            <el-switch v-model="productForm.isActive" />
          </el-form-item>
        </el-col>
      </el-row>
    </el-form>
    <template #footer>
      <el-button @click="emit('update:visible', false)">取消</el-button>
      <el-button type="primary" :loading="saving" @click="saveProduct">保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { computed } from 'vue';
import ImageUpload from '@/components/ImageUpload.vue';

const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  productForm: {
    type: Object,
    required: true,
  },
  saving: {
    type: Boolean,
    default: false,
  },
  saveProduct: {
    type: Function,
    required: true,
  },
});

const emit = defineEmits(['update:visible']);
const dialogTitle = computed(() => (props.productForm.id ? '编辑商品' : '新增商品'));
</script>

<style scoped>
.shop-menu-dialog-number {
  width: 100%;
}
</style>
