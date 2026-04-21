<template>
  <footer class="bg-white border-t border-slate-200 pt-8 pb-6 mt-auto relative z-10">
    <div class="max-w-6xl mx-auto px-6 flex flex-col gap-4 items-center justify-center text-xs text-slate-500">
      <div class="text-center md:text-left">
        <p class="font-medium text-slate-800 mb-1">© 2026 烟台英菲尼信息科技有限公司</p>
        <p>联合运营：泓策融鑫科贸（烟台）有限公司 | 技术支持：燧石创想工作室</p>
      </div>
      <div class="flex flex-wrap items-center justify-center gap-5 text-[12px]">
        <button type="button" class="site-footer-link" @click="goTo('/privacy-policy')">隐私政策</button>
        <button type="button" class="site-footer-link" @click="goTo('/disclaimer')">免责声明</button>
      </div>
    </div>
  </footer>
</template>

<script setup>
defineProps({
  goTo: {
    type: Function,
    required: true,
  },
})
</script>
