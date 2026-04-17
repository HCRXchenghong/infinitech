export interface PushRegistrationPayload {
  userId: string
  userType: string
  deviceToken: string
  appVersion: string
  locale: string
  timezone: string
  appEnv: string
}

export interface PushRegistrationState extends PushRegistrationPayload {
  fingerprint: string
  lastRegisteredAt: number
}

export interface PushRegistrationResult {
  success: boolean
  skipped?: boolean
  reason?: string
  payload?: PushRegistrationPayload
  data?: any
}

export interface PushRegistrationManager {
  registerCurrentPushDevice(options?: { force?: boolean }): Promise<PushRegistrationResult>
  unregisterCurrentPushDevice(): Promise<PushRegistrationResult>
  clearPushRegistrationState(): void
  getCachedRegistrationState(): PushRegistrationState | null
  ackPushMessage(payload?: Record<string, any>): Promise<any>
}

export function extractPushDeviceToken(pushInfo?: Record<string, any>): string
export function createPushRegistrationManager(options?: {
  storageKey?: string
  minRegisterIntervalMs?: number
  uniApp?: any
  plusRuntime?: any
  intlApi?: any
  nowFn?: () => number
  resolveAuthIdentity?: () => {
    userId?: string
    userType?: string
    role?: string
    authToken?: string
  } | null
  getSystemInfo?: () => Record<string, any>
  getPushClientInfo?: () => Record<string, any> | null
  getAppVersion?: (systemInfo?: Record<string, any>) => string
  getAppEnv?: (systemInfo?: Record<string, any>) => string
  registerPushDevice?: (payload: PushRegistrationPayload) => Promise<any> | any
  unregisterPushDevice?: (payload: {
    userId: string
    userType: string
    deviceToken: string
  }) => Promise<any> | any
  ackPushMessage?: (payload?: Record<string, any>) => Promise<any> | any
}): PushRegistrationManager
