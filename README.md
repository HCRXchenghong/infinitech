# infinitech

一站式生活服务平台代码库。

## 仓库结构

```text
admin-app/                 管理端 App（uni-app）
admin-vue/                 管理端 Web（Vue 3 + Element Plus）
app-mobile/                用户端 App（uni-app）
user-vue/                  用户端 H5 / 小程序（uni-app）
merchant-app/              商户端 App（uni-app）
rider-app/                 骑手端 App（uni-app）
backend/go/                Go API 服务
backend/bff/               Node.js BFF
socket-server/             实时通信网关
backend/docker/            本地基础设施编排
openclaw/                  AI 相关组件
heic-converter/            HEIC 转换服务
```

## 当前基线

- 生产数据库：PostgreSQL
- 生产缓存：Redis
- 本地开发允许使用替代配置，但生产环境不再以 SQLite 作为主链路前提
- 主线整治范围：`backend/go`、`backend/bff`、`socket-server`、`admin-vue`、`user-vue`、`app-mobile`、`merchant-app`、`rider-app`

## 本地启动

### 基础设施

```bash
cd backend/docker
docker compose up -d
```

### Go API

```bash
cd backend/go
go run cmd/main.go
```

### BFF

```bash
cd backend/bff
npm install
npm start
```

### 管理端

```bash
cd admin-vue
npm install
npm run dev
```

## 验证命令

```bash
cd backend/go && go test ./... && go build ./cmd
cd backend/bff && npm test -- --runInBand && npm run lint
cd admin-vue && npm run build
```

## 参考文档

- [CONFIG.md](CONFIG.md)
- [CODE_AUDIT_AND_REPAIR_PLAN.md](CODE_AUDIT_AND_REPAIR_PLAN.md)
- [SUCHPEOPLE_DEPLOYMENT.md](SUCHPEOPLE_DEPLOYMENT.md)
