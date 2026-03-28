# Infinitech

一套持续整治中的一站式本地生活服务平台主仓。

当前目标不是口头承诺“单机 10 万在线”，而是把现有系统逐步收敛成可水平扩展、可压测、可回滚、可观测的生产级架构，尽量消除单点设计、伪状态、假数据和脆弱默认配置带来的系统性风险。

## 1. 项目范围

当前主整治范围：

- `backend/go`
- `backend/bff`
- `socket-server`
- `admin-vue`
- `user-vue`
- `app-mobile`
- `merchant-app`
- `rider-app`

当前保留但不作为主整治范围：

- `android-user-app`
- `ios-user-app`
- `admin-app`
- 历史示例、原型和非主链路目录

## 2. 平台定位

平台目标是做一个多端协同的一站式生活服务系统，覆盖：

- 用户消费端
- 商家经营端
- 骑手履约端
- 管理后台
- 实时客服与消息
- 推送通知
- 财务、积分、会员
- 营销、活动、首页推广位
- 地图、短信、微信登录等外部能力

当前仓库已包含外卖、跑腿、医药、公益、会员、同频饭友、客服消息、后台运营等模块，但整体仍处于“持续整治、主链路收口、从可运行走向可生产”的阶段。

## 3. 当前生产基线

已明确的生产方向：

- 生产数据库：`PostgreSQL`
- 生产缓存与分布式状态：`Redis`
- `SQLite` 仅允许本地开发、临时测试和历史兼容，不再作为生产主链路前提
- 根目录作为唯一主仓
- 每个整治批次都要求：代码改动、验证通过、README 更新、推送 GitHub

RTC 与首页推广边界：

- `App / H5`：规划支持站内 `1v1` 音频通话
- `小程序`：不做音频通话，直接显示系统电话
- 首页推广第一阶段：只做“线下谈单 + 后台手工配置”
- 首页推广同时支持“商户位 + 商品位”
- 不做竞价
- 不做按曝光或点击自动扣费
- 不做商户自助投放

## 4. 目录说明

- `backend/go`：Go 主 API，持续收口为业务事实源
- `backend/bff`：Node.js BFF 与统一代理层
- `socket-server`：唯一实时网关与 Socket 事件桥接层
- `admin-vue`：管理后台 Web
- `user-vue`：用户端 uni-app
- `app-mobile`：用户 App 端 uni-app
- `merchant-app`：商家端 uni-app
- `rider-app`：骑手端 uni-app
- `shared/mobile-common`：多端共享移动端逻辑
- `backend/docker`：本地基础设施编排
- `scripts`：仓库级脚本
- `.github`：CI 与工作流

## 5. 技术栈

后端：

- Go
- Gin
- GORM
- PostgreSQL
- Redis

BFF 与网关：

- Node.js
- Express
- Axios

前端：

- Vue 3
- Element Plus
- uni-app
- Vite

实时能力：

- Socket.IO
- WebSocket

## 6. 本地启动

### 6.1 Go API

```powershell
cd backend/go
go test ./...
go build ./cmd
go run ./cmd
```

### 6.2 BFF

```powershell
cd backend/bff
npm install
npm test -- --runInBand
npm run lint
npm run dev
```

### 6.3 管理后台

```powershell
cd admin-vue
npm install
npm run build
npm run dev
```

### 6.4 uni-app 多端

`user-vue`、`app-mobile`、`merchant-app`、`rider-app` 当前仍以源码级整治为主，实际运行依赖 HBuilderX / uni 构建链路。

## 7. 统一验证基线

每个整治批次至少要求通过：

```powershell
cd backend/go
go test ./...
go build ./cmd

cd ../bff
npm test -- --runInBand
npm run lint

cd ../../admin-vue
npm run build
```

当前已知但非阻断的构建告警：

- `admin-vue` 仍有 `sql.js` browser externalize 警告
- `admin-vue` 仍有大 chunk 警告

## 8. 已完成的关键整治

### 8.1 安全与鉴权

- 收紧了 Socket 聊天身份伪造与越权访问问题。
- 收紧了后台鉴权与默认密钥回退问题。
- 收紧了高风险删除操作与二次校验链路。

### 8.2 配置治理

- 清理了大量开发机内网地址硬编码。
- 真正会变化的运营数据和第三方服务参数持续回收到后台配置。
- 地图能力已收敛为统一后端入口，后续可继续按配置切换到天地图。

### 8.3 主链路补齐

- 手机号改绑链路已打通。
- 图形验证码链路已打通。
- 邀请码注册与奖励链路已打通。
- 用户资料编辑已接入服务端。
- 骑手异常上报已打通。
- 跑腿、医药等多批“假打通”页面已改成真实接口。

### 8.4 地址簿服务端化

