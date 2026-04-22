<template>
  <div>
    <div class="inline-flex items-center rounded-full bg-blue-50 px-3 py-1.5 text-[12px] font-extrabold uppercase tracking-[0.12em] text-[#1976d2]">
      Cookie 说明
    </div>
    <h1 class="mt-[18px] text-[clamp(2rem,4vw,3rem)] font-extrabold leading-[1.15] text-slate-900">
      当前浏览器尚未允许官网 Cookie 与本地存储
    </h1>
    <p class="mt-[18px] max-w-[780px] text-base leading-[1.9] text-slate-600">
      当前浏览器不会继续保存官网客服 token、历史会话与相关偏好设置，因此官网互动功能已暂停。
      如果你希望继续使用在线客服、保留同一浏览器下的历史记录，可以重新允许 Cookie。
    </p>

    <div class="mt-7 flex flex-wrap gap-3">
      <el-button type="primary" size="large" class="!h-12 !px-8" @click="acceptAndContinue">
        允许并返回官网
      </el-button>
      <el-button size="large" class="!h-12 !px-8" @click="goPrivacyPolicy">
        查看隐私政策
      </el-button>
      <el-button size="large" class="!h-12 !px-8" @click="goDisclaimer">
        查看免责声明
      </el-button>
    </div>
  </div>
</template>

<script setup>
defineProps({
  acceptAndContinue: {
    type: Function,
    required: true,
  },
  goDisclaimer: {
    type: Function,
    required: true,
  },
  goPrivacyPolicy: {
    type: Function,
    required: true,
  },
})
</script>
