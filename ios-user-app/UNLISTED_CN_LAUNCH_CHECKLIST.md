# iOS Unlisted + 中国大陆首发执行清单

## 1. 账号与证书

- [ ] Apple Developer Program 已开通（个人账号）
- [ ] Bundle ID: `com.user.infinite.yuexiang`
- [ ] APNs Key (`.p8`) 已创建并安全保存
- [ ] App Store Connect 应用记录已创建

## 2. 中国大陆合规

- [ ] 中国大陆应用备案材料准备完成（主体、域名、应用信息）
- [ ] App Store Connect 已填写中国大陆备案字段
- [ ] 隐私政策与用户协议地址可访问且与应用一致

## 3. 分发策略

- [ ] 选择 `Unlisted` 分发并提交申请
- [ ] 官网/公众号/校内系统接入 Unlisted 直链
- [ ] 官网不提供 IPA 侧载，仅做官方下载入口聚合

## 4. 后端能力

- [ ] BFF 已开放 `/api/mobile/push/*` 与 `/api/mobile/maps/*`
- [ ] Go 已启用 `push_devices/push_deliveries/push_templates`
- [ ] OSM 服务可用（search/reverse）
- [ ] APNs 推送链路连通（订单、聊天、通知）

## 5. iOS 客户端

- [ ] iOS 最低版本配置为 16.0
- [ ] APNs 授权 + token 注册流程可用
- [ ] Map 搜索失败可回落到手填地址和已保存地址
- [ ] 中英文本地化资源已接入
- [ ] iPhone + iPad 关键页面可用

## 6. 测试门槛

- [ ] 单测覆盖率 >= 70%
- [ ] 关键 UI 流通过率 >= 90%
- [ ] 上线前 P0 缺陷 = 0

## 7. 上线与回滚

- [ ] TestFlight 连续灰度验证
- [ ] 关键服务开关（Push/Map）具备快速降级能力
- [ ] 紧急回滚版本与发布预案已演练
