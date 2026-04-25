# Execution Ledger

Only active work belongs in this file. Remove each task section as soon as its acceptance and evidence are satisfied. Remove this file in the same change once no active task sections remain.

## TASK-20260425-ENV-001
- Source: 用户要求不能只改代码，必须把环境侧 secret 轮换与证据一起闭环。
- Goal: 完成 `dev / test / staging / prod` 的 secret 轮换、校验和留证。
- Scope: 环境变量、部署配置、支付/短信/数据库/Redis/桌面端本地密钥、运行手册与留证目录。
- Planned Changes: 生成轮换清单、执行各环境 secret 更新、验证服务启动与回归、归档轮换记录，并强制产出 `secret-rotation-gate` 报告供发布证据链消费。
- Risks: 服务启动失败、支付/短信/登录链路失效、旧 secret 残留。
- Acceptance: 所有高敏密钥完成轮换，生产类环境无默认值与 fallback secret，校验报告齐全。
- Evidence: 轮换记录、校验输出、环境对账表、签署记录、`secret-rotation-gate` 报告。
- Dependencies: 运维环境访问、第三方平台权限、服务重启窗口。

## TASK-20260425-RELEASE-001
- Source: 用户要求 staging 彩排、回滚演练、生产切换和签署证据全部闭环。
- Goal: 完成一次完整 staging 彩排、一次完整回滚演练，并准备生产冻结与集中切换材料。
- Scope: `scripts/release-*`、`artifacts/` 留证目录、staging/production 运行环境、业务回归清单。
- Planned Changes: 执行 preflight / drill / live-cutover / rollback-verify / failure-verify / manual-attestation / final-signoff，全量归档结果，并让 `release-evidence-gate` 强制依赖 `secret-rotation-gate + realtime-acceptance`。
- Risks: 演练口径不一致、证据缺漏、回滚窗口不足、发布冻结执行不严。
- Acceptance: 所有发布脚本产物齐全，staging 全链路演练通过，生产切换条件与回滚条件清晰可审计。
- Evidence: 全套 release 报告、人工签署文件、关键链路截图与录屏、回滚对账结果、`secret-rotation-gate`、`realtime-acceptance`、`evidence-gate`、`final-signoff` 报告。
- Dependencies: staging / production 环境可用、真机资源、发布窗口、运维配合。

## TASK-20260425-LOAD-001
- Source: 用户要求不是理论支持，而是十万混合业务压测真实可验收。
- Goal: 建立专用压测环境并完成 `10k / 30k / 60k / 100k` 四档长连与混合业务实测。
- Scope: `socket-server`、`backend/go`、`backend/bff`、Redis 高可用、PostgreSQL + PgBouncer、负载均衡策略、压测脚本与报告。
- Planned Changes: 落实 websocket-only 或 sticky 策略、专用实时 Redis 拓扑、PgBouncer、观测指标、风暴与故障脚本，并执行四档压测归档结果；每档报告必须补齐拓扑字段与证据字段后才能通过 `realtime-acceptance-gate`。
- Risks: 节点资源不足、Redis 热点、数据库连接池耗尽、重连风暴和广播风暴导致抖动。
- Acceptance: 四档报告齐全，`100k` 阶段满足既定 p95/p99、错误率、恢复时延与 RTC 信令目标。
- Evidence: 拓扑图、压测配置、阶段报告、指标截图、故障演练记录、`realtime-acceptance` 报告、最终验收结论。
- Dependencies: 专用压测环境、负载均衡与 Redis/PgBouncer 配置、真机与自动化压测资源。
