package service

import (
	"fmt"
	"strings"
	"unicode/utf8"
)

type MedicineChatMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type MedicineConsultRequest struct {
	Messages []MedicineChatMessage `json:"messages"`
}

type MedicineConsultResponse struct {
	Reply      string `json:"reply"`
	Suggestion string `json:"suggestion,omitempty"`
	Disclaimer string `json:"disclaimer"`
	Severity   string `json:"severity"`
}

type MedicineService struct{}

func NewMedicineService() *MedicineService {
	return &MedicineService{}
}

func (s *MedicineService) Consult(req MedicineConsultRequest) (*MedicineConsultResponse, error) {
	latest := extractLatestMedicineUserMessage(req.Messages)
	if latest == "" {
		return nil, fmt.Errorf("message is required")
	}
	if utf8.RuneCountInString(latest) > 500 {
		return nil, fmt.Errorf("message is too long")
	}

	response := &MedicineConsultResponse{
		Reply:      "建议您先休息、补水，并继续观察症状变化。若症状持续、加重，或伴随明显不适，请及时线下就医。",
		Disclaimer: "本建议仅供参考，不能替代线下医生面诊与处方。",
		Severity:   "normal",
	}

	switch {
	case containsAny(latest, "胸痛", "呼吸困难", "喘不上气", "昏厥", "抽搐", "大出血"):
		response.Reply = "您描述的情况存在急症风险，建议立即联系急救或尽快前往附近医院急诊，不建议继续等待线上建议。"
		response.Severity = "urgent"
	case containsAny(latest, "头痛", "发烧", "感冒", "咳嗽", "流鼻涕", "咽痛"):
		response.Reply = "根据描述，更像是常见感冒或上呼吸道不适。建议先测量体温，注意休息与补水；若高烧持续不退或症状明显加重，请尽快就医。"
		response.Suggestion = "布洛芬缓释胶囊 / 对乙酰氨基酚"
	case containsAny(latest, "肚子", "胃", "腹泻", "腹痛", "反酸", "胃痛"):
		response.Reply = "胃肠道不适时，建议先清淡饮食、补充水分，避免辛辣刺激。若腹痛剧烈、持续腹泻或出现脱水迹象，请及时就医。"
		response.Suggestion = "奥美拉唑 / 达喜"
	case containsAny(latest, "过敏", "皮疹", "发痒", "瘙痒", "荨麻疹"):
		response.Reply = "从描述看，可能与过敏反应有关。请尽量回避可疑过敏源；如果出现呼吸困难、喉头紧缩等情况，请立即就医。"
		response.Suggestion = "氯雷他定"
	case containsAny(latest, "牙痛", "牙龈肿", "口腔溃疡"):
		response.Reply = "口腔或牙痛问题建议先保持口腔清洁、避免过冷过热刺激；若疼痛持续或伴随明显肿胀，请尽快就诊口腔科。"
		response.Suggestion = "人工牛黄甲硝唑 / 西瓜霜"
	}

	return response, nil
}

func extractLatestMedicineUserMessage(messages []MedicineChatMessage) string {
	for idx := len(messages) - 1; idx >= 0; idx-- {
		if strings.EqualFold(strings.TrimSpace(messages[idx].Role), "user") {
			content := strings.TrimSpace(messages[idx].Content)
			if content != "" {
				return content
			}
		}
	}
	return ""
}

func containsAny(content string, keywords ...string) bool {
	content = strings.ToLower(strings.TrimSpace(content))
	if content == "" {
		return false
	}
	for _, keyword := range keywords {
		if strings.Contains(content, strings.ToLower(strings.TrimSpace(keyword))) {
			return true
		}
	}
	return false
}
