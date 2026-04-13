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

// 工具函数

/**
 * 格式化时间
 */
export const formatTime = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')
  const second = String(date.getSeconds()).padStart(2, '0')

  return `${year}-${month}-${day} ${hour}:${minute}:${second}`
}

/**
 * 格式化相对时间
 */
export const formatRelativeTime = (timestamp: number): string => {
  const now = Date.now()
  const diff = now - timestamp
  
  const minute = 60 * 1000
  const hour = 60 * minute
  const day = 24 * hour
  
  if (diff < minute) {
    return '刚刚'
  } else if (diff < hour) {
    return `${Math.floor(diff / minute)}分钟前`
  } else if (diff < day) {
    return `${Math.floor(diff / hour)}小时前`
  } else if (diff < 7 * day) {
    return `${Math.floor(diff / day)}天前`
  } else {
    const date = new Date(timestamp)
    return `${date.getMonth() + 1}-${date.getDate()}`
  }
}

/**
 * 格式化金额
 */
export const formatMoney = (amount: number): string => {
  return amount.toFixed(2)
}

/**
 * 防抖函数
 */
export const debounce = (fn: Function, delay: number = 300) => {
  let timer: any = null
  return function(this: any, ...args: any[]) {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      fn.apply(this, args)
    }, delay)
  }
}

/**
 * 节流函数
 */
export const throttle = (fn: Function, delay: number = 300) => {
  let timer: any = null
  return function(this: any, ...args: any[]) {
    if (!timer) {
      timer = setTimeout(() => {
        fn.apply(this, args)
        timer = null
      }, delay)
    }
  }
}

/**
 * 深拷贝
 */
export const deepClone = (obj: any): any => {
  if (obj === null || typeof obj !== 'object') return obj
  if (obj instanceof Date) return new Date(obj)
  if (obj instanceof Array) return obj.map(item => deepClone(item))
  
  const cloneObj: any = {}
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      cloneObj[key] = deepClone(obj[key])
    }
  }
  return cloneObj
}

/**
 * 显示Toast提示
 */
export const showToast = (title: string, icon: any = 'none') => {
  uni.showToast({
    title,
    icon,
    duration: 2000
  })
}

/**
 * 显示Loading
 */
export const showLoading = (title: string = '加载中...') => {
  uni.showLoading({
    title,
    mask: true
  })
}

/**
 * 隐藏Loading
 */
export const hideLoading = () => {
  uni.hideLoading()
}

/**
 * 确认对话框
 */
export const showConfirm = (content: string, title: string = '提示'): Promise<boolean> => {
  return new Promise((resolve) => {
    uni.showModal({
      title,
      content,
      success: (res) => {
        resolve(res.confirm)
      }
    })
  })
}

/**
 * 订单状态文本映射
 */
export const getOrderStatusText = (status: string): string => {
  const statusMap: any = {
    pending: '待接单',
    accepted: '待出餐',
    delivering: '配送中',
    completed: '已完成',
    cancelled: '已取消',
    refunded: '已退款',
    rejected: '已拒绝',
  }
  return statusMap[status] || '未知'
}

/**
 * 订单状态颜色映射
 */
export const getOrderStatusColor = (status: string): string => {
  const colorMap: any = {
    pending: '#ef4444',
    accepted: '#f97316',
    delivering: '#009bf5',
    completed: '#10b981',
    cancelled: '#6b7280',
    refunded: '#6b7280',
    rejected: '#6b7280',
  }
  return colorMap[status] || '#6b7280'
}
