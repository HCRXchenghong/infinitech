# Code Audit And Repair Plan

## Audit Date
- 2026-03-21

## Current Status
- The repository originally had multiple P0 and P1 issues across socket auth, admin auth, secret management, and unfinished business flows.
- Repair work started from the highest-risk security and platform-baseline items and is continuing in prioritized batches.
- This document tracks what has already been fixed and what is still pending.

## Batch 1 Completed
- Lock down `socket-server/api/generate-token`
- Bind socket sessions to validated business auth
- Stop trusting client-provided `senderId` and `senderRole`
- Add support-room ACL checks for official support rooms and order-scoped chat rooms
- Update active admin / merchant / rider / user clients to request socket tokens with their business auth

### Batch 1 Fixed
- Anonymous socket token issuance
- Socket sender identity forgery
- Support namespace room join and message-load overreach
- Rider namespace sender identity forgery
- Admin / merchant / rider / user client socket token acquisition without business auth
- Socket server default-open CORS fallback for browser requests

## Batch 2 Completed
- Replace BFF admin 鈥減robe a business endpoint to validate login鈥?flow with local signed-token verification
- Unify admin token secret source between Go and BFF
- Remove hard-coded LAN fallback addresses in core backend config defaults
- Disable unsafe default financial second-confirm credentials
- Fix admin notification detail lookup so unpublished items can be viewed in management

### Batch 2 Fixed
- `backend/bff` admin auth no longer depends on `/api/stats` health to decide whether a token is valid
- `backend/go` admin token signing no longer uses a hard-coded built-in secret
- BFF CORS is now allowlist-based instead of `app.use(cors())`
- Go / BFF core backend defaults now prefer `127.0.0.1` over hard-coded LAN IPs
- Financial log delete / clear is blocked when second-confirm credentials are not configured
- Admin notification detail now reads unpublished content through a dedicated repository path
- Shop menu repository no longer returns a hard-coded empty array and now queries active products for the target shop

## Batch 3 Completed
- Harden admin QR login flows so scan / confirm only trust verified admin identities
- Stop exposing SMS verification codes to normal clients and normal logs by default
- Add real user phone-change backend flow and wire it through BFF
- Replace user and app-mobile phone-change mock pages with real verification + update flow
- Tighten rider phone-change page so it validates the old code before step 2 and cleanly handles post-change re-auth expectations

### Batch 3 Fixed
- `backend/bff` QR login scan / confirm no longer fall back to unverified token payloads before signature checks
- `backend/go` SMS service now hides `code` unless `SMS_DEBUG_EXPOSE_CODE=true`
- SMS issue logs no longer print verification codes in normal runtime
- User phone-change now has a real Go handler, route-guard rule, and BFF proxy path
- User phone-change now re-issues access / refresh tokens after the phone number changes
- `user-vue` and `app-mobile` phone-change pages now call real SMS and change-phone APIs instead of only mutating local storage
- Rider phone-change page now verifies the old-phone code before entering step 2 and sends explicit `targetType` for shared SMS scenes

## Batch 4 Completed
- Add real notification read-state persistence instead of static `is_read = false`
- Require auth on official notification list/detail/read APIs and expose unread summary metadata
- Wire BFF, user-vue, and app-mobile notification list/detail/message-center pages to the new read-state flow
- Replace the fragile rider phone-change handler path with a clean secured handler that validates account ownership and returns a fresh rider token when available

### Batch 4 Fixed
- `backend/go` official notifications now persist per-actor read records in `notification_read_records`
- Official notification list responses now return real `is_read` state plus unread-count / latest-notification summary metadata
- Official notification detail pages now mark the notification as read through an explicit write endpoint instead of relying on fake local state
- Message-center official-notification badges in `user-vue` and `app-mobile` no longer use hard-coded unread counts
- Message-center "clear unread" now clears both local chat unread state and official-notification unread state through the backend
- Rider change-phone now runs through `SecureChangePhone`, validates old-phone ownership, rejects same-number changes, checks duplicate use, and returns a fresh access token when issuance succeeds

## Batch 5 Completed
- Add a real user profile update flow for nickname / avatar / header background instead of local-only edits
- Route mobile reverse-geocode calls through the backend unified map endpoint so the map provider can be swapped later without touching clients
- Correct finance user-detail accounting so `totalIncome` is not double-counted and cancelled orders do not inflate order income

### Batch 5 Fixed
- `backend/go` users now persist `avatarUrl` and `headerBg`, and `/api/user/:id` now supports authenticated `PUT` profile updates
- User auth / refresh responses now return the richer user payload shape used by profile pages
- `backend/bff` now proxies `PUT /api/user/:id` for the mobile clients
- `user-vue` and `app-mobile` profile edit pages now load real user data, upload avatar / background images, submit profile updates to the backend, and only use local storage as a synced cache
- `user-vue` and `app-mobile` reverse geocoding now goes through `/api/mobile/maps/reverse-geocode` instead of returning fake coordinate strings
- Go mobile map service fallback URLs now align to `127.0.0.1` defaults instead of a hard-coded LAN address
- Finance user-detail aggregation no longer adds rider / merchant order income into `totalIncome` a second time, and only completed orders contribute to `orderIncome`
- Rider history orders now only read from `/api/riders/:id/orders` and no longer fall back to the unauthorized `/api/orders` path

## Batch 6 Completed
- Add a real image-captcha backend flow for registration throttling instead of leaving the registration pages pointed at a non-existent `/api/captcha`
- Require captcha after repeated registration SMS sends and verify the captcha server-side before issuing more SMS codes
- Proxy captcha images through the BFF so H5 / uni-app clients keep a single API origin

### Batch 6 Fixed
- `backend/go` now persists captcha challenges and serves `GET /api/captcha` as an SVG image
- Registration SMS sending now escalates to `needCaptcha=true` after repeated requests and validates `captcha + sessionId` before sending another code
- `backend/bff` now proxies `GET /api/captcha` and supports non-JSON proxy response types for image flows
- `user-vue` and `app-mobile` registration pages now always refresh the captcha image when the backend requires captcha

## Batch 7 Completed
- Replace rider task-page fake exception reporting with a real authenticated order exception-report flow
- Replace fake rider task navigation with system-map navigation when coordinates exist and address-copy fallback when they do not
- Unify rider task contact actions so list/detail pages share the same phone and chat behavior
- Fix rider task status advancement feedback so pickup no longer reports as completed

### Batch 7 Fixed
- `backend/go` now persists latest order exception metadata plus capped exception history on orders, and exposes `POST /api/orders/:id/exception-report`
- Order exception reporting now derives reporter identity from route-guard auth context instead of trusting client-supplied rider identifiers
- `backend/bff` now proxies `/api/orders/:id/exception-report`
- `rider-app` task list and task detail now submit real exception reports instead of front-end timeout mocks
- `rider-app` task list and task detail now use shared task action helpers for navigation, chat, and phone calls instead of duplicated fake logic
- Rider task navigation now opens system navigation when coordinates are available and otherwise copies the target address for manual navigation
- Rider task pickup now correctly shows 鈥滃紑濮嬮厤閫佲€?and only completed deliveries show 鈥滆鍗曞凡瀹屾垚鈥?
## Batch 8 Completed
- Replace homepage hard-coded category source with backend shop categories while keeping local display metadata as a fallback layer
- Remove the Windows Go verification blockers so `go build` / `go test` no longer fail on Unix-only process flags, CGO-only sqlite test wiring, or vet-invalid SMS errors

