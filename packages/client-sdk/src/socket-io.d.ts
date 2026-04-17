export interface SocketClient {
  connect(): SocketClient
  on(event: string, callback: (...args: any[]) => any): void
  emit(event: string, data?: any): void
  disconnect(): void
}

export default function createSocket(url: string, namespace?: string, token?: string): SocketClient
