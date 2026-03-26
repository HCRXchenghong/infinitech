# Infinitech

一站式本地生活服务平台主仓。

这个仓库正在从“能跑的多端业务系统”持续整治为“可扩展、可压测、可回滚、可观测”的生产级平台。目标不是口头承诺“单机 10 万在线”，而是把核心链路改造成在高并发下不会因为单点设计直接崩掉的架构。

当前主整治方向固定为：
- `backend/go`
- `backend/bff`
- `socket-server`
- `admin-vue`
- `user-vue`
- `app-mobile`
- `merchant-app`
- `rider-app`

原生 `android-user-app` / `ios-user-app` 保留在仓库中，但当前阶段不作为主重构范围，只要求不阻塞主平台整治。

## 1. 项目定位

平台目标是做一个可持续扩展的一站式生活服务大平台，覆盖：
- 用户消费端
- 商家经营端
- 骑手履约端
- 管理后台
- 实时消息/客服
- 营销运营
- 财务与积分
- 推送通知
- 地图、短信、微信登录等外部能力

平台当前已经包含外卖、跑腿、医药、公益、会员、同频饭友、消息客服、后台运营等模块，但仍处于持续重构和去演示态阶段。

## 2. 当前生产基线

当前整治后的生产基线已经明确：
- 生产数据库：`PostgreSQL`
- 生产缓存与分布式状态：`Redis`
- `SQLite` 只允许本地开发、临时测试、历史兼容，不再作为生产主链路前提
- 根目录作为唯一主仓
- 每个整改批次都要求：代码改动 + 验证通过 + README 更新 + 推送 GitHub

## 3. 目录说明

### 3.1 核心业务目录
- `backend/go`：Go 主 API 服务，业务事实源
- `backend/bff`：Node.js BFF / 统一代理层
- `socket-server`：实时连接与消息网关
- `admin-vue`：管理后台 Web
- `user-vue`：用户消费端（uni-app）
- `app-mobile`：用户 App 端（uni-app）
- `merchant-app`：商家端（uni-app）
- `rider-app`：骑手端（uni-app）

### 3.2 共用与基础设施目录
- `shared/mobile-common`：多端共享的移动端公共逻辑
- `backend/docker`：本地基础设施编排
- `backend/shared`：后端共享文件
- `backend/redis`：Redis 相关配置
- `scripts`：仓库级脚本
- `.github`：CI / 工作流配置

### 3.3 保留但非当前主整治目录
- `android-user-app`
- `ios-user-app`
- `admin-app`
- `heic-converter`

## 4. 技术栈

### 4.1 后端
- Go
- Gin
- GORM
- Redis
- PostgreSQL / SQLite（仅开发）

### 4.2 BFF / 网关
- Node.js
- Express
- Axios

### 4.3 前端
- Vue 3
- Element Plus
- uni-app
- Vite

### 4.4 实时能力
- Socket.IO / WebSocket
- 未来按计划接入 Redis 分布式状态
- `App / H5` 计划支持站内 1v1 音频通话
- 小程序明确不做音频通话，直接显示系统电话

## 5. 本地启动

### 5.1 基础设施
建议优先从 `backend/docker` 启动依赖环境，逐步收口到 PostgreSQL + Redis。

### 5.2 Go API
```powershell
cd backend/go
go test ./...
go build ./cmd
go run ./cmd
```

### 5.3 BFF
```powershell
cd backend/bff
npm install
npm test -- --runInBand
npm run lint
npm run dev
```

### 5.4 管理后台
```powershell
cd admin-vue
npm install
npm run build
npm run dev
```

### 5.5 uni-app 多端
`user-vue`、`app-mobile`、`merchant-app`、`rider-app` 当前以源码级整治为主，日常需结合 HBuilderX / uni 构建链做真机或运行时验证。

## 6. 当前验证基线

每个整改批次至少必须通过：
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

说明：
- `admin-vue` 当前仍存在 `sql.js` browser externalize 警告
- `admin-vue` 当前仍存在大 chunk 警告
- 这两项目前属于已知非阻断问题，不影响本仓当前批次交付

## 7. 已完成的关键整治

以下不是零散小修，而是已经落地的主链路整改方向。

### 7.1 安全与鉴权
- 收紧了 Socket / 聊天身份伪造与越权读取问题
- 收紧了后台鉴权与默认密钥回退问题
- 收紧了高风险删除操作与二次校验链路

