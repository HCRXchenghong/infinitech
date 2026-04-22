<template>
  <aside class="official-site-cooperation-form-card">
    <h2 class="official-site-cooperation-form-title">提交您的合作申请</h2>
    <p class="official-site-cooperation-form-copy">
      留下您的基本信息和合作方向，我们会尽快安排平台招商专员与您对接。
    </p>

    <PageStateAlert :message="pageError" />

    <el-form label-position="top">
      <el-form-item label="企业 / 团队或个人称呼">
        <el-input
          v-model="form.nickname"
          placeholder="例如：某某餐饮 / 张总"
        />
      </el-form-item>
      <el-form-item label="联系方式">
        <el-input
          v-model="form.contact"
          placeholder="请填写手机号码或微信号"
        />
      </el-form-item>
      <el-form-item label="合作意向简述">
        <el-input
          v-model="form.direction"
          type="textarea"
          :rows="5"
          placeholder="请简要描述合作方向、品牌情况或现有资源优势"
        />
      </el-form-item>
      <el-form-item>
        <el-button
          type="primary"
          class="official-site-cooperation-form-submit"
          :loading="submitting"
          @click="submitCooperation"
        >
          立即提交意向
        </el-button>
      </el-form-item>
    </el-form>
  </aside>
</template>

<script setup>
import PageStateAlert from '@/components/PageStateAlert.vue'

defineProps({
  form: {
    type: Object,
    required: true,
  },
  pageError: {
    type: String,
    default: '',
  },
  submitCooperation: {
    type: Function,
    required: true,
  },
  submitting: {
    type: Boolean,
    default: false,
  },
})
</script>
