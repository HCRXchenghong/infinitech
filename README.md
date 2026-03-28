# Infinitech

一个持续整治中的一站式本地生活服务平台主仓。

当前目标不是口头承诺“单机 10 万在线”，而是把现有系统持续收口成可水平扩展、可压测、可回滚、可观测、可发布的生产架构，尽量消除单点设计、伪状态、假数据、脆弱默认配置和历史遗留带来的系统性风险。

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

仓库当前已经包含外卖、跑腿、医药、公益、会员、同频饭友、客服消息、后台运营等模块，但整体仍处于“持续整治、主链路收口、从可运行走向可生产”的阶段。

## 3. 当前生产基线

明确的生产方向：

- 生产数据库：`PostgreSQL`
- 生产缓存与分布式状态：`Redis`
- 唯一实时服务：`socket-server`
- 业务事实源：`backend/go`
- BFF 角色：统一代理、聚合与外层准入，不再承载第二套实时服务

明确边界：

- `SQLite` 只允许本地开发、临时测试和短期 fallback，不再作为生产主链路前提
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
- `scripts`：仓库级发布、巡检、压测脚本
- `.github/workflows`：CI 工作流

## 5. 已完成的关键整治

### 5.1 架构与运行基线

- 根目录已收口为唯一主仓
- 生产数据库基线已收紧为 `PostgreSQL + Redis`
- Go、BFF、`socket-server` 已具备基础 `/health` 与 `/ready`
- 只保留一个实时服务：`socket-server`
- OpenClaw 相关链路已从主系统中清理
- Go、BFF、`socket-server` 已补齐 `X-Request-ID` 透传
- BFF、Go、`socket-server` 已补基础请求大小限制、超时和限流
- 仓库已补发布巡检脚本与 HTTP 并发烟测脚本

### 5.2 消息系统收口

- Go 消息表持续作为权威消息事实源
- 用户端、App 端、商家端、骑手端、后台客服工作台持续往“服务端优先、本地只兜底”收口
- `socket-server` 已把多条消息同步、已读同步、会话回写继续往 Go 权威源靠拢
- 多端 `message_sent / message_read / all_messages_read` 已按 `chatId` 收口，减少串会话污染
- 多端消息时间字段、fallback ID、临时消息 ID 持续统一到稳定规则
- `socket-server` 旧的 `/api/messages` HTTP 桥已移除，HTTP 消息契约只认 Go `/api/messages/*`
- 后台客服工作台的 `chatConsoleHelpers.js` 与 `useChatConsole.js` 已重写成干净 UTF-8，会话摘要 fallback、时间解析、上传/发券/发单提示和免打扰提示已恢复正常中文，并继续保持服务端会话优先

### 5.3 主链路去假数据

- 地址簿已补成服务端能力，订单引用服务端地址
- 大量活跃页面中的本地假数据、假成功提示、假状态和乱码已清理
- 商家、用户、骑手、后台多端活跃消息链路已持续去掉多余本地双写
- 首页、客服、会员、公益、医药等多块运营型页面已收成可维护状态

### 5.4 推送链路

- 设备注册已接入多端启动与退出登录流程
- 推送记录、投递明细、统计接口、派发 worker 已具备基础能力
- 后台能查看消息级和收件人级投递统计与明细
- Go readiness 与 BFF 健康聚合已能反映 push worker 运行状态、最近成功时间、连续失败次数与队列积压

### 5.5 首页推广位

- 后台已具备首页推广计划与位次管理能力
- 已支持商户位与商品位
- 已支持管理员手工锁位优先、推广计划优先于普通今日推荐的规则

### 5.6 运维与发布基线

- 发布巡检脚本 `scripts/release-preflight.mjs` 已落地
- `socket-server` 已纳入 CI smoke-check
- 发布前巡检可串行触发 `scripts/http-load-smoke.mjs`
- `admin-vue` 已做稳定的 vendor chunk 分包
- 后台首页已能直观看到 `socket-server` fallback 命中、历史回写次数、Redis adapter 模式与在线样本
- `socket-server` 上传链路已改为流式 multipart 解析，不再整包读入内存
- Go、BFF、`socket-server` 已补慢请求预警基线

## 6. 当前仍未完成的重点

下面这些是真正还没完成、上线前必须继续收的部分。

### 6.1 消息系统尾巴

- `socket-server/chat.db` 仍保留短期 fallback 角色，还没有彻底退出消息事实源链路
- 骑手端、后台工作台、商家端仍有少量本地辅助状态尚未完全去事实源化
- 会话摘要、未读汇总、fallback 行为还需要继续统一到服务端口径

### 6.2 推送闭环尾巴

- 当前推送 provider 仍以 `log / webhook` 为主，距离完整生产级外部推送平台还有距离
- 外部供应商接入、失败重试策略细化、派发压测和更完整的运维面板仍需补齐

### 6.3 RTC / 电话联系

- `App / H5` 的站内 `1v1` 音频通话还没有完整落地到服务端信令、录音保留、投诉冻结流程
- 小程序仍按既定边界只走系统电话

### 6.4 首页推广位尾巴

