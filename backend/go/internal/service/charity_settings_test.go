package service

import "testing"

func TestNormalizeCharitySettingsAppliesDefaultsAndSanitizes(t *testing.T) {
	input := CharitySettings{
		Enabled:             true,
		PageTitle:           "  ",
		ParticipationNotice: " line one \r\n line two ",
		Leaderboard: []CharityLeaderboardEntry{
			{Name: " Alice ", Amount: 1200, TimeLabel: " today "},
			{Name: "", Amount: -5, TimeLabel: ""},
		},
		NewsList: []CharityNewsItem{
			{Title: "  公益周报 ", Summary: " 已完成社区义卖 ", Source: " 运营中心 ", TimeLabel: " 今天 ", ImageURL: " https://example.com/a.png "},
			{},
		},
	}

	got := NormalizeCharitySettings(input)

	if got.PageTitle != DefaultCharitySettings().PageTitle {
		t.Fatalf("expected default page title, got %q", got.PageTitle)
	}
	if got.ParticipationNotice != "line one \n line two" {
		t.Fatalf("unexpected participation notice: %q", got.ParticipationNotice)
	}
	if len(got.Leaderboard) != 1 {
		t.Fatalf("expected 1 leaderboard entry, got %d", len(got.Leaderboard))
	}
	if got.Leaderboard[0].Name != "Alice" {
		t.Fatalf("expected trimmed leaderboard name, got %q", got.Leaderboard[0].Name)
	}
	if len(got.NewsList) != 1 {
		t.Fatalf("expected 1 news item, got %d", len(got.NewsList))
	}
}

func TestBuildPublicCharitySettingsPreservesJoinURLAndContent(t *testing.T) {
	input := CharitySettings{
		Enabled:      true,
		PageTitle:    "公益专区",
		PageSubtitle: "实时同步运营配置",
		JoinURL:      "https://example.com/charity",
		Leaderboard:  []CharityLeaderboardEntry{{Name: "张三", Amount: 88, TimeLabel: "刚刚"}},
		NewsList:     []CharityNewsItem{{Title: "新项目上线", Summary: "测试", Source: "平台", TimeLabel: "今天", ImageURL: "https://example.com/1.png"}},
	}

	public := BuildPublicCharitySettings(input)

	if public.PageTitle != "公益专区" {
		t.Fatalf("unexpected page title: %q", public.PageTitle)
	}
	if public.JoinURL != "https://example.com/charity" {
		t.Fatalf("unexpected join url: %q", public.JoinURL)
	}
	if len(public.Leaderboard) != 1 || len(public.NewsList) != 1 {
		t.Fatalf("expected public payload to keep arrays, got leaderboard=%d news=%d", len(public.Leaderboard), len(public.NewsList))
	}
}
