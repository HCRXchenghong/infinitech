package main

import (
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"log"
	"os"
	"strings"

	"github.com/yuexiang/go-api/internal/admincli"
	"github.com/yuexiang/go-api/internal/repository"
)

type response struct {
	Success     bool                 `json:"success"`
	Action      string               `json:"action,omitempty"`
	Error       string               `json:"error,omitempty"`
	NewPassword string               `json:"newPassword,omitempty"`
	Admin       map[string]any       `json:"admin,omitempty"`
	Admins      []map[string]any     `json:"admins,omitempty"`
	Data        map[string]any       `json:"data,omitempty"`
}

func main() {
	var (
		action        = flag.String("action", "list", "操作：list/show/create/update/reset-password/delete")
		adminID        = flag.Uint("id", 0, "管理员 legacy ID")
		phone          = flag.String("phone", "", "用于选择管理员的手机号")
		newPhone       = flag.String("new-phone", "", "管理员新的手机号")
		uid            = flag.String("uid", "", "管理员 UID")
		tsid           = flag.String("tsid", "", "管理员 TSID")
		name           = flag.String("name", "", "管理员姓名")
		adminType      = flag.String("type", "", "管理员类型：admin 或 super_admin")
		password       = flag.String("password", "", "管理员密码")
		passwordStdin  = flag.Bool("password-stdin", false, "从标准输入读取密码")
		generate       = flag.Bool("generate", false, "自动生成高强度密码")
		passwordLength = flag.Int("password-length", admincli.DefaultGeneratedPasswordLength, "自动生成密码长度")
		confirm        = flag.String("confirm", "", "敏感操作确认文本")
		envFile        = flag.String("env-file", "", "优先加载的 env 文件")
		jsonOutput     = flag.Bool("json", false, "输出 JSON")
	)
	flag.Parse()

	admincli.LoadEnvFiles(strings.TrimSpace(*envFile))
	db, err := admincli.OpenDB()
	if err != nil {
		fail(*jsonOutput, *action, err)
	}

	ctx := context.Background()
	selector := admincli.Selector{
		ID:    *adminID,
		Phone: strings.TrimSpace(*phone),
		UID:   strings.TrimSpace(*uid),
		TSID:  strings.TrimSpace(*tsid),
	}

	switch strings.TrimSpace(*action) {
	case "list":
		admins, listErr := admincli.ListAdmins(ctx, db)
		if listErr != nil {
			fail(*jsonOutput, *action, listErr)
		}
		respond(*jsonOutput, response{
			Success: true,
			Action:  *action,
			Admins:  serializeAdmins(admins),
		})
	case "show":
		admin, showErr := admincli.FindAdmin(ctx, db, selector)
		if showErr != nil {
			fail(*jsonOutput, *action, showErr)
		}
		respond(*jsonOutput, response{
			Success: true,
			Action:  *action,
			Admin:   serializeAdmin(admin),
		})
	case "create":
		resolvedPassword, createdByGenerator, passwordErr := resolvePassword(strings.TrimSpace(*password), *passwordStdin, *generate, *passwordLength)
		if passwordErr != nil {
			fail(*jsonOutput, *action, passwordErr)
		}
		admin, createErr := admincli.CreateAdmin(ctx, db, strings.TrimSpace(*phone), strings.TrimSpace(*name), resolvedPassword, strings.TrimSpace(*adminType))
		if createErr != nil {
			fail(*jsonOutput, *action, createErr)
		}
		payload := response{
			Success:     true,
			Action:      *action,
			Admin:       serializeAdmin(admin),
			NewPassword: resolvedPassword,
		}
		if createdByGenerator {
			payload.Data = map[string]any{"generatedPassword": true}
		}
		respond(*jsonOutput, payload)
	case "update":
		admin, updateErr := admincli.UpdateAdmin(ctx, db, selector, strings.TrimSpace(*newPhone), strings.TrimSpace(*name), strings.TrimSpace(*adminType))
		if updateErr != nil {
			fail(*jsonOutput, *action, updateErr)
		}
		respond(*jsonOutput, response{
			Success: true,
			Action:  *action,
			Admin:   serializeAdmin(admin),
		})
	case "reset-password":
		if strings.TrimSpace(*confirm) == "" {
			fail(*jsonOutput, *action, fmt.Errorf("重置管理员密码必须提供 --confirm"))
		}
		admin, lookupErr := admincli.FindAdmin(ctx, db, selector)
		if lookupErr != nil {
			fail(*jsonOutput, *action, lookupErr)
		}
		if !matchesConfirm(admin, strings.TrimSpace(*confirm)) {
			fail(*jsonOutput, *action, fmt.Errorf("确认信息不匹配目标管理员"))
		}
		resolvedPassword, _, passwordErr := resolvePassword(strings.TrimSpace(*password), *passwordStdin, *generate, *passwordLength)
		if passwordErr != nil {
			fail(*jsonOutput, *action, passwordErr)
		}
		admin, resetErr := admincli.ResetAdminPassword(ctx, db, selector, resolvedPassword)
		if resetErr != nil {
			fail(*jsonOutput, *action, resetErr)
		}
		respond(*jsonOutput, response{
			Success:     true,
			Action:      *action,
			Admin:       serializeAdmin(admin),
			NewPassword: resolvedPassword,
		})
	case "delete":
		if strings.TrimSpace(*confirm) == "" {
			fail(*jsonOutput, *action, fmt.Errorf("删除管理员必须提供 --confirm"))
		}
		admin, lookupErr := admincli.FindAdmin(ctx, db, selector)
		if lookupErr != nil {
			fail(*jsonOutput, *action, lookupErr)
		}
		if !matchesConfirm(admin, strings.TrimSpace(*confirm)) {
			fail(*jsonOutput, *action, fmt.Errorf("确认信息不匹配目标管理员"))
		}
		if deleteErr := admincli.DeleteAdmin(ctx, db, selector); deleteErr != nil {
			fail(*jsonOutput, *action, deleteErr)
		}
		respond(*jsonOutput, response{
			Success: true,
			Action:  *action,
			Admin:   serializeAdmin(admin),
		})
	default:
		fail(*jsonOutput, *action, fmt.Errorf("unsupported action: %s", *action))
	}
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

func serializeAdmins(admins []repository.Admin) []map[string]any {
	items := make([]map[string]any, 0, len(admins))
	for _, admin := range admins {
		copyAdmin := admin
		items = append(items, serializeAdmin(&copyAdmin))
	}
	return items
}

func serializeAdmin(admin *repository.Admin) map[string]any {
	if admin == nil {
		return nil
	}
	return map[string]any{
		"id":        admin.ID,
		"uid":       admin.UID,
		"tsid":      admin.TSID,
		"phone":     admin.Phone,
		"name":      admin.Name,
		"type":      admin.Type,
		"createdAt": admin.CreatedAt,
		"updatedAt": admin.UpdatedAt,
	}
}

func matchesConfirm(admin *repository.Admin, confirm string) bool {
	if admin == nil || confirm == "" {
		return false
	}
	return confirm == fmt.Sprintf("%d", admin.ID) ||
		confirm == strings.TrimSpace(admin.Phone) ||
		confirm == strings.TrimSpace(admin.UID) ||
		confirm == strings.TrimSpace(admin.TSID)
}

func respond(jsonOutput bool, payload response) {
	if jsonOutput {
		data, err := json.Marshal(payload)
		if err != nil {
			log.Fatalf("marshal response failed: %v", err)
		}
		fmt.Println(string(data))
		return
	}
	if !payload.Success {
		fmt.Println(payload.Error)
		return
	}
	if payload.Admin != nil {
		fmt.Printf("管理员: %+v\n", payload.Admin)
	}
	if len(payload.Admins) > 0 {
		fmt.Printf("管理员数量: %d\n", len(payload.Admins))
		for _, admin := range payload.Admins {
			fmt.Printf("- %+v\n", admin)
		}
	}
	if payload.NewPassword != "" {
		fmt.Printf("新密码: %s\n", payload.NewPassword)
	}
}

func fail(jsonOutput bool, action string, err error) {
	payload := response{
		Success: false,
		Action:  action,
		Error:   err.Error(),
	}
	if jsonOutput {
		data, marshalErr := json.Marshal(payload)
		if marshalErr != nil {
			log.Fatalf("marshal error response failed: %v", marshalErr)
		}
		fmt.Println(string(data))
		os.Exit(1)
	}
	log.Fatal(err)
}
