-- Unified ID migration (uid/tsid + infra tables)
-- Prefix: 250724, uid:18, tsid:28

CREATE TABLE IF NOT EXISTS `id_codebook` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `bucket_code` varchar(2) NOT NULL,
  `domain` varchar(100) NOT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'active',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_bucket_code` (`bucket_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `id_sequences` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `bucket_code` varchar(2) NOT NULL,
  `current_seq` bigint NOT NULL DEFAULT 0,
  `warn_threshold` bigint NOT NULL DEFAULT 9500000000,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_bucket_code` (`bucket_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `id_legacy_mappings` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `domain` varchar(100) NOT NULL,
  `legacy_value` varchar(100) NOT NULL,
  `uid` varchar(18) NOT NULL,
  `tsid` varchar(28) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_domain_legacy` (`domain`, `legacy_value`),
  UNIQUE KEY `uk_uid` (`uid`),
  UNIQUE KEY `uk_tsid` (`tsid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `id_migration_anomalies` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `domain` varchar(100) NOT NULL,
  `table_name` varchar(100) NOT NULL,
  `column_name` varchar(100) NOT NULL,
  `legacy_value` varchar(255) DEFAULT NULL,
  `reason` text NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Add uid/tsid to all known business tables.
ALTER TABLE `admins` ADD COLUMN IF NOT EXISTS `uid` varchar(18) DEFAULT NULL, ADD COLUMN IF NOT EXISTS `tsid` varchar(28) DEFAULT NULL;
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `uid` varchar(18) DEFAULT NULL, ADD COLUMN IF NOT EXISTS `tsid` varchar(28) DEFAULT NULL;
ALTER TABLE `riders` ADD COLUMN IF NOT EXISTS `uid` varchar(18) DEFAULT NULL, ADD COLUMN IF NOT EXISTS `tsid` varchar(28) DEFAULT NULL;
ALTER TABLE `merchants` ADD COLUMN IF NOT EXISTS `uid` varchar(18) DEFAULT NULL, ADD COLUMN IF NOT EXISTS `tsid` varchar(28) DEFAULT NULL;
ALTER TABLE `shops` ADD COLUMN IF NOT EXISTS `uid` varchar(18) DEFAULT NULL, ADD COLUMN IF NOT EXISTS `tsid` varchar(28) DEFAULT NULL;
ALTER TABLE `orders` ADD COLUMN IF NOT EXISTS `uid` varchar(18) DEFAULT NULL, ADD COLUMN IF NOT EXISTS `tsid` varchar(28) DEFAULT NULL;
ALTER TABLE `reviews` ADD COLUMN IF NOT EXISTS `uid` varchar(18) DEFAULT NULL, ADD COLUMN IF NOT EXISTS `tsid` varchar(28) DEFAULT NULL;
ALTER TABLE `rider_reviews` ADD COLUMN IF NOT EXISTS `uid` varchar(18) DEFAULT NULL, ADD COLUMN IF NOT EXISTS `tsid` varchar(28) DEFAULT NULL;
ALTER TABLE `categories` ADD COLUMN IF NOT EXISTS `uid` varchar(18) DEFAULT NULL, ADD COLUMN IF NOT EXISTS `tsid` varchar(28) DEFAULT NULL;
ALTER TABLE `products` ADD COLUMN IF NOT EXISTS `uid` varchar(18) DEFAULT NULL, ADD COLUMN IF NOT EXISTS `tsid` varchar(28) DEFAULT NULL;
ALTER TABLE `banners` ADD COLUMN IF NOT EXISTS `uid` varchar(18) DEFAULT NULL, ADD COLUMN IF NOT EXISTS `tsid` varchar(28) DEFAULT NULL;
ALTER TABLE `featured_products` ADD COLUMN IF NOT EXISTS `uid` varchar(18) DEFAULT NULL, ADD COLUMN IF NOT EXISTS `tsid` varchar(28) DEFAULT NULL;
ALTER TABLE `cooperation_requests` ADD COLUMN IF NOT EXISTS `uid` varchar(18) DEFAULT NULL, ADD COLUMN IF NOT EXISTS `tsid` varchar(28) DEFAULT NULL;
ALTER TABLE `invite_codes` ADD COLUMN IF NOT EXISTS `uid` varchar(18) DEFAULT NULL, ADD COLUMN IF NOT EXISTS `tsid` varchar(28) DEFAULT NULL;
ALTER TABLE `invite_records` ADD COLUMN IF NOT EXISTS `uid` varchar(18) DEFAULT NULL, ADD COLUMN IF NOT EXISTS `tsid` varchar(28) DEFAULT NULL;
ALTER TABLE `onboarding_invite_links` ADD COLUMN IF NOT EXISTS `uid` varchar(18) DEFAULT NULL, ADD COLUMN IF NOT EXISTS `tsid` varchar(28) DEFAULT NULL;
ALTER TABLE `onboarding_invite_submissions` ADD COLUMN IF NOT EXISTS `uid` varchar(18) DEFAULT NULL, ADD COLUMN IF NOT EXISTS `tsid` varchar(28) DEFAULT NULL;
ALTER TABLE `points_goods` ADD COLUMN IF NOT EXISTS `uid` varchar(18) DEFAULT NULL, ADD COLUMN IF NOT EXISTS `tsid` varchar(28) DEFAULT NULL;
ALTER TABLE `points_redemptions` ADD COLUMN IF NOT EXISTS `uid` varchar(18) DEFAULT NULL, ADD COLUMN IF NOT EXISTS `tsid` varchar(28) DEFAULT NULL;
ALTER TABLE `points_ledger` ADD COLUMN IF NOT EXISTS `uid` varchar(18) DEFAULT NULL, ADD COLUMN IF NOT EXISTS `tsid` varchar(28) DEFAULT NULL;
ALTER TABLE `notifications` ADD COLUMN IF NOT EXISTS `uid` varchar(18) DEFAULT NULL, ADD COLUMN IF NOT EXISTS `tsid` varchar(28) DEFAULT NULL;
ALTER TABLE `carousels` ADD COLUMN IF NOT EXISTS `uid` varchar(18) DEFAULT NULL, ADD COLUMN IF NOT EXISTS `tsid` varchar(28) DEFAULT NULL;
ALTER TABLE `push_messages` ADD COLUMN IF NOT EXISTS `uid` varchar(18) DEFAULT NULL, ADD COLUMN IF NOT EXISTS `tsid` varchar(28) DEFAULT NULL;
ALTER TABLE `public_apis` ADD COLUMN IF NOT EXISTS `uid` varchar(18) DEFAULT NULL, ADD COLUMN IF NOT EXISTS `tsid` varchar(28) DEFAULT NULL;
ALTER TABLE `user_favorites` ADD COLUMN IF NOT EXISTS `uid` varchar(18) DEFAULT NULL, ADD COLUMN IF NOT EXISTS `tsid` varchar(28) DEFAULT NULL;
ALTER TABLE `wallet_accounts` ADD COLUMN IF NOT EXISTS `uid` varchar(18) DEFAULT NULL, ADD COLUMN IF NOT EXISTS `tsid` varchar(28) DEFAULT NULL;
ALTER TABLE `wallet_transactions` ADD COLUMN IF NOT EXISTS `uid` varchar(18) DEFAULT NULL, ADD COLUMN IF NOT EXISTS `tsid` varchar(28) DEFAULT NULL;
ALTER TABLE `recharge_orders` ADD COLUMN IF NOT EXISTS `uid` varchar(18) DEFAULT NULL, ADD COLUMN IF NOT EXISTS `tsid` varchar(28) DEFAULT NULL;
ALTER TABLE `withdraw_requests` ADD COLUMN IF NOT EXISTS `uid` varchar(18) DEFAULT NULL, ADD COLUMN IF NOT EXISTS `tsid` varchar(28) DEFAULT NULL;
ALTER TABLE `admin_wallet_operations` ADD COLUMN IF NOT EXISTS `uid` varchar(18) DEFAULT NULL, ADD COLUMN IF NOT EXISTS `tsid` varchar(28) DEFAULT NULL;
ALTER TABLE `payment_callbacks` ADD COLUMN IF NOT EXISTS `uid` varchar(18) DEFAULT NULL, ADD COLUMN IF NOT EXISTS `tsid` varchar(28) DEFAULT NULL;
ALTER TABLE `idempotency_records` ADD COLUMN IF NOT EXISTS `uid` varchar(18) DEFAULT NULL, ADD COLUMN IF NOT EXISTS `tsid` varchar(28) DEFAULT NULL;
ALTER TABLE `reconciliation_tasks` ADD COLUMN IF NOT EXISTS `uid` varchar(18) DEFAULT NULL, ADD COLUMN IF NOT EXISTS `tsid` varchar(28) DEFAULT NULL;
ALTER TABLE `sms_verification_codes` ADD COLUMN IF NOT EXISTS `uid` varchar(18) DEFAULT NULL, ADD COLUMN IF NOT EXISTS `tsid` varchar(28) DEFAULT NULL;
ALTER TABLE `coupons` ADD COLUMN IF NOT EXISTS `uid` varchar(18) DEFAULT NULL, ADD COLUMN IF NOT EXISTS `tsid` varchar(28) DEFAULT NULL;
ALTER TABLE `user_coupons` ADD COLUMN IF NOT EXISTS `uid` varchar(18) DEFAULT NULL, ADD COLUMN IF NOT EXISTS `tsid` varchar(28) DEFAULT NULL;
ALTER TABLE `open_claw_configs` ADD COLUMN IF NOT EXISTS `uid` varchar(18) DEFAULT NULL, ADD COLUMN IF NOT EXISTS `tsid` varchar(28) DEFAULT NULL;
ALTER TABLE `open_claw_mcps` ADD COLUMN IF NOT EXISTS `uid` varchar(18) DEFAULT NULL, ADD COLUMN IF NOT EXISTS `tsid` varchar(28) DEFAULT NULL;
ALTER TABLE `open_claw_skills` ADD COLUMN IF NOT EXISTS `uid` varchar(18) DEFAULT NULL, ADD COLUMN IF NOT EXISTS `tsid` varchar(28) DEFAULT NULL;
ALTER TABLE `open_claw_staffs` ADD COLUMN IF NOT EXISTS `uid` varchar(18) DEFAULT NULL, ADD COLUMN IF NOT EXISTS `tsid` varchar(28) DEFAULT NULL;
ALTER TABLE `open_claw_conversations` ADD COLUMN IF NOT EXISTS `uid` varchar(18) DEFAULT NULL, ADD COLUMN IF NOT EXISTS `tsid` varchar(28) DEFAULT NULL;
ALTER TABLE `open_claw_messages` ADD COLUMN IF NOT EXISTS `uid` varchar(18) DEFAULT NULL, ADD COLUMN IF NOT EXISTS `tsid` varchar(28) DEFAULT NULL;
ALTER TABLE `open_claw_tasks` ADD COLUMN IF NOT EXISTS `uid` varchar(18) DEFAULT NULL, ADD COLUMN IF NOT EXISTS `tsid` varchar(28) DEFAULT NULL;

