export interface RTCIceServerConfig {
  url: string
  username: string
  credential: string
}

export interface RTCRuntimeSettings {
  enabled: boolean
  timeoutSeconds: number
  iceServers: RTCIceServerConfig[]
}

export const DEFAULT_RTC_RUNTIME_SETTINGS: RTCRuntimeSettings
export function normalizeRTCRuntimeSettings(payload?: Record<string, any>): RTCRuntimeSettings
export function createRTCRuntimeSettingsLoader(fetcher: () => Promise<any> | any): {
  getCachedRTCRuntimeSettings: () => RTCRuntimeSettings
  loadRTCRuntimeSettings: (force?: boolean) => Promise<RTCRuntimeSettings>
}
