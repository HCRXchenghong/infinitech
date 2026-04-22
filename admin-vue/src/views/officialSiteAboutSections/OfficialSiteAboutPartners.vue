<template>
  <section class="mb-24">
    <div class="mb-10 flex items-center gap-4">
      <div class="h-px flex-1 bg-slate-200"></div>
      <h2 class="about-section-title text-2xl font-bold uppercase tracking-wide text-slate-900">
        联合运营主体
      </h2>
      <div class="h-px flex-1 bg-slate-200"></div>
    </div>

    <div class="grid grid-cols-1 gap-12 md:grid-cols-2">
      <div v-for="partner in partners" :key="partner.name">
        <h3 class="mb-4 text-2xl font-bold text-slate-800">{{ partner.name }}</h3>
        <div class="mb-4 text-sm font-semibold uppercase tracking-widest text-[#1976d2]">
          {{ partner.badge }}
        </div>
        <p class="leading-relaxed text-slate-600">
          {{ partner.description }}
        </p>
      </div>
    </div>
  </section>
</template>

<script setup>
defineProps({
  partners: {
    type: Array,
    required: true,
  },
})
</script>
