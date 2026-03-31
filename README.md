# Infinitech

中文（默认） | [English](./README.en.md)

Infinitech 是一个面向本地生活服务场景的多端一体化平台仓库。这个仓库不是单一业务站点，也不是纯演示项目，而是把以下能力放进同一套工程基线里持续收口：

- 外卖
- 团购
- 跑腿 / 同城配送
- 用户端
- 商家端
- 骑手端
- 管理后台
- 实时消息
- 推送通知
- `App / H5` 站内 RTC 联系能力

如果你是第一次打开这个仓库，可以把它理解成一套“本地生活平台的工程化底座”：

- 后端事实源尽量统一
- 实时服务尽量单一
- 多端尽量共享 schema 和运行时工具
- 发布前必须有可执行的检查、演练和签署链


## 快速开始

如果你只是想尽快把系统拉起来，优先走这两条路径：

### 从 GitHub 直接拉起

不带 `--target-dir` 时，bootstrap 脚本会先询问本地安装目录；也可以直接通过参数指定。

Linux / macOS：

```bash
curl -fsSL https://raw.githubusercontent.com/HCRXchenghong/infinitech/main/scripts/bootstrap-install.sh | bash
```

Windows 入口对照：

| 终端 | 建议 | 直接可用命令 |
| --- | --- | --- |
| PowerShell | 推荐 | `powershell -ExecutionPolicy Bypass -Command "irm https://raw.githubusercontent.com/HCRXchenghong/infinitech/main/scripts/bootstrap-install.ps1 \| iex"` |
| CMD | 支持 | `powershell -ExecutionPolicy Bypass -Command "$u='https://raw.githubusercontent.com/HCRXchenghong/infinitech/main/scripts/bootstrap-install.cmd'; $p=Join-Path $env:TEMP 'infinitech-bootstrap-install.cmd'; irm $u -OutFile $p; & $env:ComSpec /c $p"` |

说明：

- `PowerShell` 入口会直接拉取并执行 `bootstrap-install.ps1`
- `CMD` 入口会先拉取 `bootstrap-install.cmd`，再由它下载本地 `ps1` 并执行
- 如果你当前就在 `CMD`，直接复制 `CMD` 那一行即可

### 仓库已在本地，直接安装并部署

Windows 入口对照：

| 终端 | 建议 | 直接可用命令 |
| --- | --- | --- |
| PowerShell | 推荐 | `powershell -ExecutionPolicy Bypass -File .\scripts\install-all.ps1` |
| CMD | 支持 | `scripts\install-all.cmd` |

Ubuntu / Debian / macOS：

```bash
bash scripts/install-all.sh
```

## 项目定位

从业务上看，Infinitech 是一个“多个履约域共用同一平台底座”的项目，而不是几套互相隔离的系统拼在一起。

当前仓库的设计原则是：

- `Shop / Product / Order / Message / Address` 这类核心事实尽量只有一套权威来源
- 外卖、团购、跑腿这些差异优先体现在履约域，不再把主模型裂成多套
- `socket-server` 是唯一实时网关，不再保留第二套 socket 服务
- 前端本地缓存只做加速层和失败兜底，不再回升为业务事实源
- 生产基线固定为 `PostgreSQL + Redis`

## 当前状态

这个仓库已经完成了一轮比较彻底的工程整治，核心结果包括：

- 生产数据库基线已经固定为 `PostgreSQL`
- `Redis` 已经进入限流、会话、实时共享状态等关键链路
- 核心业务事实源收口到 `backend/go`
- `socket-server` 已经收成单一实时网关
- 主要消息链路已经转成 `server-first`
- 上传链已经支持本地 HEIC 转换，不再默认依赖独立转换端口
- 发布前已经具备 `preflight / smoke / drill / evidence / signoff` 脚本链

还需要在真实环境执行、不能只靠本地改代码就宣称“全部结束”的事项仍然有：

1. 真设备 push 实投切换与验收  
2. `App / H5` RTC 真机联调验收  
3. 真故障注入后的恢复 / 回滚演练

