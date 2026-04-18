import type { SupportSocketService } from "./support-socket.js";

export function createConfiguredSupportSocketBridge(options?: {
  createSocket: (url: string, namespace?: string, token?: string) => {
    connect(): any
    on(event: string, callback: (...args: any[]) => any): void
    emit(event: string, payload?: any): void
    disconnect(): void
  }
  config?: Record<string, any>
  socketUrl?: string
  namespace?: string
  joinEvent?: string
  messageEvent?: string
  messageEventName?: string
  uniApp?: any
  emitMessage?: (payload?: any) => void
}): SupportSocketService
