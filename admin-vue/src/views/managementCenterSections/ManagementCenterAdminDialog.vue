<template>
  <el-dialog
    :model-value="visible"
    :title="dialogTitle"
    width="480px"
    :close-on-click-modal="false"
    @update:model-value="emit('update:visible', $event)"
  >
    <el-form ref="formRef" :model="adminForm" :rules="adminRules" label-width="80px">
      <el-form-item label="手机号" prop="phone">
        <el-input v-model="adminForm.phone" placeholder="请输入手机号" maxlength="11" />
      </el-form-item>
      <el-form-item label="姓名" prop="name">
        <el-input v-model="adminForm.name" placeholder="请输入姓名" />
      </el-form-item>
      <el-form-item label="类型" prop="type">
        <el-select v-model="adminForm.type" placeholder="请选择管理员类型" style="width: 100%;">
          <el-option
            v-for="option in roleOptions"
            :key="option.value"
            :label="option.label"
            :value="option.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item v-if="!editingAdmin" label="密码" prop="password">
        <el-input v-model="adminForm.password" type="password" show-password placeholder="请输入密码" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="emit('update:visible', false)">取消</el-button>
      <el-button type="primary" :loading="savingAdmin" @click="handleSaveAdmin">保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref } from 'vue';

defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  dialogTitle: {
    type: String,
    default: '添加管理员',
  },
  adminForm: {
    type: Object,
    required: true,
  },
  adminRules: {
    type: Object,
    required: true,
  },
  editingAdmin: {
    type: Object,
    default: null,
  },
  roleOptions: {
    type: Array,
    default: () => [],
  },
  savingAdmin: {
    type: Boolean,
    default: false,
  },
  handleSaveAdmin: {
    type: Function,
    required: true,
  },
});

const emit = defineEmits(['update:visible']);
const formRef = ref(null);

async function validate() {
  await formRef.value?.validate();
}

defineExpose({ validate });
</script>
