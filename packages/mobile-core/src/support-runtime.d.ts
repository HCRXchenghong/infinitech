export interface SupportRuntimeSettings {
  title: string
  welcomeMessage: string
  merchantWelcomeMessage: string
  riderWelcomeMessage: string
  aboutSummary?: string
  messageSoundUrl: string
  orderSoundUrl: string
}

export const DEFAULT_SUPPORT_RUNTIME_SETTINGS: SupportRuntimeSettings

export function normalizeSupportRuntimeSettings(
  payload?: Record<string, any>,
  defaultSettings?: Partial<SupportRuntimeSettings>
): SupportRuntimeSettings

export function createSupportRuntimeStore(options?: {
  fetchRuntimeSettings?: () => Promise<any>
  defaultSettings?: Partial<SupportRuntimeSettings>
}): {
  defaultSettings: SupportRuntimeSettings
  getCachedSupportRuntimeSettings(): SupportRuntimeSettings
  loadSupportRuntimeSettings(force?: boolean): Promise<SupportRuntimeSettings>
  resetSupportRuntimeSettings(): void
}
