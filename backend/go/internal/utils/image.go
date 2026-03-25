package utils

import (
	"bytes"
	"encoding/json"
	"fmt"
	"image"
	"image/gif"
	"image/jpeg"
	"image/png"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"
)

// CompressImage 压缩图片到指定大小以下（单位：字节），返回最终文件名
func CompressImage(inputPath string, maxSize int64) (string, error) {
	ext := strings.ToLower(filepath.Ext(inputPath))

	// HEIC/HEIF: 调用转码服务转为JPEG
	if ext == ".heic" || ext == ".heif" {
		jpgPath, err := convertHEIC(inputPath)
		if err != nil {
			log.Printf("HEIC转码失败: %v, 返回原文件", err)
			return filepath.Base(inputPath), nil
		}
		// 转码成功，用JPEG路径继续压缩流程
		inputPath = jpgPath
		ext = ".jpg"
	}

	// 检查文件大小，如果已经小于maxSize，不需要压缩
	info, err := os.Stat(inputPath)
	if err != nil {
		return "", err
	}
	if info.Size() <= maxSize {
		return filepath.Base(inputPath), nil
	}

	// 读取并解码图片
	file, err := os.Open(inputPath)
	if err != nil {
		return "", err
	}
	defer file.Close()

	img, _, err := image.Decode(file)
	if err != nil {
		return filepath.Base(inputPath), nil
	}

	// 确定输出文件名（非JPEG格式转为JPEG）
	outName := filepath.Base(inputPath)
	if ext != ".jpg" && ext != ".jpeg" {
		outName = strings.TrimSuffix(outName, ext) + ".jpg"
	}
	outPath := filepath.Join(filepath.Dir(inputPath), outName)

	// 先尝试降低质量
	qualities := []int{85, 70, 55, 40, 25}
	for _, q := range qualities {
		var buf bytes.Buffer
		if err := jpeg.Encode(&buf, img, &jpeg.Options{Quality: q}); err != nil {
			continue
		}
		if int64(buf.Len()) <= maxSize {
			return persistCompressedImage(outPath, inputPath, outName, buf.Bytes())
		}
	}

	// 质量压缩不够，缩小尺寸+降质量
	bounds := img.Bounds()
	w, h := bounds.Dx(), bounds.Dy()

	scales := []float64{0.7, 0.5, 0.35, 0.25, 0.15}
	for _, s := range scales {
		nw, nh := int(float64(w)*s), int(float64(h)*s)
		if nw < 1 || nh < 1 {
			continue
		}
		dst := image.NewRGBA(image.Rect(0, 0, nw, nh))
		resizeNearestNeighbor(dst, img)

		var buf bytes.Buffer
		if err := jpeg.Encode(&buf, dst, &jpeg.Options{Quality: 70}); err != nil {
			continue
		}
		if int64(buf.Len()) <= maxSize {
			return persistCompressedImage(outPath, inputPath, outName, buf.Bytes())
		}
	}

	// 最终兜底：极小尺寸
	nw, nh := int(float64(w)*0.1), int(float64(h)*0.1)
	if nw < 1 {
		nw = 1
	}
	if nh < 1 {
		nh = 1
	}
	dst := image.NewRGBA(image.Rect(0, 0, nw, nh))
	resizeNearestNeighbor(dst, img)
	var buf bytes.Buffer
	if err := jpeg.Encode(&buf, dst, &jpeg.Options{Quality: 50}); err != nil {
		return "", err
	}
	return persistCompressedImage(outPath, inputPath, outName, buf.Bytes())
}

func persistCompressedImage(outPath, inputPath, outName string, payload []byte) (string, error) {
	if err := os.WriteFile(outPath, payload, 0644); err != nil {
		return "", err
	}
	if outPath != inputPath {
		if err := os.Remove(inputPath); err != nil && !os.IsNotExist(err) {
			log.Printf("清理原图失败: %v", err)
		}
	}
	return outName, nil
}

// resizeNearestNeighbor 使用最近邻采样缩放（不依赖外部库）
func resizeNearestNeighbor(dst *image.RGBA, src image.Image) {
	srcBounds := src.Bounds()
	dstBounds := dst.Bounds()
	sw := srcBounds.Dx()
	sh := srcBounds.Dy()
	dw := dstBounds.Dx()
	dh := dstBounds.Dy()

	for y := 0; y < dh; y++ {
		sy := srcBounds.Min.Y + y*sh/dh
		for x := 0; x < dw; x++ {
			sx := srcBounds.Min.X + x*sw/dw
			dst.Set(dstBounds.Min.X+x, dstBounds.Min.Y+y, src.At(sx, sy))
		}
	}
}

// 确保 gif/png/jpeg 解码器已注册
var _ = gif.Decode
var _ = png.Decode

func resolveHEICConverterURL() string {
	value := strings.TrimSpace(os.Getenv("HEIC_CONVERTER_URL"))
	if value == "" {
		return "http://127.0.0.1:9899/convert"
	}

	value = strings.TrimRight(value, "/")
	if strings.HasSuffix(strings.ToLower(value), "/convert") {
		return value
	}
	return value + "/convert"
}

// convertHEIC 调用 heic-converter 微服务将 HEIC/HEIF 转为 JPEG
func convertHEIC(inputPath string) (string, error) {
	absPath, err := filepath.Abs(inputPath)
	if err != nil {
		return "", fmt.Errorf("解析输入路径失败: %w", err)
	}
	outPath := strings.TrimSuffix(absPath, filepath.Ext(absPath)) + ".jpg"

	reqBody, err := json.Marshal(map[string]string{
		"inputPath":  absPath,
		"outputPath": outPath,
	})
	if err != nil {
		return "", fmt.Errorf("构造转码请求失败: %w", err)
	}

	httpClient := &http.Client{Timeout: 15 * time.Second}
	resp, err := httpClient.Post(resolveHEICConverterURL(), "application/json", bytes.NewReader(reqBody))
	if err != nil {
		return "", fmt.Errorf("连接转码服务失败: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("读取转码响应失败: %w", err)
	}
	if resp.StatusCode != 200 {
		return "", fmt.Errorf("转码服务返回错误: %s", string(body))
	}

	var result struct {
		Success  bool   `json:"success"`
		Filename string `json:"filename"`
	}
	if err := json.Unmarshal(body, &result); err != nil {
		return "", fmt.Errorf("解析转码响应失败: %w", err)
	}

	if !result.Success {
		return "", fmt.Errorf("转码失败")
	}

	log.Printf("HEIC转码成功: %s -> %s", filepath.Base(inputPath), result.Filename)
	return outPath, nil
}
