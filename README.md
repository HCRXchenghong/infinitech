# Infinitech 1.0.0

Infinitech 是一套面向本地生活服务场景的多端一体化平台，覆盖用户端、商户端、骑手端、管理端、实时消息、支付与提现、邀请落地页、下载页，以及一键安装和一键部署工具链。

这个仓库的 1.0.0 基线已经固定了以下原则：

- 生产主数据库固定为 `PostgreSQL`
- 缓存与实时状态固定为 `Redis`
- 业务主链固定由 `backend/go` 承担
- 实时网关固定由 `socket-server` 承担
- 管理聚合、上传代理与系统健康聚合固定由 `backend/bff` 承担
- 管理端、邀请页、下载页端口在开发和生产环境保持一致
- 一键部署时会自动生成并输出首次管理端初始化账号密码、系统日志敏感操作二次验证账号密码

## 1. 项目简介

仓库当前覆盖的核心业务包括：

- 外卖
- 团购
- 跑腿 / 同城配送
- 用户端下单、支付、账单、客服、RTC 联系
- 商户端建店、商品管理、订单处理、客服
- 骑手端接单、资料管理、钱包与保证金
- 管理端运营配置、支付中心、系统日志、审计、数据治理
- 邀请 / 领券落地页
- 下载页

## 2. 核心架构

```text
admin-vue(8888/1788/1798)
          |
          v
     backend/bff(25500)
          |
          +----------------------+
          |                      |
          v                      v
 backend/go(1029)         socket-server(9898)
          |                      |
          +----------+-----------+
                     |
             Redis(2550) / PostgreSQL(5432)

支付侧扩展：
- 支付宝 sidecar: 10301
- 银行卡代付 sidecar: 10302
- 微信支付: 直接集成在 Go 主服务配置中，无独立 sidecar 端口
```

### 2.1 组件职责

- `backend/go`
  - 主业务 API
  - 订单、钱包、支付、提现、通知、管理后台主业务
  - 管理端首次初始化逻辑
- `backend/bff`
  - 管理端聚合 API
  - 文件上传代理
  - 系统健康聚合
  - 系统日志二次验证配置读取
- `socket-server`
  - Socket.IO 实时网关
  - 通知广播
  - RTC 信令
  - 上传兜底与实时辅助接口
- `admin-vue`
  - 管理端 Web
  - 同时承载管理端、邀请落地页、下载页的构建产物与路由分流
- `user-vue`
  - 用户 uni-app 客户端
- `app-mobile`
  - 用户 App 版 uni-app 客户端
- `merchant-app`
  - 商户 uni-app 客户端
- `rider-app`
  - 骑手 uni-app 客户端
- `shared/mobile-common`
  - 多端共享运行时、实时通知、RTC、平台配置
- `backend/docker`
  - Dockerfile、Compose、Caddy 反向代理配置
- `scripts`
  - 一键安装、一键部署、启动诊断、发布演练脚本

## 3. 仓库结构

```text
.
├── admin-vue                # 管理端 Web / 邀请页 / 下载页
├── admin-app                # uni-app 管理端客户端
├── user-vue                 # 用户端
├── app-mobile               # 用户 App 版
├── merchant-app             # 商户端
├── rider-app                # 骑手端
├── backend
│   ├── go                   # Go 主业务服务
│   ├── bff                  # Node.js BFF
│   └── docker               # Docker Compose 与镜像构建
├── socket-server            # 实时消息 / RTC 网关
├── shared                   # 共享模块
└── scripts                  # 安装、部署、检查、发布脚本
```

## 4. 固定端口说明

以下端口已经固定，开发和生产环境保持一致：

| 端口 | 服务 | 说明 |
| --- | --- | --- |
| `8888` | 管理端 Web | 默认管理后台入口 |
| `1788` | 邀请 / 领券页 | 邀请、落地页、券领取链路 |
| `1798` | 下载页 | App 下载页 |
| `25500` | BFF | 管理聚合与上传代理入口 |
| `1029` | Go API | 主业务 API |
| `9898` | Socket Server | 实时消息、RTC、上传辅助 |
| `10301` | Alipay Sidecar | 支付宝接口侧车 |
| `10302` | Bank Payout Sidecar | 银行卡代付 / 提现侧车 |
| `2550` | Redis | 缓存与实时共享状态 |
| `5432` | PostgreSQL | 主数据库 |
| `80` | Reverse Proxy | 可选 Caddy HTTP 入口 |
| `443` | Reverse Proxy | 可选 Caddy HTTPS 入口 |

补充说明：

- `8080` 当前预留，不作为默认入口
- 微信支付没有单独的 sidecar 端口，直接通过 Go 主服务中的微信支付配置生效
- 支付宝提现 / 支付宝支付依赖 `10301`
- 银行卡提现依赖 `10302`
- 邀请页对外常用地址示例：`http://127.0.0.1:1788/invite/<token>`
- 下载页对外常用地址示例：`http://127.0.0.1:1798/download`

## 5. 一键安装与一键部署

推荐优先使用仓库自带脚本，不要手工拼装依赖。

### 5.1 脚本入口

本地仓库内可直接使用：

- Windows CMD：`scripts\\install-all.cmd`
- Windows PowerShell：`powershell -ExecutionPolicy Bypass -File .\\scripts\\install-all.ps1`
- Linux / macOS：`bash scripts/install-all.sh`
- 通用 Node 入口：`node scripts/install-all.mjs`

如果只想部署，不重新做安装检查：

