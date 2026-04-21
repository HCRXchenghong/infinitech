<template>
  <el-dialog
    :model-value="visible"
    :title="dialogTitle"
    width="500px"
    :close-on-click-modal="false"
    @update:model-value="emit('update:visible', $event)"
  >
    <el-form :model="categoryForm" label-width="100px">
      <el-form-item label="分类名称" required>
        <el-input v-model="categoryForm.name" placeholder="请输入分类名称" />
      </el-form-item>
      <el-form-item label="排序">
        <el-input-number v-model="categoryForm.sortOrder" :min="0" class="shop-menu-dialog-number" />
      </el-form-item>
      <el-form-item label="状态">
        <el-switch v-model="categoryForm.isActive" active-text="启用" inactive-text="禁用" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="emit('update:visible', false)">取消</el-button>
      <el-button type="primary" :loading="saving" @click="saveCategory">保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  categoryForm: {
    type: Object,
    required: true,
  },
  saving: {
    type: Boolean,
    default: false,
  },
  saveCategory: {
    type: Function,
    required: true,
  },
});

const emit = defineEmits(['update:visible']);
const dialogTitle = computed(() => (props.categoryForm.id ? '编辑分类' : '新增分类'));
</script>

<style scoped>
.shop-menu-dialog-number {
  width: 100%;
}
</style>
