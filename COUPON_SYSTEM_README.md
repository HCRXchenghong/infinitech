# 优惠券系统实现说明

## 已完成的修复和功能

### 1. 修复购物车商品数量显示重复问题
**文件**: `app-mobile/pages/order/confirm/index.vue`
- 修复了购物车商品ID重复导致的数量显示错误
- 在加载商品详情前对商品ID进行去重处理

### 2. 移除订单确认页硬编码的满减优惠
**文件**: `app-mobile/pages/order/confirm/index.vue`
- 移除了硬编码的"店铺满减 -¥5.00"
- 改为动态计算优惠券折扣金额
- 只在有优惠券时显示优惠信息

### 3. 优惠券数据库设计
**文件**: `backend/go/scripts/migrate-coupons.sql`

#### 数据库表结构

**coupons 表** - 优惠券主表
- `id`: 主键
- `shop_id`: 店铺ID（0表示平台通用券）
- `name`: 优惠券名称
- `type`: 类型（fixed固定金额/percent百分比）
- `amount`: 优惠金额或百分比
- `min_amount`: 最低消费金额
- `max_discount`: 最大优惠金额（百分比券）
- `total_count`: 总发行量（0表示无限）
- `received_count`: 已领取数量
- `used_count`: 已使用数量
- `valid_from`: 有效期开始
- `valid_until`: 有效期结束
- `status`: 状态（active/inactive）
- `description`: 使用说明

**user_coupons 表** - 用户优惠券表
- `id`: 主键
- `user_id`: 用户ID
- `coupon_id`: 优惠券ID
- `status`: 状态（unused/used/expired）
- `order_id`: 使用的订单ID
- `received_at`: 领取时间
- `used_at`: 使用时间

### 4. 后端API实现

#### 文件结构
- `backend/go/internal/repository/coupon_repository.go` - 数据访问层
- `backend/go/internal/service/coupon_service.go` - 业务逻辑层
- `backend/go/internal/handler/coupon_handler.go` - API处理器

#### API接口列表

**优惠券管理（管理端）**
- `POST /api/coupons` - 创建优惠券
- `PUT /api/coupons/:id` - 更新优惠券
- `DELETE /api/coupons/:id` - 删除优惠券
- `GET /api/coupons/:id` - 获取优惠券详情
- `GET /api/shops/:shopId/coupons` - 获取店铺所有优惠券
- `GET /api/shops/:shopId/coupons/active` - 获取店铺活动中的优惠券

**用户优惠券（用户端）**
- `POST /api/coupons/:couponId/receive` - 领取优惠券
- `GET /api/coupons/user` - 获取用户优惠券列表
- `GET /api/coupons/available` - 获取用户可用优惠券

### 5. 前端页面实现

#### 优惠券选择页面
**文件**: `app-mobile/pages/order/coupon/index.vue`
- 展示用户可用的优惠券列表
- 显示优惠券金额、使用条件、有效期
- 支持选择优惠券或不使用优惠券
- 将选中的优惠券信息传回订单确认页

#### 订单确认页更新
**文件**: `app-mobile/pages/order/confirm/index.vue`
- 添加优惠券选择入口
- 动态计算优惠金额
- 支持固定金额和百分比两种优惠类型
- 订单提交时包含优惠券信息

#### 商户详情页更新
**文件**: `app-mobile/pages/shop/detail/index.vue`
- 展示店铺活动中的优惠券
- 支持用户点击领取优惠券
- 显示优惠券金额和使用条件

## 部署步骤

### 1. 数据库迁移
```bash
# 进入后端目录
cd backend/go

# 执行数据库迁移脚本
mysql -u root -p your_database < scripts/migrate-coupons.sql
```

### 2. 后端代码集成

需要在主路由文件中注册优惠券相关的路由：

