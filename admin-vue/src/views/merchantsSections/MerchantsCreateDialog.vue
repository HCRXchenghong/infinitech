<template>
  <el-dialog
    :model-value="visible"
    title="新增商户"
    width="520px"
    :close-on-click-modal="false"
    @update:model-value="emit('update:visible', $event)"
  >
    <el-form :model="createForm" label-width="100px">
      <el-form-item label="商户名称" required>
        <el-input v-model="createForm.name" placeholder="请输入商户名称" />
      </el-form-item>
      <el-form-item label="负责人" required>
        <el-input v-model="createForm.owner_name" placeholder="请输入负责人姓名" />
      </el-form-item>
      <el-form-item label="手机号" required>
        <el-input v-model="createForm.phone" placeholder="请输入手机号" />
      </el-form-item>
      <el-form-item label="登录密码" required>
        <el-input
          v-model="createForm.password"
          type="password"
          placeholder="至少6位密码"
          show-password
        />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="emit('update:visible', false)">取消</el-button>
      <el-button type="primary" :loading="creating" @click="submitCreate">保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  createForm: {
    type: Object,
    required: true,
  },
  creating: {
    type: Boolean,
    default: false,
  },
  submitCreate: {
    type: Function,
    required: true,
  },
});

const emit = defineEmits(['update:visible']);
</script>
