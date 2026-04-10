import getSyncService from '../sync'
import { configWizard } from '../config-helper'
import config from '../config'
import { setupRequestInterceptor } from '../request-interceptor'
import { checkAndClearCacheIfNeeded } from '../cache-cleaner'
import { startPushEventBridge } from '../push-events'
import { syncUserBridges, teardownUserBridges } from './bridges'
import { verifyUserSession } from './session'

let requestInterceptorInstalled = false
let pushBridgeStarted = false
let syncInitPromise: Promise<void> | null = null

function runBackgroundTask(name: string, task: () => Promise<unknown> | unknown): void {
  Promise.resolve()
    .then(() => task())
    .catch((error) => {
      console.error(`[App] ${name} failed:`, error)
    })
}

function ensureRequestInterceptor(): void {
  if (requestInterceptorInstalled) {
    return
  }
  setupRequestInterceptor()
  requestInterceptorInstalled = true
}

function ensurePushEventBridge(): void {
  if (pushBridgeStarted) {
    return
  }
  pushBridgeStarted = true
  runBackgroundTask('push event bridge', startPushEventBridge)
}

function maybeRunConfigWizard(): void {
  // #ifdef APP-PLUS
  if (config.isDev) {
    runBackgroundTask('config wizard', configWizard)
  }
  // #endif
}

function ensureSyncServiceInitialized(): Promise<void> {
  if (!syncInitPromise) {
    const syncService = getSyncService()
    syncInitPromise = syncService.init().catch((error: unknown) => {
      console.error('[App] Sync service init failed:', error)
    })
  }
  return syncInitPromise
}

export async function bootstrapUserApp(): Promise<boolean> {
  checkAndClearCacheIfNeeded()
  ensureRequestInterceptor()
  ensurePushEventBridge()
  maybeRunConfigWizard()
  void ensureSyncServiceInitialized()

  const verified = await verifyUserSession()
  if (!verified) {
    teardownUserBridges()
    return false
  }

  await syncUserBridges()
  return true
}

export async function handleUserAppShow(): Promise<void> {
  await syncUserBridges()
}
