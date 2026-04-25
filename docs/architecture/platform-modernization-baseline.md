# Platform Modernization Baseline

## Current Baseline

- `packages/contracts`: 统一响应解析、上传资产解析、统一 claims 基线。
- `packages/client-sdk`: 统一 `Bearer` 规范化与鉴权头拼装。
- `packages/domain-core`: 统一会话描述与企业化 claims 语义。
- `packages/mobile-core`: 统一移动端鉴权上传请求构造。
- `packages/admin-core`: 统一管理端受保护路由清单、模块分组、桌面壳模型、上传头能力。
- 根目录正式交付形态固定为：`user-vue`、`app-mobile`、`merchant-app`、`rider-app`、`admin-vue`、`admin-win`、`admin-mac`。
- 旧后台 uni-app 交付与旧移动端通用目录已退出主线，不再属于正式交付与共享层组成部分。

## Desktop Delivery

- `admin-vue` 继续作为浏览器后台。
- `admin-win` 与 `admin-mac` 已建立独立根目录，采用 `Tauri + Vue` 壳层。
- 两个桌面端不再复制后台模块定义，统一复用 `packages/admin-core/src/route-registry.js` 和 `packages/admin-core/src/DesktopShellApp.vue`。

## Guardrails

- 根目录 `EXECUTION_LEDGER.md` 是整改期唯一活动任务台账；有新任务先写入，任务收掉就删除，全部清空后整份文件也必须删除。
- 公网运行态不再开放通用 `POST /api/upload`。
- 邀请页只允许 `POST /api/onboarding/invites/:token/upload`。
- 官网曝光提交只允许 `POST /api/official-site/exposures/assets`。
- 根脚本 `npm run verify:modernization` 会校验交付形态、共享层、桌面壳、执行台账、实时容量基线与上传基线是否被回退。
