# Infinitech

一个正在持续整治中的一站式本地生活服务平台主仓。

当前目标不是口头承诺“单机十万在线”，而是把现有系统逐步改造成可水平扩展、可压测、可回滚、可观测的生产级架构，让高并发下不会因为单点设计、伪状态、假数据或薄弱的默认配置而直接出问题。

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
- 营销、活动、推荐位
- 地图、短信、微信登录等外部能力

当前仓库已包含外卖、跑腿、医药、公益、会员、同频饭友、客服消息、后台运营等模块，但整体仍处于“持续整治、主链路收口、从可运行走向可生产”的阶段。

## 3. 当前生产基线

已经明确的生产方向：

- 生产数据库：`PostgreSQL`
- 生产缓存与分布式状态：`Redis`
- `SQLite` 仅允许本地开发、临时测试和历史兼容，不再作为生产主链路前提
- 根目录作为唯一主仓
- 每个整治批次都要求：代码改动、验证通过、README 更新、推送 GitHub

RTC 与首页推广的边界也已固定：

- `App / H5`：规划支持站内 `1v1` 音频通话
- `小程序`：不做音频通话，直接显示系统电话
- 首页推广第一阶段：只做“线下谈单 + 后台手工配置”
- 首页推广同时支持“商户位 + 商品位”
- 不做竞价
- 不做按曝光或点击自动扣费
- 不做商户自助投放

## 4. 目录说明

- `backend/go`：Go 主 API，逐步收口为业务事实源
- `backend/bff`：Node.js BFF 与统一代理层
- `socket-server`：唯一实时网关、Socket 事件桥接
- `admin-vue`：管理后台 Web
- `user-vue`：用户端 uni-app
- `app-mobile`：用户 App 端 uni-app
- `merchant-app`：商家端 uni-app
- `rider-app`：骑手端 uni-app
- `shared/mobile-common`：多端共享移动端逻辑
- `backend/docker`：本地基础设施编排
- `backend/shared`：后端共享文件
- `backend/redis`：Redis 相关配置
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

- 收紧了 Socket 聊天身份伪造与越权访问问题
- 收紧了后台鉴权与默认密钥回退问题
- 收紧了高风险删除操作与二次校验链路

### 8.2 配置治理

- 清理了大量开发机内网地址硬编码
- 真正会变化的运营数据和第三方服务参数持续回收至后台配置
- 地图能力已整理为统一后端入口，可继续按配置切换到天地图

### 8.3 主链路补齐

- 手机号改绑链路已打通
- 图形验证码链路已打通
- 邀请码注册与奖励链路已打通
- 用户资料编辑已接入服务端
- 骑手异常上报已打通
- 跑腿、医药等多批“假打通”页面已改成真实接口

### 8.4 地址簿服务端化

- 用户端与 App 端地址列表、地址编辑、默认地址、确认下单已接入真实服务端地址
- 订单创建优先引用服务端地址对象，不再只信本地字符串

### 8.5 消息与客服统一

- 用户端、App 端、商家端、骑手端、后台客服工作台已开始持续收口到服务端会话模型
- `/api/messages/conversations`、历史消息、已读同步已进入主链路
- Socket 层已开始把消息和已读状态同步回 Go 服务
- 骑手直聊消息也已开始同步到 Go 权威消息服务
- 骑手端全局消息管理已移除未使用的本地未读伪状态，消息弹窗、通知与客服入口活跃文案已清理为统一 UTF-8
- 骑手客服页、订单详情弹层、辅助方法与样式文件的活跃乱码已清零，“举报客服”不再假提示已提交，“删除聊天记录”明确为仅清当前会话本地记录
- 后台客服工作台共享逻辑与两张聊天页的活跃乱码已清零，默认假订单种子已移除，优惠券/订单弹窗在无真实数据时改为明确空状态

### 8.6 推送链路推进

