export interface RTCSignalSession {
  callId: string
  connected: boolean
  emit(eventName: string, payload?: Record<string, any>): void
  join(): void
  accept(extra?: Record<string, any>): void
  reject(extra?: Record<string, any>): void
  cancel(extra?: Record<string, any>): void
  timeout(extra?: Record<string, any>): void
  end(extra?: Record<string, any>): void
  signal(signalType: string, signal?: any, extra?: Record<string, any>): void
  disconnect(): void
}

export interface RTCStartCallResult {
  call: any
  callId: string
  session: RTCSignalSession
}

export function canUseRTCContact(options?: {
  platform?: string
  uniApp?: any
  resolvePlatform?: () => string
}): boolean

export function createRTCContactHelper(options?: {
  uniApp?: any
  clientKind?: string
  createRTCCall?: (payload?: Record<string, any>) => Promise<any> | any
  updateRTCCallStatus?: (callId: string, payload?: Record<string, any>) => Promise<any> | any
  createSocket?: (url: string, namespace?: string, token?: string) => {
    connect(): any
    on(event: string, callback: (...args: any[]) => any): void
    emit(event: string, payload?: any): void
    disconnect(): void
  }
  getSocketUrl?: () => string
  socketUrl?: string
  getSocketToken?: () => Promise<string> | string
  platform?: string
  resolvePlatform?: () => string
}): {
  canUseRTCContact: typeof canUseRTCContact
  connectSignalSession: (callId?: any, handlers?: Record<string, (...args: any[]) => any>) => Promise<RTCSignalSession>
  startCall: (payload?: Record<string, any>, handlers?: Record<string, (...args: any[]) => any>) => Promise<RTCStartCallResult>
  updateStatus: (callId?: any, payload?: Record<string, any>) => Promise<any>
}

export function createUniRTCContactBridge(options?: {
  uniApp?: any
  getCurrentPagesFn?: () => any[]
  socketTokenStorageKey?: string
  socketTokenAccountKeyStorageKey?: string
  tokenStorageKey?: string
  authModeStorageKey?: string
  role?: string
  authMode?: string
  clientKind?: string
  callPagePath?: string
  resolveIncomingTargetName?: (role?: string, payload?: Record<string, any>, call?: Record<string, any>) => string
  resolveCurrentUserId?: () => string
  requestSocketToken?: (options: {
    socketUrl: string
    currentUserId: string
    role: string
  }) => Promise<any> | any
  readAuthorizationHeader?: () => Record<string, any>
  getCachedRTCRuntimeSettings?: () => { enabled?: boolean }
  loadRTCRuntimeSettings?: (force?: boolean) => Promise<Record<string, any>>
  getRTCCall?: (callId?: any) => Promise<any> | any
  listRTCCallHistory?: (params?: Record<string, any>) => Promise<any> | any
  createRTCCall?: (payload?: Record<string, any>) => Promise<any> | any
  updateRTCCallStatus?: (callId: string, payload?: Record<string, any>) => Promise<any> | any
  createSocket?: (url: string, namespace?: string, token?: string) => {
    connect(): any
    on(event: string, callback: (...args: any[]) => any): void
    emit(event: string, payload?: any): void
    disconnect(): void
  }
  getSocketUrl?: () => string
  socketUrl?: string
  platform?: string
  resolvePlatform?: () => string
}): {
  canUseCurrentRTCContact: () => boolean
  getCachedRTCRuntimeSettings: () => Record<string, any>
  loadRTCRuntimeSettings: (force?: boolean) => Promise<Record<string, any>>
  startRTCCall: (payload?: Record<string, any>, handlers?: Record<string, (...args: any[]) => any>) => Promise<RTCStartCallResult>
  connectRTCSignalSession: (callId?: any, handlers?: Record<string, (...args: any[]) => any>) => Promise<RTCSignalSession>
  updateRTCCall: (callId?: any, payload?: Record<string, any>) => Promise<any>
  fetchRTCCall: (callId?: any) => Promise<any>
  fetchRTCCallHistory: (params?: Record<string, any>) => Promise<any>
  ensureSocketToken: () => Promise<string>
  ensureRTCInviteBridge: () => Promise<any>
  disconnectRTCInviteBridge: () => void
}
