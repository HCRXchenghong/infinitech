import { computed } from 'vue'
import { buildRuntimeUrl } from '@/utils/runtime'

function resolveMode(rawMode) {
  const currentMode = String(rawMode || '').trim()
  if (currentMode === 'invite-only' || currentMode === 'site-only') {
    return currentMode
  }
  if (currentMode === 'download-only') {
    return 'site-only'
  }
  return 'admin-only'
}

function openRuntimePath(scope, path) {
  if (typeof window === 'undefined') {
    return
  }
  window.open(buildRuntimeUrl(scope, path), '_self')
}

export function useAccessDeniedPage({ route }) {
  const mode = computed(() => resolveMode(route?.query?.mode))

  const title = computed(() => {
    if (mode.value === 'invite-only') {
      return '1788 仅开放邀请 / 领券页'
    }
    if (mode.value === 'site-only') {
      return '1888 仅开放官网页'
    }
    return '8888 仅用于管理端'
  })

  const subtitle = computed(() => {
    if (mode.value === 'invite-only') {
      return '当前端口仅开放 /invite/:token 邀请链接和 /coupon/:token 领券链接；平台下载请使用 1888 官网内的 /download 页面。'
    }
    if (mode.value === 'site-only') {
      return '当前端口仅开放官网首页、新闻资讯、平台下载、关于我们、曝光店铺和商务合作页面；后台请使用 8888。'
    }
    return '当前端口只用于管理端登录和后台操作；邀请 / 领券请使用 1788，平台下载请使用 1888 官网内的 /download 页面。'
  })

  const actionButtons = computed(() => {
    if (mode.value === 'invite-only') {
      return [
        {
          key: 'download',
          label: '前往下载页',
          type: 'primary',
          onClick: () => openRuntimePath('site', '/download'),
        },
        {
          key: 'admin',
          label: '前往管理端',
          type: 'default',
          onClick: () => openRuntimePath('admin', '/login'),
        },
      ]
    }

    if (mode.value === 'site-only') {
      return [
        {
          key: 'admin',
          label: '前往管理端',
          type: 'default',
          onClick: () => openRuntimePath('admin', '/login'),
        },
        {
          key: 'site',
          label: '前往官网',
          type: 'primary',
          onClick: () => openRuntimePath('site', '/'),
        },
      ]
    }

    return [
      {
        key: 'download',
        label: '前往下载页',
        type: 'primary',
        onClick: () => openRuntimePath('site', '/download'),
      },
      {
        key: 'invite-example',
        label: '邀请链接示例',
        type: 'default',
        onClick: () => openRuntimePath('invite', '/invite/你的邀请token'),
      },
      {
        key: 'coupon-example',
        label: '领券链接示例',
        type: 'default',
        onClick: () => openRuntimePath('invite', '/coupon/你的领券token'),
      },
      {
        key: 'site',
        label: '前往官网',
        type: 'primary',
        onClick: () => openRuntimePath('site', '/'),
      },
      {
        key: 'admin',
        label: '管理端登录',
        type: 'default',
        onClick: () => openRuntimePath('admin', '/login'),
      },
    ]
  })

  return {
    actionButtons,
    subtitle,
    title,
  }
}
