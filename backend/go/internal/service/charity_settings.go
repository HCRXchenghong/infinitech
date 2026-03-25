package service

import (
	"fmt"
	"strings"
)

const defaultCharityHeroImageURL = "https://images.unsplash.com/photo-1593113598332-cd288d649433?w=1200"

type CharityLeaderboardEntry struct {
	Name      string `json:"name"`
	Amount    int64  `json:"amount"`
	TimeLabel string `json:"time_label"`
}

type CharityNewsItem struct {
	Title     string `json:"title"`
	Summary   string `json:"summary"`
	Source    string `json:"source"`
	TimeLabel string `json:"time_label"`
	ImageURL  string `json:"image_url"`
}

type CharitySettings struct {
	Enabled                 bool                      `json:"enabled"`
	PageTitle               string                    `json:"page_title"`
	PageSubtitle            string                    `json:"page_subtitle"`
	HeroImageURL            string                    `json:"hero_image_url"`
	HeroTagline             string                    `json:"hero_tagline"`
	HeroDaysRunning         int                       `json:"hero_days_running"`
	FundPoolAmount          int64                     `json:"fund_pool_amount"`
	TodayDonationCount      int                       `json:"today_donation_count"`
	ProjectStatusText       string                    `json:"project_status_text"`
	LeaderboardTitle        string                    `json:"leaderboard_title"`
	NewsTitle               string                    `json:"news_title"`
	MissionTitle            string                    `json:"mission_title"`
	MissionParagraphOne     string                    `json:"mission_paragraph_one"`
	MissionParagraphTwo     string                    `json:"mission_paragraph_two"`
	MatchingPlanTitle       string                    `json:"matching_plan_title"`
	MatchingPlanDescription string                    `json:"matching_plan_description"`
	ActionLabel             string                    `json:"action_label"`
	ActionNote              string                    `json:"action_note"`
	ParticipationNotice     string                    `json:"participation_notice"`
	JoinURL                 string                    `json:"join_url"`
	Leaderboard             []CharityLeaderboardEntry `json:"leaderboard"`
	NewsList                []CharityNewsItem         `json:"news_list"`
}

type PublicCharitySettings struct {
	Enabled                 bool                      `json:"enabled"`
	PageTitle               string                    `json:"page_title"`
	PageSubtitle            string                    `json:"page_subtitle"`
	HeroImageURL            string                    `json:"hero_image_url"`
	HeroTagline             string                    `json:"hero_tagline"`
	HeroDaysRunning         int                       `json:"hero_days_running"`
	FundPoolAmount          int64                     `json:"fund_pool_amount"`
	TodayDonationCount      int                       `json:"today_donation_count"`
	ProjectStatusText       string                    `json:"project_status_text"`
	LeaderboardTitle        string                    `json:"leaderboard_title"`
	NewsTitle               string                    `json:"news_title"`
	MissionTitle            string                    `json:"mission_title"`
	MissionParagraphOne     string                    `json:"mission_paragraph_one"`
	MissionParagraphTwo     string                    `json:"mission_paragraph_two"`
	MatchingPlanTitle       string                    `json:"matching_plan_title"`
	MatchingPlanDescription string                    `json:"matching_plan_description"`
	ActionLabel             string                    `json:"action_label"`
	ActionNote              string                    `json:"action_note"`
	ParticipationNotice     string                    `json:"participation_notice"`
	JoinURL                 string                    `json:"join_url"`
	Leaderboard             []CharityLeaderboardEntry `json:"leaderboard"`
	NewsList                []CharityNewsItem         `json:"news_list"`
}

func DefaultCharitySettings() CharitySettings {
	return CharitySettings{
		Enabled:                 true,
		PageTitle:               "悦享公益",
		PageSubtitle:            "让每一份善意都被看见",
		HeroImageURL:            defaultCharityHeroImageURL,
		HeroTagline:             "以长期、透明、可配置的方式，把平台善意送到真正需要帮助的人手里。",
		HeroDaysRunning:         0,
		FundPoolAmount:          0,
		TodayDonationCount:      0,
		ProjectStatusText:       "筹备中",
		LeaderboardTitle:        "善行榜单",
		NewsTitle:               "公益资讯",
		MissionTitle:            "初心",
		MissionParagraphOne:     "悦享e食不只是生活服务平台，也希望成为连接商户、用户与城市善意的长期基础设施。",
		MissionParagraphTwo:     "公益页面展示、参与入口与说明文案均以管理端发布为准，避免前端静态内容误导用户。",
		MatchingPlanTitle:       "公益参与计划",
		MatchingPlanDescription: "平台会根据运营策略配置公益参与方式，当前展示内容和入口均可在管理端统一调整。",
		ActionLabel:             "了解参与方式",
		ActionNote:              "OPERATED BY CHARITY OPS",
		ParticipationNotice:     "公益参与方式由平台统一发布。若当前未开放线上参与，请留意后续活动公告。",
		JoinURL:                 "",
		Leaderboard:             []CharityLeaderboardEntry{},
		NewsList:                []CharityNewsItem{},
	}
}

