# Infinitech

`Infinitech` 是一个正在持续工程化整治的一站式本地生活服务平台主仓，覆盖用户端、商家端、骑手端、管理后台、消息客服、推送通知、财务、会员、营销、地图、短信、登录鉴权等核心链路。

当前目标不是口头承诺“单机 10 万在线”，而是把现有系统持续收口成一套可水平扩展、可压测、可回滚、可观测、可发布的生产架构，尽量消除单点设计、伪状态、假数据、历史脏逻辑和脆弱默认配置带来的系统性风险。

## 1. 仓库范围

当前主整治范围：

- `backend/go`
- `backend/bff`
- `socket-server`
- `admin-vue`
- `user-vue`
- `app-mobile`
- `merchant-app`
- `rider-app`
- `shared/mobile-common`

保留但暂不作为当前主整治范围：

- `android-user-app`
- `ios-user-app`
- `admin-app`
- 历史原型、示例和非主链路目录

## 2. 平台定位

平台目标是做一个多端协同的一站式生活服务系统，当前仓库已经覆盖：

- 用户消费端
- 商家经营端
- 骑手履约端
- 管理后台
- 实时客服与消息
- 推送通知
- 财务、积分、会员
- 营销、活动、首页推广位
- 地图、短信、微信登录等外部能力

## 3. 当前生产基线

明确基线如下：

- 生产数据库：`PostgreSQL`
- 生产缓存与分布式状态：`Redis`
- 唯一实时服务：`socket-server`
- 业务事实源：`backend/go`
- 外层聚合与准入：`backend/bff`

明确边界如下：

- `SQLite` 仅允许本地开发、临时测试和短期 fallback，不再作为生产主链路前提
- 只保留一个实时服务，不再引入第二套 `socket` 服务
- OpenClaw 已从主系统移除
- 小程序不做 RTC 音频通话，直接走系统电话
- `App / H5` 后续才承载站内 `1v1` 音频通话
- 首页推广第一阶段不做竞价、不做自动扣费、不做商户自助投放

## 4. 核心目录说明

- `backend/go`：Go 业务 API 与业务事实源
- `backend/bff`：Node.js BFF 与统一代理层
- `socket-server`：唯一实时网关与 Socket 事件层
- `admin-vue`：管理后台 Web
- `user-vue`：用户端 uni-app
- `app-mobile`：用户 App 端 uni-app
- `merchant-app`：商家端 uni-app
- `rider-app`：骑手端 uni-app
- `shared/mobile-common`：多端共享逻辑
- `backend/docker`：本地基础设施编排
- `scripts`：发布巡检、压测、辅助脚本
- `.github/workflows`：CI 工作流

## 5. 已完成的关键整治

### 5.1 架构与运行基线

- 根目录已收口为唯一主仓
- 生产数据库基线已收紧为 `PostgreSQL + Redis`
- Go、BFF、`socket-server` 均具备 `/health` 与 `/ready`
- 只保留一个实时服务：`socket-server`
- Go、BFF、`socket-server` 已补齐 `X-Request-ID`
- Go、BFF、`socket-server` 已补基础限流、请求体限制、超时和慢请求预警
- 发布巡检脚本 `scripts/release-preflight.mjs` 已落地
- 并发烟测脚本 `scripts/http-load-smoke.mjs` 已落地
- `socket-server` 已纳入 CI smoke-check

### 5.2 消息系统收口