- 用户端与 App 端地址列表、地址编辑、默认地址、确认下单已接入真实服务端地址。
- 订单创建优先引用服务端地址对象，不再只信本地字符串。

### 8.5 消息与客服统一

- Go 消息历史接口已返回权威 `timestamp / createdAt`。
- `socket-server` 的实时消息、历史兜底和发送回执已统一透传 `timestamp / createdAt / time`。
- 用户端、App 端、商家端、骑手端、后台客服工作台都已持续收口到服务端会话模型。
- 多端消息首页已改成“服务端会话为准，本地缓存仅失败兜底”。
- 多端聊天页已改成“服务端历史成功即覆盖，本地缓存只做失败回退”。
- 骑手直聊消息已同步回 Go 权威消息服务。
- 后台客服工作台和骑手客服页已移除一批本地伪状态与假数据。
- 消息时间戳继续往服务端口径收紧，减少 `Date.now()` 伪造历史时间造成的排序漂移。
- `socket-server` 本地 `chat.db` 已新增 `event_timestamp`，本地回退时也尽量按原始消息时间排序。
- `socket-server /api/stats` 与后台首页已接入 Redis 在线样本展示。
- 本轮继续统一了双端聊天页、商家聊天页、骑手实时消息桥和 `socket-server` 本地兜底层对 `createdAt` 字符串的解析，并把历史消息 fallback ID 改成稳定格式，继续减少排序抖动和重复渲染。
- 本轮继续把骑手客服页、双端客服页和后台客服工作台里的临时消息 ID 改成稳定生成器，进一步降低 ack 匹配和本地重试阶段因裸时间戳冲突带来的误判风险。
- 本轮继续把会话列表 fallback ID、骑手实时消息 fallback ID、后台客服接收消息 fallback ID、双端客服接收消息 fallback ID 统一成基于会话/发送方/时间的稳定生成规则，进一步减少重连、补历史和回执对齐时的错乱风险。

### 8.6 推送链路推进

- 多端设备注册、反注册和本地注册状态管理已接入。
- `received / opened` 回执链路已接入。
- 后台推送统计与投递明细接口已补齐。
- 推送 delivery 已可 materialize 为用户级投递明细。
- Go 端已补后台 delivery 派发执行器，当前支持 `log` 和 `webhook` provider。

### 8.7 首页推广位

- 首页推广规则已固定为“管理员手工锁位优先，其次付费推广，再次普通今日推荐，最后自然排序”。
- 后台推广管理页已可查看商户区、商品区当前生效位次、来源和前台标识。
- 相关核心排序规则已有测试覆盖。

### 8.8 生产基线硬化

- 生产环境默认拒绝 `sqlite`。
- 生产环境默认只接受 `PostgreSQL`。
- 非 `postgres` 生产驱动必须显式开启 `ALLOW_LEGACY_PRODUCTION_DB_DRIVER=true`。
- `.env.example` 已切换为本地 `PostgreSQL + Redis` 默认路径。

### 8.9 并发与实时底座

- BFF 已新增全局 API 限流。
- BFF 已新增 JSON / urlencoded 请求体大小限制。
- BFF 上传已新增字段、文件数量和大小限制。
- BFF HTTP server 已显式配置 request、headers、keep-alive 超时。
- BFF 已支持 Redis 优先的分布式限流，Redis 不可用时自动回退到本地限流。
- Go API 已切换到 `gin.New()`，并补齐 trusted proxies、multipart memory 上限、全局请求体限制和全局限流中间件。
- Go API 在 Redis 可用时优先使用 Redis 分布式限流，Redis 不可用时自动回退到单机限流。
- `socket-server` 已新增敏感接口固定窗口限流。
- `socket-server` 已新增 JSON 和 multipart 请求体上限。
- `socket-server` 已新增 HTTP server 超时设置与更紧的 Socket.IO ping / buffer 限制。
- `socket-server` 已支持 Redis 优先的共享 token 会话存储。
- `socket-server` 的 HTTP 敏感接口限流已支持 Redis 优先的分布式固定窗口限流。
- `socket-server` 已接入 Socket.IO Redis adapter。
- `socket-server` 在线人数与 presence 样本已优先走 Redis 共享状态。
- `socket-server` 客服订单房间鉴权缓存已优先走 Redis 共享缓存。
- `socket-server` 骑手命名空间已移除无实际价值的本地 `onlineRiders` 单机状态。
- OpenClaw / SuchPeople 相关 Go 服务、Socket 命名空间、配置和脚本入口已全部移除。
- Go API 与 BFF 已统一补上 `X-Request-ID`。
- BFF 转发到 Go 时会带上真实客户端 IP。
- BFF 与 `socket-server` 已补齐 `/ready` 探针：BFF 会校验 Go API 就绪状态，`socket-server` 会显式暴露 Redis 就绪状态，便于发布探活、编排与巡检。
- 后台系统日志里的服务状态面板已优先按 `/ready` 探针判断 BFF 与 Go API，就绪失败才回退 `/health`，运维看到的状态更接近真实可接流量状态。
- 后台系统日志现已把 `socket-server` 纳入核心服务状态面板；`socket-server/.env.example` 里的历史内网地址示例也已清理回本机安全默认值。

