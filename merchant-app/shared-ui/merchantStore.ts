import { ref, computed } from 'vue'

// 店铺信息
export const storeInfo = ref({
  name: '隆江猪脚饭(科技园店)',
  category: '快餐便当',
  id: '8839210',
  logo: '',
  rating: 4.7,
  phone: '13800138000',
  address: '深圳市南山区科技园南区W1-B栋',
  openTime: '09:00',
  closeTime: '22:00',
  deliveryMode: '平台专送',
  notice: '欢迎光临！本店主营正宗隆江猪脚饭，每日现卤，售完即止。',
  isOpen: true,
  isPrinterConnected: true
})

// 订单列表
export const orders = ref([
  {
    id: 'o1',
    seq: '032',
    status: 'new',
    timeAgo: '刚刚',
    isPreOrder: false,
    total: '36.5',
    customerName: '王女士',
    note: '不要香菜，多点饭',
    items: [
      { name: '招牌隆江猪脚饭', qty: 1 },
      { name: '可乐', qty: 1 }
    ],
    isPrinting: false
  },
  {
    id: 'o2',
    seq: '031',
    status: 'processing',
    timeAgo: '15分钟前',
    isPreOrder: false,
    total: '28.0',
    customerName: '李先生',
    note: '',
    items: [{ name: '猪脚饭', qty: 1 }],
    isPrinting: false,
    rider: {
      name: '赵骑手',
      distance: '500m',
      status: '正赶往店铺'
    }
  }
])

// 商品分类
export const categories = ref([
  { id: 'c1', name: '热销推荐' },
  { id: 'c2', name: '招牌猪脚' },
  { id: 'c3', name: '营养炖汤' },
  { id: 'c4', name: '饮料小吃' }
])

// 商品列表
export const menuItems = ref([
  {
    id: 'm1',
    catId: 'c1',
    name: '招牌隆江猪脚饭+咸菜+卤蛋',
    price: 28,
    sales: 852,
    stock: true,
    online: true,
    img: ''
  },
  {
    id: 'm2',
    catId: 'c1',
    name: '至尊双拼饭(猪脚+肉卷)',
    price: 32,
    sales: 420,
    stock: true,
    online: true,
    img: ''
  },
  {
    id: 'm3',
    catId: 'c2',
    name: '单点红烧猪脚',
    price: 45,
    sales: 120,
    stock: true,
    online: true,
    img: ''
  },
  {
    id: 'm4',
    catId: 'c3',
    name: '虫草花炖老鸡',
    price: 18,
    sales: 50,
    stock: false,
    online: true,
    img: ''
  }
])

// 计算属性
export const pendingOrdersCount = computed(() => 
  orders.value.filter((o: any) => o.status === 'new').length
)

export const processingOrdersCount = computed(() => 
  orders.value.filter((o: any) => o.status === 'processing').length
)

// 方法
export const acceptOrder = (order: any) => {
  order.isPrinting = true
  setTimeout(() => {
    order.isPrinting = false
    order.status = 'processing'
    order.rider = { name: '系统分配中...', distance: '--', status: '待接单' }
    setTimeout(() => {
      if (order.rider) {
        order.rider = { name: '孙悟空', distance: '1.2km', status: '正赶往店铺' }
      }
    }, 2000)
  }, 1500)
}

export const notifyPickup = (order: any) => {
  order.status = 'delivering'
  if (order.rider) {
    order.rider.status = '已取货，配送中'
  }
}

export const toggleStoreStatus = () => {
  storeInfo.value.isOpen = !storeInfo.value.isOpen
}