- 后台规则已具备，但前台首页编排仍需继续收口，减少本地拼装和历史兼容逻辑
- 城市 / 分类定向、运营面板和完整审核流仍需继续完善

### 6.5 平台治理

- 压测基线、容量评估、降级策略、回滚剧本还没有全部收完
- 原生 Android / iOS 当前只是保留，不属于这一阶段的主整治范围

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
- push worker 连续失败次数是否超阈值、最近成功时间是否已陈旧
- 可选触发 HTTP 并发烟测，并把 error rate / p95 阈值纳入发布阻断

### 7.3 并发基线烟测

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

这个脚本当前用于快速打基线，不等同于完整生产压测，但能在发布前尽快暴露 readiness、stats 和基础入口的吞吐或延迟异常。

如果要把并发烟测直接并入发布巡检，可额外设置：

- `PREFLIGHT_RUN_HTTP_LOAD_SMOKE=true`
- `LOAD_CONCURRENCY`
- `LOAD_REQUESTS_PER_TARGET`
- `LOAD_TIMEOUT_MS`
- `LOAD_MAX_ERROR_RATE`
- `LOAD_MAX_P95_MS`
- `PREFLIGHT_MAX_PUSH_QUEUE_AGE_MS`
- `PREFLIGHT_MAX_FALLBACK_AGE_MS`

## 8. 当前运行规则

- 只保留一个实时服务：`socket-server`
- 只保留一个总文档：根目录 `README.md`
- 活跃主链路继续删假数据、假状态、假成功提示
- 稳定标题和长期不会变化的固定文案，不再继续泛化为后台配置
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

## 10. Recent Rollout Notes

- 2026-03-29：后台 `Dashboard.vue` 已重写成干净 UTF-8，天气卡片、IM 状态、在线样本、排名面板和运行探针文案已恢复正常中文。
- 2026-03-29：`socket-server` 的 fallback 缓冲策略已继续参数化，`SOCKET_FALLBACK_CHAT_HISTORY_LIMIT`、`SOCKET_FALLBACK_CHAT_RETENTION_MS`、`SOCKET_READY_MAX_FALLBACK_CHATS` 可直接用于上线前收紧 `chat.db` 兜底边界。
- 2026-03-29：后台 `dashboardHelpers.js` 与 `SystemLogs.vue` 已清理活跃乱码，运维面板能直接展示 readiness、Redis、fallback 和 push worker 细节。
- 2026-03-29：`scripts/release-preflight.mjs` 已继续加严，会阻断 socket fallback 异常膨胀、push worker 失效或积压失控的发布。
- 2026-03-29：新增 `scripts/http-load-smoke.mjs`，用于发布前快速做 readiness / stats 的并发烟测。
- 2026-03-29：`socket-server` readiness、stats 和后台首页已能直接看到 Redis adapter 是否真实启用，而不是只看 Redis 是否连接。
- 2026-03-29：`socket-server/chat.db` 已继续收紧为短期 emergency buffer，增加启动裁剪、按会话上限裁剪和 fallback 统计暴露。
- 2026-03-29：多端消息已继续按 `chatId` 过滤 `message_sent / message_read / all_messages_read`，减少串会话污染。
- 2026-03-29：双端消息首页和聊天页继续保持“服务端优先，本地只兜底”的上线口径。
- 2026-03-29：后台、用户端、商家端、骑手端的消息回执和已读链路已继续按服务端权威时间与会话上下文收紧。
- 2026-03-29：后台客服工作台 `chatConsoleHelpers.js` 与 `useChatConsole.js` 已清理活跃乱码，会话摘要 fallback、时间解析和操作提示已恢复正常中文。
- 2026-03-29：推送 worker 队列快照已补上最老排队时间 / 排队年龄 / 派发年龄，Go `/ready`、发布巡检与后台系统日志能更早识别“队列还活着但已经积压过久”的风险。
- 2026-03-29：`socket-server` fallback buffer 已补上最老消息年龄，`/ready` 与发布巡检会同时拦截“buffer 条数过大”和“buffer 虽不大但已经堆得过久”的两类风险。
- 2026-03-29：后台系统日志页与监控辅助文案继续清理，`fallback 最老年龄` 已能在健康聚合与系统日志页直接看到，方便上线前值班判断是否只是数量不大但已经积压过久。
- 2026-03-29：用户端与 App 端首页、首页分类配置已继续清理活跃乱码，定位、天气、分类跳转和首页编排错误提示都已恢复正常中文。
- 2026-03-29：骑手保障页和骑手任务详情继续清理开发态默认文案，终端默认展示已改成可发布口径，不再直接暴露“待配置”类施工提示。

## 11. 诚实状态说明

这个仓库已经从“很多链路是假打通、假状态、本地模拟”的阶段明显往前推进了很多，但现在还不能诚实地说“全部优化完成”。

更准确的状态是：

- 主链路已经比之前稳很多
- 上线前基线已经越来越像正式平台
- 但消息事实源最终收口、完整推送平台、RTC、完整压测与故障演练仍未全部完成

所以当前策略不是停止，而是继续按本 README 的优先级往下收，直到真正达到可控上线标准。
