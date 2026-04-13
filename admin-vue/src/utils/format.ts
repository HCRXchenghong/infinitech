const UID_PATTERN = /^(?:\d{14}|\d{18})$/
const TSID_PATTERN = /^(?:\d{24}|\d{28})$/

/**
 * 优先显示真实统一 ID；如果还是 legacy 数值，则直接回显，避免拼装伪 ID。
 */
export function formatUserId(id: number | string, _role: number): string {
  const raw = String(id ?? '').trim()
  if (!raw) return ''
  if (UID_PATTERN.test(raw) || TSID_PATTERN.test(raw)) {
    return raw
  }
  return raw
}

/**
 * 根据角色类型格式化ID
 */
export function formatRoleId(id: number | string, roleType: 'user' | 'rider' | 'admin' | 'merchant'): string {
  const roleMap = {
    user: 6,
    rider: 7,
    admin: 8,
    merchant: 9
  }
  return formatUserId(id, roleMap[roleType])
}
