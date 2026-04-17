export interface PortalRuntimeSettings {
  [key: string]: string
}

export interface PortalRuntimeStore<T extends PortalRuntimeSettings = PortalRuntimeSettings> {
  defaultSettings: T
  getCachedPortalRuntimeSettings(): T
  loadPortalRuntimeSettings(force?: boolean): Promise<T>
  resetPortalRuntimeSettings(): void
}

export function normalizePortalRuntimeSettings<T extends PortalRuntimeSettings = PortalRuntimeSettings>(
  payload?: Record<string, any>,
  options?: {
    defaultSettings?: T
    fieldMap?: Record<string, string | string[]>
  }
): T

export function createPortalRuntimeStore<T extends PortalRuntimeSettings = PortalRuntimeSettings>(
  options?: {
    fetchRuntimeSettings?: () => Promise<any> | any
    defaultSettings?: T
    fieldMap?: Record<string, string | string[]>
  }
): PortalRuntimeStore<T>
