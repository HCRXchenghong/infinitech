declare module 'vue' {
  const Vue: any
  export default Vue
  export function createSSRApp(...args: any[]): any
  export function defineComponent(...args: any[]): any
  export function ref<T = any>(value?: T): any
  export function computed<T = any>(getter: any): any
  export function reactive<T extends Record<string, any>>(value: T): T
  export function onMounted(callback: (...args: any[]) => any): void
  export function onUnmounted(callback: (...args: any[]) => any): void
}

declare module '*.vue' {
  const component: any
  export default component
}

declare module '@dcloudio/uni-app' {
  export function onLoad(callback: (...args: any[]) => any): void
  export function onShow(callback: (...args: any[]) => any): void
  export function onUnload(callback: (...args: any[]) => any): void
}

declare const process: {
  env: Record<string, string | undefined>
}

declare const uni: any
declare function require(path: string): any
declare function getCurrentPages(): any[]

declare module '../../packages/client-sdk/src/auth.js' {
  export function buildAuthorizationHeaders(token?: string): Record<string, string>
}

declare module '../../packages/mobile-core/src/upload.js' {
  export function createAuthenticatedUploadOptions(options?: Record<string, any>): Record<string, any>
  export function readStoredBearerToken(uniApp?: any, storageKeys?: string[]): string
  export function normalizeResourceUrl(url: string, baseUrl?: string): string
  export function uploadAuthenticatedAsset(options?: Record<string, any>): Promise<any>
}

declare module '../../shared/mobile-common/platform-runtime.js' {
  export function createPlatformRuntimeLoader(fetcher: (...args: any[]) => Promise<any> | any): {
    getCachedPlatformRuntimeSettings: () => Record<string, any>
    loadPlatformRuntimeSettings: (...args: any[]) => Promise<Record<string, any>>
  }
  export function findRiderRankLevel(levels?: any[], level?: any): Record<string, any> | null
}

declare module '../../shared/mobile-common/push-events' {
  export function startPushEventBridge(options?: Record<string, any>): Promise<any> | void
}

declare module '../../shared/mobile-common/push-registration' {
  export function createPushRegistrationManager(options?: Record<string, any>): {
    registerCurrentPushDevice: (options?: Record<string, any>) => Promise<any>
    unregisterCurrentPushDevice: () => Promise<any>
    clearPushRegistrationState: () => void
    getCachedRegistrationState: () => Record<string, any> | null
    ackPushMessage: (payload?: Record<string, any>) => Promise<any>
  }
}

declare module '../../shared/mobile-common/realtime-notify' {
  export function createRealtimeNotifyBridge(options?: Record<string, any>): {
    connectCurrentRealtimeChannel: (...args: any[]) => Promise<any>
    disconnectRealtimeChannel: () => void
    clearRealtimeState: () => void
  }
}

declare module '../../shared/mobile-common/phone-contact' {
  export function createPhoneContactHelper(options?: Record<string, any>): {
    callPhone: (...args: any[]) => Promise<any>
    reportPhoneContact: (...args: any[]) => Promise<any>
  }
}

declare module '../../shared/mobile-common/notification-audio.js' {
  export function classifyNotificationEnvelopeKind(envelope?: Record<string, any>): string
  export function createUniNotificationAudioManager(options?: Record<string, any>): {
    bindBridge: (options?: Record<string, any>) => void
    playMessage: (extra?: Record<string, any>) => boolean
    playOrder: (extra?: Record<string, any>) => boolean
    playForEnvelope: (envelope?: Record<string, any>, extra?: Record<string, any>) => boolean
  }
}

declare module '../../../../shared/mobile-common/wallet-bills-page' {
  export function createWalletBillsPageLogic(options?: Record<string, any>): any
}

declare module '../../../../shared/mobile-common/wallet-recharge-page' {
  export function createWalletRechargePageLogic(options?: Record<string, any>): any
}

declare module '../../../../shared/mobile-common/wallet-withdraw-page' {
  export function createWalletWithdrawPageLogic(options?: Record<string, any>): any
}
