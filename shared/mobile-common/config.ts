/**
 * 智能配置系统
 * 支持自动检测环境、IP地址和域名配置
 * 
 * 配置优先级（从高到低）：
 * 1. 环境变量（API_BASE_URL, SOCKET_URL）
 * 2. manifest.json 中的自定义配置
 * 3. 本地存储中的配置（运行时配置）
 * 4. 自动检测（开发环境自动检测IP，生产环境使用默认域名）
 * 
 * 注意：本项目不做 H5，只支持 App 和小程序
 */

// uni-app 全局类型声明
declare const uni: any
declare const getApp: any
declare const plus: any

// 配置接口
interface Config {
  API_BASE_URL: string
  SOCKET_URL: string
  isDev: boolean
  TIMEOUT: number
}

const DEFAULT_DEV_API_BASE_URL = 'http://127.0.0.1:25500'
const DEFAULT_DEV_SOCKET_URL = 'http://127.0.0.1:9898'
const DEFAULT_PROD_API_BASE_URL = 'https://api.yuexiang.com'
const DEFAULT_PROD_SOCKET_URL = 'https://api.yuexiang.com'

// manifest 注入接口：各端 re-export 时可通过 setManifest() 注入自己的 manifest.json
let _manifest: any = null
export function setManifest(m: any) { _manifest = m }

// 获取 manifest.json 配置
function getManifestConfig(): any {
  try {
    if (_manifest && _manifest['app-plus'] && _manifest['app-plus'].config) {
      return _manifest['app-plus'].config
    }
  } catch (e) {
    // ignore
  }
  return {}
}

// 从本地存储读取配置（运行时配置）
function getStorageConfig(): Partial<Config> {
  try {
    // @ts-ignore
    const configStr = uni.getStorageSync('app_config')
    if (configStr) {
      return JSON.parse(configStr)
    }
  } catch (e) {
    // 忽略错误
  }
  return {}
}

// 保存配置到本地存储
function saveStorageConfig(config: Partial<Config>) {
  try {
    // @ts-ignore
    uni.setStorageSync('app_config', JSON.stringify(config))
  } catch (e) {
    // ignore storage write failure
  }
}

// 自动检测环境
function detectEnvironment(): boolean {
  // 方法1: 通过环境变量（构建时注入）
  // @ts-ignore
  if (typeof process !== 'undefined' && process.env) {
    // @ts-ignore
    const env = process.env.NODE_ENV || process.env.UNI_PLATFORM
    if (env === 'production' || env === 'prod') {
      return false
    }
  }
  
  // 方法2: 通过条件编译判断（uni-app 会在编译时处理）
  // #ifdef APP-PLUS
  // App 环境，默认开发环境
  // 可以通过检查包名或版本号判断
  try {
    // @ts-ignore
    if (typeof plus !== 'undefined' && plus.runtime) {
      // @ts-ignore
      const appid = plus.runtime.appid
      // 如果 appid 包含 dev 或 test，认为是开发环境
      if (appid && (appid.includes('dev') || appid.includes('test'))) {
        return true
      }
      // 如果 appid 包含 prod 或 release，认为是生产环境
      if (appid && (appid.includes('prod') || appid.includes('release'))) {
        return false
      }
    }
  } catch (e) {
    // 忽略错误
  }
  // #endif
  
  // 方法3: 通过域名判断（如果已配置）
  const storageConfig = getStorageConfig()
  if (storageConfig.API_BASE_URL) {
    const url = storageConfig.API_BASE_URL
    // 如果包含 localhost、127.0.0.1、10.0.2.2 或 192.168.x.x，认为是开发环境
    if (url.includes('localhost') || url.includes('127.0.0.1') || url.includes('10.0.2.2') || /192\.168\.\d+\.\d+/.test(url)) {
      return true
    }
    // 如果包含 https:// 且不是本地IP，认为是生产环境
    if (url.startsWith('https://') && !url.includes('localhost') && !url.includes('127.0.0.1')) {
      return false
    }
  }
  
  // 方法4: 通过条件编译判断（uni-app会在编译时处理）
  // #ifdef APP-PLUS
  // App环境默认开发环境
  // #endif
  
  // #ifdef MP
  // 小程序环境，可以通过版本号判断
  // #endif
  
  // 默认返回开发环境
  return true
}

// 自动检测本机IP（仅开发环境）
function detectLocalIP(): string | null {
  // 注意：在 App 运行时无法直接获取开发机器的IP
  // 这个方法主要用于提示用户，实际IP需要手动配置或通过环境变量传入
  
  // 尝试从本地存储读取上次使用的IP
  try {
    // @ts-ignore
    const lastIP = uni.getStorageSync('dev_local_ip')
    if (lastIP && /^\d+\.\d+\.\d+\.\d+$/.test(lastIP)) {
      return lastIP
    }
  } catch (e) {
    // 忽略错误
  }
  
  return null
}

