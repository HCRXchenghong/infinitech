package ridercert

import (
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"
)

func BuildStorageDir(privateRoot string, riderID uint, field string) string {
	return filepath.Join(strings.TrimSpace(privateRoot), strconv.FormatUint(uint64(riderID), 10), strings.TrimSpace(field))
}

func ResolveLegacyUploadAbsPath(publicRoot, raw string) (string, string, error) {
	value := strings.TrimSpace(raw)
	if !strings.HasPrefix(value, "/uploads/") {
		return "", "", fmt.Errorf("证件资源必须通过受控上传接口生成")
	}

	relative := strings.TrimPrefix(value, "/uploads/")
	relative = filepath.Clean(filepath.FromSlash(relative))
	if relative == "." || relative == "" || strings.HasPrefix(relative, "..") {
		return "", "", fmt.Errorf("证件资源路径无效")
	}

	absPath := filepath.Join(strings.TrimSpace(publicRoot), relative)
	root := filepath.Clean(strings.TrimSpace(publicRoot))
	cleanAbs := filepath.Clean(absPath)
	if cleanAbs != root && !strings.HasPrefix(cleanAbs, root+string(filepath.Separator)) {
		return "", "", fmt.Errorf("证件资源路径无效")
	}

	return cleanAbs, filepath.Base(cleanAbs), nil
}

func ResolvePrivateAbsPath(privateRoot string, riderID uint, field, raw string) (string, string, error) {
	value := strings.TrimSpace(raw)
	if !IsPrivateReference(value) {
		return "", "", fmt.Errorf("证件资源引用无效")
	}

	ownerID, parsedField, filename, ok := ParsePrivateReference(value)
	if !ok {
		return "", "", fmt.Errorf("证件资源引用无效")
	}

	expectedID := strconv.FormatUint(uint64(riderID), 10)
	if ownerID != expectedID || parsedField != strings.TrimSpace(field) {
		return "", "", fmt.Errorf("证件资源引用无效")
	}

	absPath := filepath.Join(BuildStorageDir(privateRoot, riderID, field), filename)
	root := filepath.Clean(BuildStorageDir(privateRoot, riderID, field))
	cleanAbs := filepath.Clean(absPath)
	if cleanAbs != root && !strings.HasPrefix(cleanAbs, root+string(filepath.Separator)) {
		return "", "", fmt.Errorf("证件资源引用无效")
	}

	return cleanAbs, filename, nil
}

func PromoteLegacyReference(riderID uint, field, raw, publicRoot, privateRoot string) (string, bool, error) {
	value := strings.TrimSpace(raw)
	if value == "" {
		return "", false, nil
	}

	if IsPrivateReference(value) {
		if _, _, err := ResolvePrivateAbsPath(privateRoot, riderID, field, value); err != nil {
			return "", false, err
		}
		return value, false, nil
	}

	srcPath, filename, err := ResolveLegacyUploadAbsPath(publicRoot, value)
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

	destFilename := fmt.Sprintf(
		"%d_%d_%s%s",
		time.Now().UnixNano(),
		riderID,
		field,
		strings.ToLower(filepath.Ext(filename)),
	)
	destDir := BuildStorageDir(privateRoot, riderID, field)
	destPath := filepath.Join(destDir, destFilename)
	if err := moveFileReplace(srcPath, destPath); err != nil {
		return "", false, fmt.Errorf("迁移证件资源失败")
	}

	return BuildPrivateReference(riderID, field, destFilename), true, nil
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

var publicImageUploadAllowedExts = map[string]struct{}{
	".jpg":  {},
	".jpeg": {},
	".png":  {},
	".gif":  {},
	".webp": {},
	".bmp":  {},
	".heic": {},
	".heif": {},
}
