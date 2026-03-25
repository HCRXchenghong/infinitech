package service

import "testing"

func TestNormalizeVIPSettingsAppliesDefaultsAndDeduplicatesRules(t *testing.T) {
	input := VIPSettings{
		PageTitle:  "  ",
		PointRules: []string{" 平台消费 1 元 = 1 积分 ", "", "平台消费 1 元 = 1 积分"},
		Levels: []VIPLevel{
			{
				Name:           " 黄金VIP ",
				StyleClass:     " level-gold ",
				Tagline:        " 更高返利 ",
				ThresholdLabel: " 成长值 3000 ",
				ThresholdValue: 3000,
				Multiplier:     2,
				Benefits: []VIPBenefit{
					{Icon: " /static/icons/star.svg ", Title: " 双倍积分 ", Desc: " 积分翻倍 ", Detail: " 基础积分上额外叠加 "},
					{},
				},
			},
		},
		GrowthTasks: []VIPTask{
			{Title: " 完成 1 笔早餐订单 ", Description: " 获取奖励 ", RewardText: " +80 成长值 ", ActionLabel: " 去下单 "},
			{},
		},
	}

	got := NormalizeVIPSettings(input)

	if got.PageTitle != DefaultVIPSettings().PageTitle {
		t.Fatalf("expected default page title, got %q", got.PageTitle)
	}
	if len(got.PointRules) != 1 {
		t.Fatalf("expected deduplicated point rules, got %d", len(got.PointRules))
	}
	if len(got.Levels) != 1 || len(got.Levels[0].Benefits) != 1 {
		t.Fatalf("expected normalized levels and benefits, got levels=%d benefits=%d", len(got.Levels), len(got.Levels[0].Benefits))
	}
	if got.Levels[0].Name != "黄金VIP" {
		t.Fatalf("unexpected level name: %q", got.Levels[0].Name)
	}
	if len(got.GrowthTasks) != 1 || got.GrowthTasks[0].ActionLabel != "去下单" {
		t.Fatalf("unexpected normalized task payload: %+v", got.GrowthTasks)
	}
}

func TestBuildPublicVIPSettingsPreservesConfiguredLevels(t *testing.T) {
	input := VIPSettings{
		Enabled:            true,
		PageTitle:          "尊享会员",
		ServiceButtonText:  "专属客服",
		StandardActionText: "立即升级",
		PremiumActionText:  "联系管家",
		PointRules:         []string{"测试规则"},
		Levels: []VIPLevel{
			{
				Name:           "黑金VIP",
				StyleClass:     "level-supreme",
				Tagline:        "高阶权益",
				ThresholdLabel: "成长值 8000",
				ThresholdValue: 8000,
				Multiplier:     3,
				IsBlackGold:    true,
				Benefits: []VIPBenefit{
					{Icon: "/static/icons/headphones.svg", Title: "24h客服", Desc: "全天响应", Detail: "专属支持"},
				},
			},
		},
		GrowthTasks: []VIPTask{
			{Title: "完成 3 笔订单", Description: "测试任务", RewardText: "+50 成长值", ActionLabel: "去完成"},
		},
	}

	public := BuildPublicVIPSettings(input)

	if public.PageTitle != "尊享会员" {
		t.Fatalf("unexpected page title: %q", public.PageTitle)
	}
	if public.ServiceButtonText != "专属客服" {
		t.Fatalf("unexpected service button text: %q", public.ServiceButtonText)
	}
	if len(public.Levels) != 1 || len(public.Levels[0].Benefits) != 1 {
		t.Fatalf("expected public levels to be preserved, got levels=%d benefits=%d", len(public.Levels), len(public.Levels[0].Benefits))
	}
	if len(public.GrowthTasks) != 1 || public.GrowthTasks[0].Title != "完成 3 笔订单" {
		t.Fatalf("unexpected public task payload: %+v", public.GrowthTasks)
	}
}
