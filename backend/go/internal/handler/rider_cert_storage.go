package handler

import (
	"fmt"
	"io"
	"mime"
	"mime/multipart"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/yuexiang/go-api/internal/repository"
	"github.com/yuexiang/go-api/internal/uploadasset"
	"github.com/yuexiang/go-api/internal/utils"
	"gorm.io/gorm"
)

const riderCertPrivateScheme = "private://rider-cert/"

var riderCertPrivateRootPath = filepath.Join(".", "data", "private", "rider-certs")
var riderPublicUploadsRootPath = filepath.Join(".", "data", "uploads")

var riderCertAllowedFields = map[string]struct{}{
	"id_card_front": {},
	"id_card_back":  {},
	"health_cert":   {},
}

func normalizeRiderCertField(raw string) (string, bool) {
	field := strings.TrimSpace(raw)
	_, ok := riderCertAllowedFields[field]
	return field, ok
}

func buildRiderCertPreviewURL(riderID uint, field, raw string) string {
	value := strings.TrimSpace(raw)
	if value == "" {
		return ""
	}
	if uploadasset.IsPrivateReference(value) {
		return uploadasset.BuildConfiguredPreviewURL(value)
	}
	normalizedField, ok := normalizeRiderCertField(field)
	if !ok {
		return ""
	}
	return fmt.Sprintf("/api/riders/%d/cert?field=%s", riderID, normalizedField)
}

func buildRiderCertStorageDir(riderID uint, field string) string {
	return filepath.Join(riderCertPrivateRootPath, strconv.FormatUint(uint64(riderID), 10), field)
}

func buildRiderCertPrivateRef(riderID uint, field, filename string) string {
	return fmt.Sprintf(
		"%s%d/%s/%s",
		riderCertPrivateScheme,
		riderID,
		field,
		filepath.Base(strings.TrimSpace(filename)),
	)
}

func resolveLegacyUploadAbsPath(raw string) (string, string, error) {
	value := strings.TrimSpace(raw)
	if !strings.HasPrefix(value, "/uploads/") {
		return "", "", fmt.Errorf("证件资源必须通过受控上传接口生成")
	}
	relative := strings.TrimPrefix(value, "/uploads/")
	relative = filepath.Clean(filepath.FromSlash(relative))
	if relative == "." || relative == "" {
		return "", "", fmt.Errorf("证件资源路径无效")
	}
	if strings.HasPrefix(relative, "..") {
		return "", "", fmt.Errorf("证件资源路径无效")
	}
	absPath := filepath.Join(riderPublicUploadsRootPath, relative)
	root := filepath.Clean(riderPublicUploadsRootPath)
	cleanAbs := filepath.Clean(absPath)
	if cleanAbs != root && !strings.HasPrefix(cleanAbs, root+string(filepath.Separator)) {
		return "", "", fmt.Errorf("证件资源路径无效")
	}
	return cleanAbs, filepath.Base(cleanAbs), nil
}

func resolveRiderCertPrivateAbsPath(riderID uint, field, raw string) (string, string, error) {
	value := strings.TrimSpace(raw)
	if !strings.HasPrefix(value, riderCertPrivateScheme) {
		return "", "", fmt.Errorf("证件资源引用无效")
	}
	relative := strings.TrimPrefix(value, riderCertPrivateScheme)
	parts := strings.Split(relative, "/")
	if len(parts) != 3 {
		return "", "", fmt.Errorf("证件资源引用无效")
	}
	expectedID := strconv.FormatUint(uint64(riderID), 10)
	if parts[0] != expectedID || parts[1] != field {
		return "", "", fmt.Errorf("证件资源引用无效")
	}
	filename := filepath.Base(strings.TrimSpace(parts[2]))
	if filename == "." || filename == "" {
		return "", "", fmt.Errorf("证件资源引用无效")
	}
	absPath := filepath.Join(buildRiderCertStorageDir(riderID, field), filename)
	root := filepath.Clean(buildRiderCertStorageDir(riderID, field))
	cleanAbs := filepath.Clean(absPath)
	if cleanAbs != root && !strings.HasPrefix(cleanAbs, root+string(filepath.Separator)) {
		return "", "", fmt.Errorf("证件资源引用无效")
	}
	return cleanAbs, filename, nil
}

