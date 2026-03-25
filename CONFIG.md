# 配置与部署说明

本文档只保留当前有效的配置入口，不再使用任何固定内网 IP 作为默认值。

## 基本原则
- 本地开发默认走回环地址：`127.0.0.1`
- Android 模拟器默认走：`10.0.2.2`
- 对外公开链接必须走可配置公网域名，不能写死开发机局域网地址
- 不要修改 `dist`、`unpackage`、日志、数据库等构建产物来“修配置”

## 前端与客户端配置

### 管理端 `admin-vue`
- 开发代理入口：`admin-vue/vite.config.mts`
- 请求默认地址：`admin-vue/src/utils/request.js`
- 当前开发默认值：
  - API/BFF: `http://127.0.0.1:25500`
  - Socket: `http://127.0.0.1:9898`

### Uni-app 客户端
- 用户端：`user-vue/manifest.json`
- H5/App 用户端：`app-mobile/manifest.json`
- 商家端：`merchant-app/manifest.json`
- 骑手端：`rider-app/manifest.json`
- 共享运行时配置：`shared/mobile-common/config.ts`

当前策略：
- 优先使用显式配置的 `API_BASE_URL` / `SOCKET_URL`
- 本地调试可通过 `dev_local_ip` 覆盖
- 未配置时默认回落到本机回环地址，而不是提交仓库的内网 IP

### Android 原生
- 配置入口：`android-user-app/core/network/build.gradle.kts`
- 运行时读取：`android-user-app/core/network/src/main/java/com/user/infinite/core/network/ApiConfig.kt`

可配置项：
- `API_BASE_URL`
- `SOCKET_URL`

默认值：
- API: `http://10.0.2.2:25500/`
- Socket: `http://10.0.2.2:9898`

### iOS 原生
- 配置入口：`ios-user-app/悦享e食/悦享e食/App/AppConfig.swift`
- Debug/Release 的 Info.plist 注入定义在工程文件中

读取顺序：
1. `UserDefaults` 运行时覆盖
2. `Info.plist`
3. 安全默认值

## 后端配置

### Go API
- 配置入口：`backend/go/internal/config/config.go`
- 本地默认：
  - `DB_HOST=127.0.0.1`
  - `REDIS_HOST=127.0.0.1`
  - 地图代理：`http://127.0.0.1:8082`

### BFF
- 配置入口：`backend/bff/src/config/index.js`
- 本地默认通过 `127.0.0.1` 指向 Go API / Socket / 管理端

### Socket Server
- 配置入口：`socket-server/index.js`
- 未配置时只允许本地安全默认值，不再回落到局域网地址

## 公开链接与服务地址

以下能力必须使用环境变量或后台配置，不允许硬编码为开发机地址：

### 邀请链接
- `PUBLIC_LANDING_BASE_URL`
- `ONBOARDING_INVITE_BASE_URL`

说明：
- `ONBOARDING_INVITE_BASE_URL` 优先
- 未设置时回落到 `PUBLIC_LANDING_BASE_URL`
- 两者都未设置时使用安全公网默认值 `https://api.yuexiang.com`

### 领券链接
- `PUBLIC_LANDING_BASE_URL`
- `COUPON_CLAIM_LINK_BASE_URL`

说明：
- `COUPON_CLAIM_LINK_BASE_URL` 优先
- 未设置时回落到 `PUBLIC_LANDING_BASE_URL`
- 两者都未设置时使用安全公网默认值 `https://api.yuexiang.com`

### HEIC 转码服务
- `HEIC_CONVERTER_URL`

说明：
- 未设置时默认：`http://127.0.0.1:9899/convert`

### 天地图 / 地图服务
- 后台系统设置：`/api/service-settings`
- 管理端页面：`admin-vue/src/views/Settings.vue`

已支持配置：
- `map_provider`
- `map_search_url`
- `map_reverse_url`
- `map_api_key`
- `map_tile_template`
- `map_timeout_seconds`

## 提交前检查
- 不要提交 `.env`、`.db`、`.log`、构建产物
- 不要把个人局域网 IP 写回源码默认值
- 对外链接统一检查是否来自配置，而不是来自开发环境常量
