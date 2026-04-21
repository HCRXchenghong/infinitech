import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const HERO_READY_EVENT = 'official-site:hero-ready'

export function useOfficialSiteLayout() {
  const router = useRouter()
  const route = useRoute()
  const headerEl = ref(null)
  const mobileMenuOpen = ref(false)
  const headerTheme = ref('light')
  const logoUrl = new URL('/logo.png', import.meta.url).href
  const navItems = [
    { path: '/', label: '首页' },
    { path: '/news', label: '新闻资讯' },
    { path: '/download', label: '平台下载' },
    { path: '/expose', label: '曝光店铺' },
    { path: '/coop', label: '商务合作' },
    { path: '/about', label: '关于我们' },
  ]

  let headerContrastFrame = 0
  let resizeObserver = null

  const useLightHeaderText = computed(() =>
    headerTheme.value === 'dark' && !mobileMenuOpen.value,
  )

  const headerClass = computed(() => {
    if (useLightHeaderText.value) {
      return 'bg-transparent border-transparent'
    }
    return 'bg-white/95 backdrop-blur-md shadow-sm border-b border-slate-100'
  })

  const textClass = computed(() =>
    (useLightHeaderText.value ? 'text-white' : 'text-slate-900'),
  )

  const subTextClass = computed(() =>
    (useLightHeaderText.value ? 'text-blue-100' : 'text-slate-500'),
  )

  const mobileIconClass = computed(() => (
    useLightHeaderText.value
      ? 'bg-white/10 text-white'
      : 'bg-slate-100 text-slate-900'
  ))

  watch(() => route.fullPath, () => {
    mobileMenuOpen.value = false
    void nextTick(() => {
      bindHeroObservers()
      queueHeaderContrastUpdate()
      requestAnimationFrame(() => {
        bindHeroObservers()
        queueHeaderContrastUpdate()
      })
    })
  })

  watch(mobileMenuOpen, () => {
    queueHeaderContrastUpdate()
  })

  function updateHeaderContrast() {
    if (typeof window === 'undefined' || typeof document === 'undefined') return

    const currentHeader = headerEl.value
    const headerHeight = currentHeader instanceof HTMLElement
      ? Math.ceil(currentHeader.getBoundingClientRect().height || currentHeader.offsetHeight || 72)
      : 72
    const sampledTheme = resolveThemeBehindHeader(headerHeight)
    headerTheme.value = sampledTheme || 'light'
  }

  function queueHeaderContrastUpdate() {
    if (typeof window === 'undefined') return
    if (headerContrastFrame) {
      window.cancelAnimationFrame(headerContrastFrame)
    }
    headerContrastFrame = window.requestAnimationFrame(() => {
      headerContrastFrame = 0
      updateHeaderContrast()
    })
  }

  function disconnectHeroObservers() {
    resizeObserver?.disconnect()
    resizeObserver = null
  }

  function bindHeroObservers() {
    disconnectHeroObservers()
    if (typeof window === 'undefined' || typeof document === 'undefined') return
    if (typeof ResizeObserver === 'undefined') return

    resizeObserver = new ResizeObserver(() => {
      queueHeaderContrastUpdate()
    })

    if (headerEl.value instanceof HTMLElement) {
      resizeObserver.observe(headerEl.value)
    }

    const themeAnchor = document.querySelector('[data-site-header-theme]')
    if (themeAnchor instanceof HTMLElement) {
      resizeObserver.observe(themeAnchor)
    }
  }

  function resolveThemeBehindHeader(headerHeight) {
    if (typeof window === 'undefined' || typeof document === 'undefined') return ''

    const sampleY = Math.min(
      Math.max(8, Math.round(headerHeight / 2)),
      Math.max(8, window.innerHeight - 8),
    )
    const sampleXs = [0.22, 0.5, 0.78]
      .map((ratio) => Math.round(window.innerWidth * ratio))
      .map((value) => Math.min(Math.max(value, 8), Math.max(8, window.innerWidth - 8)))

    const currentHeader = headerEl.value
    const previousPointerEvents = currentHeader instanceof HTMLElement
      ? currentHeader.style.pointerEvents
      : ''
    if (currentHeader instanceof HTMLElement) {
      currentHeader.style.pointerEvents = 'none'
    }

    try {
      const themes = sampleXs
        .map((x) => resolveThemeAtPoint(x, sampleY))
        .filter((theme) => theme === 'dark' || theme === 'light')

      if (themes.length === 0) {
        return ''
      }

      const darkVotes = themes.filter((theme) => theme === 'dark').length
      return darkVotes >= Math.ceil(themes.length / 2) ? 'dark' : 'light'
    } finally {
      if (currentHeader instanceof HTMLElement) {
        currentHeader.style.pointerEvents = previousPointerEvents
      }
    }
  }

  function resolveThemeAtPoint(x, y) {
    const node = document.elementFromPoint(x, y)
    if (!(node instanceof Element)) {
      return ''
    }

    let current = node
    while (current) {
      const theme = String(current.getAttribute('data-site-header-theme') || '')
        .trim()
        .toLowerCase()
      if (theme === 'dark' || theme === 'light') {
        return theme
      }
      current = current.parentElement
    }

    return ''
  }

  function isActive(path) {
    if (path === '/news') return route.path === '/news' || route.path.startsWith('/news/')
    if (path === '/download') return route.path === '/download'
    if (path === '/expose') {
      return route.path === '/expose'
        || route.path === '/exposures'
        || route.path.startsWith('/expose/')
        || route.path.startsWith('/exposures/')
    }
    if (path === '/coop') return route.path === '/coop' || route.path === '/cooperation'
    return route.path === path
  }

  function getNavLinkClass(path) {
    const active = isActive(path)
    const lightText = useLightHeaderText.value
    const baseClass = 'pb-1 text-[15px] font-medium transition-all border-b-2 border-transparent'
    if (active) {
      return lightText
        ? `${baseClass} text-white font-semibold border-white`
        : `${baseClass} text-[#1976d2] font-semibold border-[#1976d2]`
    }
    return lightText
      ? `${baseClass} text-white/85 hover:text-white`
      : `${baseClass} text-slate-600 hover:text-[#1976d2]`
  }

  function goTo(path) {
    if (path !== route.path) {
      router.push(path)
    }
  }

  function handleMobileNav(path) {
    mobileMenuOpen.value = false
    goTo(path)
  }

  onMounted(() => {
    bindHeroObservers()
    queueHeaderContrastUpdate()
    window.addEventListener('scroll', queueHeaderContrastUpdate, { passive: true })
    window.addEventListener('resize', queueHeaderContrastUpdate, { passive: true })
    window.addEventListener('load', queueHeaderContrastUpdate, { passive: true })
    window.addEventListener(HERO_READY_EVENT, bindHeroObservers)
    window.addEventListener(HERO_READY_EVENT, queueHeaderContrastUpdate)
    if (document.fonts?.ready) {
      document.fonts.ready.then(() => {
        queueHeaderContrastUpdate()
      }).catch(() => {})
    }
  })

  onBeforeUnmount(() => {
    disconnectHeroObservers()
    if (headerContrastFrame) {
      window.cancelAnimationFrame(headerContrastFrame)
      headerContrastFrame = 0
    }
    window.removeEventListener('scroll', queueHeaderContrastUpdate)
    window.removeEventListener('resize', queueHeaderContrastUpdate)
    window.removeEventListener('load', queueHeaderContrastUpdate)
    window.removeEventListener(HERO_READY_EVENT, bindHeroObservers)
    window.removeEventListener(HERO_READY_EVENT, queueHeaderContrastUpdate)
  })

  return {
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
  }
}
