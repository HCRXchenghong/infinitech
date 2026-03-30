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
	"os/exec"
	"path/filepath"
	"strings"
	"time"
)

// CompressImage compresses an uploaded image to the requested size ceiling.
// HEIC/HEIF files are converted to JPEG first.
func CompressImage(inputPath string, maxSize int64) (string, error) {
	normalizedPath, err := ConvertHEICIfNeeded(inputPath)
	if err != nil {
		return "", err
	}

	inputPath = normalizedPath
	ext := strings.ToLower(filepath.Ext(inputPath))

	info, err := os.Stat(inputPath)
	if err != nil {
		return "", err
	}
	if info.Size() <= maxSize {
		return filepath.Base(inputPath), nil
	}

	file, err := os.Open(inputPath)
	if err != nil {
		return "", err
	}
	defer file.Close()

	img, _, err := image.Decode(file)
	if err != nil {
		return filepath.Base(inputPath), nil
	}

	outName := filepath.Base(inputPath)
	if ext != ".jpg" && ext != ".jpeg" {
		outName = strings.TrimSuffix(outName, ext) + ".jpg"
	}
	outPath := filepath.Join(filepath.Dir(inputPath), outName)

	qualities := []int{85, 70, 55, 40, 25}
	for _, quality := range qualities {
		var buf bytes.Buffer
		if err := jpeg.Encode(&buf, img, &jpeg.Options{Quality: quality}); err != nil {
			continue
		}
		if int64(buf.Len()) <= maxSize {
			return persistCompressedImage(outPath, inputPath, outName, buf.Bytes())
		}
	}

	bounds := img.Bounds()
	width, height := bounds.Dx(), bounds.Dy()
	scales := []float64{0.7, 0.5, 0.35, 0.25, 0.15}
	for _, scale := range scales {
		newWidth, newHeight := int(float64(width)*scale), int(float64(height)*scale)
		if newWidth < 1 || newHeight < 1 {
			continue
		}

		dst := image.NewRGBA(image.Rect(0, 0, newWidth, newHeight))
		resizeNearestNeighbor(dst, img)

		var buf bytes.Buffer
		if err := jpeg.Encode(&buf, dst, &jpeg.Options{Quality: 70}); err != nil {
			continue
		}
		if int64(buf.Len()) <= maxSize {
			return persistCompressedImage(outPath, inputPath, outName, buf.Bytes())
		}
	}

	newWidth, newHeight := int(float64(width)*0.1), int(float64(height)*0.1)
	if newWidth < 1 {
		newWidth = 1
	}
	if newHeight < 1 {
		newHeight = 1
	}
	dst := image.NewRGBA(image.Rect(0, 0, newWidth, newHeight))
	resizeNearestNeighbor(dst, img)

	var buf bytes.Buffer
	if err := jpeg.Encode(&buf, dst, &jpeg.Options{Quality: 50}); err != nil {
		return "", err
	}
	return persistCompressedImage(outPath, inputPath, outName, buf.Bytes())
}

// ConvertHEICIfNeeded converts HEIC/HEIF files to JPEG and returns the final path.
func ConvertHEICIfNeeded(inputPath string) (string, error) {
	ext := strings.ToLower(filepath.Ext(strings.TrimSpace(inputPath)))
	if ext != ".heic" && ext != ".heif" {
		return inputPath, nil
	}

	return convertHEIC(inputPath)
}

func persistCompressedImage(outPath, inputPath, outName string, payload []byte) (string, error) {
	if err := os.WriteFile(outPath, payload, 0644); err != nil {
		return "", err
	}
	if outPath != inputPath {
		if err := os.Remove(inputPath); err != nil && !os.IsNotExist(err) {
			log.Printf("cleanup source image failed: %v", err)
		}
	}
	return outName, nil
}

func resizeNearestNeighbor(dst *image.RGBA, src image.Image) {
	srcBounds := src.Bounds()
	dstBounds := dst.Bounds()
	srcWidth := srcBounds.Dx()
	srcHeight := srcBounds.Dy()
	dstWidth := dstBounds.Dx()
	dstHeight := dstBounds.Dy()

	for y := 0; y < dstHeight; y++ {
		srcY := srcBounds.Min.Y + y*srcHeight/dstHeight
		for x := 0; x < dstWidth; x++ {
			srcX := srcBounds.Min.X + x*srcWidth/dstWidth
			dst.Set(dstBounds.Min.X+x, dstBounds.Min.Y+y, src.At(srcX, srcY))
		}
	}
}

var _ = gif.Decode
var _ = png.Decode

