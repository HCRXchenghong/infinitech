<template>
  <section class="py-20 bg-slate-50 border-b border-slate-100">
    <div class="max-w-6xl mx-auto px-6">
      <div class="text-center mb-16">
        <h2 class="text-3xl font-bold text-slate-900">平台核心服务</h2>
        <p class="text-slate-500 mt-4 text-lg">
          围绕校园高频生活场景，覆盖优惠下单、即时配送、代办代取与兴趣连接四条核心服务线
        </p>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-4 gap-8">
        <article
          v-for="item in serviceCards"
          :key="item.title"
          class="bg-white p-8 rounded-lg shadow-sm border border-slate-100 hover:shadow-lg transition-shadow"
        >
          <div
            class="w-14 h-14 bg-blue-50 text-[#1976d2] flex items-center justify-center rounded-2xl mb-6 border border-blue-100"
          >
            <el-icon :size="24">
              <component :is="item.icon" />
            </el-icon>
          </div>
          <h3 class="text-lg font-bold text-slate-800 mb-3">{{ item.title }}</h3>
          <p class="text-slate-500 text-sm leading-relaxed">{{ item.desc }}</p>
        </article>
      </div>
    </div>
  </section>
</template>

<script setup>
defineProps({
  serviceCards: {
    type: Array,
    default: () => [],
  },
});
</script>