func contentTypeByFilename(filename string) string {
	ext := strings.ToLower(filepath.Ext(strings.TrimSpace(filename)))
	switch ext {
	case ".jpg", ".jpeg":
		return "image/jpeg"
	case ".png":
		return "image/png"
	case ".gif":
		return "image/gif"
	case ".webp":
		return "image/webp"
	case ".bmp":
		return "image/bmp"
	case ".heic":
		return "image/heic"
	case ".heif":
		return "image/heif"
	default:
		if guessed := mime.TypeByExtension(ext); strings.TrimSpace(guessed) != "" {
			return guessed
		}
		return "application/octet-stream"
	}
}

func moveFileReplace(srcPath, destPath string) error {
	if err := os.MkdirAll(filepath.Dir(destPath), 0755); err != nil {
		return err
	}
	if err := os.Rename(srcPath, destPath); err == nil {
		return nil
	}

	srcFile, err := os.Open(srcPath)
	if err != nil {
		return err
	}
	defer srcFile.Close()

	destFile, err := os.OpenFile(destPath, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, 0644)
	if err != nil {
		return err
	}
	if _, err := io.Copy(destFile, srcFile); err != nil {
		destFile.Close()
		return err
	}
	if err := destFile.Close(); err != nil {
		return err
	}
	return os.Remove(srcPath)
}

func promoteLegacyRiderCertReference(riderID uint, field, raw string) (string, bool, error) {
	value := strings.TrimSpace(raw)
	if value == "" {
		return "", false, nil
	}
	if strings.HasPrefix(value, riderCertPrivateScheme) {
		if _, _, err := resolveRiderCertPrivateAbsPath(riderID, field, value); err != nil {
			return "", false, err
		}
		return value, false, nil
	}
	if uploadasset.IsPrivateReference(value) {
		parsed, ok := uploadasset.ParseReference(value)
		if !ok {
			return "", false, fmt.Errorf("证件资源引用无效")
		}
		expectedOwnerID := strconv.FormatUint(uint64(riderID), 10)
		if parsed.Domain != uploadasset.DomainOnboardingDocument ||
			parsed.OwnerRole != "rider" ||
			parsed.OwnerID != expectedOwnerID {
			return "", false, fmt.Errorf("证件资源引用无效")
		}
		return value, false, nil
	}

	srcPath, filename, err := resolveLegacyUploadAbsPath(value)
	if err != nil {
		return "", false, err
	}
	if _, ok := publicImageUploadAllowedExts[strings.ToLower(filepath.Ext(filename))]; !ok {
		return "", false, fmt.Errorf("证件资源格式无效")
	}
	if _, statErr := os.Stat(srcPath); statErr != nil {
		if os.IsNotExist(statErr) {
			return "", false, fmt.Errorf("证件资源不存在，请重新上传")
		}
		return "", false, fmt.Errorf("证件资源读取失败")
	}

	destFilename := fmt.Sprintf("%d_%d_%s%s", time.Now().UnixNano(), riderID, field, strings.ToLower(filepath.Ext(filename)))
	destDir := buildRiderCertStorageDir(riderID, field)
	destPath := filepath.Join(destDir, destFilename)
	if err := moveFileReplace(srcPath, destPath); err != nil {
		return "", false, fmt.Errorf("迁移证件资源失败")
	}

	return buildRiderCertPrivateRef(riderID, field, destFilename), true, nil
}

func saveUploadedRiderCert(c *gin.Context, file *multipart.FileHeader, riderID uint, field string) (string, string, string, error) {
	ext, err := validateUploadFile(file, generalUploadMaxBytes, publicImageUploadAllowedExts)
	if err != nil {
		return "", "", "", err
	}

	uploadDir := buildRiderCertStorageDir(riderID, field)
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		return "", "", "", fmt.Errorf("创建证件目录失败")
	}

	filename := fmt.Sprintf("%d_%d_%s%s", time.Now().UnixNano(), riderID, field, ext)
	savePath := filepath.Join(uploadDir, filename)
	if err := c.SaveUploadedFile(file, savePath); err != nil {
		return "", "", "", fmt.Errorf("保存证件失败")
	}

	finalFilename, err := utils.CompressImage(savePath, 500*1024)
	if err != nil {
		_ = os.Remove(savePath)
		return "", "", "", fmt.Errorf("证件图片处理失败")
	}

	return buildRiderCertPrivateRef(riderID, field, finalFilename), finalFilename, contentTypeByFilename(finalFilename), nil
}