### 7.2 配置治理
- 把真正需要运营调整的数据逐步收回后台配置
- 去掉了大量开发机内网地址硬编码
- 地图能力已经整理为统一后端入口，后续可切换到天地图

### 7.3 主链路补齐
- 手机号改绑链路打通
- 图形验证码链路打通
- 邀请码注册与奖励链路打通
- 用户资料编辑打通到服务端
- 骑手任务异常上报打通
- 跑腿 / 医药等一批假打通页面改成真接口

### 7.4 消息与客服
- 用户端 / App 端 / 商家端 / 骑手端 / 后台工作台已开始统一到服务端会话模型
- Socket 实时层已经开始把消息和已读同步回 Go 服务
- 推送设备注册与推送回执桥已经接通

### 7.5 假数据与乱码清理
- 活跃页面里的大量假数据、假成功提示、本地伪状态已持续清理
- 多端活跃页面和关键维护文件中的可见乱码已持续修复
- 仓库 Markdown 已收口到当前这一份 `README.md`

## 8. 当前仍未完成的大项

这些不是“可有可无”的优化，而是主平台继续往大厂标准推进必须完成的工作。

### 8.1 生产架构硬化
- Go 主库彻底切换到 PostgreSQL 默认路径
- Redis 在生产环境下改为强依赖并 fail-fast
- BFF / Go / Socket 的统一限流、超时、请求体限制、标准错误模型继续补齐
- 上传链路从本地/内存模式进一步收口到流式存储抽象
- 健康检查、readiness、结构化日志、请求 ID、关键业务埋点继续补齐

### 8.2 消息系统统一
- `socket-server/chat.db` 仍需彻底退出“业务事实源”角色
- 商家端 / 骑手端 / 后台客服工作台剩余本地伪会话和伪未读还要继续收口
- 多端消息列表、历史、未读、已读需要继续统一成一个权威口径

### 8.3 推送系统闭环
- 当前已完成：设备注册、反注册、`received/opened` 回执、后台推送统计接口
- 当前未完成：
  - 真正的消息派发执行器
  - 平台级重试调度
  - 失败原因统一归档
  - 后台投递明细与结果面板

### 8.4 地址簿与下单
- 用户端地址簿已经服务端化
- 仍需继续检查更多业务入口是否完全去掉旧本地缓存依赖
- 订单链路需要继续确保只接收真实地址对象而非历史伪字符串

### 8.5 首页商户 / 商品推广位
第一阶段规则已经确定，但仍需正式落地：
- 同时支持商户位和商品位
- 后台手工锁位优先
- 已审核且生效中的付费计划优先于普通推荐
- 不做竞价
- 不做按曝光/点击自动扣费
- 不做商户自助投放
- 前台统一展示 `推广` 标识

### 8.6 P2P 音频通话
范围已经明确：
- `App / H5`：只做站内 1v1 音频通话
- `小程序`：不做音频通话，直接显示系统电话

仍待落地：
- 服务端信令
- 会话/订单关系鉴权
- 通话元数据记录
- 投诉与录音保留策略
- 后台通话记录与投诉处理面板

## 9. 首页推广位方案

首页推荐不做复杂竞价信息流，第一阶段继续保留并升级现有两条能力：
- 商户“今日推荐 / 位次”
- 商品“今日推荐 / 位次”

排序优先级固定为：
1. 管理员手工锁定位次
2. 已审核且有效的付费推广计划
3. 普通今日推荐
4. 自然排序

后台需要新增两类能力：
- 推广计划管理
- 首页位次管理

第一阶段定向只做：
- 全局
- 可选城市
- 可选业务分类

明确不做：
- 用户画像定向
- 自动竞价
- 商户自助投放

## 10. ID 体系说明

仓库已经在逐步统一外部 ID 体系：
- 优先使用统一 ID（UID / TSID）
- legacy 自增主键仅作为内部兼容

本轮又顺手修了一个关键底层问题：
- `resolveEntityID` 现在会优先识别 UID / TSID，再回退到 legacy 数字主键
- 避免了 14 位 UID 被误判成 legacy 数字主键的系统性错误

## 11. 最近完成的整改批次

### 11.1 地址簿服务端权威化
- 用户端与 App 端地址列表、地址编辑、默认地址、确认下单已接入真实服务端地址
- 订单创建优先引用服务端地址对象

