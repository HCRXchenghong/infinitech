# Infinitech

一个持续整治中的一站式本地生活服务平台主仓。

当前目标不是口头承诺“单机 10 万在线”，而是把现有系统持续收口成可水平扩展、可压测、可回滚、可观测、可上线交付的生产架构，尽量消除单点设计、伪状态、假数据、脆弱默认配置和历史遗留带来的系统性风险。

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

## 3. 当前技术与生产基线

明确的生产方向：

- 生产数据库：`PostgreSQL`
- 生产缓存与分布式状态：`Redis`
- 唯一实时服务：`socket-server`
- 业务事实源：`backend/go`
- BFF 角色：统一代理、聚合与外层准入，不再承载第二套实时服务

明确的边界：

- `SQLite` 只允许本地开发、临时测试和短期 fallback，不再作为生产主链路前提
- 小程序不做 RTC 音频通话，直接走系统电话
- `App / H5` 后续才承载站内 `1v1` 音频通话
- 首页推广第一阶段不做竞价，不做自动扣费，不做商户自助投放

## 4. 目录说明

- `backend/go`：Go 主 API 与业务事实源
- `backend/bff`：Node.js BFF 与统一代理层
- `socket-server`：唯一实时网关与 Socket 事件桥
- `admin-vue`：管理后台 Web
- `user-vue`：用户端 uni-app
- `app-mobile`：用户 App 端 uni-app
- `merchant-app`：商家端 uni-app
- `rider-app`：骑手端 uni-app
- `shared/mobile-common`：多端共享逻辑
- `backend/docker`：本地基础设施编排
- `scripts`：仓库级发布、压测、巡检脚本
- `.github/workflows`：CI 工作流

## 5. 已完成的核心整治

### 5.1 架构与生产基线

- 根目录收口为唯一主仓。
- 生产环境数据库基线已收紧为 `PostgreSQL + Redis`。
- Go、BFF、`socket-server` 都已补齐基础 readiness / health 能力。
- 只保留一个实时服务：`socket-server`。
- OpenClaw 相关链路已经从主系统中清理。

### 5.2 消息系统收口

- Go 侧消息表持续作为权威消息事实源。
- 用户端、App 端、商家端、骑手端、后台客服工作台都在往“服务端优先，本地只兜底”收口。
- `socket-server` 已经把多条消息同步、已读同步、会话回写继续往 Go 权威源靠拢。
- 多端 `message_sent / message_read / all_messages_read` 已经按 `chatId` 收口，减少串会话污染。
- 多端消息时间字段、fallback ID、临时消息 ID 持续收紧为稳定规则。

### 5.3 主链路去假数据

- 地址簿已补成服务端真实能力，订单引用服务端地址。
- 大量活跃页面的本地假数据、假成功提示、假状态和乱码已清理。
- 商家、用户、骑手、后台多端活跃消息链路已持续去掉多余的本地双写。

### 5.4 推送链路

- 设备注册已接入多端启动/退出登录流程。
- 推送记录、投递明细、统计接口、派发 worker 已具备。
- 后台已能看到消息级和收件人级的投递统计与明细。
- Go readiness 和 BFF 健康聚合已能看到 push worker 状态与队列积压。

### 5.5 首页推广位

- 后台已具备首页推广计划与位次管理能力。
- 已支持商户位与商品位。
- 已支持管理员手工锁位优先、推广计划优先于普通今日推荐的规则。

### 5.6 运维与发布基线

- Go、BFF、`socket-server` 已统一补入 `X-Request-ID` 透传能力。
- 发布前巡检脚本 `scripts/release-preflight.mjs` 已落地。
- `socket-server` 已纳入 CI smoke-check。
- `admin-vue` 已做显式 vendor chunk 拆分，主包集中度明显下降。

## 6. 当前仍未完成的重点

下面这些是真正还没完成、上线前必须继续收的部分。

### 6.1 消息系统尾巴

- `socket-server/chat.db` 仍然保留短期 fallback 角色，还没有完全退出消息事实源链路。
- 骑手端、后台工作台、商家端仍有少量本地辅助状态尚未完全去事实源化。
- 会话摘要、未读汇总、fallback 行为还需要继续统一到服务端口径。