### Batch 8 Fixed
- `user-vue` and `app-mobile` home pages now load categories from `/api/shops/categories` and fall back to local display config only when the backend returns empty or errors
- `user-vue` and `app-mobile` category display builders now merge backend category names / counts with stable local icon and background assets instead of treating mock data as the source of truth
- `backend/go` OpenClaw gateway detached-process attributes are now split by platform build tags, so Windows no longer compiles Unix-only `SysProcAttr.Setpgid`
- `backend/go` SMS service no longer uses a variable directly as a `fmt.Errorf` format string, removing the vet failure in current Go toolchains
- `backend/go` sync-service tests now use the pure-Go sqlite driver already present in the repo and explicitly close temp database handles on cleanup
- Current Windows environment now passes both `go test ./...` and `go build ./cmd`

## Batch 9 Completed
- Add immutable audit snapshots before financial transaction-log delete and clear operations
- Preserve operator identity, mutation reason, and clear-batch grouping for sensitive financial log mutations without changing the existing admin flow

### Batch 9 Fixed
- `backend/go` now auto-migrates `financial_log_audits` to store pre-delete snapshots for wallet transactions and admin wallet operations
- Single-record financial log deletion now writes an audit snapshot before the actual delete executes
- Bulk financial log clear now archives every affected record in batches before deleting, and ties the whole mutation together with a shared `batchId`
- Financial log audits now record operator role / id / name from auth context plus a normalized mutation reason
- `backend/bff` financial controller now forwards `reason` for delete / clear requests and writes it into operation logs

## Batch 10 Completed
- Replace chat-page placeholder voice behavior with a real record-upload-send flow
- Promote location sharing from disguised plain text to a first-class message type with map opening fallback
- Keep support/admin chat list previews readable for the new message types and serve uploaded audio files with proper MIME types

### Batch 10 Fixed
- `user-vue` and `app-mobile` chat pages now support `audio` and `location` message rendering instead of collapsing everything into plain text
- User-side chat pages now record voice on first mic tap, stop/send on second tap, upload the recording through the existing socket upload endpoint, and play audio inline
- User-side location sharing now sends structured `location` payloads and opens the system map when users tap the message bubble
- Legacy `[浣嶇疆] ... (lat,lng)` text messages now hydrate into clickable location cards instead of staying plain text forever
- `socket-server` support chat list previews now show `[璇煶]` / `[浣嶇疆]` correctly instead of leaking raw payloads or mojibake placeholders
- `socket-server` uploaded file serving now returns audio MIME types for `.mp3/.m4a/.aac/.wav/.ogg/.amr`

## Batch 11 Completed
- Remove the remaining hard-coded LAN runtime defaults from active source code
- Keep local service fallbacks on loopback, and move public invite / coupon link generation to environment-driven public bases

### Batch 11 Fixed
- `merchant-app` BFF probing now falls back to `127.0.0.1` instead of a baked `192.168.0.103`
- HEIC image conversion now reads `HEIC_CONVERTER_URL` and otherwise uses `http://127.0.0.1:9899/convert`
- OpenClaw gateway enablement now defaults to a loopback gateway URL when no explicit gateway URL is supplied
- Onboarding invite links now resolve from `ONBOARDING_INVITE_BASE_URL` or shared `PUBLIC_LANDING_BASE_URL`, with a safe public fallback instead of a private LAN IP
- Coupon claim links now resolve from `COUPON_CLAIM_LINK_BASE_URL` or shared `PUBLIC_LANDING_BASE_URL`, with the same public fallback behavior

## Batch 12 Completed
- Rewrite the broken user/app settings pages in clean UTF-8 and connect the password-change entry to the real reset-password flow
- Replace the invite-friends placeholder pages with real invite-code loading, share-record persistence, and copyable invite content