## 9. 当前仍未完成的大项

### 9.1 生产架构硬化

- Go、BFF 与 `socket-server` 虽已具备 Redis 优先的分布式限流或共享状态能力，但细粒度治理、压测和故障演练仍未完成。
- 上传链路虽已限流和限体积，但仍偏本地磁盘模式，后续还需要流式存储 / 对象存储抽象。
- 结构化日志、错误分级、readiness、依赖自检、关键埋点仍需继续补齐。

### 9.2 消息系统彻底统一

- `socket-server/chat.db` 还未完全退出业务事实源角色。
- 骑手端、后台工作台剩余本地未读和零散辅助状态还需继续清理。
- 会话列表、历史、已读、未读仍需进一步统一成单一服务端口径。

### 9.3 推送闭环

- 当前已完成设备登记、投递明细和派发执行器，但离完整生产级推送平台仍有距离。
- 真正的外部供应商接入、失败重试策略细化、投递监控面板和压测仍需继续补齐。

### 9.4 首页推广位

- 后台规则和位次能力已具备，但首页编排结果仍需继续压缩前端本地拼装逻辑。
- 城市 / 业务分类定向能力、推广计划审核流和投放运营面板仍需继续完善。

### 9.5 RTC / 电话联系

- `App / H5` 的站内 1v1 音频通话仍未落地到完整服务端信令、录音保留与投诉冻结流程。
- 小程序侧仍按既定方案保留系统电话，不做 RTC。

### 9.6 平台治理

- 压测基线、容量评估、降级策略、回滚剧本仍未完成。
- 原生 Android / iOS 端当前仅保留，不作为主整治范围，但后续若要进入生产交付仍需单独治理。

## 10. 当前执行原则

- 只保留一个实时服务：`socket-server`
- 只保留一个总文档：根目录 `README.md`
- 继续删除活跃主链路中的假数据、假成功提示和可见乱码
- 稳定标题和长期不会变化的固定文案不再继续配置化
- 每个批次完成后必须：
  - 更新代码
  - 跑验证
  - 更新 README
  - 提交并推送 GitHub

## 11. 当前下一步优先级

下一批继续按以下顺序推进：

1. 继续收 `socket-server` 和多端消息里的本地 fallback 尾巴
2. 把消息事实源继续往 Go 权威源收紧
3. 继续补推送闭环与派发监控
4. 继续完善首页推广位后台能力和前台编排
5. 继续补平台级可观测性、压测和故障治理

## 12. Recent Rollout Notes

- 2026-03-28: `socket-server` now assigns and returns `X-Request-ID` on HTTP requests, propagates the same header to internal Go API calls, and starts correlating support/rider message sync plus order-room authorization with shared request ids for cross-service tracing.
- 2026-03-28: the admin system log service-status panel now preserves `/ready` response details from BFF / Go API / socket-server so launch checks can see dependency failures like `go api not ready`, `database not ready`, or `redis not ready` instead of only generic up/down states.
- 2026-03-28: Go `POST /api/messages/sync` now returns authoritative message timestamps and ids more completely, and `socket-server` uses that response to override support/rider realtime message acks and broadcasts, reducing reliance on local send-time facts.
- 2026-03-28: `socket-server` message creation now uses stable local `uid` values as the primary realtime message id instead of SQLite row ids, so live sends, acks, local fallback history, and Go sync all align on the same message identity more often.
- 2026-03-28: when `socket-server` successfully loads support message history from Go, it now rewrites the local `chat.db` fallback history with that authoritative result, so later fallback reads are less likely to drift behind the server-side message source.
- 2026-03-28: after support/rider realtime sends receive the authoritative Go sync response, `socket-server` now reconciles the just-written local `chat.db` row in place as well, so fallback history picks up server-side timestamps and ids without waiting for a later history reload.
- 2026-03-28: the user/app customer-service pages now stamp local sending placeholders with explicit `timestamp / createdAt / time` and also absorb authoritative `createdAt` from realtime acks, reducing visible ordering jitter before server history reloads.
- 2026-03-28: the legacy `socket-server /api/messages` HTTP bridge has been removed; active message history and sync now go through the Go `/api/messages/*` contract plus the single `socket-server` realtime gateway, reducing parallel message entry points.
