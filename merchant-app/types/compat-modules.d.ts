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