## 功能范围

### 用户端

- 注册 / 登录 / 找回密码 / 修改资料
- 地址簿
- 外卖浏览、点餐、下单、订单流转
- 团购浏览、购买、核销相关链路
- 跑腿、医药等扩展入口
- 消息、客服会话、上传
- 商家联系、客服联系、RTC 联系入口

### 商家端

- 登录 / 建店 / 店铺资料维护
- 菜单与商品管理
- 外卖 / 团购订单处理
- 客服聊天
- 图像上传

### 骑手端

- 登录
- 任务大厅 / 任务详情
- 客服消息
- 证件、头像等资料上传

### 管理后台

- 运营配置
- 首页编排 / 推广位 / 推荐位
- 推送管理
- 电话联系审计
- RTC 通话审计
- 系统健康、日志与发布信号

## 仓库结构

- `backend/go`
  - 核心业务 API
  - 业务模型、仓储、服务
  - 消息事实源
  - 推送 worker
  - RTC 审计与留存清理
- `backend/bff`
  - Node.js BFF
  - 上传代理
  - 管理聚合
  - 健康聚合
  - 发布前 drill / signoff 接入点
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
  - 多端共享 schema、同步层、RTC helper、运行时工具
- `tools/heic-converter`
  - HEIC 本地转换模块
- `backend/docker`
  - Dockerfile、Compose、Caddy 反代配置
- `scripts`
  - 一键安装
  - 一键部署
  - 发布前检查、drill、证据链与签署脚本

## 当前架构边界

### 权威边界

- 业务事实源：`backend/go`
- 单一实时服务：`socket-server`
- 聚合 / 上传代理 / 管理健康视图：`backend/bff`
- 前端本地缓存：加速层与失败兜底，不再承担长期事实

### 不再推荐的旧路径

- `SQLite` 作为生产主库
- 第二套 socket 服务
- 本地消息缓存充当长期事实源
- 默认要求单独启动 HEIC HTTP 微服务

## HEIC 图片处理

`tools/heic-converter` 已经从“独立服务”收成“仓库内本地转换模块”。

现在默认行为是：

- 活跃上传链统一优先走 `BFF -> Go /api/upload`
- Go 端和 `socket-server` 都会优先调用本地 HEIC 转换模块
- Docker 镜像会把 `tools/heic-converter` 一起打包
- 默认不再要求独立的 HEIC 转换端口

如果你走 Docker / 一键部署，HEIC 转换会跟随主服务一起可用。  
如果你做本地非 Docker 开发，请先安装：

```bash
cd tools/heic-converter
npm ci
```

## 本地开发回归

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

## 零到一安装与部署

如果目标机器是新装系统，优先用安装器，而不是先手动配依赖。

安装器会：

- 检测系统和架构
- 检查并安装 `Git / Docker / Docker Compose / Node.js`
- 提供数字菜单选择镜像源
- 生成统一运行时环境文件
- 自动调用 Docker 全栈部署

### 支持的平台

- Windows 10 / 11
- Windows Server
- macOS Apple Silicon（M 系列）
- Ubuntu
- Debian

### 镜像源选择

安装器内置：

1. 官方源（默认）
2. 阿里云
3. 腾讯云
4. 华为云
5. 清华 / goproxy.cn 组合

镜像源会影响：

- Docker 基础镜像
- `npm` registry
- `GOPROXY`
- Alpine 包仓库

## 从 GitHub 直接拉取并部署

### Linux / macOS

```bash
curl -fsSL https://raw.githubusercontent.com/HCRXchenghong/infinitech/main/scripts/bootstrap-install.sh | bash
```

指定目录或分支：

```bash
curl -fsSL https://raw.githubusercontent.com/HCRXchenghong/infinitech/main/scripts/bootstrap-install.sh | bash -s -- --target-dir=/opt/infinitech --branch=main
```

### Windows 入口对照

