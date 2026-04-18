export interface PhoneContactAuditPayload {
  targetRole?: string
  targetId?: string
  targetPhone?: string
  phoneNumber?: string
  entryPoint?: string
  scene?: string
  orderId?: string
  roomId?: string
  pagePath?: string
  clientPlatform?: string
  clientResult?: string
  metadata?: Record<string, any>
}

export interface PhoneContactHelper {
  makePhoneCall(payload?: PhoneContactAuditPayload): Promise<{
    success: boolean
    phoneNumber: string
  }>
  normalizePhoneNumber(value?: string): string
}

export function normalizePhoneNumber(value?: string): string

export function createPhoneContactHelper(options?: {
  uniApp?: any
  recordPhoneContactClick?: (payload: PhoneContactAuditPayload) => Promise<any> | any
}): PhoneContactHelper