func NormalizeCharitySettings(input CharitySettings) CharitySettings {
	defaults := DefaultCharitySettings()
	settings := defaults

	settings.Enabled = input.Enabled
	settings.PageTitle = normalizeCharityFallback(input.PageTitle, defaults.PageTitle)
	settings.PageSubtitle = normalizeCharityFallback(input.PageSubtitle, defaults.PageSubtitle)
	settings.HeroImageURL = normalizeCharityFallback(input.HeroImageURL, defaults.HeroImageURL)
	settings.HeroTagline = normalizeCharityFallback(input.HeroTagline, defaults.HeroTagline)
	settings.HeroDaysRunning = input.HeroDaysRunning
	settings.FundPoolAmount = input.FundPoolAmount
	settings.TodayDonationCount = input.TodayDonationCount
	settings.ProjectStatusText = normalizeCharityFallback(input.ProjectStatusText, defaults.ProjectStatusText)
	settings.LeaderboardTitle = normalizeCharityFallback(input.LeaderboardTitle, defaults.LeaderboardTitle)
	settings.NewsTitle = normalizeCharityFallback(input.NewsTitle, defaults.NewsTitle)
	settings.MissionTitle = normalizeCharityFallback(input.MissionTitle, defaults.MissionTitle)
	settings.MissionParagraphOne = normalizeCharityFallback(input.MissionParagraphOne, defaults.MissionParagraphOne)
	settings.MissionParagraphTwo = normalizeCharityFallback(input.MissionParagraphTwo, defaults.MissionParagraphTwo)
	settings.MatchingPlanTitle = normalizeCharityFallback(input.MatchingPlanTitle, defaults.MatchingPlanTitle)
	settings.MatchingPlanDescription = normalizeCharityFallback(input.MatchingPlanDescription, defaults.MatchingPlanDescription)
	settings.ActionLabel = normalizeCharityFallback(input.ActionLabel, defaults.ActionLabel)
	settings.ActionNote = normalizeCharityFallback(input.ActionNote, defaults.ActionNote)
	settings.ParticipationNotice = normalizeCharityFallback(input.ParticipationNotice, defaults.ParticipationNotice)
	settings.JoinURL = normalizeCharityOptional(input.JoinURL)
	settings.Leaderboard = normalizeCharityLeaderboard(input.Leaderboard)
	settings.NewsList = normalizeCharityNewsList(input.NewsList)

	if settings.HeroDaysRunning < 0 {
		settings.HeroDaysRunning = 0
	}
	if settings.FundPoolAmount < 0 {
		settings.FundPoolAmount = 0
	}
	if settings.TodayDonationCount < 0 {
		settings.TodayDonationCount = 0
	}

	return settings
}

func ValidateCharitySettings(input CharitySettings) error {
	settings := NormalizeCharitySettings(input)

	if len(settings.PageTitle) > 64 {
		return fmt.Errorf("page_title is too long")
	}
	if len(settings.PageSubtitle) > 120 {
		return fmt.Errorf("page_subtitle is too long")
	}
	if err := validateOptionalServiceURL(settings.HeroImageURL, "hero_image_url"); err != nil {
		return err
	}
	if len(settings.HeroTagline) > 200 {
		return fmt.Errorf("hero_tagline is too long")
	}
	if settings.HeroDaysRunning > 100000 {
		return fmt.Errorf("hero_days_running is too large")
	}
	if settings.FundPoolAmount > 9_999_999_999 {
		return fmt.Errorf("fund_pool_amount is too large")
	}
	if settings.TodayDonationCount > 9_999_999 {
		return fmt.Errorf("today_donation_count is too large")
	}
	if len(settings.ProjectStatusText) > 64 {
		return fmt.Errorf("project_status_text is too long")
	}
	if len(settings.LeaderboardTitle) > 64 {
		return fmt.Errorf("leaderboard_title is too long")
	}
	if len(settings.NewsTitle) > 64 {
		return fmt.Errorf("news_title is too long")
	}
	if len(settings.MissionTitle) > 64 {
		return fmt.Errorf("mission_title is too long")
	}
	if len(settings.MissionParagraphOne) > 500 {
		return fmt.Errorf("mission_paragraph_one is too long")
	}
	if len(settings.MissionParagraphTwo) > 500 {
		return fmt.Errorf("mission_paragraph_two is too long")
	}
	if len(settings.MatchingPlanTitle) > 80 {
		return fmt.Errorf("matching_plan_title is too long")
	}
	if len(settings.MatchingPlanDescription) > 500 {
		return fmt.Errorf("matching_plan_description is too long")
	}
	if len(settings.ActionLabel) > 64 {
		return fmt.Errorf("action_label is too long")
	}
	if len(settings.ActionNote) > 120 {
		return fmt.Errorf("action_note is too long")
	}
	if len(settings.ParticipationNotice) > 500 {
		return fmt.Errorf("participation_notice is too long")
	}
	if err := validateOptionalServiceURL(settings.JoinURL, "join_url"); err != nil {
		return err
	}
	if len(settings.Leaderboard) > 20 {
		return fmt.Errorf("leaderboard exceeds maximum size")
	}
	for _, item := range settings.Leaderboard {
		if len(item.Name) > 64 {
			return fmt.Errorf("leaderboard.name is too long")
		}
		if item.Amount < 0 || item.Amount > 9_999_999_999 {
			return fmt.Errorf("leaderboard.amount is invalid")
		}
		if len(item.TimeLabel) > 64 {
			return fmt.Errorf("leaderboard.time_label is too long")
		}
	}
	if len(settings.NewsList) > 20 {
		return fmt.Errorf("news_list exceeds maximum size")
	}
	for _, item := range settings.NewsList {
		if len(item.Title) > 120 {
			return fmt.Errorf("news_list.title is too long")
		}
		if len(item.Summary) > 500 {
			return fmt.Errorf("news_list.summary is too long")
		}
		if len(item.Source) > 64 {
			return fmt.Errorf("news_list.source is too long")
		}
		if len(item.TimeLabel) > 64 {
			return fmt.Errorf("news_list.time_label is too long")
		}
		if err := validateOptionalServiceURL(item.ImageURL, "news_list.image_url"); err != nil {
			return err
		}
	}

	return nil
}

