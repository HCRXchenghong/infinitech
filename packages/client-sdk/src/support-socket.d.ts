export interface SupportSocketState {
  isConnected: boolean
  isConnecting: boolean
  queueLength: number
}

export interface SupportSocketService {
  connect(token?: string): void
  joinRoom(roomId: string): void
  send(roomId: string, text: string): void
  close(): void
  getState(): SupportSocketState
}

export function createSupportSocketService(options?: {
  createSocket?: (url: string, namespace?: string, token?: string) => {
    connect(): any
    on(event: string, callback: (...args: any[]) => any): void
    emit(event: string, payload?: any): void
    disconnect(): void
  }
  socketUrl?: string
  namespace?: string
  joinEvent?: string
  messageEvent?: string
  emitMessage?: (payload?: any) => void
}): SupportSocketService

export function createUniSupportSocketBridge(options?: {
  createSocket?: (url: string, namespace?: string, token?: string) => {
    connect(): any
    on(event: string, callback: (...args: any[]) => any): void
    emit(event: string, payload?: any): void
    disconnect(): void
  }
  socketUrl?: string
  namespace?: string
  joinEvent?: string
  messageEvent?: string
  messageEventName?: string
  uniApp?: any
  emitMessage?: (payload?: any) => void
}): SupportSocketService
