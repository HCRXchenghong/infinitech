# Android Migration Contract Map

Last updated: 2026-02-27
Scope: app-mobile -> android-user-app
Constraint: No backend/BFF/socket API changes.

## Base URLs
- BFF HTTP: `http://127.0.0.1:25500`
- Socket HTTP: `http://127.0.0.1:9898`
- Uploads: `POST /api/upload`

## Auth Contract
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/request-sms-code`
- `POST /api/verify-sms-code`
- `POST /api/verify-sms-code-check`
- `POST /api/auth/register`
- `POST /api/set-new-password`

Compatibility rules:
- Accept response envelopes with or without nested `data`.
- Login success requires `token + refreshToken`.
- Refresh failure triggers forced logout.

## Core Business APIs
- Shops:
  - `GET /api/shops`
  - `GET /api/shops/{id}`
  - `GET /api/shops/{id}/menu`
  - `GET /api/shops/today-recommended`
- Products:
  - `GET /api/products`
  - `GET /api/products/{id}`
  - `GET /api/products/featured`
  - `GET /api/categories`
  - `GET /api/banners`
- Orders:
  - `POST /api/orders`
  - `GET /api/orders/{id}`
  - `GET /api/orders/user/{userId}`
- Wallet:
  - `GET /api/wallet/balance`
  - `GET /api/wallet/transactions`
  - `POST /api/wallet/recharge`
  - `POST /api/wallet/payment`
  - `POST /api/wallet/withdraw`
- Coupons/Points:
  - `GET /api/coupons/user`
  - `GET /api/coupons/available`
  - `GET /api/points/balance`
  - `GET /api/points/goods`
  - `POST /api/points/redeem`
  - `POST /api/points/earn`
  - `POST /api/points/refund`

## Messaging/Socket Contract
- Generate socket token: `POST {SOCKET_URL}/api/generate-token`
- Upload image: `POST {SOCKET_URL}/api/upload`
- Namespace: `/support`
- Events:
  - outbound: `join_chat`, `load_messages`, `send_message`
  - inbound: `new_message`, `messages_loaded`, `message_sent`, `auth_error`

## Sync Contract
- `GET /api/sync/state`
- `GET /api/sync/{dataset}?since={version}`

## Known Compatibility Risks (client-side handling only)
- Some endpoints return wrapped data; Android parser must normalize.
- Some old uni-app calls use paths that may vary by route aggregation.
- `401` handling must refresh and retry once.
- Token payload field names are not always consistent (`id/userId/phone`).

## Android Internal Contracts Implemented
- `ApiResult<T>`
- `AuthSession`
- `SocketEvent`
- `SyncState`
- `FeatureFlag`
- Repositories:
  - `AuthRepository`
  - `ShopRepository`
  - `OrderRepository`
  - `MessageRepository`
  - `ProfileRepository`
  - `WalletRepository`
  - `ErrandRepository`
  - `MedicineRepository`


## Address Compatibility (Client Local)
- `addresses` and selected address are stored locally on Android via DataStore JSON.
- No backend contract changes; address selection and edit are client-side compatible behaviors.