### Batch 12 Fixed
- `user-vue` and `app-mobile` settings pages now route `淇敼瀵嗙爜` to `/pages/auth/reset-password/index` instead of an empty placeholder path
- The same settings pages were rewritten as clean UTF-8 source, removing the visible mojibake that had leaked into user-facing copy
- `user-vue` and `app-mobile` invite-friends pages now load invite codes from `/api/invite/code`, fall back to cached/local codes only when needed, and persist the resolved code locally
- Invite-friends `绔嬪嵆閭€璇穈 now records a share action through `/api/invite/share` and copies a full invite message instead of showing a fake 鈥滃紑鍙戜腑鈥?toast
- Invite-friends pages now expose explicit copy actions for both raw invite codes and full invite copy, so the flow is usable even before native/social share integrations are expanded

## Batch 13 Completed
- Close the invite-code registration path end to end without leaving the backend in a broken state
- Normalize invite records so share events and registration events join up cleanly in admin views

### Batch 13 Fixed
- `user-vue` and `app-mobile` register pages now accept optional `inviteCode`, prefill it from route params, and submit it with the registration payload
- `backend/go/internal/service/auth_service.go` now validates invite codes during registration, rejects self-invite / invalid invite usage, and remains fully compilable after cleanup of historical mojibake damage
- Registration now updates the latest matching `shared` invite record into `registered` with invitee identity data when possible, instead of always creating a duplicate record
- Admin operations center invite tables now show `invitee_user_id`, `invitee_phone`, and `reward_points`, so invite conversion records are visible to ops instead of staying half-blind

## Batch 14 Completed
- Settle invite registration rewards into the points ledger with idempotent bookkeeping
- Lock the invite reward flow with an integration-style service test that runs with the real unified-ID bootstrap

### Batch 14 Fixed
- `backend/go/internal/config/config.go` now exposes `INVITE_REGISTER_REWARD_POINTS`, so invite reward values are configurable instead of being baked into service logic
- `backend/go/internal/service/auth_service.go` now writes one `points_ledger` reward entry for the inviter, upgrades invite records from `registered` to `rewarded`, and keeps settlement idempotent by business key
- Invite reward settlement now works for both freshly created invite records and older `shared` invite records that are being converted during registration
- `backend/go/internal/service/auth_service_invite_test.go` now verifies invite-code registration, invite-record conversion, and inviter reward ledger creation in one path

## Batch 15 Completed
- Add a public runtime-settings surface so client pages stop hardcoding unfinished entry points
- Rewrite the invite / auth entry pages in clean UTF-8 and replace fake WeChat buttons with config-driven exposure

### Batch 15 Fixed
- `backend/go/internal/service/service_settings.go` now carries `invite_landing_url`, `wechat_login_enabled`, and `wechat_login_entry_url`, validates them, and exposes a sanitized `PublicRuntimeSettings` response for unauthenticated clients
- `backend/go/internal/handler/admin_settings_handler.go`, `backend/go/cmd/main.go`, `backend/bff/src/services/adminSettingsService.js`, and `backend/bff/src/routes/index.js` now expose `GET /api/public/runtime-settings`, so frontends can read safe runtime config without leaking admin-only map keys
- `admin-vue/src/views/Settings.vue` and `admin-vue/src/views/settingsHelpers.js` now let ops configure the invite landing page and the external WeChat login entry inside system settings
- `user-vue/shared-ui/api.js` and `app-mobile/shared-ui/api.js` now provide `fetchPublicRuntimeSettings`, so invite and auth pages stop baking runtime assumptions into client code
- `user-vue/pages/profile/invite-friends/index.vue` and `app-mobile/pages/profile/invite-friends/index.vue` were rewritten in clean UTF-8, now generate copyable invite links from configured landing pages, and keep share-record persistence on `/api/invite/share`
- `user-vue/pages/auth/login/index.vue`, `app-mobile/pages/auth/login/index.vue`, `user-vue/pages/auth/register/index.vue`, and `app-mobile/pages/auth/register/index.vue` were rewritten in clean UTF-8; WeChat entry buttons now only render when `public/runtime-settings` exposes a usable configured entry URL instead of always showing a dead placeholder
- `backend/go/internal/service/service_settings_test.go` now locks the public runtime-settings sanitization rule so a half-configured WeChat entry cannot leak into client UI

## Batch 16 Completed
- Replace the fake SMS provider path with a real Aliyun SMS implementation and admin-manageable configuration
- Normalize the SMS config schema so old settings payloads and new admin pages do not overwrite each other

### Batch 16 Fixed
- `backend/go/internal/service/sms_service.go` was rewritten in clean UTF-8, now validates scenes and phone state cleanly, calls a real provider before persisting codes, and stops treating SMS as a fake local-only success path
- `backend/go/internal/service/sms_provider_config.go` now defines the normalized SMS config contract, supports legacy fields like `access_key/sign/template_id`, preserves existing secrets on admin updates, and validates Aliyun config completeness
- `backend/go/internal/service/sms_provider_aliyun.go` now sends verification codes through the official Aliyun SMS Go SDK with `SendSms`, request tracing, region/endpoint support, and provider-level error surfacing
- `backend/go/internal/handler/admin_settings_handler.go` now returns masked admin SMS config payloads and stores normalized Aliyun config instead of blindly persisting arbitrary JSON
- `admin-vue/src/views/smsConfigHelpers.js`, `admin-vue/src/views/settingsHelpers.js`, `admin-vue/src/views/apiManagementHelpers.js`, and `admin-vue/src/views/settingsHelpers/sms.js` now share one SMS config normalizer/payload builder, so system settings and API management pages stop drifting
- `admin-vue/src/views/Settings.vue` and `admin-vue/src/views/ApiManagement.vue` now expose Aliyun-specific fields: `AccessKey ID`, `AccessKey Secret`, `签名`, `模板 Code`, `区域`, and optional `Endpoint`
- `backend/go/internal/service/sms_provider_config_test.go` now locks legacy-field compatibility, secret masking, and config validation rules

## Batch 17 Completed
- Finish the real WeChat login flow across the Go API, BFF, user-vue, app-mobile, and admin settings
- Replace the remaining auth-entry placeholders and lingering mojibake on the user-facing auth path

### Batch 17 Fixed
- `backend/go/internal/repository/user_repository.go` and `backend/go/internal/repository/external_auth_session_model.go` now persist WeChat identity fields plus short-lived external auth sessions, so OAuth results are no longer shoved directly into redirect query strings
- `backend/go/internal/service/wechat_login_config.go`, `backend/go/internal/service/auth_service_wechat.go`, `backend/go/internal/handler/auth_handler_wechat.go`, `backend/go/internal/handler/admin_settings_handler_wechat.go`, `backend/go/internal/middleware/route_guard.go`, and `backend/go/cmd/main.go` now provide a real WeChat OAuth start/callback/session/bind-login flow plus admin-manageable WeChat app configuration
- `backend/go/internal/service/auth_service.go` now accepts `wechatBindToken` during registration and binds the validated WeChat identity inside the registration transaction instead of leaving registration and binding split across fake client steps
- `backend/bff/src/controllers/authController.js`, `backend/bff/src/routes/auth.js`, `backend/bff/src/services/adminSettingsService.js`, and `backend/bff/src/routes/admin.js` now proxy the WeChat auth and admin-config endpoints cleanly through the BFF
- `user-vue/shared-ui/api.js` and `app-mobile/shared-ui/api.js` now expose `consumeWechatSession` and `wechatBindLogin`, so the mobile/web auth pages can consume once-only WeChat sessions and bind existing accounts without raw ad-hoc requests
- `user-vue/pages/auth/login/index.vue`, `user-vue/pages/auth/register/index.vue`, `user-vue/pages/auth/wechat-callback/index.vue`, `app-mobile/pages/auth/login/index.vue`, `app-mobile/pages/auth/register/index.vue`, and `app-mobile/pages/auth/wechat-callback/index.vue` were rewritten in clean UTF-8 and now implement the real client flow: start OAuth, consume callback sessions, bind existing accounts, bind on registration, and auto-login after successful registration
- `user-vue/pages.json` and `app-mobile/pages.json` now register the WeChat callback route, so OAuth callbacks have an actual landing page instead of falling into a missing route
- `admin-vue/src/views/Settings.vue` now exposes a dedicated WeChat login settings card for `enabled`, `app_id`, `app_secret`, `callback_url`, and `scope`, so ops can manage the OAuth credentials without patching settings by hand
- `backend/go/internal/service/wechat_login_config.go` was renamed internally to avoid helper-name collisions with the existing shop service helpers, restoring clean Go compilation on the merged codebase
- `backend/go/internal/service/wechat_login_config_test.go` now locks legacy-key normalization, secret-preserving merges, masked admin views, and enabled-config validation rules for the new WeChat config surface

## Batch 18 Completed
- Remove source-level mojibake and broken template/tag issues from the user-facing profile and settings entry pages
- Replace dead-end settings stubs with real navigation and persisted local preference toggles

### Batch 18 Fixed
- `user-vue/pages/profile/index/index.vue` and `app-mobile/pages/profile/index/index.vue` were rewritten in clean UTF-8, now load synced profile data safely, render a valid profile header again, and stop shipping malformed strings / broken template nodes
- `user-vue/pages/profile/index/index.scss` and `app-mobile/pages/profile/index/index.scss` were rebuilt into valid SCSS, fixing the previously corrupted selectors that had effectively commented out whole blocks of profile-page styling
- `user-vue/pages/profile/settings/index.vue` and `app-mobile/pages/profile/settings/index.vue` now provide a clean settings home with working account/security navigation, local preference persistence, cache cleanup, update checks, and logout instead of corrupted text and broken markup
- `user-vue/pages/profile/settings/detail/index.vue` and `app-mobile/pages/profile/settings/detail/index.vue` now route to real downstream pages, persist extended local preferences, and remove the remaining placeholder-only settings actions from this entry path

## Batch 19 Completed
- Retire the broken `menus` pseudo-sync path and make shop product/menu reads use the real `products` dataset cache contract
- Remove the remaining active homepage imports from `mock-data` naming and clean the stale menu repository dead code

### Batch 19 Fixed
- `user-vue/shared-ui/api.js` and `app-mobile/shared-ui/api.js` now load shop product lists through `syncService.getData('products', { shop_id })`, normalize wrapped responses, preserve display order, and make `fetchShopMenu` an alias of the real product list instead of writing incompatible product rows into the legacy `menus` table
- `user-vue/shared-ui/sync.ts` and `app-mobile/shared-ui/sync.ts` no longer advertise `menus` as a background sync dataset, so app startup stops polling a legacy dataset that had no valid version contract
- `user-vue/shared-ui/home-categories.js`, `app-mobile/shared-ui/home-categories.js`, `user-vue/pages/index/index.vue`, and `app-mobile/pages/index/index.vue` now use an explicit homepage-category display module instead of pulling live entry pages from a `mock-data` import path
- `backend/go/internal/repository/shop_repository.go` had the stale unreachable fallback removed after the real `GetShopMenu` database implementation, so the repository no longer advertises an empty-array path that can never execute

## Batch 20 Completed
- Remove remaining active rider-side imports from `mock-data` naming on the task exception path
- Delete dead rider profile placeholder branches that were no longer rendered but still preserved `功能开发中` fallback behavior

### Batch 20 Fixed
- `rider-app/shared-ui/task-report-reasons.ts`, `rider-app/pages/tasks/index-logic.ts`, and `rider-app/pages/tasks/detail-logic.ts` now use an explicit task-exception constants module instead of importing active task flow data from `mock-data`
- `rider-app/pages/profile/index-logic.ts` no longer carries the unused `tools` collection and `handleToolClick` placeholder branch, removing dead navigation paths that were disconnected from the rendered profile page

## Batch 21 Completed
- Replace the homepage-entry `同频饭友` mock page with a real authenticated backend flow
- Remove visible mojibake from the dining-buddy user/app pages while keeping the existing visual shell and category interactions
- Lock the new dining-buddy create/join/chat path with a real Go service test

### Batch 21 Fixed
- `backend/go/internal/repository/dining_buddy_models.go`, `backend/go/internal/service/dining_buddy_service.go`, `backend/go/internal/handler/dining_buddy_handler.go`, `backend/go/internal/service/services.go`, `backend/go/internal/handler/handlers.go`, `backend/go/internal/middleware/route_guard.go`, `backend/go/internal/idkit/codebook.go`, and `backend/go/cmd/main.go` now provide a real `同频饭友` data model plus `/api/dining-buddy/parties`, `/api/dining-buddy/parties/:id/join`, and `/api/dining-buddy/parties/:id/messages` endpoints with membership checks, system messages, and unified IDs
- `backend/bff/src/controllers/diningBuddyController.js`, `backend/bff/src/routes/diningBuddy.js`, and `backend/bff/src/routes/index.js` now proxy the dining-buddy endpoints through the BFF instead of leaving the page stranded on local-only state
- `user-vue/shared-ui/api.js` and `app-mobile/shared-ui/api.js` now expose real dining-buddy list/create/join/message API wrappers
- `user-vue/pages/dining-buddy/index.vue` and `app-mobile/pages/dining-buddy/index.vue` were rewritten in clean UTF-8; the active page no longer seeds fake parties, fake replies, or local-only chat state, and now polls real backend messages after users join a party
- `backend/go/internal/service/dining_buddy_service_test.go` now verifies create -> join -> send-message -> member-only message access on the real sqlite + unified-ID bootstrap path

## Batch 22 Completed
- Remove visible mojibake from the active search pages and stop carrying front-end fake-delay behavior
- Keep search results wired to the real shop dataset while cleaning up the search-history and hot-keyword UX

### Batch 22 Fixed
- `user-vue/pages/search/index/index.vue` and `app-mobile/pages/search/index/index.vue` were rewritten in clean UTF-8, so the active search page no longer leaks garbled Chinese into placeholders, buttons, state text, and hot keywords
- The same two search pages now filter the real `fetchShops()` result set immediately instead of wrapping local filtering in a fake `setTimeout` delay
- Search history persistence is now normalized to one storage key with de-duplication and a 10-item cap, which removes repeated stale entries when users repeatedly tap the same keyword

## Batch 23 Completed
- Replace the active errand flow's local fake order creation with real authenticated order creation and detail loading
- Teach the order service to preserve errand-specific structured fields so user/app pages no longer need local cache-only fallback data
- Remove the stale legacy errand entry page's local fake-order branch to avoid future accidental reuse

### Batch 23 Fixed
- `backend/go/internal/service/order_service.go` now recognizes errand service types, stores `serviceType/serviceDescription/errandRequest/errandLocation/errandRequirements/deliveryFee/productPrice`, and returns those fields from create/list/detail responses so errand pages can render from the real backend contract instead of `lastErrandOrder`
- `user-vue/shared-ui/errand.js` and `app-mobile/shared-ui/errand.js` now centralize errand identity resolution, payload shaping, and order mapping, which removes duplicated local fake-order assembly across the user and app clients
- `user-vue/pages/errand/home/index.vue`, `user-vue/pages/errand/buy/index.vue`, `user-vue/pages/errand/deliver/index.vue`, `user-vue/pages/errand/pickup/index.vue`, `user-vue/pages/errand/do/index.vue`, and `user-vue/pages/errand/detail/index.vue` now use real `createOrder`, `fetchOrders`, and `fetchOrderDetail` calls, so recent orders, order details, and all four errand order types are bound to real backend data
- `app-mobile/pages/errand/home/index.vue`, `app-mobile/pages/errand/buy/index.vue`, `app-mobile/pages/errand/deliver/index.vue`, `app-mobile/pages/errand/pickup/index.vue`, `app-mobile/pages/errand/do/index.vue`, and `app-mobile/pages/errand/detail/index.vue` were aligned to the same real errand flow to keep both client implementations in sync
- `user-vue/pages/errand/index/index.vue` and `app-mobile/pages/errand/index/index.vue` are now legacy redirect pages instead of carrying dead local-only fake order logic

## Batch 24 Completed
- Replace the active medicine order flow's local storage fake-order path with real authenticated order creation
- Replace the active medicine tracking page's timer simulation with real order-detail rendering from the backend contract
- Reuse the new errand-order contract so medicine delivery no longer drifts into a private front-end-only implementation

### Batch 24 Fixed
- `user-vue/pages/medicine/order.vue` and `app-mobile/pages/medicine/order.vue` now submit real orders through `createOrder`, require a logged-in user identity, support real prescription image upload through `uploadCommonImage`, and navigate to tracking with the created order ID instead of writing `medicine_last_order` into local storage
- `user-vue/pages/medicine/tracking.vue` and `app-mobile/pages/medicine/tracking.vue` now load real order detail via `fetchOrderDetail`, map backend errand-order fields into medicine-delivery progress/rider/address/fee cards, and no longer fake status transitions with chained `setTimeout`
- `user-vue/shared-ui/errand.js` and `app-mobile/shared-ui/errand.js` now support service-name/shop-name overrides plus rider identity mapping, allowing the medicine delivery pages to share the same backend contract as the main errand flow without losing their medicine-specific presentation

## Batch 25 Completed
- Replace the active medicine consultation page's front-end keyword rules with a real backend consult API
- Keep the existing consultation UI shell, but move symptom classification and medicine suggestion generation behind Go + BFF routes
- Add automated service coverage so the new consult API has regression protection before later swapping to a real LLM provider

### Batch 25 Fixed
- `backend/go/internal/service/medicine_service.go`, `backend/go/internal/handler/medicine_handler.go`, `backend/go/internal/service/services.go`, `backend/go/internal/handler/handlers.go`, `backend/go/internal/middleware/route_guard.go`, and `backend/go/cmd/main.go` now provide a real authenticated `POST /api/medicine/consult` endpoint with symptom classification, emergency escalation wording, medicine suggestion output, and service tests in `backend/go/internal/service/medicine_service_test.go`
- `backend/bff/src/controllers/medicineController.js`, `backend/bff/src/routes/medicine.js`, and `backend/bff/src/routes/index.js` now proxy the medicine consult API through the BFF instead of leaving the mobile/web clients tied to local keyword branches
- `user-vue/shared-ui/api.js` and `app-mobile/shared-ui/api.js` now expose `consultMedicineAssistant`
- `user-vue/pages/medicine/chat.vue` and `app-mobile/pages/medicine/chat.vue` now call the real consult API and no longer keep symptom matching, medicine suggestion generation, or artificial 900ms fake reply delays in the front end

## Batch 26 Completed
- Move medicine-home hotline and operational copy into admin-configurable runtime settings
- Remove the fake medicine hotline number from active front-end pages and replace it with safe runtime fallback logic
- Keep the platform configuration surface centralized so map, invite, WeChat login, and medicine-service operations all live under the same service-settings model

### Batch 26 Fixed
- `backend/go/internal/service/service_settings.go` and `backend/go/internal/service/service_settings_test.go` now define, normalize, validate, and expose `medicine_support_phone`, `medicine_support_title`, `medicine_support_subtitle`, `medicine_delivery_description`, and `medicine_season_tip`, with public-runtime output falling back to `service_phone` when a dedicated medicine hotline is not configured
- `admin-vue/src/views/settingsHelpers.js` and `admin-vue/src/views/Settings.vue` now let operations configure medicine-home hotline and copy from the admin system-settings page instead of leaving those values hardcoded in the client
- `user-vue/pages/medicine/home.vue` and `app-mobile/pages/medicine/home.vue` were rewritten as clean UTF-8 pages that load `fetchPublicRuntimeSettings()`, render admin-configured medicine operational copy, and refuse to dial when no hotline is configured instead of calling the old fake number

## Batch 27 Completed
- Replace the charity page's static demo data with an admin-configurable runtime settings model
- Add a dedicated public/admin charity-settings contract instead of overloading the generic service-settings payload
- Remove the front-end fake donation increment path so charity participation messaging is now honest and configuration-driven

### Batch 27 Fixed
- `backend/go/internal/service/charity_settings.go`, `backend/go/internal/service/charity_settings_test.go`, `backend/go/internal/handler/admin_settings_handler.go`, `backend/go/internal/middleware/route_guard.go`, and `backend/go/cmd/main.go` now define, validate, persist, and expose `charity_settings` plus a public `GET /api/public/charity-settings` payload
- `backend/bff/src/services/adminSettingsService.js`, `backend/bff/src/routes/admin.js`, and `backend/bff/src/routes/index.js` now proxy both admin and public charity-settings routes through the BFF
- `admin-vue/src/views/settingsHelpers.js` and `admin-vue/src/views/Settings.vue` now give operations a dedicated charity configuration surface for page copy, hero data, status metrics, join URL, leaderboard entries, and news items
- `user-vue/shared-ui/api.js`, `app-mobile/shared-ui/api.js`, `user-vue/pages/charity/index.vue`, and `app-mobile/pages/charity/index.vue` now load charity runtime settings from the backend, render empty states honestly when no content is configured, and stop mutating fake donation totals in the client

## Batch 28 Completed
- Move rider exception-report reasons into admin-configurable runtime settings
- Remove the active rider task flow's dependency on `mock-data` for exception-report content
- Keep rider map/config/runtime data centralized under system settings so future map-provider changes do not require app re-release

### Batch 28 Fixed
- `backend/go/internal/service/service_settings.go` and `backend/go/internal/service/service_settings_test.go` now define, normalize, validate, and publicly expose `rider_exception_report_reasons`
- `admin-vue/src/views/settingsHelpers.js` and `admin-vue/src/views/Settings.vue` now provide a dedicated rider-fulfillment configuration card so operations can maintain exception-report reasons directly in system settings
- `rider-app/shared-ui/api.ts`, `rider-app/shared-ui/task-report-reasons.ts`, `rider-app/pages/tasks/index-logic.ts`, and `rider-app/pages/tasks/detail-logic.ts` now load exception-report reasons from public runtime settings instead of from `mock-data`

## Batch 29 Completed
- Replace the VIP center's front-end hardcoded level data with an admin-configurable `vip_settings` contract
- Remove fake VIP progress and task-progress numbers from the active member-center page, while keeping real points and points-mall integration
- Rebuild the active VIP center files as clean UTF-8 runtime-driven pages so the remaining member-entry experience no longer depends on garbled static copy

### Batch 29 Fixed
- `backend/go/internal/service/vip_settings.go`, `backend/go/internal/service/vip_settings_test.go`, `backend/go/internal/handler/admin_settings_handler.go`, `backend/go/internal/middleware/route_guard.go`, and `backend/go/cmd/main.go` now provide validated admin/public `vip_settings` endpoints
- `backend/bff/src/services/adminSettingsService.js`, `backend/bff/src/routes/admin.js`, and `backend/bff/src/routes/index.js` now proxy both admin and public VIP settings routes through the BFF
- `admin-vue/src/views/vipSettingsHelpers.js`, `admin-vue/src/views/settingsHelpers.js`, and `admin-vue/src/views/Settings.vue` now provide an operations-facing VIP center configuration surface for levels, benefits, growth tasks, and points rules
- `user-vue/shared-ui/api.js`, `app-mobile/shared-ui/api.js`, `user-vue/pages/profile/vip-center/vip-data.js`, `user-vue/pages/profile/vip-center/page-options.js`, `user-vue/pages/profile/vip-center/index.vue`, `app-mobile/pages/profile/vip-center/vip-data.js`, `app-mobile/pages/profile/vip-center/page-options.js`, and `app-mobile/pages/profile/vip-center/index.vue` now render the member center from runtime settings plus live points data instead of from garbled hardcoded VIP arrays

## Batch 30 Completed
- Move active customer-service title and welcome copy into admin-configurable `service_settings`
- Remove duplicated hardcoded support branding from user/app active客服页、消息会话页和骑手客服主入口
- Keep support runtime data centralized under `public/runtime-settings` so later运营改名 does not require app code changes

### Batch 30 Fixed
- `backend/go/internal/service/service_settings.go` and `backend/go/internal/service/service_settings_test.go` now define, normalize, validate, and publicly expose `support_chat_title` plus `support_chat_welcome_message`
- `admin-vue/src/views/settingsHelpers.js` and `admin-vue/src/views/Settings.vue` now let operations maintain support-chat title and welcome copy directly in system settings
- `user-vue/shared-ui/support-runtime.js`, `app-mobile/shared-ui/support-runtime.js`, and `rider-app/shared-ui/support-runtime.ts` now provide cached runtime support-config loaders for each active client
- `user-vue/pages/profile/customer-service/page-logic.js`, `user-vue/pages/profile/customer-service/index.vue`, `app-mobile/pages/profile/customer-service/page-logic.js`, and `app-mobile/pages/profile/customer-service/index.vue` now render admin-configured support titles and welcome messages instead of hardcoded defaults
- `user-vue/pages/message/chat/page-logic.js`, `app-mobile/pages/message/chat/page-logic.js`, `user-vue/pages/message/index/index.vue`, and `app-mobile/pages/message/index/index.vue` now derive support-session names from runtime settings instead of hardcoding `官方客服`
- `rider-app/pages/service/index-logic.ts`, `rider-app/pages/service/service-data-methods.ts`, `rider-app/utils/message-manager.ts`, and `rider-app/utils/notification.ts` now consume runtime support titles instead of hardcoding `在线客服`

## Batch 31 Completed
- Extend support runtime consumption to the merchant-side active entry points and remaining rider/user visible support labels
- Remove platform-name hardcoding from active phone-warning prompts so support naming stays consistent with admin settings
- Reduce remaining live support-name drift to defaults/mock/static navigation config instead of business entry flows

### Batch 31 Fixed
- `merchant-app/shared-ui/api.ts` and `merchant-app/shared-ui/support-runtime.ts` now provide a merchant-side runtime support-config loader on top of `GET /api/public/runtime-settings`
- `merchant-app/pages/index/index.vue`, `merchant-app/pages/orders/detail.vue`, and `merchant-app/pages/messages/chat.vue` now render support titles from runtime settings and stop passing hardcoded `官方客服` into merchant support-chat routes
- `user-vue/components/PhoneWarningModal.vue` and `app-mobile/components/PhoneWarningModal.vue` now render the support title from runtime settings instead of hardcoding the platform name
- `rider-app/pages/profile/index-logic.ts`, `rider-app/pages/profile/index.vue`, and `rider-app/pages/profile/developer.vue` now reuse runtime support titles for the rider personal-center entry and local notification test payloads

## Batch 32 Completed
- Unify static support fallback naming so configuration misses no longer fall back to two different support brands
- Replace remaining active static support page titles with neutral defaults that are compatible with runtime overrides
- Clean the final stale support-name residues out of tests and active source files

### Batch 32 Fixed
- `backend/go/internal/service/service_settings.go`, `backend/go/internal/service/service_settings_test.go`, `admin-vue/src/views/settingsHelpers.js`, and `admin-vue/src/views/Settings.vue` now use `平台客服` as the neutral default support fallback copy instead of mixed `官方客服 / 在线客服`
- `user-vue/shared-ui/support-runtime.js`, `app-mobile/shared-ui/support-runtime.js`, `merchant-app/shared-ui/support-runtime.ts`, and `rider-app/shared-ui/support-runtime.ts` now share the same neutral fallback support branding
- `user-vue/pages.json`, `app-mobile/pages.json`, and `rider-app/pages.json` now use neutral static `navigationBarTitleText` defaults for support pages so runtime title updates no longer fight old labels
- `rider-app/pages/service/index-logic.ts`, `rider-app/pages/service/service-data-methods.ts`, and `rider-app/shared-ui/mock-data.ts` now drop the old `在线客服` fallback naming
- `admin-vue/src/router/index.js`, `admin-vue/src/config/menuGroups.js`, and `admin-vue/src/App.vue` now rename the admin support entry to `客服工作台`, separating internal admin tooling from end-user support branding

## Batch 33 Completed
- Make the map provider setting actually executable instead of leaving `tianditu` as a dead option in system settings
- Align map environment variables with platform-level configuration naming while keeping backward compatibility
- Clean active location-selection pages that were still shipping visible乱码 in user/app flows

### Batch 33 Fixed
- `backend/go/internal/service/mobile_map_service.go` now implements real provider-aware map behavior: `proxy/custom` continue using the existing proxy contract, while `tianditu` now calls official TianDiTu search and reverse-geocode endpoints using the admin-configured `map_api_key`
- `backend/go/internal/service/mobile_map_service_test.go` now covers TianDiTu search and reverse-geocode request building plus response parsing
- `backend/go/internal/service/service_settings.go` and `backend/go/internal/service/service_settings_map_test.go` now require `map_api_key` whenever `map_provider=tianditu`, preventing broken admin saves
- `backend/go/internal/config/config.go` now supports generic `MAP_SEARCH_URL`, `MAP_REVERSE_URL`, and `MAP_TIMEOUT_SECONDS` env vars while remaining backward compatible with the old `OSM_GEOCODER_*` names
- `user-vue/pages/location/select/index.vue` and `app-mobile/pages/location/select/index.vue` were rewritten as clean UTF-8 pages so the active location-selection entry no longer shows乱码

## Batch 34 Completed
- Clean user-visible mojibake out of the rider personal-center main entry and merchant-side support chat page
- Normalize active chat and profile copy without changing the underlying business protocol or route structure
- Reduce terminal-facing false positives by treating PowerShell display decoding separately from source-level UTF-8 validation

### Batch 34 Fixed
- `rider-app/pages/profile/index.vue` now uses clean UTF-8 for the active rider profile page, including the stats card, wallet entry, rider-home entry, and core menu labels
- `rider-app/pages/profile/index-logic.ts` now uses clean UTF-8 defaults for rider name, rank names, and performance text while preserving the existing data-loading and navigation behavior
- `merchant-app/pages/messages/chat.vue` now uses clean UTF-8 for the active merchant chat page, including navigation labels, empty state, official-intervention tag, send controls, and user-facing toast / error messages

## Batch 35 Completed
- Remove fake delivery-address seed data from the active address-book entry
- Make checkout read the real selected address instead of hard-coded demo recipient data
- Clear stale `selectedAddress` storage so home, checkout, and address-book flows stop drifting out of sync

### Batch 35 Fixed
- `user-vue/pages/profile/address-list/index.vue` and `app-mobile/pages/profile/address-list/index.vue` no longer seed the address book with demo data when storage is empty; they now normalize stored address items and clear invalid `selectedAddress` pointers
- `user-vue/pages/order/confirm/index.vue` and `app-mobile/pages/order/confirm/index.vue` now render the real selected delivery address, auto-bind the only saved address when exactly one exists, and block submit when no valid delivery address has been chosen
- The order payload in both checkout pages now sends the real delivery address, recipient name, and delivery phone instead of the old hard-coded `腾讯大厦 / 张先生 / 138****8888` demo tuple

## Batch 36 Completed
- Move rider insurance page data out of static demo copy and into admin-managed runtime settings
- Expose rider insurance policy metadata, coverage items, claim steps, and action links through the public runtime contract
- Stop shipping fake policy number / insurer / effective dates to rider devices

### Batch 36 Fixed
- `backend/go/internal/service/service_settings.go` and `backend/go/internal/service/service_settings_test.go` now include rider insurance runtime fields in both `service_settings` and `public/runtime-settings`, with normalization, validation, defaults, and test coverage
- `admin-vue/src/views/settingsHelpers.js` and `admin-vue/src/views/Settings.vue` now provide editable rider insurance configuration, including status copy, policy metadata, coverage items, claim steps, and claim/detail links
- `rider-app/pages/profile/insurance.vue` now reads rider insurance data from `fetchPublicRuntimeSettings()`, renders configured coverage/policy content, and replaces the old static demo policy values with explicit `未配置` / config-driven output

## Batch 37 Completed
- Move merchant/rider chat welcome copy out of frontend hard-codes and into admin-managed runtime settings
- Keep support, merchant, and rider conversation boot messages under one public runtime contract
- Remove the last active hard-coded merchant/rider welcome strings from user-facing chat initialization

### Batch 37 Fixed
- `backend/go/internal/service/service_settings.go` and `backend/go/internal/service/service_settings_test.go` now define, normalize, validate, and publicly expose `merchant_chat_welcome_message` and `rider_chat_welcome_message`
- `admin-vue/src/views/settingsHelpers.js` and `admin-vue/src/views/Settings.vue` now let operations configure support, merchant, and rider chat boot copy separately
- `user-vue/shared-ui/support-runtime.js`, `app-mobile/shared-ui/support-runtime.js`, `merchant-app/shared-ui/support-runtime.ts`, and `rider-app/shared-ui/support-runtime.ts` now cache and expose merchant/rider chat welcome messages alongside the existing support title/welcome copy
- `user-vue/pages/message/chat/page-logic.js` and `app-mobile/pages/message/chat/page-logic.js` now seed rider/shop conversations from runtime config instead of hard-coded strings

## Batch 38 Completed
- Move merchant portal login copy and merchant app policy/agreement summaries out of frontend hard-codes and into admin-managed runtime settings
- Expose merchant portal runtime copy through the same public settings contract used by other terminals
- Remove the last active hard-coded merchant login footer and merchant policy modal text from the merchant app

### Batch 38 Fixed
- `backend/go/internal/service/service_settings.go` plus the new `backend/go/internal/service/service_settings_merchant_portal_test.go` now define, normalize, validate, and publicly expose `merchant_portal_title`, `merchant_portal_subtitle`, `merchant_portal_login_footer`, `merchant_privacy_policy`, and `merchant_service_agreement`
- `admin-vue/src/views/settingsHelpers.js` and `admin-vue/src/views/Settings.vue` now let operations maintain merchant login copy and merchant compliance summaries from system settings
- `merchant-app/shared-ui/portal-runtime.ts` now caches merchant portal runtime settings from `/api/public/runtime-settings`
- `merchant-app/pages/login/index.vue` and `merchant-app/pages/store/app-settings.vue` now render login/footer/policy/agreement copy from runtime config instead of hard-coded strings

## Batch 39 Completed
- Move consumer terminal legal copy out of user/app settings pages and into admin-managed runtime settings
- Keep user-vue and app-mobile settings pages on one shared public runtime contract for “关于我们 / 隐私政策 / 用户协议”
- Remove the last active hard-coded legal summary text from the user/app settings entry pages

### Batch 39 Fixed
- `backend/go/internal/service/service_settings.go` plus the new `backend/go/internal/service/service_settings_consumer_legal_test.go` now define, normalize, validate, and publicly expose `consumer_about_summary`, `consumer_privacy_policy`, and `consumer_user_agreement`
- `admin-vue/src/views/settingsHelpers.js` and `admin-vue/src/views/Settings.vue` now let operations maintain consumer about/privacy/agreement copy from system settings
- `user-vue/shared-ui/legal-runtime.js` and `app-mobile/shared-ui/legal-runtime.js` now cache consumer legal runtime settings from `/api/public/runtime-settings`
- `user-vue/pages/profile/settings/index.vue`, `user-vue/pages/profile/settings/detail/index.vue`, `app-mobile/pages/profile/settings/index.vue`, and `app-mobile/pages/profile/settings/detail/index.vue` now render legal/about modal content from runtime config instead of hard-coded strings

## Batch 40 Completed
- Move rider terminal “about” copy into admin-managed runtime settings
- Remove hard-coded terminal version strings from active settings pages and switch them to runtime version detection
- Rewrite the rider settings page from the old garbled source into a clean UTF-8 implementation with real cache clearing behavior

### Batch 40 Fixed
- `backend/go/internal/service/service_settings.go` plus the new `backend/go/internal/service/service_settings_rider_about_test.go` now define, normalize, validate, test, and publicly expose `rider_about_summary`
- `admin-vue/src/views/settingsHelpers.js` and `admin-vue/src/views/Settings.vue` now let operations maintain rider-side “关于我们” copy from system settings
- `rider-app/shared-ui/support-runtime.ts` now caches `rider_about_summary` from `/api/public/runtime-settings`
- `rider-app/pages/profile/settings.vue` has been rewritten to clean UTF-8, now reads runtime about copy, shows runtime version, and clears cache without dropping rider auth/session keys
- `user-vue/shared-ui/app-version.js`, `app-mobile/shared-ui/app-version.js`, `merchant-app/shared-ui/app-version.ts`, and `rider-app/shared-ui/app-version.ts` now provide runtime version labels for active settings pages
- `user-vue/pages/profile/settings/index.vue`, `user-vue/pages/profile/settings/detail/index.vue`, `app-mobile/pages/profile/settings/index.vue`, `app-mobile/pages/profile/settings/detail/index.vue`, and `merchant-app/pages/store/app-settings.vue` no longer hard-code `v3.0.0` or `v1.0.0`

## Batch 41 Completed
- Move rider portal login copy out of hard-coded rider pages and into admin-managed runtime settings
- Rewrite the active rider login / reset-password / set-password pages from the old garbled source into clean UTF-8 implementations
- Keep rider-side auth entrance copy under the same public runtime contract as other terminal settings

### Batch 41 Fixed
- `backend/go/internal/service/service_settings.go` plus the new `backend/go/internal/service/service_settings_rider_portal_test.go` now define, normalize, validate, test, and publicly expose `rider_portal_title`, `rider_portal_subtitle`, and `rider_portal_login_footer`
- `admin-vue/src/views/settingsHelpers.js` and `admin-vue/src/views/Settings.vue` now let operations maintain rider login title, subtitle, and footer copy from system settings
- `rider-app/shared-ui/portal-runtime.ts` now caches rider portal runtime settings from `/api/public/runtime-settings`
- `rider-app/pages/login/index.vue`, `rider-app/pages/reset-password/index.vue`, and `rider-app/pages/set-password/index.vue` now render runtime portal copy and use clean UTF-8 source instead of the previous garbled implementation

## Batch 42 Completed
- Move consumer-side auth portal copy out of hard-coded user/app pages and into admin-managed runtime settings
- Keep user-vue and app-mobile login / register / reset-password / set-password pages on one shared runtime auth contract
- Repair the admin settings template structure so the new auth-portal configuration remains buildable after the historical mojibake damage

### Batch 42 Fixed
- `backend/go/internal/service/service_settings.go` plus the new `backend/go/internal/service/service_settings_consumer_portal_test.go` now define, normalize, validate, test, and publicly expose `consumer_portal_title`, `consumer_portal_subtitle`, and `consumer_portal_login_footer`
- `admin-vue/src/views/settingsHelpers.js` and `admin-vue/src/views/Settings.vue` now let operations maintain consumer auth portal title, subtitle, and footer copy from system settings
- `user-vue/shared-ui/auth-runtime.js` and `app-mobile/shared-ui/auth-runtime.js` now cache consumer auth runtime settings, including the existing WeChat-login entrance flags
- `user-vue/pages/auth/login/index.vue`, `user-vue/pages/auth/register/index.vue`, `user-vue/pages/auth/reset-password/index.vue`, and `user-vue/pages/auth/set-password/index.vue` have been rewritten to clean UTF-8, now render runtime auth copy, and preserve the existing login / register / captcha / bind-wechat contracts
- `app-mobile/pages/auth/login/index.vue`, `app-mobile/pages/auth/register/index.vue`, `app-mobile/pages/auth/reset-password/index.vue`, and `app-mobile/pages/auth/set-password/index.vue` now match the same runtime-driven contract and no longer ship garbled active auth pages
- `user-vue/pages/auth/login/index.scss`, `user-vue/pages/auth/register/index.scss`, `app-mobile/pages/auth/login/index.scss`, and `app-mobile/pages/auth/register/index.scss` now style shared portal footer copy for the runtime-driven auth pages
- `admin-vue/src/views/Settings.vue` was structurally repaired so the system-settings page remains buildable after adding the new consumer auth portal fields

## Batch 43 Completed
- Stop expanding stable config surfaces and refocus cleanup on active mock data, placeholder copy, and mojibake
- Remove the last active `mock-data` home-category dependency and delete the now-unused shared mock-data files
- Finish the remaining mojibake cleanup in the admin settings page, socket runtime messages, and auth-service comments

### Batch 43 Fixed
- `user-vue/shared-ui/home-categories.js` and `app-mobile/shared-ui/home-categories.js` now own the live home-category display config directly instead of re-exporting `mock-data`
- Deleted `user-vue/shared-ui/mock-data.js`, `app-mobile/shared-ui/mock-data.js`, and `rider-app/shared-ui/mock-data.ts` after removing their active imports
- `socket-server/aiNamespace.js`, `socket-server/index.js`, `socket-server/riderNamespace.js`, `socket-server/supportNamespaces.js`, and `admin-vue/src/utils/socket.js` no longer ship garbled runtime text in AI/chat/upload/admin socket flows
- `admin-vue/src/views/Settings.vue` now has clean UTF-8 labels, placeholders, dialogs, and table actions across the remaining VIP / charity / app-download / payment / WeChat-login / data-management / external-API sections
- `backend/go/internal/service/auth_service.go` comment blocks around token issuance, refresh-token handling, rider login, merchant login, and password reset were normalized so the file is no longer polluted by historical mojibake
- `backend/go/internal/service/charity_settings.go`, `admin-vue/src/views/settingsHelpers.js`, `user-vue/pages/charity/index.vue`, and `app-mobile/pages/charity/index.vue` now use neutral “static content” wording instead of “demo/mock” wording in live fallback copy

## Batch 44 Completed
- Turn the platform baseline toward `PostgreSQL + Redis` with config validation, connection-pool controls, explicit HTTP server timeouts, and graceful shutdown
- Add a real homepage orchestration surface for admin-controlled shop/product promotion slots instead of client-side stitching
- Replace active home-page mojibake and dual-request assembly with clean UTF-8 pages that read one `home/feed` contract
- Restore BFF route files from historical encoding damage so public/admin routes are explicitly registered instead of being at risk of being swallowed by broken comment lines
- Add the first root-level CI workflow and switch the default local infra compose stack to `PostgreSQL + Redis`

### Batch 44 Fixed
- `backend/go/internal/config/config.go`, `backend/go/internal/repository/database.go`, `backend/go/internal/repository/redis.go`, and `backend/go/cmd/main.go` now validate production config, set DB pool parameters, fail fast when required Redis is unavailable, expose `/health` + `/ready`, and run behind an explicit `http.Server` with read/write/idle/shutdown timeouts
- `backend/go/internal/repository/home_promotion_models.go`, `backend/go/internal/service/home_feed_service.go`, `backend/go/internal/handler/home_feed_handler.go`, `backend/go/internal/service/services.go`, `backend/go/internal/handler/handlers.go`, and `backend/go/internal/middleware/route_guard.go` now provide a persisted homepage promotion-campaign model plus admin/public APIs for `home/feed`, `home-campaigns`, and `home-slots`
- `backend/bff/src/controllers/homeController.js`, `backend/bff/src/routes/index.js`, and `backend/bff/src/routes/admin.js` now proxy the homepage orchestration APIs cleanly, and the route files were rewritten in clean executable form to eliminate the risk from prior mojibake-corrupted comment lines
- `user-vue/shared-ui/api.js`, `app-mobile/shared-ui/api.js`, `user-vue/pages/index/index.vue`, and `app-mobile/pages/index/index.vue` now read one `/api/home/feed` contract instead of separately stitching shops and featured products on the client
- `user-vue/components/HomeShopCard.vue`, `user-vue/components/FeaturedSection.vue`, `app-mobile/components/HomeShopCard.vue`, and `app-mobile/components/FeaturedSection.vue` were rewritten in clean UTF-8 and now render `推广` badges for paid/manual placements
- `admin-vue/src/views/HomeCampaigns.vue`, `admin-vue/src/router/index.js`, and `admin-vue/src/config/menuGroups.js` now add an admin-manageable homepage promotion page with campaign CRUD, lock-slot writes, status actions, and current slot preview
- `backend/docker/docker-compose.yml` now treats `postgres + redis` as the default stack while keeping `mysql` as a legacy profile and `rabbitmq` as an optional profile
- `.github/workflows/ci.yml` now runs Go tests/build, BFF tests/lint, and `admin-vue` production build at the root monorepo level

## Verification
- Passed `node --check` on modified `socket-server` and `backend/bff` modules
- Passed `backend/bff` test suite: `npm test -- --runInBand`
- Passed `backend/bff` lint: `npm run lint`
- Passed `go test ./internal/config ./internal/repository`
- Passed `go test ./internal/config ./internal/service ./internal/repository`
- Passed `go test ./...`
- Passed `go build ./cmd`
- Passed `node --check` on the new `backend/bff` QR login and user-route modules
- Passed `node --check` on `backend/bff/src/controllers/notificationController.js`
- Passed `node --check` on `backend/bff/src/routes/notification.js`
- Passed `node --check` on `backend/bff/src/controllers/userController.js`
- Passed `node --check` on `backend/bff/src/routes/user.js`
- Passed `node --check` on `backend/bff/src/controllers/authController.js`
- Passed `node --check` on `backend/bff/src/routes/index.js`
- Passed `node --check` on `backend/bff/src/utils/goProxy.js`
- Passed `node --check` on `backend/bff/src/controllers/orderController.js`
- Passed `node --check` on `backend/bff/src/routes/order.js`
- Passed `node --check` on `backend/bff/src/controllers/financialController.js`
- Passed `node --check` on `socket-server/supportNamespaces.js`
- Passed `node --check` on `socket-server/index.js`
- Static-verified uni-app chat page logic and templates for `user-vue` / `app-mobile` after the `audio` and `location` message-flow changes
- Static-verified the rewritten `user-vue` / `app-mobile` settings and invite-friends page templates, routes, and invite API bindings
- Passed `gofmt -w backend/go/internal/service/auth_service.go`
- Passed `gofmt -w backend/go/internal/config/config.go`
- Passed `gofmt -w backend/go/internal/service/auth_service_invite_test.go`
- Passed `gofmt -w backend/go/internal/service/service_settings.go`
- Passed `gofmt -w backend/go/internal/service/service_settings_test.go`
- Passed `gofmt -w backend/go/internal/handler/admin_settings_handler.go`
- Passed `gofmt -w backend/go/internal/service/sms_service.go`
- Passed `gofmt -w backend/go/internal/service/sms_provider_config.go`
- Passed `gofmt -w backend/go/internal/service/sms_provider_aliyun.go`
- Passed `gofmt -w backend/go/internal/service/sms_provider_config_test.go`
- Passed `gofmt -w backend/go/internal/service/wechat_login_config.go`
- Passed `gofmt -w backend/go/internal/service/auth_service.go`
- Passed `gofmt -w backend/go/internal/service/charity_settings.go`
- Passed `gofmt -w backend/go/internal/service/home_feed_service.go`
- Passed `gofmt -w backend/go/cmd/main.go`
- Passed `admin-vue` production build: `npm run build`

## Remaining High-Priority Items
- Clean committed `.env`, `.db`, `.log`, build artifacts, and other repo pollution
- Fix finance overview double-count risk and the underlying accounting rules
- Replace remaining placeholder or mock-driven pages outside the now-fixed auth / invite entry paths
- Expand automated coverage around sensitive admin / finance mutations

## Next Repair Focus
- Remaining message / native unfinished integrations and parity issues
- Broader architecture and duplicate-code reduction work
