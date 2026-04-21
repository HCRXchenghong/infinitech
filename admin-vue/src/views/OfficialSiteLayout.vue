<template>
  <div class="official-site-app min-h-screen flex flex-col bg-slate-50 text-slate-700">
    <OfficialSiteShellHeader
      :header-ref="headerEl"
      :header-class="headerClass"
      :logo-url="logoUrl"
      :nav-items="navItems"
      :text-class="textClass"
      :sub-text-class="subTextClass"
      :mobile-icon-class="mobileIconClass"
      :mobile-menu-open="mobileMenuOpen"
      :get-nav-link-class="getNavLinkClass"
      :go-to="goTo"
      :is-active="isActive"
      :handle-mobile-nav="handleMobileNav"
      @update:mobile-menu-open="mobileMenuOpen = $event"
    />

    <main :class="['flex-1 w-full relative z-0', route.path === '/' ? 'pt-0' : 'pt-[72px]']">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>

    <OfficialSiteShellFooter :go-to="goTo" />

    <OfficialSiteCookieBanner />
    <OfficialSiteSupportWidget />
  </div>
</template>

<script setup>
import './OfficialSiteLayout.css'
import OfficialSiteCookieBanner from '@/components/OfficialSiteCookieBanner.vue'
import OfficialSiteSupportWidget from '@/components/OfficialSiteSupportWidget.vue'
import OfficialSiteShellFooter from './officialSiteLayoutSections/OfficialSiteShellFooter.vue'
import OfficialSiteShellHeader from './officialSiteLayoutSections/OfficialSiteShellHeader.vue'
import { useOfficialSiteLayout } from './officialSiteLayoutHelpers'

const {
  goTo,
  getNavLinkClass,
  handleMobileNav,
  headerClass,
  headerEl,
  isActive,
  logoUrl,
  mobileIconClass,
  mobileMenuOpen,
  navItems,
  route,
  subTextClass,
  textClass,
} = useOfficialSiteLayout()
</script>
