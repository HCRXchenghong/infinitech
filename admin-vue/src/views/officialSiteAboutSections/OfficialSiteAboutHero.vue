<template>
  <div
    class="site-screen-section site-screen-center relative overflow-hidden border-b border-slate-100 bg-slate-50 py-16 md:py-20"
    data-site-header-theme="light"
  >
    <div class="pointer-events-none absolute inset-0">
      <div class="absolute left-0 top-0 h-full w-full bg-[linear-gradient(to_right,rgba(226,232,240,0.36)_1px,transparent_1px)] bg-[length:112px_100%] opacity-50"></div>
      <div class="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(25,118,210,0.12),transparent_28%)]"></div>
      <div class="absolute left-6 top-12 h-px w-24 bg-slate-200"></div>
      <div class="absolute bottom-12 right-6 h-px w-24 bg-slate-200"></div>
      <div class="absolute right-0 top-0 hidden h-full w-[40%] border-l border-slate-200 bg-white/72 lg:block"></div>
      <div class="absolute left-[58%] top-0 hidden h-full w-px bg-slate-200/80 lg:block"></div>
    </div>

    <div class="relative mx-auto w-full max-w-6xl px-6">
      <div class="grid gap-10 lg:grid-cols-[1.04fr_0.96fr] lg:items-center">
        <div class="max-w-3xl pt-4">
          <div class="text-[12px] font-semibold tracking-[0.22em] text-[#1976d2]">
            ABOUT US
          </div>

          <h1 class="mt-5 text-4xl font-bold leading-tight tracking-tight text-slate-900 md:text-5xl lg:text-6xl">
            关于我们
          </h1>

          <p class="mt-6 max-w-3xl text-lg leading-relaxed text-slate-600 md:text-[19px]">
            我们不仅是一个技术平台，更是连接烟台城市科技职业学院师生与优质商业生态的数字桥梁。
          </p>

          <div class="mt-8 max-w-3xl border-l-4 border-[#1976d2] pl-5 md:pl-6">
            <p class="text-base leading-8 text-slate-700 md:text-lg">
              以悦享e食官方支持平台为载体，连接校内资讯发布、服务入口、治理反馈与商户协同，让技术、运营与校园真实需求之间形成稳定闭环。
            </p>
          </div>

          <div class="mt-10 grid gap-6 border-t border-slate-200 pt-8 sm:grid-cols-3">
            <div v-for="metric in heroMetrics" :key="metric.label">
              <div class="text-[12px] font-semibold tracking-[0.18em] text-slate-400">
                {{ metric.label }}
              </div>
              <p class="mt-3 text-sm leading-7 text-slate-600">
                {{ metric.description }}
              </p>
            </div>
          </div>
        </div>

        <div class="relative lg:pl-8">
          <div class="absolute -right-3 top-8 hidden h-28 w-28 rounded-full border border-[#1976d2]/12 lg:block"></div>
          <div class="absolute -left-4 bottom-10 hidden h-20 w-20 rounded-full bg-[#1976d2]/8 blur-2xl lg:block"></div>

          <div class="relative overflow-hidden rounded-[32px] border border-slate-200 bg-white/92 shadow-[0_24px_60px_-36px_rgba(15,23,42,0.38)] backdrop-blur-sm">
            <div class="bg-[linear-gradient(180deg,rgba(25,118,210,0.08),rgba(255,255,255,0))] px-7 pb-6 pt-7">
              <div class="flex items-center justify-between gap-4">
                <div class="text-[12px] font-semibold tracking-[0.22em] text-[#1976d2]">YUEXIANG E-FOOD</div>
                <div class="h-px flex-1 bg-[#1976d2]/16"></div>
              </div>

              <p class="mt-5 text-3xl font-semibold leading-[1.24] tracking-tight text-slate-900 md:text-[38px]">
                让校园服务真正可达，
                <br class="hidden sm:block">
                也让每一次反馈、合作与履约都更有回应。
              </p>

              <p class="mt-5 text-sm leading-8 text-slate-600 md:text-[15px]">
                从资讯触达、服务进入，到问题反馈与商户协同，平台更关注真实校园日常里“能不能顺手使用、能不能稳定落地”。
              </p>
            </div>

            <div class="px-7 py-6">
              <div class="space-y-5">
                <div
                  v-for="item in heroFeatureItems"
                  :key="item.title"
                  class="grid grid-cols-[12px_1fr] gap-4"
                >
                  <div class="mt-2 h-3 w-3 rounded-full" :class="item.dotClass"></div>
                  <div>
                    <div class="text-sm font-semibold text-slate-900">{{ item.title }}</div>
                    <p class="mt-2 text-sm leading-7 text-slate-500">
                      {{ item.description }}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div class="grid gap-0 border-t border-slate-200 bg-slate-50/90 sm:grid-cols-3">
              <div
                v-for="(item, index) in heroFooterStats"
                :key="item.label"
                class="px-6 py-4"
                :class="index === 1 ? 'sm:border-x border-slate-200' : ''"
              >
                <div class="text-[12px] font-semibold tracking-[0.16em] text-slate-400">
                  {{ item.label }}
                </div>
                <div class="mt-2 text-sm font-semibold text-slate-900">
                  {{ item.value }}
                </div>
              </div>
            </div>
          </div>

          <div class="mt-5 grid gap-4 sm:grid-cols-2">
            <div
              v-for="item in heroPerspectiveCards"
              :key="item.label"
              class="border border-slate-200 bg-white/80 px-5 py-4"
            >
              <div class="text-[12px] font-semibold tracking-[0.16em] text-slate-400">
                {{ item.label }}
              </div>
              <p class="mt-2 text-sm leading-7 text-slate-600">
                {{ item.description }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  heroFeatureItems: {
    type: Array,
    required: true,
  },
  heroFooterStats: {
    type: Array,
    required: true,
  },
  heroMetrics: {
    type: Array,
    required: true,
  },
  heroPerspectiveCards: {
    type: Array,
    required: true,
  },
})
</script>
