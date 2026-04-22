<template>
  <el-dialog
    :model-value="bootstrapDialogVisible"
    title="完成首次管理员初始化"
    width="420px"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
    :show-close="false"
  >
    <p style="margin-top: 0; color: #6b7280;">
      检测到你当前使用的是首次部署生成的临时管理员账号。请先改成真实的管理员名称、手机号和密码后再进入后台。
    </p>

    <form id="bootstrap-form" @submit.prevent="handleCompleteBootstrap">
      <div class="field-group">
        <label>真实管理员名称</label>
        <input
          v-model.trim="bootstrapForm.name"
          class="glass-input"
          type="text"
          placeholder="请输入真实管理员名称"
        />
      </div>

      <div class="field-group">
        <label>真实管理员手机号</label>
        <input
          v-model.trim="bootstrapForm.phone"
          class="glass-input"
          type="text"
          maxlength="11"
          placeholder="请输入真实管理员手机号"
          autocomplete="username"
          inputmode="numeric"
        />
      </div>

      <div class="field-group">
        <label>新的管理员密码</label>
        <input
          v-model="bootstrapForm.nextPassword"
          class="glass-input"
          type="password"
          placeholder="请输入新的管理员密码"
          autocomplete="new-password"
        />
      </div>

      <div class="field-group">
        <label>确认新的管理员密码</label>
        <input
          v-model="bootstrapForm.confirmPassword"
          class="glass-input"
          type="password"
          placeholder="请再次输入新的管理员密码"
          autocomplete="new-password"
        />
      </div>
    </form>

    <template #footer>
      <el-button @click="handleBootstrapLogout">退出登录</el-button>
      <el-button type="primary" native-type="submit" form="bootstrap-form" :loading="bootstrapSubmitting">
        保存并进入后台
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup>
defineProps({
  bootstrapDialogVisible: {
    type: Boolean,
    default: false,
  },
  bootstrapForm: {
    type: Object,
    required: true,
  },
  bootstrapSubmitting: {
    type: Boolean,
    default: false,
  },
  handleCompleteBootstrap: {
    type: Function,
    required: true,
  },
  handleBootstrapLogout: {
    type: Function,
    required: true,
  },
})
</script>

<style scoped lang="css" src="../Login.css"></style>
