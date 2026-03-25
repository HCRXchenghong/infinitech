# 65-Page Migration Tracker

Status legend:
- done: implemented in Android native
- in_progress: feature-complete but still under parity hardening
- pending: not started

## Progress snapshot (2026-02-27)
- Page matrix summary: done 65 / in_progress 0 / pending 0 (total 65)
- Build gate status: `scripts/Run-QualityGates.ps1` (`:app:testDebugUnitTest` + `:app:assembleDebug`) passing on ASCII mirror workspace
- This round focus: final sign-off completion and artifact archival
## Current implementation status
- done:
  - auth/login baseline
  - auth session storage
  - app shell + navigation baseline
  - core repository implementations wired (auth/shop/order/message/profile/wallet/errand/medicine)
  - sync worker + socket reliability baseline integrated
  - debug build gate (`:app:assembleDebug`) passing
  - unit test gate (`:app:testDebugUnitTest`) passing including `RouteResolverTest` and `SocketServiceReliabilityTest`
  - message reconnect and weak-network reliability unit coverage added (`ChatViewModelReliabilityTest`) and passing
  - full 65-page route and screen mapping completed
  - category/product, order remark/tableware, errand/medicine, dining-buddy/charity, wallet subpages, and profile subpages completed
  - gray rollout evaluator validated for both continue and rollback paths
  - stage G one-command gate script and CI workflow scaffold added
  - transaction compose E2E chain added (`TransactionE2EComposeTest`) and passing
  - local connected instrumentation run passed (7 tests, 0 failures)
  - stage G one-command run including instrumentation passed after latest automation additions
  - release sign-off report automation added (`scripts/Generate-ReleaseSignoffReport.ps1`)
  - stage G script supports direct sign-off report output (`-GenerateSignoffReport`)
  - manual parity status template and working status file prepared (`docs/signoff/manual_parity_status*.json`)
- in_progress:
  - none
- pending:
  - none

## Page matrix from app-mobile

1. pages/welcome/welcome/index - done
2. pages/auth/login/index - done
3. pages/auth/register/index - done
4. pages/auth/reset-password/index - done
5. pages/auth/set-password/index - done
6. pages/index/index - done
7. pages/shop/list/index - done
8. pages/shop/detail/index - done
9. pages/shop/menu/index - done
10. pages/category/index/index - done
11. pages/category/food/index - done
12. pages/category/dessert/index - done
13. pages/category/market/index - done
14. pages/category/fruit/index - done
15. pages/category/medicine/index - done
16. pages/category/burger/index - done
17. pages/category/all/index - done
18. pages/product/detail/index - done
19. pages/product/featured/index - done
20. pages/product/popup-detail/index - done
21. pages/shop/cart-popup/index - done
22. pages/location/select/index - done
23. pages/order/confirm/index - done
24. pages/order/remark/index - done
25. pages/order/tableware/index - done
26. pages/pay/success/index - done
27. pages/order/list/index - done
28. pages/order/detail/index - done
29. pages/order/review/index - done
30. pages/order/refund/index - done
31. pages/message/index/index - done
32. pages/message/chat/index - done
33. pages/message/notification-detail/index - done
34. pages/profile/index/index - done
35. pages/profile/favorites/index - done
36. pages/profile/my-reviews/index - done
37. pages/profile/address-list/index - done
38. pages/profile/address-edit/index - done
39. pages/profile/coupon-list/index - done
40. pages/profile/wallet/index - done
41. pages/profile/wallet/recharge/index - done
42. pages/profile/wallet/withdraw/index - done
43. pages/profile/wallet/bills/index - done
44. pages/profile/settings/index - done
45. pages/profile/settings/detail/index - done
46. pages/profile/cooperation/index - done
47. pages/profile/invite-friends/index - done
48. pages/profile/points-mall/index - done
49. pages/profile/edit/index - done
50. pages/profile/phone-change/index - done
51. pages/profile/vip-center/index - done
52. pages/profile/customer-service/index - done
53. pages/search/index/index - done
54. pages/errand/home/index - done
55. pages/errand/buy/index - done
56. pages/errand/deliver/index - done
57. pages/errand/pickup/index - done
58. pages/errand/do/index - done
59. pages/errand/detail/index - done
60. pages/medicine/home - done
61. pages/medicine/chat - done
62. pages/medicine/order - done
63. pages/medicine/tracking - done
64. pages/dining-buddy/index - done
65. pages/charity/index - done

## Quality gates
- P0/P1/P2 defects must be zero before release.
- Core E2E (login -> browse -> order -> pay -> order detail) must pass.
- Crash/ANR/network/socket indicators must stay within release thresholds.
- Current sign-off report status: `READY_FOR_RELEASE` (`docs/signoff/release_signoff_report.json`).




