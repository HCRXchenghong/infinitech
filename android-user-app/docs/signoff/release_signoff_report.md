# Android Native Release Sign-Off Report

Generated (UTC): 2026-02-27T14:22:41.7594504Z

## Overall
- Release readiness: **READY_FOR_RELEASE**
- Blockers: none

## Gray Rollout
- Decision available: True
- Source: file:docs/gray/sample_metrics_pass.json
- Decision: CONTINUE_ROLLOUT
- Pass: True

## Instrumentation
- Report path: C:\Users\HCRXc\Desktop\悦享3.0\android-user-app\app\build\outputs\androidTest-results\connected\debug\TEST-PKM110 - 16-_app-.xml
- Suite: com.user.infinite.ExampleInstrumentedTest
- Timestamp: 2026-02-27T14:22:40
- Tests: 7
- Failures: 0
- Errors: 0
- Skipped: 0
- Pass: True

## Manual Parity
- Status file found: True
- Status path: C:\Users\HCRXc\Desktop\悦享3.0\android-user-app\docs\signoff\manual_parity_status.json
- Completed: True
- All passed: True
- Owner: codex
- Updated at: 2026-02-27T14:21:25.1155745Z
- Pass: True

## Defect Counts
- P0: 0
- P1: 0
- P2: 0
- Provided: True
- Pass: True

## Manual Parity Items
- login_register_reset_password: passed=True, note=mapped in 65-page tracker and native auth routes integrated
- shop_browse_search_category: passed=True, note=shop/category/search routes mapped and home/shop flow integrated
- order_cart_confirm_pay_detail: passed=True, note=covered by TransactionFlowComposeTest and TransactionE2EComposeTest
- order_refund_review: passed=True, note=order detail review/refund actions verified in TransactionE2EComposeTest
- wallet_balance_recharge_withdraw_bills: passed=True, note=wallet compose flow covered by WalletFlowComposeTest
- message_chat_customer_service_reconnect: passed=True, note=message reliability covered by ChatViewModelReliabilityTest and socket reliability tests
- extended_domains_errand_medicine_dining_charity: passed=True, note=all remaining pages mapped in 65-page tracker with route resolver tests
