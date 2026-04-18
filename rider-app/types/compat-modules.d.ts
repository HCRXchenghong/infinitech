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