- 多端设备注册、反注册和本地状态管理已接入
- `received / opened` 回执链路已接入
- 后台推送统计与投递明细接口已补齐
- 推送 delivery 已可 materialize 为用户级投递明细
- Go 端已补后台 delivery 派发执行器，当前支持 `log` 和 `webhook` provider

### 8.7 首页推广位

- 首页推广规则已经固定为“管理员手工锁位优先，其次付费推广，其次普通今日推荐，最后自然排序”
- 后台推广管理页已重写并可查看商户区、商品区当前生效位次、来源和前台标识
- 相关核心排序规则已有测试覆盖

### 8.8 生产基线硬化

- 生产环境已默认拒绝 `sqlite`
- 生产环境默认只接受 `PostgreSQL`
- 非 `postgres` 生产驱动需显式开启 `ALLOW_LEGACY_PRODUCTION_DB_DRIVER=true`
- `.env.example` 已切换为本地 `PostgreSQL + Redis` 默认路径

### 8.9 本轮新增并发硬化

- BFF 已新增全局 API 限流
- BFF 已新增 JSON / urlencoded 请求体大小限制
- BFF 上传已新增字段和文件数量、大小限制
- BFF HTTP server 已显式设置 request、headers、keep-alive 超时
- BFF 现已支持 Redis 优先的分布式限流，Redis 不可用时自动回退到本地内存限流
- Go API 已切换到 `gin.New()`，避免重复默认中间件开销
- Go API 已增加 trusted proxies、multipart memory 上限、全局请求体限制、全局限流中间件
- Go API 在 Redis 可用时会优先使用 Redis 分布式限流，Redis 不可用时自动回退到单机限流
- `socket-server` 已增加敏感接口固定窗口限流
- `socket-server` 已增加 JSON 和 multipart 请求体上限
- `socket-server` 已增加 HTTP server 超时设置与更紧的 Socket.IO ping / buffer 限制
- `socket-server` 现已支持 Redis 优先的共享 token 会话存储，解决多实例下“发 token 的实例”和“校验 token 的实例”互不认账的问题
- `socket-server` 的 HTTP 敏感接口限流现已支持 Redis 优先的分布式固定窗口限流，Redis 不可用时自动回退到本地内存限流
- `socket-server` 已接入 Socket.IO Redis adapter，多实例下的房间广播和跨实例实时事件同步不再只依赖单机内存
- `socket-server` 在线人数现在会优先走 Redis 共享 presence 统计，Redis 不可用时自动回退到本地计数
- `socket-server` 客服订单房间鉴权缓存现在会优先走 Redis 共享缓存，减少多实例下重复回源 Go 校验
- `socket-server` 骑手命名空间已移除无实际用途的本地 `onlineRiders` 单机状态表
- OpenClaw / SuchPeople 相关 Go 服务、Socket 命名空间、配置和启动脚本入口现已全部移除
- `socket-server` 客服会话列表与消息历史现在改为 Go 权威消息服务优先加载，本地 `chat.db` 仅保留兜底读取
- 用户端与 App 端消息首页现在改为服务端会话列表为准，本地缓存只在接口失败时兜底，不再把本地旧会话和服务端结果混成双事实源
- Go API 与 BFF 现已统一补上 `X-Request-ID`，便于后续压测、审计和故障排查串联日志
- BFF 转发到 Go 时现在会带上真实客户端 IP，便于审计和保护策略

## 9. 当前仍未完成的大项

### 9.1 生产架构硬化

- Go、BFF 与 `socket-server` 已具备 Redis 优先的分布式限流或共享状态能力，但细粒度治理、压测和故障演练还未完成
- 上传链路虽已限流和限体积，但仍偏本地磁盘模式，后续还需要流式存储 / 对象存储抽象
- 结构化日志、请求 ID、关键业务埋点、错误分级、更多 readiness / 依赖自检仍需继续补齐

### 9.2 消息系统彻底统一

