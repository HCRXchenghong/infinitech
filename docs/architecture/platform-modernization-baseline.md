# Platform Modernization Baseline

## Current Baseline

- `packages/contracts`: 统一响应解析、上传资产解析、统一 claims 基线。
- `packages/client-sdk`: 统一 `Bearer` 规范化与鉴权头拼装。
- `packages/domain-core`: 统一会话描述与企业化 claims 语义。
- `packages/mobile-core`: 统一移动端鉴权上传请求构造。
- `packages/admin-core`: 统一管理端受保护路由清单、模块分组、桌面壳模型、上传头能力。

## Desktop Delivery

- `admin-vue` 继续作为浏览器后台。
- `admin-win` 与 `admin-mac` 已建立独立根目录，采用 `Tauri + Vue` 壳层。
- 两个桌面端不再复制后台模块定义，统一复用 `packages/admin-core/src/route-registry.js` 和 `packages/admin-core/src/DesktopShellApp.vue`。

## Guardrails

- 公网运行态不再开放通用 `POST /api/upload`。
- 邀请页只允许 `POST /api/onboarding/invites/:token/upload`。
- 官网曝光提交只允许 `POST /api/official-site/exposures/assets`。
- 根脚本 `npm run verify:modernization` 会校验共享层、桌面壳和上传基线是否被回退。

## Next Migration Steps

- 把 `admin-vue` 的权限模型、菜单树、查询模型继续迁入 `packages/admin-core`。
- 把移动端上传、实时连接、鉴权刷新逐步迁到 `packages/mobile-core + packages/client-sdk`。
- 让 Go/BFF/Socket 的响应 envelope 与错误码枚举直接产出到 `packages/contracts`，替代各端手写常量。
