/**
 * Shared mobile runtime config.
 *
 * Priority:
 * 1. Environment variables
 * 2. Runtime storage overrides
 * 3. Manifest config
 * 4. Safe defaults
 */

declare const uni: {
  getStorageSync?: (key: string) => string
  setStorageSync?: (key: string, value: string) => void
}

declare const plus: {
  runtime?: {
    appid?: string
  }
}

type RuntimeProcessEnv = {
  NODE_ENV?: string
  UNI_PLATFORM?: string
  API_BASE_URL?: string
  SOCKET_URL?: string
}

type RuntimeProcess = {
  env?: RuntimeProcessEnv
}

declare const process: RuntimeProcess | undefined

export interface Config {
  API_BASE_URL: string
  SOCKET_URL: string
  isDev: boolean
  TIMEOUT: number
}

type ManifestConfig = Partial<Pick<Config, 'API_BASE_URL' | 'SOCKET_URL'>>

type AppManifest = {
  'app-plus'?: {
    config?: ManifestConfig
  }
}

const STORAGE_KEY = 'app_config'
const LAST_DEV_IP_KEY = 'dev_local_ip'
const DEFAULT_DEV_API_BASE_URL = 'http://127.0.0.1:25500'
const DEFAULT_DEV_SOCKET_URL = 'http://127.0.0.1:9898'
const DEFAULT_PROD_API_BASE_URL = 'https://api.yuexiang.com'
const DEFAULT_PROD_SOCKET_URL = 'https://api.yuexiang.com'
const PRIVATE_IP_PATTERN = /^(?:127\.0\.0\.1|10\.0\.2\.2|192\.168\.\d+\.\d+)$/

let manifest: AppManifest | null = null

export function setManifest(nextManifest: AppManifest | null | undefined) {
  manifest = nextManifest || null
}

function getProcessEnv(): RuntimeProcessEnv {
  if (typeof process === 'undefined' || !process?.env) {
    return {}
  }
  return process.env
}

function getManifestConfig(): ManifestConfig {
  return manifest?.['app-plus']?.config || {}
}

function getUniStorage(): typeof uni | null {
  if (typeof uni === 'undefined') {
    return null
  }
  return uni
}

function readStorageJson<T>(key: string): T | null {
  const storage = getUniStorage()
  if (!storage?.getStorageSync) {
    return null
  }

  try {
    const raw = storage.getStorageSync(key)
    if (!raw) return null
    return JSON.parse(raw) as T
  } catch (_error) {
    return null
  }
}

function writeStorageJson(key: string, value: unknown) {
  const storage = getUniStorage()
  if (!storage?.setStorageSync) {
    return
  }

  try {
    storage.setStorageSync(key, JSON.stringify(value))
  } catch (_error) {
    // Ignore storage write failures in constrained runtimes.
  }
}

function getStorageConfig(): Partial<Config> {
  return readStorageJson<Partial<Config>>(STORAGE_KEY) || {}
}

function saveStorageConfig(config: Partial<Config>) {
  writeStorageJson(STORAGE_KEY, config)
}

function getLastLocalIp(): string | null {
  const storage = getUniStorage()
  if (!storage?.getStorageSync) {
    return null
  }

  try {
    const raw = String(storage.getStorageSync(LAST_DEV_IP_KEY) || '').trim()
    return /^\d+\.\d+\.\d+\.\d+$/.test(raw) ? raw : null
  } catch (_error) {
    return null
  }
}

function isPrivateDevHost(hostname: string): boolean {
  return PRIVATE_IP_PATTERN.test(hostname) || hostname === 'localhost'
}

function normalizeUrl(input: string): URL | null {
  try {
    return new URL(String(input || '').trim())
  } catch (_error) {
    return null
  }
}

function isProductionUrl(rawUrl: string): boolean {
  const parsed = normalizeUrl(rawUrl)
  if (!parsed) return false
  return parsed.protocol === 'https:' && !isPrivateDevHost(parsed.hostname)
}

function isDevelopmentUrl(rawUrl: string): boolean {
  const parsed = normalizeUrl(rawUrl)
  if (!parsed) return false
  return isPrivateDevHost(parsed.hostname)
}

