import { setSiteCookieConsent } from '@/utils/siteCookieConsent'

const acceptEffects = [
  '官网会将客服会话 token 保存到当前浏览器本地。',
  '同一浏览器再次打开官网时，可以继续读取历史客服记录。',
  'Cookie 与本地存储仅用于官网基础安全、客服链路与体验优化。',
]

const rejectEffects = [
  '本机会话 token 会立即清空，不再继续持久保存。',
  '官网客服、历史记录等依赖本地标识的能力不会继续提供。',
  '你仍可以查看隐私政策、免责声明与本 Cookie 说明页面。',
]

export function useOfficialSiteCookieRequiredPage({ route, router }) {
  function acceptAndContinue() {
    setSiteCookieConsent('accepted')
    const redirectPath =
      typeof route.query.redirect === 'string' && route.query.redirect.startsWith('/')
        ? route.query.redirect
        : '/'
    router.replace(redirectPath)
  }

  function goPrivacyPolicy() {
    router.push('/privacy-policy')
  }

  function goDisclaimer() {
    router.push('/disclaimer')
  }

  return {
    acceptAndContinue,
    acceptEffects,
    goDisclaimer,
    goPrivacyPolicy,
    rejectEffects,
  }
}