### 11.2 消息事实源收口
- 用户端、App 端、商家端、骑手端与后台工作台持续向服务端会话模型收口
- Socket 层已经开始把消息与已读状态同步回 Go 服务

### 11.3 推送设备注册
- 四端都已补设备注册辅助模块
- 登录态建立后会上报设备
- 退出登录或登录态失效时会清理本地注册状态

### 11.4 推送回执桥
- App 端已接 `receive / click` 事件桥
- 当 payload 带 `messageId` 时，会自动回传 `received / opened`
- 通知详情页支持 `messageId` 兜底回执

### 11.5 推送统计接口与索引修复
- 后台已补 `GET /api/push-messages/:id/stats`
- 返回字段统一为：
  - `total_deliveries`
  - `total_users`
  - `received_count`
  - `read_count`
  - `unread_count`
  - `read_rate`
  - `read_rate_percent`
- `push_deliveries` 已修正为按 `message_id + user_id + user_type` 组合唯一
- 这为后续真正的推送派发执行器打下了正确的统计基础

### 11.6 推送投递记录落库与后台明细
- 创建或更新启用中的推送消息时，服务端会按当前活跃设备生成收件人级 delivery 记录
- 后台已补 `GET /api/push-messages/:id/deliveries`
- 推送统计弹层现在可以直接查看最近投递明细
- 当前仍未完成真正的外部推送下发执行器，但“推送任务 -> delivery 记录 -> 后台统计/明细”这一段已经成型

### 11.7 推送派发执行器与失败重试
- Go 端已补后台推送 delivery 执行器，支持轮询 `queued / retry_pending` 任务并自动派发
- 当前支持两种派发 provider：
  - `log`：本地开发模拟派发
  - `webhook`：通过 `PUSH_DISPATCH_WEBHOOK_URL` 对接外部推送网关
- delivery 状态现在已经形成闭环：`queued -> dispatching -> sent / retry_pending / failed -> acknowledged`
- delivery 表新增 `app_env / dispatch_provider / provider_message_id / next_retry_at`
- 后台推送统计已补 `queued_count / sent_count / failed_count / acknowledged_count`
- 当前仍未完成的推送项，只剩“真正的厂商网关接入”和“终端送达回执更细粒度展示”

## 12. 管理端配置原则

后续继续遵守这个边界：
- 真正会变的运营数据放后台配置
- 外部依赖参数放后台配置
- 渠道、电话、链接、地图、短信、微信登录、活动文案等可以配置
- 稳定标题、长期不会改的固定文案，不再继续泛化配置化

## 13. 不再接受的旧做法

后续整治默认拒绝这些做法：
- 新增假数据
- 新增假成功提示
- 前端本地状态冒充业务事实源
- 把开发机内网地址写回默认配置
- 通过修改 `dist`、`unpackage`、日志或数据库文件“修问题”
- 让不同端维护互相分裂的数据口径

## 14. 交付与 Git 规则

当前仓库执行规则固定为：
- 根目录作为唯一主仓
- 远端主仓：`https://github.com/HCRXchenghong/infinitech`
- 每一批都要求：
  - 功能闭环
  - 验证通过
  - README 更新
  - 推送 GitHub

当前默认节奏：
- 小批次原子提交
- 每批完成即 push
- 不等到大里程碑再集中提交

## 15. 下一批优先级

如果继续沿当前主计划推进，下一批优先顺序建议保持为：
1. 商家端 / 骑手端 / 后台消息口径剩余收口
2. 首页商户 / 商品推广位后台能力
3. PostgreSQL + Redis 生产默认路径收口
4. 推送外部厂商网关接入与更细粒度送达面板
5. `App / H5` 站内 1v1 音频通话

## 16. 当前已知非阻断问题

- `admin-vue` 仍有 `sql.js` browser externalize 警告
- `admin-vue` 仍有大 chunk 警告
- 部分 uni-app 批次仍以源码级校验为主，未做到每批都跑真机构建
- 仓库里仍有一部分历史保留目录和非主链路代码未完全按新基线清理

## 17. 维护说明

从现在开始，这个仓库只保留当前这一份总 README。

后续继续推进整治时：
- 不再新增分散的 Markdown
- 直接维护这份 `README.md`
- 已完成项写在“最近完成的整改批次”
- 未完成项写在“当前仍未完成的大项”与“下一批优先级”