func resolveHEICConverterURL() string {
	value := strings.TrimSpace(os.Getenv("HEIC_CONVERTER_URL"))
	if value == "" {
		return ""
	}

	value = strings.TrimRight(value, "/")
	if strings.HasSuffix(strings.ToLower(value), "/convert") {
		return value
	}
	return value + "/convert"
}

func resolveHEICConverterScript() string {
	if explicit := strings.TrimSpace(os.Getenv("HEIC_CONVERTER_SCRIPT")); explicit != "" {
		if info, err := os.Stat(explicit); err == nil && !info.IsDir() {
			return explicit
		}
	}

	exePath, _ := os.Executable()
	exeDir := filepath.Dir(exePath)
	candidates := []string{
		filepath.Join(".", "tools", "heic-converter", "index.js"),
		filepath.Join("..", "tools", "heic-converter", "index.js"),
		filepath.Join("..", "..", "tools", "heic-converter", "index.js"),
		filepath.Join(exeDir, "tools", "heic-converter", "index.js"),
		filepath.Join(exeDir, "scripts", "..", "tools", "heic-converter", "index.js"),
	}

	for _, candidate := range candidates {
		clean := filepath.Clean(candidate)
		if info, err := os.Stat(clean); err == nil && !info.IsDir() {
			return clean
		}
	}

	return ""
}

func resolveNodeBinary() string {
	if explicit := strings.TrimSpace(os.Getenv("NODE_BINARY")); explicit != "" {
		return explicit
	}

	candidates := []string{"node", "node.exe"}
	for _, candidate := range candidates {
		if resolved, err := exec.LookPath(candidate); err == nil {
			return resolved
		}
	}
	return ""
}

func convertHEIC(inputPath string) (string, error) {
	absPath, err := filepath.Abs(inputPath)
	if err != nil {
		return "", fmt.Errorf("resolve input path failed: %w", err)
	}

	outputPath := strings.TrimSuffix(absPath, filepath.Ext(absPath)) + ".jpg"
	if remoteURL := resolveHEICConverterURL(); remoteURL != "" {
		return convertHEICViaHTTP(remoteURL, absPath, outputPath)
	}

	return convertHEICViaLocalCLI(absPath, outputPath)
}

func convertHEICViaHTTP(converterURL, inputPath, outputPath string) (string, error) {
	reqBody, err := json.Marshal(map[string]string{
		"inputPath":  inputPath,
		"outputPath": outputPath,
	})
	if err != nil {
		return "", fmt.Errorf("build HEIC conversion request failed: %w", err)
	}

	httpClient := &http.Client{Timeout: 15 * time.Second}
	resp, err := httpClient.Post(converterURL, "application/json", bytes.NewReader(reqBody))
	if err != nil {
		return "", fmt.Errorf("connect HEIC conversion service failed: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("read HEIC conversion response failed: %w", err)
	}
	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("HEIC conversion service error: %s", string(body))
	}

	var result struct {
		Success    bool   `json:"success"`
		OutputPath string `json:"outputPath"`
	}
	if err := json.Unmarshal(body, &result); err != nil {
		return "", fmt.Errorf("parse HEIC conversion response failed: %w", err)
	}
	if !result.Success {
		return "", fmt.Errorf("HEIC conversion failed")
	}
	if strings.TrimSpace(result.OutputPath) != "" {
		return result.OutputPath, nil
	}
	return outputPath, nil
}

func convertHEICViaLocalCLI(inputPath, outputPath string) (string, error) {
	nodeBinary := resolveNodeBinary()
	if nodeBinary == "" {
		return "", fmt.Errorf("node runtime is required for local HEIC conversion")
	}

	scriptPath := resolveHEICConverterScript()
	if scriptPath == "" {
		return "", fmt.Errorf("local HEIC converter script not found")
	}

	cmd := exec.Command(nodeBinary, scriptPath, inputPath, outputPath)
	output, err := cmd.CombinedOutput()
	if err != nil {
		return "", fmt.Errorf("local HEIC conversion failed: %v (%s)", err, strings.TrimSpace(string(output)))
	}

	var result struct {
		Success    bool   `json:"success"`
		OutputPath string `json:"outputPath"`
		Error      string `json:"error"`
	}
	if err := json.Unmarshal(output, &result); err != nil {
		return "", fmt.Errorf("parse local HEIC conversion result failed: %w", err)
	}
	if !result.Success {
		if strings.TrimSpace(result.Error) != "" {
			return "", fmt.Errorf("local HEIC conversion failed: %s", result.Error)
		}
		return "", fmt.Errorf("local HEIC conversion failed")
	}
	if strings.TrimSpace(result.OutputPath) != "" {
		return result.OutputPath, nil
	}
	return outputPath, nil
}
