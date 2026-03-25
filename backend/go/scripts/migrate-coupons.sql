-- 优惠券表
CREATE TABLE IF NOT EXISTS coupons (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    shop_id BIGINT NOT NULL COMMENT '店铺ID，0表示平台券',
    name VARCHAR(100) NOT NULL COMMENT '优惠券名称',
    type VARCHAR(20) NOT NULL COMMENT '类型：fixed固定金额，percent百分比',
    amount DECIMAL(10,2) NOT NULL COMMENT '优惠金额或百分比',
    min_amount DECIMAL(10,2) DEFAULT 0 COMMENT '最低消费金额',
    max_discount DECIMAL(10,2) DEFAULT NULL COMMENT '最大优惠金额（百分比券）',
    total_count INT DEFAULT 0 COMMENT '总发行量，0表示无限',
    received_count INT DEFAULT 0 COMMENT '已领取数量',
    used_count INT DEFAULT 0 COMMENT '已使用数量',
    valid_from DATETIME NOT NULL COMMENT '有效期开始',
    valid_until DATETIME NOT NULL COMMENT '有效期结束',
    status VARCHAR(20) DEFAULT 'active' COMMENT '状态：active活动中，inactive已下架',
    description TEXT COMMENT '使用说明',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_shop_id (shop_id),
    INDEX idx_status (status),
    INDEX idx_valid_time (valid_from, valid_until)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='优惠券表';

-- 用户优惠券表
CREATE TABLE IF NOT EXISTS user_coupons (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id VARCHAR(50) NOT NULL COMMENT '用户ID',
    coupon_id BIGINT NOT NULL COMMENT '优惠券ID',
    status VARCHAR(20) DEFAULT 'unused' COMMENT '状态：unused未使用，used已使用，expired已过期',
    order_id VARCHAR(50) DEFAULT NULL COMMENT '使用的订单ID',
    received_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '领取时间',
    used_at DATETIME DEFAULT NULL COMMENT '使用时间',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_coupon_id (coupon_id),
    INDEX idx_status (status),
    INDEX idx_order_id (order_id),
    FOREIGN KEY (coupon_id) REFERENCES coupons(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户优惠券表';

-- 插入示例优惠券数据
INSERT INTO coupons (shop_id, name, type, amount, min_amount, max_discount, total_count, valid_from, valid_until, description) VALUES
(1, '新用户专享券', 'fixed', 10.00, 30.00, NULL, 1000, NOW(), DATE_ADD(NOW(), INTERVAL 30 DAY), '新用户首单立减10元'),
(1, '满40减15', 'fixed', 15.00, 40.00, NULL, 500, NOW(), DATE_ADD(NOW(), INTERVAL 30 DAY), '满40元可用'),
(1, '满60减20', 'fixed', 20.00, 60.00, NULL, 500, NOW(), DATE_ADD(NOW(), INTERVAL 30 DAY), '满60元可用'),
(2, '8折优惠券', 'percent', 20.00, 50.00, 30.00, 300, NOW(), DATE_ADD(NOW(), INTERVAL 30 DAY), '全场8折，最高优惠30元'),
(0, '平台通用券', 'fixed', 5.00, 20.00, NULL, 10000, NOW(), DATE_ADD(NOW(), INTERVAL 60 DAY), '全平台通用');