- Go 消息表持续作为权威消息事实源
- 用户端、App 端、商家端、骑手端、后台客服工作台持续向“服务端优先，本地只兜底”收口
- 用户端与 App 端客服页已改成先建服务端会话、拉服务端历史、同步已读，不再进页注入假欢迎语
- 用户端与 App 端主聊天页也已停止在“无历史消息”时注入欢迎语，空会话只展示真实服务端历史或受控本地兜底
- 用户端与 App 端主聊天页、客服页的“清空聊天记录”假删除动作已收口为真实留存提示
- 后台客服工作台本地 unread 已收紧成“仅临时提示，权威数量等服务端回拉”，减少本地自增漂移
- 后台客服工作台收到实时新消息时已不再本地伪造 unread 数量，切会话已读后也不再在服务端回拉失败时强行本地清零整列会话
- 后台客服工作台现在会拒绝让迟到的旧实时消息回滚会话摘要、最后时间和排序，进一步减少多端乱序事件导致的会话列表漂移
- 用户端与 App 端消息首页本地会话缓存已继续去字段化，只保留必要标识和 `updatedAt`
- 用户端与 App 端消息首页在会话已读成功后，已不再因为后续回拉失败而本地强行清零 unread
- 用户端、App 端、商家端、骑手端和后台客服工作台在已经拿到服务端历史/摘要后，后续短时请求失败时已不再被旧本地缓存反向覆盖
- 商家聊天页本地消息缓存已继续缩成最小快照，只保留必要字段，不再缓存展示态时间
- `message_sent / message_read / all_messages_read` 已按 `chatId` 收口，减少串会话污染
- 消息时间字段、fallback ID、临时消息 ID 持续统一到稳定规则
- 骑手端本地 SQLite fallback ID 已补强为包含发送方、类型和时间戳的稳定组合，降低高频消息碰撞风险
- 商家端与用户双端聊天页的 fallback ID 也已补齐到同一档稳定规则，减少无显式消息 ID 时的本地碰撞
- `socket-server` 旧的 `/api/messages` HTTP 桥已移除，HTTP 消息契约只认 Go `/api/messages/*`
- `chat.db` 已继续降级为短期 emergency buffer，并进一步收紧为默认每会话 200 条、默认保留 14 天；客服会话列表已不再从本地 fallback 生成
- `socket-server` 在缺少认证信息时已不再回退读取本地客服历史，避免未鉴权状态继续消费旧 fallback 数据
- `socket-server` 默认关闭客服历史 fallback 时，客服发送、历史回写、已读同步和清空会话也不再维护本地 SQLite 状态，进一步把 `chat.db` 收成显式开关下的应急缓冲
- `socket-server` 的骑手直聊转发也不再先把消息落进服务端本地 SQLite 再同步 Go，而是直接以瞬时消息体同步权威消息服务后广播，继续削弱 `chat.db` 的事实源角色
- 双端主聊天页、双端客服页、商家聊天页、骑手客服页和后台客服工作台已经停止依赖 `load_messages / messages_loaded` 这条旧 socket 历史拉取路径，默认历史只认 HTTP 服务端消息接口，socket 只保留实时增量和回执
- 双端消息首页读取旧格式本地会话缓存时也会先归一化并清零未读，避免历史缓存把服务端摘要、排序和红点口径再次带偏

### 5.3 主链路去假数据

- 地址簿已补成服务端能力，订单引用服务端地址
- 大量活跃页面中的本地假数据、假成功提示、假状态和可见乱码已持续清理
- 骑手客服页等高频入口里的“建设中 / 假清空”这类占位动作已继续收口为真实平台提示
- 多端消息、客服、首页、会员、公益、医药、骑手保障等活跃页面已明显收口
- 商家端与骑手端 `sync.ts` 现已补齐版本回退保护、响应归一化落库和 `preferFresh` 选项，继续降低陈旧本地缓存反向带偏线上数据的风险

### 5.4 推送链路

- 设备注册已接入多端启动与登出流程
- 推送记录、投递明细、统计接口、派发 worker 已具备基础能力
- 后台能查看消息级和收件人级投递明细
- Go readiness 与 BFF 健康聚合已能反映 push worker 运行状态、最近成功时间、连续失败次数与队列积压
- 推送队列快照现已暴露：
  - `oldestQueuedAt`
  - `oldestQueuedAgeSeconds`
  - `oldestRetryPendingAt`
  - `oldestRetryPendingAgeSeconds`
  - `oldestDispatchingAt`
  - `oldestDispatchingAgeSeconds`
  - `latestSentAt`
  - `latestFailedAt`
  - `latestAcknowledgedAt`
- 发布巡检已会阻断：
  - push worker 未运行
  - push worker 最近周期失败
  - 队列总量过大
  - 最老排队年龄过大
  - 最老重试年龄过大

### 5.5 首页推广位

- 后台已具备首页推广计划与位次管理能力
- 已支持商户位与商品位
- 已支持管理员手工锁位优先于付费推广，再优先于普通今日推荐

### 5.6 运维与发布可观测性

- 后台首页与系统日志页已持续接入 readiness、Redis 模式、fallback、push worker 信号
- 后台监控已移除失效的“列表回退 / 历史回写”统计项，只保留真实仍在生效的 fallback buffer 与 readiness 信号
- `socket-server` 已能暴露 Redis adapter 是否真实启用，而不是只看 Redis 是否连上
- 发布前可以串行执行：
  - 健康检查
  - readiness 校验
  - 推送队列信号校验
  - socket fallback 风险校验
  - HTTP 并发烟测

## 6. 当前仍未完成的重点

下面这些是真正还没完成、上线前必须继续收的部分。

### 6.1 消息系统尾巴

- `socket-server/chat.db` 仍保留短期 fallback 角色，但当前已主要退到“消息历史应急缓冲”，还没彻底退出消息事实源链路
- 骑手端、后台工作台、商家端仍有少量本地辅助状态尚未完全去事实源化
- 会话摘要、未读汇总和 fallback 行为还需要继续统一到服务端口径

### 6.2 推送闭环尾巴

