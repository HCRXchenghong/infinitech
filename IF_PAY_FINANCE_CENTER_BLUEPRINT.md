# IF-PAY 财务中心架构定版（严谨版）

> 版本：v2.0（架构冻结稿）  
> 日期：2026-02-23  
> 适用范围：`app-mobile`（用户端）+ `rider-app`（骑手端）+ `merchant-app`（商户端）+ `admin-vue`（管理端）+ `backend/bff` + `backend/go` + 数据库

---

## 0. 架构结论（先明确你最关心的）

1. **IF-Pay 是平台自有支付体系**，不是第三方代收代付。
2. 三端钱包统一重构为同一套账户/账本内核：`customer / rider / merchant` 共享同一底层模型。
3. 生产链路必须是：**前端/三端 -> BFF -> Go -> MySQL(事务) + Redis(锁/限流/幂等) -> 回传**。
4. 微信/支付宝先做**通道预留**（充值/提现），IF-Pay 先做完整闭环。
5. 财务中心全部指标以后端权威账本为准，不再靠前端拼接或临时估算。

---

## 1. 非妥协原则（金融级）

1. 金额字段统一 `BIGINT`（单位分），禁止浮点金额入账。
2. 账本（交易流水）业务上**只增不删**，状态允许受控流转。
3. 每笔资金变化必须“**同事务：写流水 + 改余额**”，不可拆。
4. 所有写操作必须有：幂等键 + 乐观锁 + 风控校验。
5. 关键动作（扣款/退款/赔付/提现/管理员加减）必须可审计：操作者、IP、请求体、结果、签名。
6. 管理端财务接口必须 RBAC（最小权限）。
7. 第三方回调必须验签、防重放、防重复处理。

---

## 2. 基于现有代码的真实落地架构

### 2.1 现状（已存在）

- Go API：`backend/go`（Gin + GORM）
- BFF：`backend/bff`（Express）
- 管理端：`admin-vue`
- 三端：`app-mobile` / `rider-app` / `merchant-app`
- 订单主表：`orders`（已有 `total_price`, `rider_quoted_price`, `merchant_id`, `rider_id` 等）

### 2.2 定版目标拓扑

```text
app-mobile / rider-app / merchant-app / admin-vue
    -> BFF (鉴权/聚合/参数校验/限流)
    -> Go (资金内核/订单支付编排/财务统计)
    -> MySQL (事务 + 索引) / Redis (锁、限流、幂等、短期缓存)
    -> (可选) MQ (异步对账、统计快照、告警)
```

### 2.3 与当前工程目录对齐

- Go 侧新增：
  - `backend/go/internal/repository/wallet_repository.go`
  - `backend/go/internal/service/wallet_service.go`
  - `backend/go/internal/service/payment_service.go`
  - `backend/go/internal/service/financial_service.go`
  - `backend/go/internal/service/risk_control_service.go`
  - `backend/go/internal/handler/wallet_handler.go`
  - `backend/go/internal/handler/payment_handler.go`
  - `backend/go/internal/handler/financial_handler.go`
  - `backend/go/internal/handler/admin_wallet_handler.go`
- BFF 侧新增：
  - `backend/bff/src/routes/wallet.js`
  - `backend/bff/src/routes/admin.wallet.js`
  - `backend/bff/src/routes/admin.financial.js`
  - `backend/bff/src/controllers/walletController.js`
  - `backend/bff/src/controllers/adminWalletController.js`
  - `backend/bff/src/controllers/financialController.js`

---

## 3. 数据库模型定版（采用你给的主方案并强化约束）

> 表名与字段基本沿用你给出的方案，作为正式目标模型。

### 3.1 核心表（必须）

1. `wallet_accounts`
2. `wallet_transactions`
3. `recharge_orders`
4. `withdraw_requests`
5. `admin_wallet_operations`
6. `financial_statistics`
7. `user_financial_details`
8. `orders` 扩展支付字段（你给出的 ALTER）

### 3.2 建议再加 3 张安全表（提升严谨性）

1. `payment_callbacks`
   - 记录微信/支付宝回调原文、验签结果、处理状态、防重放指纹。
2. `idempotency_records`
   - 幂等键统一管理（接口级）。
3. `reconciliation_tasks`
   - 对账任务（平台账本 vs 第三方账单）。

### 3.3 关键约束

- `wallet_accounts.user_id` 唯一。
- `wallet_transactions.transaction_id` 唯一。
- `wallet_transactions.idempotency_key` 唯一（新增字段）。
- 业务层禁止对成功交易的 `amount/balance_before/balance_after/signature` 更新。
- `orders.payment_status` 与 `wallet_transactions` 通过 `payment_transaction_id/refund_transaction_id` 强关联。

---

## 4. IF-Pay 业务闭环（第一优先）

## 4.1 订单支付（IF-Pay）

1. 客户端提交支付请求（带 `idempotency_key`）
2. BFF 校验登录态、参数、签名头
3. Go 开事务：
   - 风控校验（金额、频次、账户状态）
   - 创建 `wallet_transactions(type=payment,pending)`
   - 乐观锁扣 `wallet_accounts.balance`
   - 更新 `orders.payment_status=paid`
   - 更新流水 `success`
4. 提交事务，返回支付结果

## 4.2 退款

1. 触发条件：取消单/售后审核通过
2. 事务内：
   - `wallet_transactions(type=refund)`
   - 回补客户余额
   - 更新 `orders.payment_status=refunded`、`refund_amount/refund_time`

## 4.3 赔付

1. 由管理端发起（必须有 reason）
2. 事务内：
   - `wallet_transactions(type=compensation)`
   - 给目标账户加款
   - 写 `admin_wallet_operations`

