# SuchPeople AI员工系统 - 部署指南

## 系统架构

```
┌─────────────────────────────────────────────────────────────┐
│                      悦享e食平台                             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐      ┌──────────────┐                    │
│  │  管理端 Web  │◄────►│  Go 后端     │                    │
│  │  (Vue.js)    │      │  (API + DB)  │                    │
│  └──────┬───────┘      └──────┬───────┘                    │
│         │                     │                             │
│         │  WebSocket          │  HTTP API                   │
│         │                     │                             │
│  ┌──────▼─────────────────────▼───────┐                    │
│  │       Socket Server                │                    │
│  │    (实时通讯 + 权限控制)           │                    │
│  └──────┬─────────────────────────────┘                    │
│         │                                                   │
│         │  WebSocket (/ai-staff)                           │
│         │                                                   │
│  ┌──────▼─────────────────────────────┐                    │
│  │         OpenClaw                   │                    │
│  │  (AI引擎 + SuchPeople包装器)      │                    │
│  │                                    │                    │
│  │  ┌──────────────────────────────┐ │                    │
│  │  │    suchpeople.js             │ │                    │
│  │  │  (进程管理 + 任务调度)       │ │                    │
│  │  └──────────┬───────────────────┘ │                    │
│  │             │                      │                    │
│  │  ┌──────────▼───────────────────┐ │                    │
│  │  │    openclaw.mjs              │ │                    │
│  │  │  (AI对话和任务执行)          │ │                    │
│  │  └──────────────────────────────┘ │                    │
│  └────────────────────────────────────┘                    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## 部署步骤

### 1. 部署 Go 后端

```bash
cd backend/go

# 安装依赖
go mod download

# 编译
go build -o bin/api cmd/main.go

# 运行
./bin/api
```

Go 后端会自动创建以下数据表：
- `openclaw_configs` - OpenClaw 配置
- `openclaw_mcps` - MCP 配置
- `openclaw_skills` - Skill 配置
- `openclaw_tasks` - 任务记录

### 2. 部署 Socket Server

```bash
cd socket-server

# 安装依赖
npm install

# 配置环境变量
echo "AI_STAFF_TOKEN=your_secure_token_here" > .env

# 运行
node index.js
```

Socket Server 新增了 `/ai-staff` 命名空间，用于：
- 管理端与 SuchPeople 的通信
- 任务分发和状态同步
- 配置更新通知

### 3. 部署 OpenClaw + SuchPeople

```bash
cd openclaw

# 安装 SuchPeople 依赖
npm install

# 配置 SuchPeople
cp suchpeople.env suchpeople.env.local
# 编辑 suchpeople.env.local 配置：
# - API_BASE_URL: Go 后端地址
# - SOCKET_SERVER_URL: Socket 服务器地址
# - AI_STAFF_TOKEN: 与 Socket Server 相同的 token

# 运行 SuchPeople
npm start
```

### 4. 部署管理端 Web

```bash
cd admin-vue

# 安装依赖
npm install

# 构建
npm run build

# 部署 dist 目录到 Web 服务器
```

## 配置说明

### Go 后端 API

新增的 API 端点：

```
# 配置管理
GET    /api/openclaw/config          # 获取激活的配置
GET    /api/openclaw/configs         # 获取所有配置
POST   /api/openclaw/configs         # 创建配置
PUT    /api/openclaw/configs/:id     # 更新配置
DELETE /api/openclaw/configs/:id     # 删除配置
POST   /api/openclaw/gateway/enable  # 一键启用 Gateway（自动生成 token / 写配置 / 启动 / 健康检查）

# 员工管理
GET    /api/openclaw/staffs          # 获取员工列表
POST   /api/openclaw/staffs          # 创建员工
PUT    /api/openclaw/staffs/:id      # 更新员工
DELETE /api/openclaw/staffs/:id      # 删除员工

# 会话与消息（按员工隔离）
GET    /api/openclaw/staffs/:id/conversations      # 获取员工会话
POST   /api/openclaw/conversations                 # 创建会话
GET    /api/openclaw/conversations/:id/messages    # 获取会话消息
POST   /api/openclaw/conversations/:id/messages    # 追加消息

# MCP 管理
GET    /api/openclaw/mcps            # 获取所有 MCP
POST   /api/openclaw/mcps            # 创建 MCP
PUT    /api/openclaw/mcps/:id        # 更新 MCP
DELETE /api/openclaw/mcps/:id        # 删除 MCP

# Skill 管理
GET    /api/openclaw/skills          # 获取所有 Skill
POST   /api/openclaw/skills          # 创建 Skill
PUT    /api/openclaw/skills/:id      # 更新 Skill
DELETE /api/openclaw/skills/:id      # 删除 Skill

