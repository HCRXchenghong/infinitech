import { fetchPublicRuntimeSettings } from './api'

export const DEFAULT_REPORT_REASONS = [
  '商家出餐慢',
  '联系不上顾客',
  '顾客位置错误',
  '车辆故障',
  '恶劣天气',
  '道路拥堵',
  '订单信息错误',
  '其他原因'
]

function normalizeReasons(reasons: unknown): string[] {
  if (!Array.isArray(reasons)) {
    return [...DEFAULT_REPORT_REASONS]
  }

  const seen = new Set<string>()
  const normalized = reasons
    .map((item) => String(item || '').trim())
    .filter((item) => {
      if (!item || seen.has(item)) return false
      seen.add(item)
      return true
    })
    .slice(0, 20)

  return normalized.length ? normalized : [...DEFAULT_REPORT_REASONS]
}

export async function loadTaskReportReasons(): Promise<string[]> {
  try {
    const response: any = await fetchPublicRuntimeSettings()
    return normalizeReasons(response?.rider_exception_report_reasons)
  } catch (error) {
    return [...DEFAULT_REPORT_REASONS]
  }
}