func BuildPublicCharitySettings(input CharitySettings) PublicCharitySettings {
	settings := NormalizeCharitySettings(input)
	return PublicCharitySettings{
		Enabled:                 settings.Enabled,
		PageTitle:               settings.PageTitle,
		PageSubtitle:            settings.PageSubtitle,
		HeroImageURL:            settings.HeroImageURL,
		HeroTagline:             settings.HeroTagline,
		HeroDaysRunning:         settings.HeroDaysRunning,
		FundPoolAmount:          settings.FundPoolAmount,
		TodayDonationCount:      settings.TodayDonationCount,
		ProjectStatusText:       settings.ProjectStatusText,
		LeaderboardTitle:        settings.LeaderboardTitle,
		NewsTitle:               settings.NewsTitle,
		MissionTitle:            settings.MissionTitle,
		MissionParagraphOne:     settings.MissionParagraphOne,
		MissionParagraphTwo:     settings.MissionParagraphTwo,
		MatchingPlanTitle:       settings.MatchingPlanTitle,
		MatchingPlanDescription: settings.MatchingPlanDescription,
		ActionLabel:             settings.ActionLabel,
		ActionNote:              settings.ActionNote,
		ParticipationNotice:     settings.ParticipationNotice,
		JoinURL:                 settings.JoinURL,
		Leaderboard:             settings.Leaderboard,
		NewsList:                settings.NewsList,
	}
}

func normalizeCharityFallback(value, fallback string) string {
	normalized := normalizeCharityOptional(value)
	if normalized == "" {
		return fallback
	}
	return normalized
}

func normalizeCharityOptional(value string) string {
	normalized := strings.ReplaceAll(value, "\r\n", "\n")
	normalized = strings.ReplaceAll(normalized, "\r", "\n")
	return strings.TrimSpace(normalized)
}

func normalizeCharityLeaderboard(items []CharityLeaderboardEntry) []CharityLeaderboardEntry {
	if len(items) == 0 {
		return []CharityLeaderboardEntry{}
	}

	result := make([]CharityLeaderboardEntry, 0, len(items))
	for _, item := range items {
		entry := CharityLeaderboardEntry{
			Name:      normalizeCharityOptional(item.Name),
			Amount:    item.Amount,
			TimeLabel: normalizeCharityOptional(item.TimeLabel),
		}
		if entry.Amount < 0 {
			entry.Amount = 0
		}
		if entry.Name == "" && entry.Amount == 0 && entry.TimeLabel == "" {
			continue
		}
		result = append(result, entry)
	}
	return result
}

func normalizeCharityNewsList(items []CharityNewsItem) []CharityNewsItem {
	if len(items) == 0 {
		return []CharityNewsItem{}
	}

	result := make([]CharityNewsItem, 0, len(items))
	for _, item := range items {
		entry := CharityNewsItem{
			Title:     normalizeCharityOptional(item.Title),
			Summary:   normalizeCharityOptional(item.Summary),
			Source:    normalizeCharityOptional(item.Source),
			TimeLabel: normalizeCharityOptional(item.TimeLabel),
			ImageURL:  normalizeCharityOptional(item.ImageURL),
		}
		if entry.Title == "" && entry.Summary == "" && entry.Source == "" && entry.TimeLabel == "" && entry.ImageURL == "" {
			continue
		}
		result = append(result, entry)
	}
	return result
}