## 4.4 提现（先 IF-Pay 内核，通道后挂）

1. 创建 `withdraw_requests(pending)`
2. 冻结余额（`balance -> frozen_balance`）
3. 审核/自动通过后处理转账
4. 成功：扣冻结、记流水
5. 失败：解冻并标记失败

---

## 5. 微信/支付宝接入边界（预留策略）

1. **充值通道**：第三方只负责“法币入账到 IF-Pay 钱包”。
2. **提现通道**：IF-Pay 出账后转到第三方账户。
3. **订单内支付**：第一阶段全部走 IF-Pay（保证账本一致性）。
4. 回调统一入口：
   - `POST /api/payments/callback/wechat`
   - `POST /api/payments/callback/alipay`

---

## 6. BFF / Go / DB 真正打通的接口矩阵

## 6.1 三端共用（钱包）

- `GET /api/wallet/balance`
- `POST /api/wallet/payment`
- `POST /api/wallet/recharge`
- `POST /api/wallet/withdraw`
- `GET /api/wallet/transactions`

## 6.2 管理端（资金操作）

- `POST /api/admin/wallet/add-balance`
- `POST /api/admin/wallet/deduct-balance`
- `POST /api/admin/wallet/freeze`
- `POST /api/admin/wallet/unfreeze`
- `GET /api/admin/wallet/operations`

## 6.3 管理端（财务中心）

- `GET /api/admin/financial/overview`
- `GET /api/admin/financial/statistics`
- `GET /api/admin/financial/user-details`
- `GET /api/admin/financial/export`

### 6.4 周期维度统一参数

`periodType: yearly | quarterly | monthly | weekly | daily`

---

## 7. 财务中心指标口径（你点名的全覆盖）

## 7.1 平台级（按 年/季/月/周/日）

1. 总流水 `total_transaction_amount`
2. 退款金额 `total_refund_amount`
3. 赔付金额 `total_compensation_amount`
4. （预留）平台收益 `platform_revenue`

## 7.2 骑手级（按 年/季/月/周/日）

1. 各骑手所得 `user_financial_details.total_income`（`user_type=rider`）
2. 骑手订单数与完成率

## 7.3 商户级（按 年/季/月/周/日）

1. 各商户所得 `user_financial_details.total_income`（`user_type=merchant`）
2. 商户订单规模与退款率

---

## 8. 三端钱包重构要求（必须同步）

## 8.1 用户端 `app-mobile`

- 钱包页改成真实接口数据：可用余额、冻结余额、充值/提现入口、交易明细。
- 下单支付优先走 `POST /api/wallet/payment`。

## 8.2 骑手端 `rider-app`

- 钱包页从静态值改为真实余额。
- 收入页基于 `user_financial_details` 聚合。
- 提现申请/状态跟踪接 `withdraw_requests`。

## 8.3 商户端 `merchant-app`

- 收益卡、结算卡改为真实财务接口。
- 可提现余额、提现申请、资金流水可追踪。

## 8.4 管理端 `admin-vue`

- 财务中心按 5 区块：
  1) 平台概览 2) 退款赔付 3) 骑手榜 4) 商户榜 5) 导出与审计

---

## 9. 安全机制定版（执行级）

1. 交易 ID：你给出的 `TXN + 时间 + 用户后缀 + 随机 + 校验` 方案采用。
2. 乐观锁：`wallet_accounts.version` 强制。
3. 分布式锁：`wallet:lock:{userId}`（Redis SetNX + TTL）。
4. 幂等：请求头 `Idempotency-Key` + 表内唯一约束。
5. 签名：`HMAC-SHA256(transaction_id|user_id|amount|type|timestamp)`。
6. 风控：单笔限额 + 日限额 + 次数限制 + 账户状态 + 黑名单。
7. 限流：BFF 对钱包/支付接口启用 rate limit（当前代码需补真正中间件挂载）。
8. 审计：管理员资金操作必须落 `admin_wallet_operations`。
9. 数据保护：提现账号脱敏展示、密文存储。

---

## 10. 迁移与上线策略（避免一次性爆改）

## Phase 1（先打通）

- 建表 + Go 服务 + BFF 路由
- IF-Pay 支付/退款/提现/管理员加减闭环
- admin-vue 财务中心接真数据

## Phase 2（三端替换）

- 用户/骑手/商户钱包页面由静态改动态
- 订单支付改为 if-pay 主路径

## Phase 3（第三方通道）

- 微信/支付宝充值提现接入
- 回调验签、防重放、对账

## Phase 4（财务增强）

- 日/周/月快照任务
- 异常告警与自动对账

---

## 11. 验收标准（“真通”标准）

1. **链路通**：三端与管理端接口均走 BFF->Go->DB 成功返回。
2. **账实一致**：账户余额 = 成功账本净额。
3. **并发正确**：高并发下无超扣/负余额。
4. **幂等正确**：重复请求不重复入账。
5. **审计完整**：任一流水可追溯操作来源。
6. **报表正确**：财务中心各周期统计与明细抽样一致。

---

## 12. 你这次参考方案与本定版关系

- 你给的核心表和字段：**保留并作为主设计**。
- 我这里额外增强的是：
  - BFF/Go/DB 真实打通路径
  - 三端钱包同步重构清单
  - 幂等、防重放、审计、对账的执行细则
  - 分阶段可交付路线和验收标准

---

## 13. 下一步（建议直接执行）

1. 先实现 Phase 1（if-pay 内核 + 管理端财务 API）
2. 同步接入 `admin-vue` 财务中心真实展示
3. 再推进三端钱包重构

> 说明：这份文档就是“架构冻结稿”，后续代码开发严格按此执行，不再漂移。