func cleanupRiderCertReference(riderID uint, field, raw string) {
	value := strings.TrimSpace(raw)
	if value == "" {
		return
	}
	var targetPath string
	if strings.HasPrefix(value, riderCertPrivateScheme) {
		path, _, err := resolveRiderCertPrivateAbsPath(riderID, field, value)
		if err != nil {
			return
		}
		targetPath = path
	} else if strings.HasPrefix(value, "/uploads/") {
		path, _, err := resolveLegacyUploadAbsPath(value)
		if err != nil {
			return
		}
		targetPath = path
	}
	if strings.TrimSpace(targetPath) == "" {
		return
	}
	if err := os.Remove(targetPath); err != nil && !os.IsNotExist(err) {
		return
	}
}

func resolveStoredRiderCertFile(riderID uint, field, raw string) (string, string, string, bool, error) {
	value := strings.TrimSpace(raw)
	if value == "" {
		return "", "", "", false, fmt.Errorf("证件资源不存在")
	}
	if uploadasset.IsPrivateReference(value) {
		parsed, absPath, err := uploadasset.ResolveAbsolutePath(generalPrivateUploadsRootPath, value)
		if err != nil {
			return "", "", "", false, fmt.Errorf("证件资源引用无效")
		}
		expectedOwnerID := strconv.FormatUint(uint64(riderID), 10)
		if parsed.Domain != uploadasset.DomainOnboardingDocument ||
			parsed.OwnerRole != "rider" ||
			parsed.OwnerID != expectedOwnerID {
			return "", "", "", false, fmt.Errorf("证件资源引用无效")
		}
		if _, statErr := os.Stat(absPath); statErr != nil {
			if os.IsNotExist(statErr) {
				return "", "", "", false, fmt.Errorf("证件资源不存在")
			}
			return "", "", "", false, fmt.Errorf("证件资源读取失败")
		}
		return value, absPath, contentTypeByFilename(parsed.Filename), false, nil
	}

	ref := value
	changed := false
	if !strings.HasPrefix(ref, riderCertPrivateScheme) {
		nextRef, migrated, err := promoteLegacyRiderCertReference(riderID, field, ref)
		if err != nil {
			return "", "", "", false, err
		}
		ref = nextRef
		changed = migrated
	}

	absPath, filename, err := resolveRiderCertPrivateAbsPath(riderID, field, ref)
	if err != nil {
		return "", "", "", false, err
	}
	if _, statErr := os.Stat(absPath); statErr != nil {
		if os.IsNotExist(statErr) {
			return "", "", "", false, fmt.Errorf("证件资源不存在")
		}
		return "", "", "", false, fmt.Errorf("证件资源读取失败")
	}
	return ref, absPath, contentTypeByFilename(filename), changed, nil
}

func normalizeStoredRiderCertRefs(db *gorm.DB, rider *repository.Rider) error {
	if db == nil || rider == nil || rider.ID == 0 {
		return nil
	}

	type certFieldState struct {
		name    string
		current string
	}

	fields := []certFieldState{
		{name: "id_card_front", current: rider.IDCardFront},
		{name: "id_card_back", current: rider.IDCardBack},
		{name: "health_cert", current: rider.HealthCert},
	}
	updates := map[string]interface{}{}

	for _, field := range fields {
		nextRef, changed, err := promoteLegacyRiderCertReference(rider.ID, field.name, field.current)
		if err != nil || !changed {
			continue
		}
		updates[field.name] = nextRef
		switch field.name {
		case "id_card_front":
			rider.IDCardFront = nextRef
		case "id_card_back":
			rider.IDCardBack = nextRef
		case "health_cert":
			rider.HealthCert = nextRef
		}
	}

	if len(updates) == 0 {
		return nil
	}
	return db.Model(&repository.Rider{}).Where("id = ?", rider.ID).Updates(updates).Error
}