-- External/idempotency raw fields for compatibility lookup.
ALTER TABLE `wallet_transactions` ADD COLUMN IF NOT EXISTS `transaction_id_raw` varchar(128) DEFAULT NULL, ADD COLUMN IF NOT EXISTS `idempotency_key_raw` varchar(160) DEFAULT NULL;
ALTER TABLE `recharge_orders` ADD COLUMN IF NOT EXISTS `transaction_id_raw` varchar(128) DEFAULT NULL;
ALTER TABLE `withdraw_requests` ADD COLUMN IF NOT EXISTS `request_id_raw` varchar(128) DEFAULT NULL, ADD COLUMN IF NOT EXISTS `transaction_id_raw` varchar(128) DEFAULT NULL;
ALTER TABLE `admin_wallet_operations` ADD COLUMN IF NOT EXISTS `operation_id_raw` varchar(128) DEFAULT NULL, ADD COLUMN IF NOT EXISTS `transaction_id_raw` varchar(128) DEFAULT NULL;
ALTER TABLE `payment_callbacks` ADD COLUMN IF NOT EXISTS `callback_id_raw` varchar(128) DEFAULT NULL, ADD COLUMN IF NOT EXISTS `transaction_id_raw` varchar(128) DEFAULT NULL;
ALTER TABLE `idempotency_records` ADD COLUMN IF NOT EXISTS `idempotency_key_raw` varchar(200) DEFAULT NULL;
ALTER TABLE `reconciliation_tasks` ADD COLUMN IF NOT EXISTS `task_id_raw` varchar(128) DEFAULT NULL;
ALTER TABLE `groupbuy_redemption_logs` ADD COLUMN IF NOT EXISTS `idempotency_key_raw` varchar(200) DEFAULT NULL;
