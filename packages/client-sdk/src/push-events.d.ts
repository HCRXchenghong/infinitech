export interface PushEventEnvelope {
  rawMessage: Record<string, any>
  payload: Record<string, any>
  messageId: string
  notificationId: string
  route: string
  title: string
  content: string
}

export interface PushEventBridgeController {
  start(): Promise<void>
  isStarted(): boolean
}

export function extractPushEventEnvelope(rawMessage?: any): PushEventEnvelope
export function createPushEventBridgeController(options?: {
  loggerTag?: string
  logger?: {
    error?: (...args: any[]) => void
  }
  uniApp?: any
  plusRuntime?: any
  documentRef?: any
  ackPushMessage?: (payload?: Record<string, any>) => Promise<any> | any
  onReceive?: (envelope: PushEventEnvelope) => void
  onClick?: (envelope: PushEventEnvelope) => void
  resolveClickUrl?: (envelope: PushEventEnvelope) => string
}): PushEventBridgeController
export function startPushEventBridge(options?: {
  loggerTag?: string
  logger?: {
    error?: (...args: any[]) => void
  }
  uniApp?: any
  plusRuntime?: any
  documentRef?: any
  ackPushMessage?: (payload?: Record<string, any>) => Promise<any> | any
  onReceive?: (envelope: PushEventEnvelope) => void
  onClick?: (envelope: PushEventEnvelope) => void
  resolveClickUrl?: (envelope: PushEventEnvelope) => string
}): Promise<void>
export function resetPushEventBridgeForTest(): void
