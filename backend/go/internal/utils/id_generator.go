package utils

import (
	"fmt"
)

// Deprecated: 仅用于旧页面的本地展示回退，不用于生成真实统一业务 ID。
func FormatRiderID(id uint) string {
	return fmt.Sprintf("250724007%05d", id%100000)
}

// Deprecated: 仅用于旧页面的本地展示回退，不用于生成真实统一业务 ID。
func FormatMerchantID(id uint) string {
	return fmt.Sprintf("250724009%05d", id%100000)
}

// Deprecated: 仅用于旧页面的本地展示回退，不用于生成真实统一业务 ID。
func FormatUserID(id uint) string {
	return fmt.Sprintf("250724006%06d", id%1000000)
}

// Deprecated: 仅用于旧页面的本地展示回退，不用于生成真实统一业务 ID。
func FormatAdminID(id uint) string {
	return fmt.Sprintf("2507%02d%02d", 24, id%100)
}

// Deprecated: 仅用于旧页面的本地展示回退，不用于生成真实统一业务 ID。
func FormatOrderID(id uint) string {
	return fmt.Sprintf("250724-%05d", id%100000)
}
