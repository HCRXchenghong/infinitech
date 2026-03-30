# Infinitech

中文（默认） | [English](#english)

Infinitech 是一个面向本地生活服务的多端一体化平台仓库，目标覆盖：

- 外卖
- 团购
- 跑腿 / 同城配送
- 用户端
- 商家端
- 骑手端
- 管理后台
- 实时消息
- 推送通知
- `App / H5` 站内音频联系能力

这不是一个“演示站”仓库。当前仓库目标是把它持续收口成一个：

- 可水平扩展
- 可观测
- 可压测
- 可回滚
- 可审计
- 默认配置更安全

的大型平台代码库。

## 项目状态

当前仓库已经完成了大规模整治，核心方向包括：

- 生产基线固定为 `PostgreSQL + Redis`
- 核心业务事实源收口到 `backend/go`
- 实时能力收口到单一 `socket-server`
- BFF 负责聚合、上传代理、健康聚合、发布 drill 和证据链
- 主要消息链路已经改成 `server-first`
- 发布前具备 `preflight / smoke / drill / evidence / signoff` 全链脚本
- `heic-converter` 已经集成为本地转换模块，不再默认要求独立 HTTP 端口

仍然需要在真实环境执行、不能只靠本地改代码就宣称“完成”的事项：

- 真设备 push 实投切换与验收
- `App / H5` RTC 真机联调验收
- 真故障注入后的恢复 / 回滚演练

## 功能矩阵

### 用户端

- 注册 / 登录 / 找回密码 / 资料编辑
- 地址簿
- 外卖浏览、点餐、下单、订单流转
- 团购浏览、购买、订单流转
- 跑腿 / 医药等扩展场景入口
- 订单消息、客服消息、聊天上传
- 商家联系、客服联系、RTC 联系入口

### 商家端

- 入驻 / 建店 / 店铺资料管理
- 商品管理
- 订单处理
- 客服聊天
- 图片上传

### 骑手端

- 登录
- 接单 / 任务详情
- 客服消息
- 证件与头像上传

### 管理后台

- 运营配置
- 首页编排 / 推广位 / 推荐位
- 推送管理
- 电话联系审计
- RTC 通话审计
- 系统日志与健康状态

## 仓库结构

- `backend/go`
  - Go 业务 API
  - 核心模型与仓储
  - 消息事实源
  - 推送 worker
  - RTC 审计与 retention cleanup
- `backend/bff`
  - Node.js BFF
  - 上传代理
  - 管理聚合
  - 健康聚合
  - 发布 drill / signoff 接口
- `socket-server`
  - 单一实时网关
  - Socket.IO
  - Redis 共享状态
  - RTC 信令 namespace
- `admin-vue`
  - 管理后台 Web
- `user-vue`
  - 用户 uni-app 端
- `app-mobile`
  - 用户 App 版 uni-app 端
- `merchant-app`
  - 商家 uni-app 端
- `rider-app`
  - 骑手 uni-app 端
- `shared/mobile-common`
  - 多端共享 schema、运行时工具、RTC helper、同步层
- `heic-converter`
  - HEIC 本地转换模块
- `backend/docker`
  - Dockerfile、Compose、Caddy 反代配置
- `scripts`
  - 一键部署
  - 发布巡检
  - 压测 smoke
  - drill / evidence / signoff

## 当前架构边界

### 权威边界

- 业务事实源：`backend/go`
- 单一实时服务：`socket-server`
- 聚合 / 上传代理 / 管理侧健康视图：`backend/bff`
- 前端本地缓存：只作为加速层或失败兜底，不再作为长期事实源

### 不再采用的方向

- 不再使用 `SQLite` 作为生产主库
- 不再保留第二套 socket 服务
- 不再让本地消息缓存充当长期事实源
- 不再默认要求单独开启 `heic-converter` HTTP 端口

## HEIC 图片处理

仓库根目录的 [`heic-converter`](./heic-converter) 已经从“独立微服务”收成“本地转换模块”。

当前默认行为：

- 活跃上传链优先统一走 `BFF -> Go /api/upload`
- Go 端和 `socket-server` 都优先调用本地 `heic-converter/index.js`
- Docker 镜像会把 `heic-converter` 一起打包进去
- 不再默认要求单独启动 `9899` 之类的 HEIC 转换端口

当前覆盖的活跃上传链包括：

- 用户 / App 聊天图片与音频上传
- 用户 / App 客服上传
- 用户 / App 通用图片上传
- 商家聊天图片上传
- 骑手客服图片上传
- 商家商品图 / 店铺图
- 骑手证件图
- 后台图片上传

本地非 Docker 开发如需 HEIC 转换，请先执行：

```bash
cd heic-converter
npm ci
```

Go 端仍保留 `HEIC_CONVERTER_URL` 兼容项，作为特殊场景下的可选外部转换回退，但默认路径已经不依赖独立端口。

## 快速开始

### 依赖

建议本机具备：

- Node.js 20+
- Go 1.23+
- PostgreSQL
- Redis

如果直接走 Docker，可以跳过本地安装数据库和 Redis。

### 本地开发回归

Go：

```powershell
cd backend/go
go test ./...
go build ./cmd
```

BFF：

```powershell
cd backend/bff
cmd /c npm test -- --runInBand
cmd /c npm run lint
```

后台：

```powershell
cd admin-vue
cmd /c npm run build
```

实时服务：

```powershell
cd socket-server
cmd /c npm run check
```

## 一键命令行部署

统一入口：

```powershell
node scripts/deploy-all.mjs
```

如果不带动作参数，脚本会进入数字菜单。

### 数字菜单

1. 启动核心服务
2. 启动核心服务并前台附着日志
3. 启动完整服务 + 域名反向代理
4. 停止并删除容器
5. 重建并重启
6. 查看日志
7. 查看容器状态
8. 输出 Compose 配置

### Windows

```powershell
scripts\deploy-all.cmd
```

### Ubuntu / Debian / 其他 Linux

```bash
sh scripts/deploy-all.sh
```

### 直接命令模式

```powershell
node scripts/deploy-all.mjs up
node scripts/deploy-all.mjs down
node scripts/deploy-all.mjs restart
node scripts/deploy-all.mjs logs
node scripts/deploy-all.mjs ps
node scripts/deploy-all.mjs config
```

### 带域名和反向代理

```powershell
node scripts/deploy-all.mjs up --proxy --public-domain=api.example.com --admin-domain=admin.example.com --caddy-email=ops@example.com
```

脚本会自动生成运行时环境文件：

```text
backend/docker/.deploy.runtime.env
```

## Docker 完整启动

核心编排文件：

- [`backend/docker/docker-compose.yml`](./backend/docker/docker-compose.yml)

默认核心服务：

- `admin-web`
- `postgres`
- `redis`
- `go-api`
- `socket-server`
- `bff`

可选 profile：

- `mysql`
- `rabbitmq`
- `reverse-proxy`

### 默认端口

- Admin Web: `http://127.0.0.1:8080`
- Go API: `http://127.0.0.1:1029/ready`
- BFF: `http://127.0.0.1:25500/ready`
- Socket Server: `http://127.0.0.1:9898/ready`
- PostgreSQL: `127.0.0.1:5432`
- Redis: `127.0.0.1:2550`

### Docker 部署拓扑

- `admin-web`
  - 管理后台静态站点
- `postgres`
  - 主业务数据库
- `redis`
  - 会话、限流、实时共享状态
- `go-api`
  - 核心业务 API、消息事实源、push worker、RTC 审计
- `socket-server`
  - 单一实时网关、RTC 信令、上传接入
- `bff`
  - Web 聚合层、上传代理、管理健康接口
- `reverse-proxy`
  - 可选 Caddy 反代

### 反向代理模式

相关文件：

- [`backend/docker/Caddyfile`](./backend/docker/Caddyfile)
- [`backend/docker/Dockerfile.admin`](./backend/docker/Dockerfile.admin)
- [`backend/docker/Dockerfile.go`](./backend/docker/Dockerfile.go)
- [`backend/docker/Dockerfile.socket`](./backend/docker/Dockerfile.socket)

域名模式下：

- `PUBLIC_DOMAIN` 负责 API 与实时入口
- `ADMIN_DOMAIN` 负责后台 Web

## 代码整治重点

当前已经完成或显著推进的重点包括：

- 消息链路 `server-first`
- 单一 `socket-server`
- Redis-backed 会话 / 限流 / 在线状态
- 推送 worker、push drill、provider readiness
- RTC 审计、RTC 信令、RTC 运行时配置、RTC retention cleanup
- 首页编排与店铺域边界收口
- 统一 schema 与字段投影
- 本地缓存降级为加速层
- 电话联系审计与后台查询
- 一键部署、Docker、发布 gate、evidence、signoff

## 测试与发布

### 代码回归

- `go test ./...`
- `go build ./cmd`
- `backend/bff`: `npm test -- --runInBand`
- `backend/bff`: `npm run lint`
- `admin-vue`: `npm run build`
- `socket-server`: `npm run check`

### 发布脚本

- `scripts/release-preflight.mjs`
- `scripts/http-load-smoke.mjs`
- `scripts/push-delivery-drill.mjs`
- `scripts/rtc-call-drill.mjs`
- `scripts/rtc-retention-drill.mjs`
- `scripts/release-drill.mjs`
- `scripts/release-live-cutover.mjs`
- `scripts/release-evidence-gate.mjs`
- `scripts/release-final-signoff.mjs`

## 上线前最后三件事

仓库内能补的代码、脚本、gate、evidence、signoff 基本已经收口。现在真正必须在真实环境执行的只剩：

1. 真设备 push 实投切换和验收
2. `App / H5` RTC 真机联调验收
3. 真故障注入后的恢复 / 回滚演练

---

## English

Infinitech is a multi-client local services platform repository covering food delivery, group buying, errands, merchant tools, rider tools, admin operations, real-time messaging, notifications, and in-app RTC contact flows.

### Current state

- Production baseline is `PostgreSQL + Redis`
- The primary business source of truth lives in `backend/go`
- `socket-server` is the only realtime gateway
- BFF handles aggregation, upload proxying, health aggregation, release drills, and signoff support
- Main messaging flows are now `server-first`
- Release gating includes `preflight / smoke / drill / evidence / signoff`
- `heic-converter` is integrated as a local conversion module and is no longer expected to run as a standalone HTTP service by default

### One-command deployment

- Interactive entry:
  - `node scripts/deploy-all.mjs`
- Windows:
  - `scripts\deploy-all.cmd`
- Ubuntu / Debian / Linux:
  - `sh scripts/deploy-all.sh`

The interactive menu includes:

1. Start core services
2. Start core services with attached logs
3. Start full stack with reverse proxy and domains
4. Stop and remove containers
5. Rebuild and restart
6. View logs
7. View container status
8. Output Compose config

### Docker stack

The full Docker stack is defined in [`backend/docker/docker-compose.yml`](./backend/docker/docker-compose.yml) and includes:

- `admin-web`
- `postgres`
- `redis`
- `go-api`
- `socket-server`
- `bff`
- optional `reverse-proxy`

### HEIC handling

HEIC conversion is now integrated into the main upload chain. Active uploads no longer require a dedicated HEIC conversion port by default. Docker builds package the converter into the Go API and socket server images.

### What still requires real environment execution

- real-device push provider cutover and validation
- real-device `App / H5` RTC validation
- real failure injection with recovery / rollback verification
