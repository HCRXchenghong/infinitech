package service

import "testing"

func TestMedicineServiceConsultCommonSymptom(t *testing.T) {
	service := NewMedicineService()

	res, err := service.Consult(MedicineConsultRequest{
		Messages: []MedicineChatMessage{
			{Role: "user", Content: "我这两天发烧头痛，还流鼻涕"},
		},
	})
	if err != nil {
		t.Fatalf("Consult returned error: %v", err)
	}
	if res.Suggestion == "" {
		t.Fatalf("expected medicine suggestion for common symptom")
	}
	if res.Severity != "normal" {
		t.Fatalf("expected severity normal, got %s", res.Severity)
	}
}

func TestMedicineServiceConsultUrgentSymptom(t *testing.T) {
	service := NewMedicineService()

	res, err := service.Consult(MedicineConsultRequest{
		Messages: []MedicineChatMessage{
			{Role: "user", Content: "我现在胸痛还呼吸困难"},
		},
	})
	if err != nil {
		t.Fatalf("Consult returned error: %v", err)
	}
	if res.Severity != "urgent" {
		t.Fatalf("expected severity urgent, got %s", res.Severity)
	}
	if res.Suggestion != "" {
		t.Fatalf("expected no direct medicine suggestion for urgent symptom")
	}
}
