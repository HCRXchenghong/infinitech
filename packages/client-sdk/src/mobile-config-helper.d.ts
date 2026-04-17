export interface MobileConfigHelper {
  checkServerConnection(url?: string): Promise<boolean>
  autoDetectServer(): Promise<string | null>
  updateConfigAndVerify(newConfig: {
    API_BASE_URL?: string
    SOCKET_URL?: string
  }): Promise<boolean>
  configWizard(): Promise<void>
  getConfigInfo(): {
    current: Record<string, any>
    storage: any
    environment: string
  }
}

export function createMobileConfigHelper(options?: Record<string, any>): MobileConfigHelper