```go
// 在 main.go 或路由配置文件中添加
couponRepo := repository.NewCouponRepository(db)
couponService := service.NewCouponService(couponRepo)
couponHandler := handler.NewCouponHandler(couponService)

// 注册路由
api := router.Group("/api")
{
    // 优惠券管理（管理端）
    api.POST("/coupons", couponHandler.CreateCoupon)
    api.PUT("/coupons/:id", couponHandler.UpdateCoupon)
    api.DELETE("/coupons/:id", couponHandler.DeleteCoupon)
    api.GET("/coupons/:id", couponHandler.GetCouponByID)
    api.GET("/shops/:shopId/coupons", couponHandler.GetShopCoupons)
    api.GET("/shops/:shopId/coupons/active", couponHandler.GetActiveCoupons)

    // 用户优惠券（用户端）
    api.POST("/coupons/:couponId/receive", couponHandler.ReceiveCoupon)
    api.GET("/coupons/user", couponHandler.GetUserCoupons)
    api.GET("/coupons/available", couponHandler.GetAvailableCoupons)
}
```

### 3. 前端API配置

在 `app-mobile/shared-ui/api.js` 中添加优惠券相关的API方法（如果需要）。

### 4. 订单表更新

需要在订单表中添加优惠券相关字段：

```sql
ALTER TABLE orders
ADD COLUMN original_price DECIMAL(10,2) DEFAULT 0 COMMENT '原价',
ADD COLUMN discount_amount DECIMAL(10,2) DEFAULT 0 COMMENT '优惠金额',
ADD COLUMN user_coupon_id BIGINT DEFAULT NULL COMMENT '使用的用户优惠券ID';
```

## 使用流程

### 用户端流程

1. **浏览商户** → 在商户详情页查看可领取的优惠券
2. **领取优惠券** → 点击优惠券卡片领取到个人账户
3. **下单** → 在订单确认页点击"优惠券"选项
4. **选择优惠券** → 在优惠券列表中选择要使用的优惠券
5. **确认订单** → 系统自动计算优惠后的金额
6. **提交订单** → 优惠券自动核销，订单金额扣除优惠

### 管理端流程

1. **创建优惠券** → 在管理后台"标签与优惠"中创建优惠券
2. **设置参数**:
   - 优惠券名称
   - 优惠类型（固定金额/百分比）
   - 优惠金额
   - 使用门槛
   - 发行数量
   - 有效期
3. **发布优惠券** → 优惠券自动在商户详情页展示
4. **查看数据** → 查看优惠券领取和使用情况

## 优惠券类型说明

### 固定金额券 (fixed)
- 直接减免固定金额
- 例如：满40减15，满60减20
- `type: "fixed"`, `amount: 15.00`, `minAmount: 40.00`

### 百分比券 (percent)
- 按百分比折扣
- 可设置最大优惠金额
- 例如：8折优惠，最高优惠30元
- `type: "percent"`, `amount: 20.00` (表示20%折扣，即8折), `maxDiscount: 30.00`

## 注意事项

1. **优惠券库存**: 设置 `total_count = 0` 表示无限量
2. **平台通用券**: 设置 `shop_id = 0` 表示全平台可用
3. **优惠券状态**:
   - `active`: 活动中，用户可领取
   - `inactive`: 已下架，用户不可领取
4. **用户优惠券状态**:
   - `unused`: 未使用
   - `used`: 已使用
   - `expired`: 已过期
5. **并发控制**: 领取优惠券时使用事务确保库存准确性
6. **重复领取**: 同一用户不能重复领取同一张优惠券

## 测试建议

1. 测试优惠券领取流程
2. 测试优惠券使用和金额计算
3. 测试优惠券库存限制
4. 测试优惠券有效期验证
5. 测试并发领取场景
6. 测试订单提交后优惠券核销

## 后续优化建议

1. 添加优惠券使用记录查询
2. 添加优惠券过期自动处理
3. 添加优惠券分享功能
4. 添加优惠券使用统计报表
5. 支持优惠券叠加使用规则
6. 添加优惠券推送通知