- `node scripts/deploy-all.mjs up`
- `node scripts/deploy-all.mjs down`
- `node scripts/deploy-all.mjs restart`
- `node scripts/deploy-all.mjs logs`
- `node scripts/deploy-all.mjs ps`

### 5.2 从 GitHub 直接拉取并安装

Linux / macOS：

```bash
curl -fsSL https://raw.githubusercontent.com/HCRXchenghong/infinitech/main/scripts/bootstrap-install.sh | bash
```

Windows PowerShell：

```powershell
irm https://raw.githubusercontent.com/HCRXchenghong/infinitech/main/scripts/bootstrap-install.ps1 | iex
```

Windows CMD：

```cmd
powershell -ExecutionPolicy Bypass -Command "irm 'https://raw.githubusercontent.com/HCRXchenghong/infinitech/main/scripts/bootstrap-install.ps1' | iex"
```

### 5.3 一键安装脚本会做什么

- 识别当前系统和架构
- 检查 Docker / Docker Compose 是否可用
- 提供镜像源选择
- 自动生成本地运行时文件 `backend/docker/.deploy.runtime.env`
- 固定写入管理端 / 邀请页 / 下载页端口
- 自动调用 `scripts/deploy-all.mjs up`

### 5.4 运行时文件

部署时会在本地生成：

- `backend/docker/.deploy.runtime.env`

这个文件：

- 默认不会提交到 Git
- 用来保存端口、域名、初始化账号、二次验证账号等运行时配置
- 重复部署时会复用已有值，不会自动重置口令

## 6. 首次初始化账号与二次验证账号

一键部署完成后，命令行最后会输出两组敏感信息：

### 6.1 管理端首次初始化账号

用于空库首次登录管理端：

- 初始化账号：来自 `BOOTSTRAP_ADMIN_PHONE`
- 初始化密码：来自 `BOOTSTRAP_ADMIN_PASSWORD`
- 初始管理员名：来自 `BOOTSTRAP_ADMIN_NAME`

首次登录后，系统会强制要求修改成真实管理员信息。

### 6.2 系统日志 / 清空类敏感操作二次验证账号

用于系统日志删除、清空等敏感操作的二次确认：

- 验证账号：来自 `SYSTEM_LOG_DELETE_ACCOUNT`
- 验证密码：来自 `SYSTEM_LOG_DELETE_PASSWORD`

### 6.3 如需自定义上述信息

可在部署前通过环境变量或 `.deploy.runtime.env` 指定：

```bash
BOOTSTRAP_ADMIN_PHONE=13800138000
BOOTSTRAP_ADMIN_NAME=Bootstrap Admin
BOOTSTRAP_ADMIN_PASSWORD=ChangeMe123456
SYSTEM_LOG_DELETE_ACCOUNT=syslog_admin
SYSTEM_LOG_DELETE_PASSWORD=ChangeMeAgain123456
```

## 7. 默认访问地址

在本机默认部署完成后，可直接访问：

- 管理端：`http://127.0.0.1:8888`
- 邀请页：`http://127.0.0.1:1788`
- 下载页：`http://127.0.0.1:1798`
- BFF 健康检查：`http://127.0.0.1:25500/ready`
- Go API 健康检查：`http://127.0.0.1:1029/ready`
- Socket 健康检查：`http://127.0.0.1:9898/ready`
- 支付宝 sidecar 健康检查：`http://127.0.0.1:10301/health`
- 银行卡 sidecar 健康检查：`http://127.0.0.1:10302/health`

## 8. 可选反向代理与域名部署

如果需要公网域名和 HTTPS，可启用 `reverse-proxy` profile。

示例：

```bash
node scripts/deploy-all.mjs up --proxy --public-domain=api.example.com --admin-domain=admin.example.com --caddy-email=ops@example.com
```

启用后：

- 业务域名走 `PUBLIC_DOMAIN`
- 后台域名走 `ADMIN_DOMAIN`
- 反代端口使用 `80` 和 `443`

## 9. 本地开发命令

### 9.1 管理端

```bash
cd admin-vue
npm run dev:admin
npm run dev:invite
npm run dev:download
```

### 9.2 Go 主服务

```bash
cd backend/go
go test ./...
go build ./cmd
```

### 9.3 BFF

```bash
cd backend/bff
npm test
```

### 9.4 Socket Server

```bash
cd socket-server
npm run check
```

## 10. 质量检查

### 10.1 乱码检查

仓库提供了专门的乱码检查脚本：

```bash
node scripts/check-mojibake.mjs
```

输出：

```text
No mojibake or invalid UTF-8 found.
```

### 10.2 常用健康检查

- `GET /health`
- `GET /ready`

这些接口已经在 `backend/go`、`backend/bff`、`socket-server` 中统一提供。

## 11. 生产部署建议

- 不要把 `backend/docker/.deploy.runtime.env` 提交到公开仓库
- 上线前替换默认 JWT 密钥、支付密钥、短信配置
- 空库首次登录后，立即修改初始化管理员账号密码
- 系统日志二次验证账号密码也应立即改成正式值
- 如需公网支付回调，必须配置真实公网域名与回调地址
- `mysql` 和 `rabbitmq` 仅保留为可选 profile，不是 1.0.0 默认运行基线

## 12. 版本信息

- 当前仓库发布版本：`1.0.0`
- 当前默认分支：`main`
- 当前发布仓库：`https://github.com/HCRXchenghong/infinitech`

## 13. 许可证与说明

本仓库当前以实际业务工程形态维护。若你准备二次部署、商用或对外分发，请先自行核对支付、短信、推送、隐私合规和资质要求。
