/**
 * 格式化用户ID
 * @param id 原始ID
 * @param role 角色类型: 6-用户, 7-骑手, 8-管理员, 9-商户
 * @returns 格式化后的ID: 250724006XXXXXX
 */
export function formatUserId(id: number | string, role: number): string {
  const idStr = String(id).padStart(6, '0')
  return `25072400${role}${idStr}`
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
