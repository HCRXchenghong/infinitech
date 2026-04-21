<template>
  <el-dialog
    :model-value="visible"
    title="积分商品"
    width="480px"
    @update:model-value="emit('update:visible', $event)"
  >
    <el-form :model="goodForm" label-width="90px">
      <el-form-item label="名称">
        <el-input v-model="goodForm.name" />
      </el-form-item>
      <el-form-item label="积分">
        <el-input-number v-model="goodForm.points" :min="1" />
      </el-form-item>
      <el-form-item label="运费">
        <el-input-number v-model="goodForm.ship_fee" :min="0" :step="1" />
      </el-form-item>
      <el-form-item label="标签">
        <el-input v-model="goodForm.tag" placeholder="如：实物/VIP" />
      </el-form-item>
      <el-form-item label="类型">
        <el-select v-model="goodForm.type">
          <el-option
            v-for="option in goodsTypeOptions"
            :key="option.value"
            :label="option.label"
            :value="option.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="描述">
        <el-input v-model="goodForm.desc" type="textarea" />
      </el-form-item>
      <el-form-item label="上架">
        <el-switch v-model="goodForm.is_active" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button size="small" @click="emit('update:visible', false)">取消</el-button>
      <el-button size="small" type="primary" :loading="savingGood" @click="saveGood">保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  goodForm: {
    type: Object,
    required: true,
  },
  savingGood: {
    type: Boolean,
    default: false,
  },
  goodsTypeOptions: {
    type: Array,
    default: () => [],
  },
  saveGood: {
    type: Function,
    required: true,
  },
});

const emit = defineEmits(['update:visible']);
</script>
