package utils

import (
	"crypto/rand"
	"fmt"
	"math/big"
)

// GenerateSecureCode 生成安全的数字验证码
// length: 验证码长度（通常为4或6位）
func GenerateSecureCode(length int) (string, error) {
	if length <= 0 || length > 10 {
		return "", fmt.Errorf("invalid code length: %d", length)
	}

	// 计算最大值（例如：6位验证码的最大值是999999）
	max := big.NewInt(1)
	for i := 0; i < length; i++ {
		max.Mul(max, big.NewInt(10))
	}

	// 使用crypto/rand生成安全的随机数
	n, err := rand.Int(rand.Reader, max)
	if err != nil {
		return "", fmt.Errorf("failed to generate random number: %w", err)
	}

	// 格式化为指定长度的字符串（前面补0）
	format := fmt.Sprintf("%%0%dd", length)
	return fmt.Sprintf(format, n.Int64()), nil
}

// GenerateSecure6DigitCode 生成6位安全验证码（快捷方法）
func GenerateSecure6DigitCode() (string, error) {
	return GenerateSecureCode(6)
}

// GenerateSecure4DigitCode 生成4位安全验证码（快捷方法）
func GenerateSecure4DigitCode() (string, error) {
	return GenerateSecureCode(4)
}
