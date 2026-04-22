<template>
  <section class="mb-24 mt-16">
    <div class="mb-10 flex items-center gap-4">
      <div class="h-px flex-1 bg-slate-200"></div>
      <h2 class="about-section-title text-2xl font-bold uppercase tracking-wide text-slate-900">
        燧石创想工作室
      </h2>
      <div class="h-px flex-1 bg-slate-200"></div>
    </div>
    <p class="mx-auto mb-12 max-w-2xl text-center leading-relaxed text-slate-500">
      这是悦享e食官方支持平台的核心驱动力。我们是一支平均年龄 18 至 22 岁的极客团队，怀抱热情，以前沿技术服务于烟台城市科技职业学院的师生们，并与联合运营主体共同推动校园生态服务数字化。
    </p>

    <div class="mx-auto grid max-w-3xl grid-cols-1 gap-8 md:grid-cols-2">
      <div
        v-for="founder in founders"
        :key="founder.name"
        class="flex items-center gap-6 p-6"
      >
        <div class="flex h-24 w-24 flex-shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-100 shadow-inner">
          <span class="text-3xl font-bold text-slate-300">{{ founder.initial }}</span>
        </div>
        <div>
          <div class="mb-1 text-sm font-bold uppercase tracking-widest text-[#1976d2]">
            {{ founder.role }}
          </div>
          <h4 class="mb-2 text-2xl font-bold text-slate-900">{{ founder.name }}</h4>
          <p class="text-sm text-slate-500">{{ founder.description }}</p>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
defineProps({
  founders: {
    type: Array,
    required: true,
  },
})
</script>
