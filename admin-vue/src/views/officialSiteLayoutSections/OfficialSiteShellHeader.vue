<template>
  <header
    :ref="headerRef"
    :class="['fixed top-0 left-0 w-full z-50 transition-all duration-300', headerClass]"
  >
    <div class="max-w-6xl mx-auto px-6 h-[72px] flex items-center justify-between">
      <button
        class="site-brand flex items-center gap-3 cursor-pointer bg-transparent border-0 p-0 appearance-none"
        type="button"
        @click="goTo('/')"
      >
        <span class="site-brand-mark">
          <img class="site-brand-logo" :src="logoUrl" alt="悦享e食 logo">
        </span>
        <span class="flex flex-col items-start leading-none">
          <strong :class="['text-[24px] font-bold tracking-[0.02em] transition-colors duration-300', textClass]">悦享e食</strong>
          <small :class="['mt-1 text-[11px] font-medium tracking-[0.18em] transition-colors duration-300', subTextClass]">INFINITECH</small>
        </span>
      </button>

      <nav class="hidden md:flex items-center space-x-8">
        <button
          v-for="item in navItems"
          :key="item.path"
          type="button"
          :class="['bg-transparent border-0 p-0 appearance-none', getNavLinkClass(item.path)]"
          @click="goTo(item.path)"
        >
          {{ item.label }}
        </button>
      </nav>

      <button
        class="md:hidden bg-transparent border-0 p-0 appearance-none"
        type="button"
        @click="emit('update:mobileMenuOpen', !mobileMenuOpen)"
      >
        <div :class="['w-10 h-10 rounded-full flex items-center justify-center transition-colors duration-300', mobileIconClass]">
          <span class="text-xl leading-none">{{ mobileMenuOpen ? '×' : '≡' }}</span>
        </div>
      </button>
    </div>

    <transition name="fade">
      <div v-if="mobileMenuOpen" class="md:hidden bg-white border-t border-slate-100 shadow-lg">
        <div class="px-6 py-4 flex flex-col gap-2">
          <button
            v-for="item in navItems"
            :key="`mobile-${item.path}`"
            type="button"
            class="w-full px-4 py-3 rounded-lg text-left text-sm font-semibold transition-all border-0 appearance-none"
            :class="isActive(item.path) ? 'bg-blue-50 text-[#1976d2]' : 'text-slate-700 hover:bg-slate-50'"
            @click="handleMobileNav(item.path)"
          >
            {{ item.label }}
          </button>
        </div>
      </div>
    </transition>
  </header>
</template>

<script setup>
defineProps({
  headerRef: {
    type: [Function, Object],
    default: null,
  },
  headerClass: {
    type: String,
    default: '',
  },
  logoUrl: {
    type: String,
    required: true,
  },
  navItems: {
    type: Array,
    default: () => [],
  },
  textClass: {
    type: String,
    default: '',
  },
  subTextClass: {
    type: String,
    default: '',
  },
  mobileIconClass: {
    type: String,
    default: '',
  },
  mobileMenuOpen: {
    type: Boolean,
    default: false,
  },
  getNavLinkClass: {
    type: Function,
    required: true,
  },
  goTo: {
    type: Function,
    required: true,
  },
  isActive: {
    type: Function,
    required: true,
  },
  handleMobileNav: {
    type: Function,
    required: true,
  },
})

const emit = defineEmits(['update:mobileMenuOpen'])
</script>
