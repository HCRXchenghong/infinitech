# 悦享e食 3.0

外卖配送平台系统

## 项目结构

```
悦享3.0/
├── admin-app/              # 管理端 App (uni-app)
├── admin-vue/              # 管理端 Web (Vue 3 + Element Plus)
├── app-mobile/             # 用户端 App (uni-app)
├── merchant-app/           # 商户端 App (uni-app)
├── rider-app/              # 骑手端 App (uni-app)
├── backend/
│   ├── go/                # Go API 服务 (Gin + GORM + SQLite)
│   └── bff/               # Node.js BFF 服务 (Express)
├── socket-server/          # WebSocket 服务器 (Socket.IO)
├── openclaw/               # OpenClaw AI 引擎 + SuchPeople 包装器
│   ├── suchpeople.js      # AI 员工系统包装器
│   ├── suchpeople.env     # SuchPeople 配置
│   └── ...                # OpenClaw 源码
├── heic-converter/         # HEIC 图片转换服务
└── bin/                    # 可执行文件
```

## 核心功能

### 用户端
- 浏览商家和商品
- 下单和支付
- 实时订单追踪
- 在线客服

### 商户端
- 店铺管理
- 商品管理
- 订单处理
- 数据统计

### 骑手端
- 接单配送
- 路线导航
- 收入统计
- 排行榜

### 管理端
- 用户/商户/骑手管理
- 订单管理
- 数据分析
- 在线客服
- **AI 员工**（基于 OpenClaw）

## 快速开始

### 1. 启动后端服务

```bash
# Go API (端口 1029)
cd backend/go
go run cmd/main.go

# BFF (端口 25500)
cd backend/bff
npm install
npm start

# Socket Server (端口 9898)
cd socket-server
npm install
node index.js

# HEIC 转换服务 (端口 9899)
cd heic-converter
npm install
node server.js
```

### 2. 启动管理端 Web

```bash
cd admin-vue
npm install
npm run dev  # 端口 8888
```

### 3. 启动移动端

使用 HBuilderX 打开对应项目运行

### 4. 启动 AI 员工系统（可选）

详见 [SUCHPEOPLE_DEPLOYMENT.md](SUCHPEOPLE_DEPLOYMENT.md)

## 技术栈

- **前端**: Vue 3, Element Plus, uni-app
- **后端**: Go (Gin), Node.js (Express)
- **数据库**: SQLite, Redis
- **实时通讯**: Socket.IO
- **AI**: OpenClaw, Claude API

## 配置说明

详见 [CONFIG.md](CONFIG.md)

## 注意事项

- 所有账号需在管理端创建
- 默认密码：123456
- 数据库：backend/go/data/yuexiang.db
- Redis 可选（用于验证码缓存）
- 移动端首次运行需配置实际 IP 地址

## 许可证

私有项目