function enforceBffApiBaseUrl(rawUrl: string, source: string): string {
  const input = String(rawUrl || '').trim()
  if (!input) return input

  const normalized = input
    .replace(/:1029(?=\/|$)/, ':25500')
    .replace(/:1129(?=\/|$)/, ':25500')

  if (normalized !== input) {
    console.warn('检测到' + source + ' API_BASE_URL 指向 Go 端口，已自动切换到 BFF 端口: ' + normalized)
  }

  return normalized
}

// 构建配置
function buildConfig(): Config {
  const isDev = detectEnvironment()
  
  // 1. 优先使用环境变量（构建时注入）
  // @ts-ignore
  const envApiUrl = typeof process !== 'undefined' && process.env ? process.env.API_BASE_URL : null
  // @ts-ignore
  const envSocketUrl = typeof process !== 'undefined' && process.env ? process.env.SOCKET_URL : null
  
  // 2. 从 manifest.json 读取配置
  const manifestConfig = getManifestConfig()
  
  // 3. 从本地存储读取配置（运行时配置）
  const storageConfig = getStorageConfig()
  
  // 4. 构建最终配置
  let apiBaseUrl: string
  let socketUrl: string
  
  if (envApiUrl) {
    // 环境变量优先级最高
    apiBaseUrl = enforceBffApiBaseUrl(envApiUrl, '环境变量')
    socketUrl = envSocketUrl || envApiUrl
  } else if (storageConfig.API_BASE_URL) {
    // 本地存储配置（运行时配置）
    apiBaseUrl = enforceBffApiBaseUrl(storageConfig.API_BASE_URL, '本地存储')
    socketUrl = storageConfig.SOCKET_URL || apiBaseUrl
  } else if (manifestConfig.API_BASE_URL) {
    // manifest.json 配置
    apiBaseUrl = enforceBffApiBaseUrl(manifestConfig.API_BASE_URL, 'manifest')
    socketUrl = manifestConfig.SOCKET_URL || apiBaseUrl
    } else {
      // 使用默认配置
      if (isDev) {
        // 开发环境：优先使用上次保存的IP，否则回退到本机回环地址。
        // 真机调试需要通过 manifest、环境变量或运行时配置显式指定局域网/公网地址。
        const localIP = detectLocalIP()
        apiBaseUrl = localIP ? `http://${localIP}:25500` : DEFAULT_DEV_API_BASE_URL
        socketUrl = localIP ? `http://${localIP}:9898` : DEFAULT_DEV_SOCKET_URL
      } else {
        // 生产环境：使用默认域名
        apiBaseUrl = DEFAULT_PROD_API_BASE_URL
        socketUrl = DEFAULT_PROD_SOCKET_URL
      }
    }
  
  return {
    API_BASE_URL: apiBaseUrl,
    SOCKET_URL: socketUrl,
    isDev,
    TIMEOUT: 30000,
  }
}

// 生成配置
const config: Config = buildConfig()

// 导出配置
export default config

// 导出配置更新函数（运行时更新配置）
export function updateConfig(newConfig: Partial<Config>) {
  const currentConfig = getStorageConfig()
  const normalizedNewConfig = { ...newConfig }

  if (normalizedNewConfig.API_BASE_URL) {
    normalizedNewConfig.API_BASE_URL = enforceBffApiBaseUrl(normalizedNewConfig.API_BASE_URL, '运行时更新')
  }

  const updatedConfig = { ...currentConfig, ...normalizedNewConfig }
  saveStorageConfig(updatedConfig)
  
  // 重新构建配置
  const finalConfig = buildConfig()
  
  // 更新导出的配置对象
  Object.assign(config, finalConfig)

  return finalConfig
}

// 导出获取当前配置的函数
export function getConfig(): Config {
  return { ...config }
}

/**
 * 使用说明：
 * 
 * 1. 环境变量配置（推荐，构建时注入）：
 *    在构建脚本中设置：
 *    API_BASE_URL=http://127.0.0.1:25500 npm run build:app-plus
 *
 * 2. 运行时配置（动态更新）：
 *    import { updateConfig } from './config'
 *    updateConfig({ API_BASE_URL: 'http://127.0.0.1:25500' })
 *
 * 3. manifest.json 配置：
 *    在 manifest.json 中添加：
 *    {
 *      "app-plus": {
 *        "config": {
 *          "API_BASE_URL": "http://127.0.0.1:25500",
 *          "SOCKET_URL": "http://127.0.0.1:9898"
 *        }
 *      }
 *    }
 * 
 * 4. 自动检测：
 *    - 开发环境：自动使用本地IP（需要先设置一次）
 *    - 生产环境：自动使用生产域名
 * 
 * 配置优先级（从高到低）：
 * 1. 环境变量
 * 2. 运行时配置（本地存储）
 * 3. manifest.json 配置
 * 4. 自动检测默认值
 */
