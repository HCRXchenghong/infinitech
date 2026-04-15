//go:build script
// +build script

package main

import (
	"context"
	"flag"
	"fmt"
	"io"
	"log"
	"os"
	"strings"

	"github.com/yuexiang/go-api/internal/admincli"
	"github.com/yuexiang/go-api/internal/repository"
)

func main() {
	var (
		adminID        = flag.Uint("id", 0, "管理员 legacy ID")
		phone          = flag.String("phone", "", "管理员手机号")
		uid            = flag.String("uid", "", "管理员 UID")
		tsid           = flag.String("tsid", "", "管理员 TSID")
		password       = flag.String("password", "", "新的管理员密码，不建议直接写在命令历史里")
		passwordStdin  = flag.Bool("password-stdin", false, "从标准输入读取新的管理员密码")
		generate       = flag.Bool("generate", false, "自动生成一次性高强度临时密码")
		passwordLength = flag.Int("password-length", admincli.DefaultGeneratedPasswordLength, "自动生成密码长度")
		confirm        = flag.String("confirm", "", "执行重置前再次确认目标管理员的 ID / UID / TSID / 手机号")
		yes            = flag.Bool("yes", false, "确认执行密码重置")
		listOnly       = flag.Bool("list", false, "仅列出管理员账号")
		showSensitive  = flag.Bool("show-sensitive", false, "列出管理员时显示完整手机号和姓名")
		envFile        = flag.String("env-file", "", "优先加载的 .env 文件")
	)
	flag.Parse()

	admincli.LoadEnvFiles(strings.TrimSpace(*envFile))
	db, err := admincli.OpenDB()
	if err != nil {
		log.Fatalf("连接数据库失败: %v", err)
	}

	selector := admincli.Selector{
		ID:    *adminID,
		Phone: strings.TrimSpace(*phone),
		UID:   strings.TrimSpace(*uid),
		TSID:  strings.TrimSpace(*tsid),
	}

	ctx := context.Background()
	if *listOnly || selector.Count() == 0 {
		admins, listErr := admincli.ListAdmins(ctx, db)
		if listErr != nil {
			log.Fatalf("列出管理员失败: %v", listErr)
		}
		printAdmins(admins, *showSensitive)
		if selector.Count() == 0 {
			printUsageHints()
		}
		return
	}

	if err := selector.ValidateSingle(); err != nil {
		log.Fatal(err)
	}

	admin, err := admincli.FindAdmin(ctx, db, selector)
	if err != nil {
		log.Fatalf("查找管理员失败: %v", err)
	}

	if !*yes {
		log.Fatalf(
			"出于安全考虑，重置管理员密码必须显式带上 --yes。目标管理员：ID=%d UID=%s 手机号=%s",
			admin.ID,
			safeValue(admin.UID),
			maskPhone(admin.Phone),
		)
	}

	if !confirmationMatches(admin, strings.TrimSpace(*confirm)) {
		log.Fatalf(
			"出于安全考虑，必须通过 --confirm 再次确认目标管理员。可填该管理员当前的 ID / UID / TSID / 手机号。目标：ID=%d UID=%s TSID=%s 手机号=%s",
			admin.ID,
			safeValue(admin.UID),
			safeValue(admin.TSID),
			maskPhone(admin.Phone),
		)
	}

	resolvedPassword, generatedPassword, passwordErr := resolvePassword(strings.TrimSpace(*password), *passwordStdin, *generate, *passwordLength)
	if passwordErr != nil {
		log.Fatalf("准备新密码失败: %v", passwordErr)
	}

	admin, err = admincli.ResetAdminPassword(ctx, db, selector, resolvedPassword)
	if err != nil {
		log.Fatalf("重置管理员密码失败: %v", err)
	}

	fmt.Println("管理员密码已重置成功。")
	fmt.Printf("目标管理员 ID: %d\n", admin.ID)
	fmt.Printf("目标管理员 UID: %s\n", safeValue(admin.UID))
	fmt.Printf("登录手机号: %s\n", maskPhone(admin.Phone))
	fmt.Printf("管理员姓名: %s\n", maskName(admin.Name))
	fmt.Printf("新密码: %s\n", resolvedPassword)
	if generatedPassword {
		fmt.Println("说明：本次使用的是自动生成的一次性高强度临时密码。")
	}
	fmt.Println("请在管理员重新登录后立即改成真实且长期使用的密码。")
}