- `socket-server/chat.db` 还未完全退出业务事实源角色
- 商家端、骑手端、后台工作台剩余本地伪会话和伪未读还需继续清理
- 会话列表、历史、已读、未读仍需进一步统一成单一服务端口径

### 9.3 推送系统闭环

- 当前已完成设备登记、回执、统计、delivery materialization 和派发执行器
- 当前仍未完成真正的外部推送厂商网关接入
- 当前仍未完成更细粒度的终端送达展示
- 当前仍未完成更完整的失败原因归类和重试观察面板

### 9.4 首页推广位完整落地

- 管理能力已开始落地，但商户位与商品位整套后台工作流仍需继续补完
- 第一阶段继续遵守“手工锁位 + 后台推广计划 + 前台推广标识”的模式

### 9.5 P2P 音频通话

- `App / H5` 规划支持站内 `1v1` 音频通话
- `小程序` 明确不做音频通话，直接显示系统电话
- 当前仍待补服务端信令、关系鉴权、通话元数据、投诉与录音保留策略、后台通话记录面板

### 9.6 高并发能力的剩余差距

- 现在不能对外宣称“万人并发一定不会出问题”
- 这一轮已经补的是明显的默认薄弱点和单机保护层
- Go、BFF 与 `socket-server` 现在都已经具备 Redis 优先的限流或共享状态能力，但全链路仍未完成所有分布式治理
- `socket-server` 已经补上 Redis adapter、共享 token 会话和共享在线人数，但消息持久化事实源仍需继续往 Go 收口
- 真正面向千人、万人级稳定性，还需要继续完成：
- 更细粒度的 Redis 分布式限流
- PostgreSQL 生产部署与连接池压测
- Socket 横向扩展压测与故障演练
- 推送外部供应商接入
- 首页与消息等主链路压测基线

## 10. 首页推广位规则

首页推广第一阶段规则固定如下：

1. 管理员手工锁定位次
2. 已审核且在有效期内的付费推广计划
3. 普通今日推荐
4. 自然排序

推广对象：

- 商户位
- 商品位

支持的定向能力：

- 全局
- 可选城市
- 可选业务分类

明确不做：

- 用户画像定向
- 自动竞价
- 商户自助投放
- 自动扣费

前台要求：

- 所有付费或锁位推广内容统一展示 `推广` 标识

## 11. 配置治理原则

继续遵守以下边界：

- 真正会变化的运营数据放后台配置
- 外部依赖参数放后台配置
- 渠道、电话、链接、地图、短信、微信登录、活动文案等可配置
- 稳定标题和长期不会变化的固定文案不再继续泛化配置化

## 12. 不再接受的旧做法

- 新增假数据
- 新增假成功提示
- 前端本地状态冒充业务事实源
- 把开发机内网地址重新写回默认配置
- 通过修改 `dist`、`unpackage`、日志或数据库文件“修问题”
- 让不同端各自维护分裂的数据口径

## 13. Git 与交付规则

- 根目录作为唯一主仓
- 远端主仓：`https://github.com/HCRXchenghong/infinitech`
- 每一批都要求：功能闭环、验证通过、README 更新、推送 GitHub
- 默认节奏：小批次原子提交，完成即 push

## 14. 下一批优先级

建议继续按这个顺序推进：

1. 商家端 / 骑手端 / 后台消息口径剩余收口
2. 首页商户位 / 商品位后台能力继续补齐
3. Redis 分布式限流与更多服务端保护层
4. 推送外部厂商网关接入与更细投递观察面板
5. `App / H5` 站内 `1v1` 音频通话

## 15. 维护说明

从现在开始，这个仓库只保留这一份总 README。

后续继续整治时：

- 不再新增分散 Markdown
- 直接维护这份 `README.md`
- 已完成项写入“已完成的关键整治”
- 未完成项写入“当前仍未完成的大项”和“下一批优先级”
