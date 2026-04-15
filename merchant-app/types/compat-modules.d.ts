declare module 'vue' {
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
declare function getCurrentPages(): any[]

declare module '../../packages/mobile-core/src/upload.js' {
  export function createAuthenticatedUploadOptions(options?: Record<string, any>): Record<string, any>
  export function readStoredBearerToken(uniApp?: any, storageKeys?: string[]): string
  export function normalizeResourceUrl(url: string, baseUrl?: string): string
  export function uploadAuthenticatedAsset(options?: Record<string, any>): Promise<any>
}

declare module '../../shared/mobile-common/config' {
  const config: Record<string, any>
  export function setManifest(manifest: Record<string, unknown>): void
  export function updateConfig(payload: Record<string, any>): void
  export function getConfig(): Record<string, any>
  export default config
}

declare module '../../shared/mobile-common/socket-io' {
  const createSocket: any
  export default createSocket
}

declare module '../../shared/mobile-common/socket' {
  const socketBridge: any
  export default socketBridge
}

declare module '../../shared/mobile-common/db' {
  const db: any
  export default db
}

declare module '../../shared/mobile-common/utils' {
  export function debounce(...args: any[]): any
  export function throttle(...args: any[]): any
  export function formatPrice(...args: any[]): any
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

declare module '../../shared/mobile-common/platform-runtime.js' {
  export function createPlatformRuntimeLoader(
    fetcher: (...args: any[]) => Promise<any> | any
  ): {
    getCachedPlatformRuntimeSettings: () => Record<string, any>
    loadPlatformRuntimeSettings: (...args: any[]) => Promise<Record<string, any>>
  }
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

declare module '@/shared-ui/platform-schema' {
  export const ORDER_TYPE_OPTIONS: string[]
  export const BUSINESS_CATEGORY_OPTIONS: string[]
  export function buildMerchantTypeOptions(settings?: Record<string, any> | null): any[]
  export function buildBusinessCategoryOptions(settings?: Record<string, any> | null): any[]
  export function resolveMerchantTypeOption(value: string, settings?: Record<string, any> | null): any
  export function resolveBusinessCategoryOption(value: string, settings?: Record<string, any> | null): any
  export function normalizeMerchantType(value: string): string
  export function normalizeBizType(value: string): string
  export function normalizeOrderTypeLabel(value: string): string
  export function merchantTypeFromOrderType(value: string): string
  export function normalizeBusinessCategoryKey(value: string, settings?: Record<string, any> | null): string
  export function getBusinessCategoryLabelByKey(value: string, settings?: Record<string, any> | null): string
  export function normalizeBusinessCategory(value: string, settings?: Record<string, any> | null): string
  export function normalizeOrderStatus(status: string, bizType?: string, options?: Record<string, any>): string
  export function getOrderStatusText(status: string, bizType?: string, options?: Record<string, any>): string
}