| 终端 | 建议 | 直接可用命令 |
| --- | --- | --- |
| PowerShell | 推荐 | `powershell -ExecutionPolicy Bypass -Command "irm https://raw.githubusercontent.com/HCRXchenghong/infinitech/main/scripts/bootstrap-install.ps1 \| iex"` |
| CMD | 支持 | `powershell -ExecutionPolicy Bypass -Command "$u='https://raw.githubusercontent.com/HCRXchenghong/infinitech/main/scripts/bootstrap-install.cmd'; $p=Join-Path $env:TEMP 'infinitech-bootstrap-install.cmd'; irm $u -OutFile $p; & $env:ComSpec /c $p"` |

指定目录示例：

```powershell
powershell -ExecutionPolicy Bypass -Command "irm https://raw.githubusercontent.com/HCRXchenghong/infinitech/main/scripts/bootstrap-install.ps1 | iex --target-dir D:\infinitech"
```

```cmd
powershell -ExecutionPolicy Bypass -Command "$u='https://raw.githubusercontent.com/HCRXchenghong/infinitech/main/scripts/bootstrap-install.cmd'; $p=Join-Path $env:TEMP 'infinitech-bootstrap-install.cmd'; irm $u -OutFile $p; & $env:ComSpec /c $p --target-dir D:\infinitech"
```

## 本地安装器入口

Windows 入口对照：

| 终端 | 建议 | 直接可用命令 |
| --- | --- | --- |
| PowerShell | 推荐 | `powershell -ExecutionPolicy Bypass -File .\scripts\install-all.ps1` |
| CMD | 支持 | `scripts\install-all.cmd` |

Ubuntu / Debian / macOS：

```bash
bash scripts/install-all.sh
```

统一 Node 入口：

```powershell
node scripts/install-all.mjs
```

只准备环境、不立即部署：

```powershell
node scripts/install-all.mjs --no-deploy
```

## 一键部署入口

统一入口：

```powershell
node scripts/deploy-all.mjs
```

如果不带动作，脚本会进入数字菜单。

### 菜单动作

1. 启动核心服务  
2. 启动核心服务并前台附着日志  
3. 启动完整服务 + 域名反向代理  
4. 停止并删除容器  
5. 重建并重启  
6. 查看日志  
7. 查看容器状态  
8. 输出 Compose 配置  

### 本地快捷入口

Windows：

```powershell
scripts\deploy-all.cmd
```

Linux / macOS：

```bash
bash scripts/deploy-all.sh
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

### 带域名和反代

```powershell
node scripts/deploy-all.mjs up --proxy --public-domain=api.example.com --admin-domain=admin.example.com --caddy-email=ops@example.com
```

运行时环境文件：

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

- `reverse-proxy`
- `legacy-mysql`
- `messaging`

### 默认端口

- Admin Web: `http://127.0.0.1:8080`
- Go API: `http://127.0.0.1:1029/ready`
- BFF: `http://127.0.0.1:25500/ready`
- Socket Server: `http://127.0.0.1:9898/ready`
- PostgreSQL: `127.0.0.1:5432`
- Redis: `127.0.0.1:2550`

### 服务拓扑

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
  - 可选 Caddy 反向代理

## 发布前工具链

当前仓库已经不是“跑通就行”的发布方式，而是带完整发布支撑链。

主要脚本包括：

- `scripts/release-preflight.mjs`
- `scripts/http-load-smoke.mjs`
- `scripts/push-delivery-drill.mjs`
- `scripts/rtc-call-drill.mjs`
- `scripts/rtc-retention-drill.mjs`
- `scripts/release-drill.mjs`
- `scripts/release-live-cutover.mjs`
- `scripts/release-evidence-gate.mjs`
- `scripts/release-final-signoff.mjs`

## 上线前仍需真实环境执行的事项

代码和脚本层面已经基本收口，但真正上线前仍然必须做：

1. 真设备 push 实投切换和验收  
2. `App / H5` RTC 真机联调验收  
3. 真故障注入后的恢复 / 回滚演练  
