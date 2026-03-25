package service

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"strings"
	"time"

	openapi "github.com/alibabacloud-go/darabonba-openapi/v2/client"
	dysmsapi "github.com/alibabacloud-go/dysmsapi-20170525/v5/client"
	"github.com/alibabacloud-go/tea/dara"
	"github.com/alibabacloud-go/tea/tea"
)

func (s *SMSService) sendAliyunSMS(ctx context.Context, cfg SMSProviderConfig, phone, scene, code string) error {
	client, err := newAliyunSMSClient(cfg)
	if err != nil {
		return err
	}

	templateParam, err := buildAliyunSMSTemplateParam(code)
	if err != nil {
		return err
	}

	request := &dysmsapi.SendSmsRequest{
		PhoneNumbers:  tea.String(phone),
		SignName:      tea.String(cfg.SignName),
		TemplateCode:  tea.String(cfg.TemplateCode),
		TemplateParam: tea.String(templateParam),
		OutId:         tea.String(buildAliyunSMSOutID(scene, phone)),
	}

	response, err := client.SendSmsWithContext(ctx, request, &dara.RuntimeOptions{})
	if err != nil {
		return fmt.Errorf("aliyun sms request failed: %w", err)
	}
	if response == nil || response.Body == nil {
		return fmt.Errorf("aliyun sms response is empty")
	}

	responseCode := strings.TrimSpace(tea.StringValue(response.Body.Code))
	if !strings.EqualFold(responseCode, "OK") {
		return fmt.Errorf(
			"aliyun sms rejected request: code=%s message=%s request_id=%s",
			responseCode,
			strings.TrimSpace(tea.StringValue(response.Body.Message)),
			strings.TrimSpace(tea.StringValue(response.Body.RequestId)),
		)
	}

	log.Printf(
		"[sms] provider=aliyun scene=%s phone=%s request_id=%s biz_id=%s",
		scene,
		maskPhone(phone),
		strings.TrimSpace(tea.StringValue(response.Body.RequestId)),
		strings.TrimSpace(tea.StringValue(response.Body.BizId)),
	)
	return nil
}

func newAliyunSMSClient(cfg SMSProviderConfig) (*dysmsapi.Client, error) {
	normalized := NormalizeSMSProviderConfig(cfg)
	if !normalized.IsConfigured() {
		return nil, fmt.Errorf("aliyun sms config is incomplete")
	}

	config := &openapi.Config{
		AccessKeyId:     tea.String(normalized.AccessKeyID),
		AccessKeySecret: tea.String(normalized.AccessKeySecret),
		RegionId:        tea.String(normalized.RegionID),
		ConnectTimeout:  tea.Int(5000),
		ReadTimeout:     tea.Int(5000),
	}
	if normalized.Endpoint != "" {
		config.Endpoint = tea.String(normalized.Endpoint)
	}

	return dysmsapi.NewClient(config)
}

func buildAliyunSMSTemplateParam(code string) (string, error) {
	payload, err := json.Marshal(map[string]string{
		"code": code,
	})
	if err != nil {
		return "", err
	}
	return string(payload), nil
}

func buildAliyunSMSOutID(scene, phone string) string {
	suffix := phone
	if len(phone) >= 4 {
		suffix = phone[len(phone)-4:]
	}
	return fmt.Sprintf("%s-%s-%d", scene, suffix, time.Now().UnixNano())
}