function detectEnvironment(): boolean {
  const env = getProcessEnv()
  const runtimeEnv = String(env.NODE_ENV || env.UNI_PLATFORM || '').trim().toLowerCase()
  if (runtimeEnv === 'production' || runtimeEnv === 'prod') {
    return false
  }

  try {
    const appid = String(plus?.runtime?.appid || '').trim().toLowerCase()
    if (appid.includes('prod') || appid.includes('release')) {
      return false
    }
    if (appid.includes('dev') || appid.includes('test')) {
      return true
    }
  } catch (_error) {
    // Ignore non-app runtimes.
  }

  const configuredApiBaseUrl = String(getStorageConfig().API_BASE_URL || '').trim()
  if (configuredApiBaseUrl) {
    if (isProductionUrl(configuredApiBaseUrl)) {
      return false
    }
    if (isDevelopmentUrl(configuredApiBaseUrl)) {
      return true
    }
  }

  return true
}

function enforceBffApiBaseUrl(rawUrl: string, source: string): string {
  const original = String(rawUrl || '').trim()
  const normalized = original
    .replace(/:1029(?=\/|$)/, ':25500')
    .replace(/:1129(?=\/|$)/, ':25500')

  if (normalized && normalized !== original) {
    console.warn(`[config] ${source} API_BASE_URL pointed at Go directly; switched to BFF endpoint: ${normalized}`)
  }

  return normalized
}

function resolveDevDefaults(): Pick<Config, 'API_BASE_URL' | 'SOCKET_URL'> {
  const localIp = getLastLocalIp()
  if (!localIp) {
    return {
      API_BASE_URL: DEFAULT_DEV_API_BASE_URL,
      SOCKET_URL: DEFAULT_DEV_SOCKET_URL
    }
  }

  return {
    API_BASE_URL: `http://${localIp}:25500`,
    SOCKET_URL: `http://${localIp}:9898`
  }
}

function buildConfig(): Config {
  const isDev = detectEnvironment()
  const env = getProcessEnv()
  const manifestConfig = getManifestConfig()
  const storageConfig = getStorageConfig()

  const envApiUrl = String(env.API_BASE_URL || '').trim()
  const envSocketUrl = String(env.SOCKET_URL || '').trim()
  const storageApiUrl = String(storageConfig.API_BASE_URL || '').trim()
  const storageSocketUrl = String(storageConfig.SOCKET_URL || '').trim()
  const manifestApiUrl = String(manifestConfig.API_BASE_URL || '').trim()
  const manifestSocketUrl = String(manifestConfig.SOCKET_URL || '').trim()

  let apiBaseUrl = ''
  let socketUrl = ''

  if (envApiUrl) {
    apiBaseUrl = enforceBffApiBaseUrl(envApiUrl, 'environment')
    socketUrl = envSocketUrl || apiBaseUrl
  } else if (storageApiUrl) {
    apiBaseUrl = enforceBffApiBaseUrl(storageApiUrl, 'storage')
    socketUrl = storageSocketUrl || apiBaseUrl
  } else if (manifestApiUrl) {
    apiBaseUrl = enforceBffApiBaseUrl(manifestApiUrl, 'manifest')
    socketUrl = manifestSocketUrl || apiBaseUrl
  } else if (isDev) {
    const defaults = resolveDevDefaults()
    apiBaseUrl = defaults.API_BASE_URL
    socketUrl = defaults.SOCKET_URL
  } else {
    apiBaseUrl = DEFAULT_PROD_API_BASE_URL
    socketUrl = DEFAULT_PROD_SOCKET_URL
  }

  return {
    API_BASE_URL: apiBaseUrl,
    SOCKET_URL: socketUrl,
    isDev,
    TIMEOUT: 30_000
  }
}

const config: Config = buildConfig()

export default config

export function updateConfig(newConfig: Partial<Config>): Config {
  const normalizedConfig: Partial<Config> = { ...newConfig }

  if (normalizedConfig.API_BASE_URL) {
    normalizedConfig.API_BASE_URL = enforceBffApiBaseUrl(normalizedConfig.API_BASE_URL, 'runtime update')
  }

  saveStorageConfig({
    ...getStorageConfig(),
    ...normalizedConfig
  })

  const nextConfig = buildConfig()
  Object.assign(config, nextConfig)
  return nextConfig
}

export function getConfig(): Config {
  return { ...config }
}
