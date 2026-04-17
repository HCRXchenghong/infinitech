export interface RealtimeNotificationEnvelope {
  eventType: string
  title: string
  content: string
  route: string
  messageId: string
  refreshTargets: string[]
  payload: Record<string, any>
}

export interface RealtimeNotifyBridge {
  connectCurrentRealtimeChannel(options?: { forceTokenRefresh?: boolean }): Promise<void>
  disconnectRealtimeChannel(): void
  clearRealtimeState(): void
}

export function createRealtimeNotifyBridge(options?: {
  loggerTag?: string
  storageKey?: string
  tokenStorageKey?: string
  tokenAccountKeyStorageKey?: string
  eventName?: string
  reconnectDelayMs?: number
  seenMessageTTL?: number
  nowFn?: () => number
  uniApp?: any
  logger?: {
    error?: (...args: any[]) => void
  }
  resolveAuthIdentity?: () => {
    userId?: string
    role?: string
    authToken?: string
    userType?: string
  } | null
  resolveTokenAccountKey?: (identity?: Record<string, any> | null) => string
  requestSocketToken?: (options: {
    socketUrl: string
    authToken: string
    userId: string
    role: string
    identity?: Record<string, any>
    forceRefresh?: boolean
  }) => Promise<any> | any
  getSocketURL?: () => string
  socketUrl?: string
  createSocket?: (url: string, namespace?: string, token?: string) => {
    connect?: () => any
    on(event: string, callback: (...args: any[]) => any): void
    disconnect(): void
  }
  onReceive?: (envelope: RealtimeNotificationEnvelope) => void
  setTimeoutFn?: (callback: (...args: any[]) => any, delay?: number) => any
  clearTimeoutFn?: (timer?: any) => void
}): RealtimeNotifyBridge