# 任务管理
GET    /api/openclaw/tasks           # 获取任务列表
GET    /api/openclaw/tasks/:id       # 获取任务详情
POST   /api/openclaw/tasks           # 创建任务（支持 staffId / conversationId）
PUT    /api/openclaw/tasks/:id/status # 更新任务状态
```

### Socket Server 权限控制

`/ai-staff` 命名空间的权限控制：

1. **SuchPeople 连接**：
   - 使用特殊 token (`AI_STAFF_TOKEN`)
   - role 必须为 `ai_staff`

2. **管理端连接**：
   - 使用 JWT token
   - role 必须为 `admin`

3. **事件权限**：
   - `ai_task`: 仅管理端可发送
   - `task_status`, `task_completed`, `task_failed`: 仅 SuchPeople 可发送
   - `config_update`: 仅管理端可发送

### 环境变量

#### Socket Server (.env)
```env
AI_STAFF_TOKEN=your_secure_token_here
```

#### SuchPeople (suchpeople.env)
```env
API_BASE_URL=http://localhost:1029/api
SOCKET_SERVER_URL=http://localhost:9898
AI_STAFF_TOKEN=your_secure_token_here
OPENCLAW_GATEWAY_URL=
OPENCLAW_GATEWAY_TOKEN=
```

说明：
- 默认使用 `direct`（直连）模式执行任务。
- 如部署了 OpenClaw Gateway，可配置 `OPENCLAW_GATEWAY_URL`（可选 token）优先走网关。

## 使用流程

### 1. 配置 OpenClaw

1. 登录管理端 Web
2. 进入"AI员工"页面
3. 在"配置管理"标签页添加配置：
   - 名称：例如 "Claude Opus 4.6"
   - API地址：`https://api.anthropic.com`
   - API密钥：你的 Anthropic API Key
   - 模型：`claude-opus-4-6`
   - 激活：勾选

### 2. 配置 AI 员工（必做）

在“员工配置”标签页添加/编辑员工：
- 员工名称、描述
- 绑定模型配置
- 背景（Background）
- 提示词（System Prompt）
- 是否默认客服（默认会自动创建并启用 `AI客服`）

### 3. 添加 MCP 和 Skill（可选）

在对应的标签页添加 MCP 和 Skill 配置。

### 4. 启动 SuchPeople

```bash
cd openclaw
node suchpeople.js
```

SuchPeople 会：
1. 连接到 Socket Server
2. 从 Go 后端获取配置 + 员工 + 会话数据
3. 按任务绑定员工并加载对应会话历史
4. 执行后回写任务状态与会话消息

### 5. 发送任务

1. 在管理端 Web 的"任务对话"标签页
2. 选择员工和会话
3. 输入任务内容
3. 点击"发送任务"
4. 实时查看任务执行状态和结果

### 6. 查看历史

在"任务历史"标签页查看所有任务记录。

## 安全注意事项

1. **Token 安全**：
   - `AI_STAFF_TOKEN` 必须保密
   - 定期更换 token
   - 不要在代码中硬编码

2. **网络隔离**：
   - Socket Server 的 `/ai-staff` 命名空间仅允许内网访问
   - 使用防火墙限制访问

3. **API 密钥**：
   - OpenClaw 的 API 密钥存储在数据库中
   - 建议加密存储
   - 定期轮换密钥

4. **权限控制**：
   - 仅管理员可以访问 AI 员工页面
   - 管理端 App 需要单独的认证机制

## 故障排查

### SuchPeople 无法连接

检查：
1. Socket Server 是否运行
2. `AI_STAFF_TOKEN` 是否正确
3. 网络连接是否正常

### Gateway 一键启用失败

检查：
1. 是否已安装 `openclaw` CLI（命令行可执行 `openclaw gateway status`）
2. 后端进程是否有权限写入 `openclaw/suchpeople.env.local`
3. 端口 `18789` 是否被其他程序占用

### 任务执行失败

检查：
1. 任务绑定的员工是否启用、是否已绑定可用配置
2. 查看 SuchPeople 日志
3. Gateway 模式下检查 `http://127.0.0.1:18789/v1/models` 是否可访问
4. 检查 API 配额是否用尽

## 监控和日志

### SuchPeople 日志

```bash
cd openclaw
node suchpeople.js 2>&1 | tee suchpeople.log
```

### OpenClaw 日志

OpenClaw 的日志会输出到 SuchPeople 的标准输出。

### 任务状态监控

在管理端 Web 的"任务历史"标签页实时查看任务状态。

## 升级指南

### 升级 OpenClaw

```bash
cd openclaw
git pull
npm install
# 重启 SuchPeople
```

### 升级 Go 后端

1. 停止 Go 后端
2. 拉取最新代码
3. 编译
4. 运行数据库迁移（自动）
5. 启动 Go 后端

## 性能优化

1. **并发任务**：
   - 当前版本一次只能执行一个任务
   - 可以扩展为多实例部署

2. **缓存**：
   - 配置信息缓存在 SuchPeople 内存中
   - 定期检查更新（30秒）

3. **连接池**：
   - Socket 连接使用长连接
   - 自动重连机制

## 备份和恢复

### 备份数据库

```bash
# SQLite
cp backend/go/data/yuexiang.db yuexiang.db.backup

# 或使用 sqlite3
sqlite3 backend/go/data/yuexiang.db ".backup yuexiang.db.backup"
```

### 恢复数据库

```bash
cp yuexiang.db.backup backend/go/data/yuexiang.db
```

## 联系支持

如有问题，请查看：
- OpenClaw 文档: https://docs.openclaw.ai
- 项目 Issues
