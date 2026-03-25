/**
 * 配置辅助工具
 * 提供配置检测、更新、验证等功能
 */

// uni-app 全局类型声明
declare const uni: any

import config, { updateConfig, getConfig } from './config'

/**
 * 检测服务器是否可访问
 */
export async function checkServerConnection(url?: string): Promise<boolean> {
  const testUrl = url || config.API_BASE_URL + '/health'
  
  return new Promise((resolve) => {
    uni.request({
      url: testUrl,
      method: 'GET',
      timeout: 5000,
      success: (res: any) => {
        resolve(res.statusCode >= 200 && res.statusCode < 300)
      },
      fail: () => {
        resolve(false)
      }
    })
  })
}

/**
 * 自动检测可用的服务器地址
 * 尝试多个可能的地址，找到可用的
 */
export async function autoDetectServer(): Promise<string | null> {
  const candidates = [
    // 1. 当前配置的地址
    config.API_BASE_URL,

    // 2. 常见的本地开发地址

    // 3. 常见的局域网地址段
    ...generateIPCandidates(),
  ]

  for (const candidate of candidates) {
    if (!candidate) continue

    const isAvailable = await checkServerConnection(candidate + '/health')

    if (isAvailable) {
      return candidate
    }
  }

  return null
}

/**
 * 生成常见的IP地址候选列表
 */
function generateIPCandidates(): string[] {
  const candidates: string[] = []
  
  // 常见的局域网IP段
  const commonSegments = [
    '192.168.0',
    '192.168.1',
    '192.168.2',
    '10.0.0',
    '172.16.0',
  ]
  
  // 生成每个段的常见IP（100-150）
  commonSegments.forEach(segment => {
    for (let i = 100; i <= 150; i++) {
      candidates.push(`http://${segment}.${i}:25500`)
    }
  })
  
  return candidates
}

/**
 * 更新配置并验证连接
 */
export async function updateConfigAndVerify(newConfig: { API_BASE_URL?: string; SOCKET_URL?: string }): Promise<boolean> {
  const oldConfig = getConfig()
  
  // 更新配置
  updateConfig(newConfig)
  
  // 验证新配置是否可用
  const isAvailable = await checkServerConnection()
  
  if (!isAvailable) {
    // 如果新配置不可用，恢复旧配置
    updateConfig(oldConfig)
    return false
  }

  return true
}

/**
 * 智能配置向导
 * 引导用户完成配置
 */
export async function configWizard(): Promise<void> {
  // 1. 检查当前配置是否可用
  const currentAvailable = await checkServerConnection()

  if (currentAvailable) {
    return
  }

  // 2. 尝试自动检测
  const detectedUrl = await autoDetectServer()

  if (detectedUrl) {
    const baseUrl = detectedUrl.replace('/health', '')
    const updated = await updateConfigAndVerify({
      API_BASE_URL: baseUrl,
      SOCKET_URL: baseUrl,
    })
    
    if (updated) {
      return
    }
  }
  
  // 3. 提示用户手动配置
  console.log('❌ 自动检测失败，请手动配置服务器地址')
  console.log('   使用方法：')
  console.log('   import { updateConfig } from "./config"')
  console.log('   updateConfig({ API_BASE_URL: "http://你的IP:25500" })')
}

/**
 * 获取配置信息（用于调试）
 */
export function getConfigInfo(): {
  current: typeof config
  storage: any
  environment: string
} {
  try {
    const storageConfig = uni.getStorageSync('app_config')
    return {
      current: getConfig(),
      storage: storageConfig ? JSON.parse(storageConfig) : null,
      environment: config.isDev ? 'development' : 'production',
    }
  } catch (e) {
    return {
      current: getConfig(),
      storage: null,
      environment: config.isDev ? 'development' : 'production',
    }
  }
}