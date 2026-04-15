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

declare module '../../shared/mobile-common/socket-io' {
  const createSocket: any
  export default createSocket
}

declare module '../../shared/mobile-common/socket' {
  const socketBridge: any
  export default socketBridge
}
