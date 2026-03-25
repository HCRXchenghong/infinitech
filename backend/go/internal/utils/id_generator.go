package utils

import (
	"fmt"
)

// FormatRiderID 格式化骑手ID: 250724007XXXX
func FormatRiderID(id uint) string {
	return fmt.Sprintf("250724007%05d", id%100000)
}

// FormatMerchantID 格式化商家ID: 250724009XXXX
func FormatMerchantID(id uint) string {
	return fmt.Sprintf("250724009%05d", id%100000)
}

// FormatUserID 格式化用户ID: 250724006XXXXXX
func FormatUserID(id uint) string {
	return fmt.Sprintf("250724006%06d", id%1000000)
}

// FormatAdminID 格式化管理员ID: 250724XX
func FormatAdminID(id uint) string {
	return fmt.Sprintf("2507%02d%02d", 24, id%100)
}

// FormatOrderID 格式化订单号: 250724-XXXX (简化版)
func FormatOrderID(id uint) string {
	return fmt.Sprintf("250724-%05d", id%100000)
}