### 6.2 推送闭环尾巴

- 当前推送 provider 仍以 `log / webhook` 为主，距离完整生产级外部推送平台还有距离。
- 外部供应商接入、失败重试策略细化、派发压测和更完整的运维面板仍需补齐。

### 6.3 RTC / 电话联系

- `App / H5` 的站内 `1v1` 音频通话还没有完整落地到服务端信令、录音保留、投诉冻结流程。
- 小程序仍按既定边界只走系统电话。

### 6.4 首页推广位尾巴

- 后台规则已经具备，但前台首页编排仍需继续收口，减少本地拼装和历史兼容逻辑。
- 城市 / 分类定向、运营面板和完整审核流仍需继续完善。

### 6.5 平台治理

- 压测基线、容量评估、降级策略、回滚剧本还没有完全收完。
- 原生 Android / iOS 目前只是保留，不属于这一阶段的主整治范围。

## 7. 上线前必须执行的验证

### 7.1 后端与后台

在仓库根目录执行：

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

这个脚本当前会检查：

- `BFF /ready`
- `Go /ready`
- `socket-server /ready`
- `socket-server /api/stats`
- 可选认证态 `BFF /api/system-health`
- socket fallback buffer 是否异常膨胀
- push worker 是否运行、是否最近失败、是否积压过大

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

这个脚本当前用于快速打基线，不等同于完整生产压测，但能在发布前尽快暴露 readiness、stats 和基础入口的吞吐或延迟异常。

## 8. 当前运行规则

- 只保留一个实时服务：`socket-server`
- 只保留一个总文档：根目录 `README.md`
- 活跃主链路继续删假数据、假状态、假成功提示
- 稳定标题和长期不会变化的固定文案，不再继续泛化为后台配置
- 真正会运营变更的数据才继续配置化：密钥、渠道、电话、链接、地图、短信、微信、活动文案、推广计划、运营数据
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

- 2026-03-29：`admin-vue` 构建加入显式 vendor chunk 拆分，继续压低后台主包集中度。
- 2026-03-29：新增 `scripts/release-preflight.mjs`，发布前会校验 BFF / Go / `socket-server` 的 readiness、stats 和系统健康。
- 2026-03-29：发布前巡检脚本继续加严，已经会阻断 socket fallback 过大、push worker 未运行、push 队列积压过高等风险。
- 2026-03-29：Go `/ready` 现在会把 push worker 运行态和队列快照纳入 readiness 判定。
- 2026-03-29：BFF `/ready` 默认也会检查 `socket-server /ready`，不再只看 Go。
- 2026-03-29：`socket-server` 的 readiness、stats 和后台首页已经能看到 Redis adapter 是否真实启用，而不是只有 Redis 是否连上。
- 2026-03-29：多端消息已继续按 `chatId` 过滤 `message_sent / message_read / all_messages_read`，减少串会话污染。
- 2026-03-29：`socket-server/chat.db` 已继续收紧为短期 emergency buffer，加入启动裁剪、按会话上限裁剪、按时间淘汰和 fallback 统计暴露。
- 2026-03-29：BFF、Go、`socket-server` 已继续补齐 request id 透传、健康聚合和运维面板信息。
- 2026-03-29：新增 `scripts/http-load-smoke.mjs`，用于发布前快速做 readiness / stats 并发烟测。
- 2026-03-29：Go、BFF、`socket-server` 已开始输出慢请求预警，方便在千人级流量上更早发现超时和退化。

## 11. 诚实状态说明

这个仓库已经从“很多链路是假打通、假状态、本地模拟”的阶段明显往前推进了很多，但现在还不能诚实地说“全部优化完成”。

更准确的状态是：

- 主链路已经比之前稳很多
- 上线前基线已经越来越像正式平台
- 但消息事实源最终收口、完整推送平台、RTC、完整压测与故障演练仍未全部完成

所以当前策略不是停止，而是继续按本 README 的优先级往下收，直到真正达到可控上线标准。
