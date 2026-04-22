<template>
  <section class="rounded-lg border border-slate-100 bg-slate-50 p-10">
    <h2 class="mb-8 text-center text-xl font-bold text-slate-900">合法合规 · 资质认证</h2>
    <div class="flex flex-col items-center justify-center gap-8 md:flex-row md:gap-16">
      <template v-for="(item, index) in complianceItems" :key="item.label">
        <div class="flex flex-col items-center text-center">
          <div
            class="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-slate-100 bg-white text-xl font-bold shadow-sm"
            :class="item.codeClass"
          >
            {{ item.code }}
          </div>
          <span class="font-bold text-slate-800">{{ item.label }}</span>
        </div>
        <div
          v-if="index < complianceItems.length - 1"
          class="about-compliance-divider hidden md:block"
        ></div>
      </template>
    </div>
  </section>
</template>

<script setup>
defineProps({
  complianceItems: {
    type: Array,
    required: true,
  },
})
</script>