func resolvePassword(manual string, passwordStdin, generate bool, length int) (string, bool, error) {
	modeCount := 0
	if manual != "" {
		modeCount++
	}
	if passwordStdin {
		modeCount++
	}
	if generate {
		modeCount++
	}
	if modeCount > 1 {
		return "", false, fmt.Errorf("--password、--password-stdin、--generate 只能三选一")
	}

	if manual != "" {
		if err := admincli.ValidateManualPassword(manual); err != nil {
			return "", false, err
		}
		return manual, false, nil
	}

	if passwordStdin {
		raw, err := io.ReadAll(os.Stdin)
		if err != nil {
			return "", false, fmt.Errorf("从标准输入读取密码失败: %w", err)
		}
		value := strings.TrimSpace(string(raw))
		if err := admincli.ValidateManualPassword(value); err != nil {
			return "", false, err
		}
		return value, false, nil
	}

	password, err := admincli.GenerateSecurePassword(length)
	if err != nil {
		return "", false, err
	}
	return password, true, nil
}

func printUsageHints() {
	fmt.Println("\n提示：如需重置管理员密码，请先通过 --list 找到目标管理员，再显式确认。")
	fmt.Println("推荐做法：默认使用自动生成的一次性临时密码。")
	fmt.Println("示例：")
	fmt.Println("  go run ./scripts/reset-admin-password.go --list")
	fmt.Println("  go run ./scripts/reset-admin-password.go --phone 13800138000 --confirm 13800138000 --generate --yes")
	fmt.Println("  echo 强密码示例123!Abc | go run ./scripts/reset-admin-password.go --uid ADMIN_UID --confirm ADMIN_UID --password-stdin --yes")
}

func printAdmins(admins []repository.Admin, showSensitive bool) {
	if len(admins) == 0 {
		fmt.Println("当前数据库没有管理员账号。")
		return
	}

	fmt.Printf("管理员数量: %d\n", len(admins))
	for _, admin := range admins {
		phone := maskPhone(admin.Phone)
		name := maskName(admin.Name)
		if showSensitive {
			phone = safeValue(admin.Phone)
			name = safeValue(admin.Name)
		}
		fmt.Printf(
			"- ID=%d UID=%s TSID=%s 手机号=%s 姓名=%s 类型=%s\n",
			admin.ID,
			safeValue(admin.UID),
			safeValue(admin.TSID),
			phone,
			name,
			safeValue(admin.Type),
		)
	}
}

func confirmationMatches(admin *repository.Admin, confirm string) bool {
	if admin == nil || confirm == "" {
		return false
	}
	return confirm == fmt.Sprintf("%d", admin.ID) ||
		confirm == strings.TrimSpace(admin.Phone) ||
		confirm == strings.TrimSpace(admin.UID) ||
		confirm == strings.TrimSpace(admin.TSID)
}

func maskPhone(phone string) string {
	phone = strings.TrimSpace(phone)
	if len(phone) != 11 {
		return safeValue(phone)
	}
	return phone[:3] + "****" + phone[7:]
}

func maskName(name string) string {
	name = strings.TrimSpace(name)
	runes := []rune(name)
	if len(runes) <= 1 {
		return safeValue(name)
	}
	if len(runes) == 2 {
		return string(runes[0]) + "*"
	}
	return string(runes[0]) + strings.Repeat("*", len(runes)-2) + string(runes[len(runes)-1])
}

func safeValue(value string) string {
	value = strings.TrimSpace(value)
	if value == "" {
		return "-"
	}
	return value
}
