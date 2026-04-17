export interface MobileConfig {
  API_BASE_URL: string
  SOCKET_URL: string
  isDev: boolean
  TIMEOUT: number
}

export interface MobileConfigRuntime {
  config: MobileConfig
  setManifest(nextManifest: Record<string, any> | null | undefined): void
  updateConfig(newConfig?: Partial<MobileConfig>): MobileConfig
  getConfig(): MobileConfig
}

export function createMobileConfigRuntime(options?: Record<string, any>): MobileConfigRuntime
export function setManifest(nextManifest: Record<string, any> | null | undefined): void
export function updateConfig(newConfig?: Partial<MobileConfig>): MobileConfig
export function getConfig(): MobileConfig

declare const config: MobileConfig

export default config
