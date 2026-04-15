declare module '@/shared-ui/push-registration' {
  export function registerCurrentPushDevice(): Promise<any>
  export function clearPushRegistrationState(): void
}

declare module '@/shared-ui/push-events' {
  export function startPushEventBridge(): Promise<any> | void
}

declare module '@/shared-ui/realtime-notify' {
  export function connectCurrentRealtimeChannel(): Promise<any>
  export function clearRealtimeState(): void
}

declare module '@/shared-ui/rtc-contact.js' {
  export function ensureUserRTCInviteBridge(): Promise<any>
  export function disconnectUserRTCInviteBridge(): void
}

declare module '@/shared-ui/notification-sound.js' {
  export function bindNotificationSoundBridge(): void
}