- 当前推送 provider 仍以 `log / webhook` 为主，距离完整生产级外部推送平台还有距离
- 外部供应商接入、失败治理细化、派发压测和更完整的运维面板仍需补齐

### 6.3 RTC / 电话联系

- `App / H5` 的站内 `1v1` 音频通话还没有完整落到服务端信令、录音保留和投诉冻结流程
- 小程序继续按既定边界只走系统电话

### 6.4 首页推广位尾巴

- 后台规则已具备，但前台首页编排仍需继续收口，减少本地拼装和历史兼容逻辑
- 用户端与 App 端独立“今日推荐”页已改为直接复用统一 `home/feed` 编排结果，不再分别走 `featured-products` 和 `today-recommended shops` 两套老接口
- 城市 / 分类定向、运营面板和完整审核流仍需继续完善

### 6.5 平台治理

- 压测基线、容量评估、降级策略、回滚脚本和故障演练还没全部收完
- Android / iOS 原生当前只保留，不属于本阶段主整治范围

## 7. 上线前必须执行的验证

### 7.1 后端与后台

在 `backend/go` 执行：

```powershell
go test ./...
go build ./cmd
```

在 `backend/bff` 执行：

```powershell
cmd /c npm test -- --runInBand
cmd /c npm run lint
```

在 `admin-vue` 执行：

```powershell
cmd /c npm run build
```

在 `socket-server` 执行：

```powershell
cmd /c npm run check
```

### 7.2 发布前巡检

```powershell
node scripts/release-preflight.mjs
```

当前会检查：

- `BFF /ready`
- `Go /ready`
- `socket-server /ready`
- `socket-server /api/stats`
- 可选认证态 `BFF /api/system-health`
- socket fallback buffer 是否异常膨胀
- push worker 是否运行、是否最近失败、是否队列积压过高
- push worker 连续失败次数是否超阈值
- 最近成功时间是否已陈旧
- 最老排队年龄是否超阈值
- 最老重试年龄是否超阈值
- 可选触发 HTTP 并发烟测，并把 error rate / p95 阈值纳入发布阻断

### 7.3 并发烟测

```powershell
node scripts/http-load-smoke.mjs
```

可通过环境变量调整：

- `BFF_BASE_URL`
- `GO_API_URL`
- `SOCKET_SERVER_URL`
- `LOAD_CONCURRENCY`
- `LOAD_REQUESTS_PER_TARGET`
- `LOAD_TIMEOUT_MS`
- `LOAD_MAX_ERROR_RATE`
- `LOAD_MAX_P95_MS`
- `PREFLIGHT_MAX_PUSH_CONSECUTIVE_FAILURES`
- `PREFLIGHT_MAX_PUSH_SUCCESS_STALE_MS`
- `PREFLIGHT_MAX_PUSH_QUEUE_AGE_MS`
- `PREFLIGHT_MAX_FALLBACK_AGE_MS`

## 8. 当前运行规则

- 只保留一个实时服务：`socket-server`
- 只保留一个总文档：根目录 `README.md`
- 活跃主链路继续删除假数据、假状态、假成功提示
- 稳定标题和长期不会变化的固定文案，不再泛化为后台配置
- 只有真正会运营调整的数据继续配置化：密钥、渠道、电话、链接、地图、短信、微信、活动文案、推广计划、运营数据
- 每个整治批次都必须做到：
  - 代码改动
  - 验证通过
  - 更新 `README.md`
  - 提交并推送 GitHub

## 9. 当前下一步优先级

按当前上线优先级，后续继续按这个顺序推进：

1. 继续压缩 `socket-server/chat.db` 的事实源角色
2. 继续把消息会话摘要、未读汇总和本地 fallback 收回 Go 权威源
3. 继续补齐推送链路的外部 provider、失败治理和观测能力
4. 继续完善首页推广位前台编排和运营面板
5. 继续补齐压测、降级、回滚和故障演练基线
6. 最后再进入完整上线检查和灰度准备

## 10. 真实状态说明

这个仓库已经明显从“很多链路是假打通、假状态、本地模拟”的阶段往前推进了很多，但现在还不能诚实地说“全部优化完成”。

更准确的状态是：

- 主链路已经比之前稳定很多
- 上线前基线已经越来越像正式平台
- 但消息事实源最终收口、完整推送平台、RTC、完整压测与故障演练仍未全部完成

所以当前策略不是停止，而是继续按本 README 的优先级往下收，直到真正达到可控上线标准。

## 11. Latest Update

- `socket-server` now purges server-local fallback history on startup whenever `SOCKET_ENABLE_HISTORY_FALLBACK=false`.
- Dashboard, system-health aggregation, and release preflight now expose that disabled cleanup explicitly, instead of relying on stale fallback runtime counters.
