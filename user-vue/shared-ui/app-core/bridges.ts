import { registerCurrentPushDevice, clearPushRegistrationState } from '../push-registration'
import { connectCurrentRealtimeChannel, clearRealtimeState } from '../realtime-notify'
import { ensureUserRTCInviteBridge, disconnectUserRTCInviteBridge } from '../rtc-contact.js'
import { hasActiveUserSession } from './session'

async function runBridgeTask(name: string, task: () => Promise<unknown>) {
  try {
    await task()
  } catch (error) {
    console.error(`[App] ${name} failed:`, error)
  }
}

export function teardownUserBridges(): void {
  clearPushRegistrationState()
  clearRealtimeState()
  disconnectUserRTCInviteBridge()
}

export async function syncUserBridges(): Promise<boolean> {
  if (!hasActiveUserSession()) {
    teardownUserBridges()
    return false
  }

  await runBridgeTask('push registration', registerCurrentPushDevice)
  await runBridgeTask('realtime notify', connectCurrentRealtimeChannel)
  await runBridgeTask('rtc invite bridge', ensureUserRTCInviteBridge)
  return true
}
