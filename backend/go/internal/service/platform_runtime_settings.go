package service

import (
	"context"
	"fmt"
	"sort"
	"strings"

	"gorm.io/gorm"
)

const (
	SettingKeyHomeEntrySettings        = "home_entry_settings"
	SettingKeyErrandSettings           = "errand_settings"
	SettingKeyMerchantTaxonomySettings = "merchant_taxonomy_settings"
	SettingKeyRiderRankSettings        = "rider_rank_settings"
	SettingKeyDiningBuddySettings      = "dining_buddy_settings"
)

type HomeEntrySetting struct {
	Key          string   `json:"key"`
	Label        string   `json:"label"`
	Icon         string   `json:"icon"`
	IconType     string   `json:"icon_type"`
	BGColor      string   `json:"bg_color"`
	SortOrder    int      `json:"sort_order"`
	Enabled      bool     `json:"enabled"`
	CityScopes   []string `json:"city_scopes"`
	ClientScopes []string `json:"client_scopes"`
	RouteType    string   `json:"route_type"`
	RouteValue   string   `json:"route_value"`
	BadgeText    string   `json:"badge_text"`
}

type HomeEntrySettings struct {
	Entries []HomeEntrySetting `json:"entries"`
}

type ErrandServiceSetting struct {
	Key            string `json:"key"`
	Label          string `json:"label"`
	Desc           string `json:"desc"`
	Icon           string `json:"icon"`
	Color          string `json:"color"`
	Enabled        bool   `json:"enabled"`
	SortOrder      int    `json:"sort_order"`
	Route          string `json:"route"`
	ServiceFeeHint string `json:"service_fee_hint"`
}

type ErrandSettings struct {
	PageTitle string                 `json:"page_title"`
	HeroTitle string                 `json:"hero_title"`
	HeroDesc  string                 `json:"hero_desc"`
	DetailTip string                 `json:"detail_tip"`
	Services  []ErrandServiceSetting `json:"services"`
}

type MerchantTaxonomyOption struct {
	Key       string   `json:"key"`
	Label     string   `json:"label"`
	Enabled   bool     `json:"enabled"`
	SortOrder int      `json:"sort_order"`
	Aliases   []string `json:"aliases,omitempty"`
}

type MerchantTaxonomySettings struct {
	MerchantTypes      []MerchantTaxonomyOption `json:"merchant_types"`
	BusinessCategories []MerchantTaxonomyOption `json:"business_categories"`
}

type RiderRankLevelSetting struct {
	Level            int      `json:"level"`
	Key              string   `json:"key"`
	Name             string   `json:"name"`
	Icon             string   `json:"icon"`
	Desc             string   `json:"desc"`
	ProgressTemplate string   `json:"progress_template"`
	ThresholdRules   []string `json:"threshold_rules"`
}

type RiderRankSettings struct {
	Levels []RiderRankLevelSetting `json:"levels"`
}

type DiningBuddyCategorySetting struct {
	ID        string `json:"id"`
	Label     string `json:"label"`
	Icon      string `json:"icon"`
	IconType  string `json:"icon_type"`
	Enabled   bool   `json:"enabled"`
	SortOrder int    `json:"sort_order"`
	Color     string `json:"color"`
}

type DiningBuddyQuestionOption struct {
	Text string `json:"text"`
	Icon string `json:"icon"`
}

type DiningBuddyQuestionSetting struct {
	Question string                      `json:"question"`
	Options  []DiningBuddyQuestionOption `json:"options"`
}

type DiningBuddySettings struct {
	Enabled                   bool                         `json:"enabled"`
	WelcomeTitle              string                       `json:"welcome_title"`
	WelcomeSubtitle           string                       `json:"welcome_subtitle"`
	Categories                []DiningBuddyCategorySetting `json:"categories"`
	Questions                 []DiningBuddyQuestionSetting `json:"questions"`
	PublishLimitPerDay        int                          `json:"publish_limit_per_day"`
	MessageRateLimitPerMinute int                          `json:"message_rate_limit_per_minute"`
	DefaultMaxPeople          int                          `json:"default_max_people"`
	MaxMaxPeople              int                          `json:"max_max_people"`
	AutoCloseExpiredHours     int                          `json:"auto_close_expired_hours"`
}

type PlatformRuntimeBundle struct {
	HomeEntrySettings        HomeEntrySettings        `json:"home_entry_settings"`
	ErrandSettings           ErrandSettings           `json:"errand_settings"`
	MerchantTaxonomySettings MerchantTaxonomySettings `json:"merchant_taxonomy_settings"`
	RiderRankSettings        RiderRankSettings        `json:"rider_rank_settings"`
	DiningBuddySettings      DiningBuddySettings      `json:"dining_buddy_settings"`
}

type PublicPlatformRuntimeSettings struct {
	PublicRuntimeSettings
	HomeEntrySettings        HomeEntrySettings        `json:"home_entry_settings"`
	ErrandSettings           ErrandSettings           `json:"errand_settings"`
	MerchantTaxonomySettings MerchantTaxonomySettings `json:"merchant_taxonomy_settings"`
	RiderRankSettings        RiderRankSettings        `json:"rider_rank_settings"`
	DiningBuddySettings      DiningBuddySettings      `json:"dining_buddy_settings"`
}

var defaultHomeEntrySeeds = []HomeEntrySetting{
	{Key: "food", Label: "美食", Icon: "🍜", IconType: "emoji", BGColor: "#FFF7ED", SortOrder: 10, Enabled: true, ClientScopes: []string{"user-vue", "app-mobile"}, RouteType: "category", RouteValue: "food"},
	{Key: "groupbuy", Label: "团购", Icon: "🏷️", IconType: "emoji", BGColor: "#FFFBEB", SortOrder: 20, Enabled: true, ClientScopes: []string{"user-vue", "app-mobile"}, RouteType: "category", RouteValue: "groupbuy"},
	{Key: "dessert_drinks", Label: "甜点饮品", Icon: "🧋", IconType: "emoji", BGColor: "#FFF1F2", SortOrder: 30, Enabled: true, ClientScopes: []string{"user-vue", "app-mobile"}, RouteType: "category", RouteValue: "dessert_drinks"},
	{Key: "supermarket_convenience", Label: "超市便利", Icon: "🛒", IconType: "emoji", BGColor: "#EFF6FF", SortOrder: 40, Enabled: true, ClientScopes: []string{"user-vue", "app-mobile"}, RouteType: "category", RouteValue: "supermarket_convenience"},
	{Key: "leisure_entertainment", Label: "休闲娱乐", Icon: "🎮", IconType: "emoji", BGColor: "#F0FDF4", SortOrder: 50, Enabled: true, ClientScopes: []string{"user-vue", "app-mobile"}, RouteType: "category", RouteValue: "leisure_entertainment"},
	{Key: "medicine", Label: "看病买药", Icon: "💊", IconType: "emoji", BGColor: "#ECFEFF", SortOrder: 60, Enabled: true, ClientScopes: []string{"user-vue", "app-mobile"}, RouteType: "feature", RouteValue: "medicine"},
	{Key: "errand", Label: "跑腿代购", Icon: "🏃", IconType: "emoji", BGColor: "#EEF2FF", SortOrder: 70, Enabled: true, ClientScopes: []string{"user-vue", "app-mobile"}, RouteType: "feature", RouteValue: "errand"},
	{Key: "life_services", Label: "生活服务", Icon: "🔧", IconType: "emoji", BGColor: "#F3F4F6", SortOrder: 80, Enabled: true, ClientScopes: []string{"user-vue", "app-mobile"}, RouteType: "category", RouteValue: "life_services"},
	{Key: "dining_buddy", Label: "同频饭友", Icon: "👫", IconType: "emoji", BGColor: "#FEF3C7", SortOrder: 90, Enabled: true, ClientScopes: []string{"user-vue", "app-mobile"}, RouteType: "feature", RouteValue: "dining_buddy"},
	{Key: "charity", Label: "悦享公益", Icon: "💚", IconType: "emoji", BGColor: "#DCFCE7", SortOrder: 100, Enabled: true, ClientScopes: []string{"user-vue", "app-mobile"}, RouteType: "feature", RouteValue: "charity"},
}

var defaultErrandServiceSeeds = []ErrandServiceSetting{
	{Key: "buy", Label: "帮我买", Desc: "代买商品", Icon: "购", Color: "#ff6b00", Enabled: true, SortOrder: 10, Route: "/pages/errand/buy/index", ServiceFeeHint: "按距离与商品重量综合计费"},
	{Key: "deliver", Label: "帮我送", Desc: "同城配送", Icon: "送", Color: "#009bf5", Enabled: true, SortOrder: 20, Route: "/pages/errand/deliver/index", ServiceFeeHint: "按寄送距离与时效计费"},
	{Key: "pickup", Label: "帮我取", Desc: "快递代取", Icon: "取", Color: "#10b981", Enabled: true, SortOrder: 30, Route: "/pages/errand/pickup/index", ServiceFeeHint: "按取件点距离与件数计费"},
	{Key: "do", Label: "帮我办", Desc: "排队代办", Icon: "办", Color: "#8b5cf6", Enabled: true, SortOrder: 40, Route: "/pages/errand/do/index", ServiceFeeHint: "按预估耗时与代办复杂度计费"},
}

var defaultMerchantTypes = []MerchantTaxonomyOption{
	{Key: "takeout", Label: "外卖", Enabled: true, SortOrder: 10, Aliases: []string{"外卖", "外卖类"}},
	{Key: "groupbuy", Label: "团购", Enabled: true, SortOrder: 20, Aliases: []string{"团购", "团购类"}},
	{Key: "hybrid", Label: "混合", Enabled: true, SortOrder: 30, Aliases: []string{"混合", "混合类"}},
}

var defaultBusinessCategories = []MerchantTaxonomyOption{
	{Key: "food", Label: "美食", Enabled: true, SortOrder: 10, Aliases: []string{"美食"}},
	{Key: "groupbuy", Label: "团购", Enabled: true, SortOrder: 20, Aliases: []string{"团购"}},
	{Key: "dessert_drinks", Label: "甜点饮品", Enabled: true, SortOrder: 30, Aliases: []string{"甜点饮品"}},
	{Key: "supermarket_convenience", Label: "超市便利", Enabled: true, SortOrder: 40, Aliases: []string{"超市便利"}},
	{Key: "leisure_entertainment", Label: "休闲娱乐", Enabled: true, SortOrder: 50, Aliases: []string{"休闲娱乐", "休闲玩乐"}},
	{Key: "life_services", Label: "生活服务", Enabled: true, SortOrder: 60, Aliases: []string{"生活服务"}},
}

var defaultRiderRankLevels = []RiderRankLevelSetting{
	{Level: 1, Key: "bronze_knight", Name: "青铜骑士", Icon: "🥉", Desc: "新手上路", ProgressTemplate: "累计{{totalOrders}}/100单，升级白银骑士", ThresholdRules: []string{"累计完成 100 单"}},
	{Level: 2, Key: "silver_knight", Name: "白银骑士", Icon: "🥈", Desc: "稳定履约", ProgressTemplate: "累计{{totalOrders}}/300单，升级黄金骑士", ThresholdRules: []string{"累计完成 300 单"}},
	{Level: 3, Key: "gold_knight", Name: "黄金骑士", Icon: "🥇", Desc: "高频骑手", ProgressTemplate: "本周{{weekOrders}}/100单，升级钻石骑士", ThresholdRules: []string{"本周完成 100 单"}},
	{Level: 4, Key: "diamond_knight", Name: "钻石骑士", Icon: "💎", Desc: "高质量履约", ProgressTemplate: "本周{{weekOrders}}/150单，升级王者骑士", ThresholdRules: []string{"本周完成 150 单"}},
	{Level: 5, Key: "king_knight", Name: "王者骑士", Icon: "👑", Desc: "稳定冲榜", ProgressTemplate: "保持高评分与连续周表现，升级传奇骑士", ThresholdRules: []string{"连续 3 周保持钻石及以上"}},
	{Level: 6, Key: "legend_knight", Name: "传奇骑士", Icon: "🌟", Desc: "平台顶尖骑手", ProgressTemplate: "保持传奇骑士段位", ThresholdRules: []string{"高评分、低异常、稳定履约"}},
}

var defaultDiningBuddyCategories = []DiningBuddyCategorySetting{
	{ID: "chat", Label: "聊天", Icon: "/static/icons/chat-bubble.svg", IconType: "image", Enabled: true, SortOrder: 10, Color: "#ec4899"},
	{ID: "food", Label: "约饭", Icon: "/static/icons/food-bowl.svg", IconType: "image", Enabled: true, SortOrder: 20, Color: "#f97316"},
	{ID: "study", Label: "学习", Icon: "/static/icons/study-book.svg", IconType: "image", Enabled: true, SortOrder: 30, Color: "#6366f1"},
}

var defaultDiningBuddyQuestions = []DiningBuddyQuestionSetting{
	{
		Question: "你更想先从哪种搭子开始？",
		Options: []DiningBuddyQuestionOption{
			{Text: "先找个能聊天的人", Icon: "💬"},
			{Text: "先约一顿饭最直接", Icon: "🍜"},
			{Text: "先找学习监督搭子", Icon: "📚"},
		},
	},
	{
		Question: "你希望这场局有多少人？",
		Options: []DiningBuddyQuestionOption{
			{Text: "2 人就够，直接高效", Icon: "🫶"},
			{Text: "3-4 人，刚好不冷场", Icon: "✨"},
			{Text: "5-6 人，更热闹一点", Icon: "🎉"},
		},
	},
	{
		Question: "如果现场节奏不一致，你更偏向？",
		Options: []DiningBuddyQuestionOption{
			{Text: "先听听大家意见", Icon: "🤝"},
			{Text: "商量一个折中方案", Icon: "🗣️"},
			{Text: "我会先把偏好说清楚", Icon: "✅"},
		},
	},
}

func DefaultHomeEntrySettings() HomeEntrySettings {
	return HomeEntrySettings{Entries: cloneHomeEntries(defaultHomeEntrySeeds)}
}

func NormalizeHomeEntrySettings(input HomeEntrySettings) HomeEntrySettings {
	defaults := DefaultHomeEntrySettings()
	defaultByKey := map[string]HomeEntrySetting{}
	for _, item := range defaults.Entries {
		defaultByKey[item.Key] = item
	}

	source := input.Entries
	if len(source) == 0 {
		source = defaults.Entries
	}

	normalized := make([]HomeEntrySetting, 0, len(source))
	seen := map[string]bool{}
	for index, item := range source {
		key := strings.TrimSpace(item.Key)
		if key == "" || seen[key] {
			continue
		}
		seen[key] = true
		fallback, ok := defaultByKey[key]
		if !ok {
			fallback = HomeEntrySetting{
				Key:          key,
				Label:        key,
				Icon:         "✨",
				IconType:     "emoji",
				BGColor:      "#F3F4F6",
				SortOrder:    (index + 1) * 10,
				Enabled:      true,
				ClientScopes: []string{"user-vue", "app-mobile"},
				RouteType:    "page",
			}
		}
		entry := fallback
		entry.Key = key
		entry.Label = defaultString(normalizeOptionalMultiline(item.Label), fallback.Label)
		entry.Icon = defaultString(strings.TrimSpace(item.Icon), fallback.Icon)
		entry.IconType = normalizeIconType(item.IconType, fallback.IconType)
		entry.BGColor = defaultString(strings.TrimSpace(item.BGColor), fallback.BGColor)
		entry.SortOrder = defaultInt(item.SortOrder, fallback.SortOrder)
		entry.Enabled = item.Enabled
		entry.CityScopes = normalizeStringList(item.CityScopes)
		entry.ClientScopes = normalizeStringList(item.ClientScopes)
		if len(entry.ClientScopes) == 0 {
			entry.ClientScopes = cloneStringSlice(fallback.ClientScopes)
		}
		entry.RouteType = normalizeHomeEntryRouteType(item.RouteType, fallback.RouteType)
		entry.RouteValue = normalizeHomeEntryRouteValue(entry.RouteType, item.RouteValue, fallback.RouteValue)
		entry.BadgeText = strings.TrimSpace(item.BadgeText)
		normalized = append(normalized, entry)
	}

	if len(normalized) == 0 {
		normalized = cloneHomeEntries(defaults.Entries)
	}
	sort.SliceStable(normalized, func(i, j int) bool {
		if normalized[i].SortOrder == normalized[j].SortOrder {
			return normalized[i].Key < normalized[j].Key
		}
		return normalized[i].SortOrder < normalized[j].SortOrder
	})
	return HomeEntrySettings{Entries: normalized}
}

func ValidateHomeEntrySettings(input HomeEntrySettings) error {
	settings := NormalizeHomeEntrySettings(input)
	if len(settings.Entries) == 0 {
		return fmt.Errorf("home entries cannot be empty")
	}
	seenKeys := map[string]bool{}
	for _, entry := range settings.Entries {
		if len(entry.Key) == 0 || len(entry.Key) > 64 {
			return fmt.Errorf("home entry key is invalid")
		}
		if seenKeys[entry.Key] {
			return fmt.Errorf("home entry key must be unique")
		}
		seenKeys[entry.Key] = true
		if len(entry.Label) == 0 || len(entry.Label) > 32 {
			return fmt.Errorf("home entry label is invalid")
		}
		if len(entry.Icon) > 255 {
			return fmt.Errorf("home entry icon is too long")
		}
		if len(entry.BGColor) > 32 {
			return fmt.Errorf("home entry bg_color is too long")
		}
		if len(entry.BadgeText) > 32 {
			return fmt.Errorf("home entry badge_text is too long")
		}
		if len(entry.RouteValue) == 0 || len(entry.RouteValue) > 500 {
			return fmt.Errorf("home entry route_value is invalid")
		}
	}
	return nil
}

func DefaultErrandSettings() ErrandSettings {
	return ErrandSettings{
		PageTitle: "跑腿",
		HeroTitle: "同城跑腿",
		HeroDesc:  "帮买、帮送、帮取、帮办统一走真实订单链路",
		DetailTip: "订单金额、距离、重量和服务复杂度会影响最终费用，请以下单页实时展示为准。",
		Services:  cloneErrandServices(defaultErrandServiceSeeds),
	}
}

func NormalizeErrandSettings(input ErrandSettings) ErrandSettings {
	defaults := DefaultErrandSettings()
	settings := defaults
	settings.PageTitle = defaultString(normalizeOptionalMultiline(input.PageTitle), defaults.PageTitle)
	settings.HeroTitle = defaultString(normalizeOptionalMultiline(input.HeroTitle), defaults.HeroTitle)
	settings.HeroDesc = defaultString(normalizeOptionalMultiline(input.HeroDesc), defaults.HeroDesc)
	settings.DetailTip = defaultString(normalizeOptionalMultiline(input.DetailTip), defaults.DetailTip)

	allowed := map[string]ErrandServiceSetting{}
	for _, item := range defaults.Services {
		allowed[item.Key] = item
	}
	services := make([]ErrandServiceSetting, 0, len(defaults.Services))
	seen := map[string]bool{}
	for _, item := range input.Services {
		key := strings.TrimSpace(item.Key)
		fallback, ok := allowed[key]
		if !ok || seen[key] {
			continue
		}
		seen[key] = true
		entry := fallback
		entry.Label = defaultString(normalizeOptionalMultiline(item.Label), fallback.Label)
		entry.Desc = defaultString(normalizeOptionalMultiline(item.Desc), fallback.Desc)
		entry.Icon = defaultString(strings.TrimSpace(item.Icon), fallback.Icon)
		entry.Color = defaultString(strings.TrimSpace(item.Color), fallback.Color)
		entry.Enabled = item.Enabled
		entry.SortOrder = defaultInt(item.SortOrder, fallback.SortOrder)
		entry.Route = defaultString(strings.TrimSpace(item.Route), fallback.Route)
		entry.ServiceFeeHint = defaultString(normalizeOptionalMultiline(item.ServiceFeeHint), fallback.ServiceFeeHint)
		services = append(services, entry)
	}
	for _, item := range defaults.Services {
		if !seen[item.Key] {
			services = append(services, item)
		}
	}
	sort.SliceStable(services, func(i, j int) bool {
		if services[i].SortOrder == services[j].SortOrder {
			return services[i].Key < services[j].Key
		}
		return services[i].SortOrder < services[j].SortOrder
	})
	settings.Services = services
	return settings
}

func ValidateErrandSettings(input ErrandSettings) error {
	settings := NormalizeErrandSettings(input)
	if len(settings.PageTitle) > 32 {
		return fmt.Errorf("errand page_title is too long")
	}
	if len(settings.HeroTitle) > 64 {
		return fmt.Errorf("errand hero_title is too long")
	}
	if len(settings.HeroDesc) > 200 {
		return fmt.Errorf("errand hero_desc is too long")
	}
	if len(settings.DetailTip) > 500 {
		return fmt.Errorf("errand detail_tip is too long")
	}
	for _, item := range settings.Services {
		if len(item.Label) == 0 || len(item.Label) > 32 {
			return fmt.Errorf("errand service label is invalid")
		}
		if len(item.Desc) > 120 {
			return fmt.Errorf("errand service desc is too long")
		}
		if len(item.Icon) > 64 {
			return fmt.Errorf("errand service icon is too long")
		}
		if len(item.Route) > 255 {
			return fmt.Errorf("errand service route is too long")
		}
		if len(item.ServiceFeeHint) > 200 {
			return fmt.Errorf("errand service fee hint is too long")
		}
	}
	return nil
}

func DefaultMerchantTaxonomySettings() MerchantTaxonomySettings {
	return MerchantTaxonomySettings{
		MerchantTypes:      cloneMerchantTaxonomyOptions(defaultMerchantTypes),
		BusinessCategories: cloneMerchantTaxonomyOptions(defaultBusinessCategories),
	}
}

func NormalizeMerchantTaxonomySettings(input MerchantTaxonomySettings) MerchantTaxonomySettings {
	defaults := DefaultMerchantTaxonomySettings()
	return MerchantTaxonomySettings{
		MerchantTypes:      normalizeMerchantTaxonomyOptions(input.MerchantTypes, defaults.MerchantTypes),
		BusinessCategories: normalizeMerchantTaxonomyOptions(input.BusinessCategories, defaults.BusinessCategories),
	}
}

func ValidateMerchantTaxonomySettings(input MerchantTaxonomySettings) error {
	settings := NormalizeMerchantTaxonomySettings(input)
	if len(settings.MerchantTypes) == 0 || len(settings.BusinessCategories) == 0 {
		return fmt.Errorf("merchant taxonomy options cannot be empty")
	}
	for _, item := range append(cloneMerchantTaxonomyOptions(settings.MerchantTypes), settings.BusinessCategories...) {
		if len(item.Label) == 0 || len(item.Label) > 32 {
			return fmt.Errorf("taxonomy label is invalid")
		}
		if len(item.Key) == 0 || len(item.Key) > 64 {
			return fmt.Errorf("taxonomy key is invalid")
		}
		for _, alias := range item.Aliases {
			if len(alias) > 32 {
				return fmt.Errorf("taxonomy alias is too long")
			}
		}
	}
	return nil
}

func CanonicalMerchantTypeKey(raw string) string {
	value := strings.ToLower(strings.TrimSpace(raw))
	switch value {
	case "", "takeout", "waimai", "delivery", "外卖", "外卖类":
		return "takeout"
	case "groupbuy", "团购", "团购类":
		return "groupbuy"
	case "hybrid", "mixed", "mix", "混合", "混合类":
		return "hybrid"
	default:
		return "takeout"
	}
}

func CanonicalBusinessCategoryKey(raw string) string {
	value := strings.TrimSpace(strings.ToLower(raw))
	switch value {
	case "", "food", "美食":
		return "food"
	case "groupbuy", "团购":
		return "groupbuy"
	case "dessert_drinks", "dessert-drinks", "甜点饮品":
		return "dessert_drinks"
	case "supermarket_convenience", "supermarket-convenience", "超市便利":
		return "supermarket_convenience"
	case "leisure_entertainment", "leisure-entertainment", "休闲娱乐", "休闲玩乐":
		return "leisure_entertainment"
	case "life_services", "life-services", "生活服务":
		return "life_services"
	default:
		return "food"
	}
}

func MerchantTypeLabel(settings MerchantTaxonomySettings, key string) string {
	normalized := NormalizeMerchantTaxonomySettings(settings)
	canonical := CanonicalMerchantTypeKey(key)
	for _, item := range normalized.MerchantTypes {
		if item.Key == canonical {
			return item.Label
		}
	}
	return defaultMerchantTypes[0].Label
}

func BusinessCategoryLabel(settings MerchantTaxonomySettings, key string) string {
	normalized := NormalizeMerchantTaxonomySettings(settings)
	canonical := CanonicalBusinessCategoryKey(key)
	for _, item := range normalized.BusinessCategories {
		if item.Key == canonical {
			return item.Label
		}
	}
	return defaultBusinessCategories[0].Label
}

func NormalizeBusinessCategoryInput(raw string, settings MerchantTaxonomySettings) (string, string) {
	key := CanonicalBusinessCategoryKey(raw)
	return key, BusinessCategoryLabel(settings, key)
}

func DefaultRiderRankSettings() RiderRankSettings {
	return RiderRankSettings{Levels: cloneRiderRankLevels(defaultRiderRankLevels)}
}

func NormalizeRiderRankSettings(input RiderRankSettings) RiderRankSettings {
	defaults := DefaultRiderRankSettings()
	fallbackByLevel := map[int]RiderRankLevelSetting{}
	for _, item := range defaults.Levels {
		fallbackByLevel[item.Level] = item
	}
	levels := make([]RiderRankLevelSetting, 0, len(defaults.Levels))
	seen := map[int]bool{}
	for _, item := range input.Levels {
		fallback, ok := fallbackByLevel[item.Level]
		if !ok || seen[item.Level] {
			continue
		}
		seen[item.Level] = true
		level := fallback
		level.Key = defaultString(strings.TrimSpace(item.Key), fallback.Key)
		level.Name = defaultString(normalizeOptionalMultiline(item.Name), fallback.Name)
		level.Icon = defaultString(strings.TrimSpace(item.Icon), fallback.Icon)
		level.Desc = defaultString(normalizeOptionalMultiline(item.Desc), fallback.Desc)
		level.ProgressTemplate = defaultString(normalizeOptionalMultiline(item.ProgressTemplate), fallback.ProgressTemplate)
		level.ThresholdRules = normalizeRuntimeStringList(item.ThresholdRules)
		if len(level.ThresholdRules) == 0 {
			level.ThresholdRules = cloneStringSlice(fallback.ThresholdRules)
		}
		levels = append(levels, level)
	}
	for _, item := range defaults.Levels {
		if !seen[item.Level] {
			levels = append(levels, item)
		}
	}
	sort.SliceStable(levels, func(i, j int) bool {
		return levels[i].Level < levels[j].Level
	})
	return RiderRankSettings{Levels: levels}
}

func ValidateRiderRankSettings(input RiderRankSettings) error {
	settings := NormalizeRiderRankSettings(input)
	if len(settings.Levels) != len(defaultRiderRankLevels) {
		return fmt.Errorf("rider rank levels are incomplete")
	}
	for _, item := range settings.Levels {
		if item.Level < 1 || item.Level > 6 {
			return fmt.Errorf("rider rank level is invalid")
		}
		if len(item.Key) == 0 || len(item.Key) > 64 {
			return fmt.Errorf("rider rank key is invalid")
		}
		if len(item.Name) == 0 || len(item.Name) > 32 {
			return fmt.Errorf("rider rank name is invalid")
		}
		if len(item.Icon) > 64 {
			return fmt.Errorf("rider rank icon is too long")
		}
		if len(item.Desc) > 120 {
			return fmt.Errorf("rider rank desc is too long")
		}
		if len(item.ProgressTemplate) > 200 {
			return fmt.Errorf("rider rank progress_template is too long")
		}
		for _, rule := range item.ThresholdRules {
			if len(rule) > 160 {
				return fmt.Errorf("rider rank threshold rule is too long")
			}
		}
	}
	return nil
}

func DefaultDiningBuddySettings() DiningBuddySettings {
	return DiningBuddySettings{
		Enabled:                   true,
		WelcomeTitle:              "同频饭友",
		WelcomeSubtitle:           "约饭、聊天、学习，快速找到同频搭子。",
		Categories:                cloneDiningBuddyCategories(defaultDiningBuddyCategories),
		Questions:                 cloneDiningBuddyQuestions(defaultDiningBuddyQuestions),
		PublishLimitPerDay:        5,
		MessageRateLimitPerMinute: 20,
		DefaultMaxPeople:          4,
		MaxMaxPeople:              6,
		AutoCloseExpiredHours:     24,
	}
}

func NormalizeDiningBuddySettings(input DiningBuddySettings) DiningBuddySettings {
	defaults := DefaultDiningBuddySettings()
	settings := defaults
	settings.Enabled = input.Enabled
	settings.WelcomeTitle = defaultString(normalizeOptionalMultiline(input.WelcomeTitle), defaults.WelcomeTitle)
	settings.WelcomeSubtitle = defaultString(normalizeOptionalMultiline(input.WelcomeSubtitle), defaults.WelcomeSubtitle)
	settings.Categories = normalizeDiningBuddyCategories(input.Categories, defaults.Categories)
	settings.Questions = normalizeDiningBuddyQuestions(input.Questions)
	if len(settings.Questions) == 0 {
		settings.Questions = cloneDiningBuddyQuestions(defaults.Questions)
	}
	settings.PublishLimitPerDay = clampInt(defaultInt(input.PublishLimitPerDay, defaults.PublishLimitPerDay), 1, 20)
	settings.MessageRateLimitPerMinute = clampInt(defaultInt(input.MessageRateLimitPerMinute, defaults.MessageRateLimitPerMinute), 1, 120)
	settings.DefaultMaxPeople = clampInt(defaultInt(input.DefaultMaxPeople, defaults.DefaultMaxPeople), 2, 20)
	settings.MaxMaxPeople = clampInt(defaultInt(input.MaxMaxPeople, defaults.MaxMaxPeople), settings.DefaultMaxPeople, 20)
	settings.AutoCloseExpiredHours = clampInt(defaultInt(input.AutoCloseExpiredHours, defaults.AutoCloseExpiredHours), 1, 168)
	return settings
}

func ValidateDiningBuddySettings(input DiningBuddySettings) error {
	settings := NormalizeDiningBuddySettings(input)
	if len(settings.WelcomeTitle) == 0 || len(settings.WelcomeTitle) > 32 {
		return fmt.Errorf("dining buddy welcome_title is invalid")
	}
	if len(settings.WelcomeSubtitle) > 120 {
		return fmt.Errorf("dining buddy welcome_subtitle is too long")
	}
	if len(settings.Categories) == 0 {
		return fmt.Errorf("dining buddy categories cannot be empty")
	}
	for _, category := range settings.Categories {
		if category.ID != "chat" && category.ID != "food" && category.ID != "study" {
			return fmt.Errorf("dining buddy category id is invalid")
		}
		if len(category.Label) == 0 || len(category.Label) > 20 {
			return fmt.Errorf("dining buddy category label is invalid")
		}
		if len(category.Icon) > 255 {
			return fmt.Errorf("dining buddy category icon is too long")
		}
	}
	if len(settings.Questions) > 10 {
		return fmt.Errorf("dining buddy questions exceed maximum size")
	}
	for _, question := range settings.Questions {
		if len(question.Question) == 0 || len(question.Question) > 120 {
			return fmt.Errorf("dining buddy question is invalid")
		}
		if len(question.Options) == 0 || len(question.Options) > 6 {
			return fmt.Errorf("dining buddy question options are invalid")
		}
		for _, option := range question.Options {
			if len(option.Text) == 0 || len(option.Text) > 80 {
				return fmt.Errorf("dining buddy question option text is invalid")
			}
			if len(option.Icon) > 32 {
				return fmt.Errorf("dining buddy question option icon is too long")
			}
		}
	}
	return nil
}

func LoadPlatformRuntimeBundle(ctx context.Context, db *gorm.DB) PlatformRuntimeBundle {
	homeEntry := DefaultHomeEntrySettings()
	_ = LoadJSONSetting(ctx, db, SettingKeyHomeEntrySettings, &homeEntry)
	homeEntry = NormalizeHomeEntrySettings(homeEntry)

	errand := DefaultErrandSettings()
	_ = LoadJSONSetting(ctx, db, SettingKeyErrandSettings, &errand)
	errand = NormalizeErrandSettings(errand)

	taxonomy := DefaultMerchantTaxonomySettings()
	_ = LoadJSONSetting(ctx, db, SettingKeyMerchantTaxonomySettings, &taxonomy)
	taxonomy = NormalizeMerchantTaxonomySettings(taxonomy)

	ranks := DefaultRiderRankSettings()
	_ = LoadJSONSetting(ctx, db, SettingKeyRiderRankSettings, &ranks)
	ranks = NormalizeRiderRankSettings(ranks)

	diningBuddy := DefaultDiningBuddySettings()
	_ = LoadJSONSetting(ctx, db, SettingKeyDiningBuddySettings, &diningBuddy)
	diningBuddy = NormalizeDiningBuddySettings(diningBuddy)

	return PlatformRuntimeBundle{
		HomeEntrySettings:        homeEntry,
		ErrandSettings:           errand,
		MerchantTaxonomySettings: taxonomy,
		RiderRankSettings:        ranks,
		DiningBuddySettings:      diningBuddy,
	}
}

func BuildPublicPlatformRuntimeSettings(input ServiceSettings, bundle PlatformRuntimeBundle) PublicPlatformRuntimeSettings {
	publicBase := BuildPublicRuntimeSettings(input)
	return PublicPlatformRuntimeSettings{
		PublicRuntimeSettings:    publicBase,
		HomeEntrySettings:        bundle.HomeEntrySettings,
		ErrandSettings:           bundle.ErrandSettings,
		MerchantTaxonomySettings: bundle.MerchantTaxonomySettings,
		RiderRankSettings:        bundle.RiderRankSettings,
		DiningBuddySettings:      bundle.DiningBuddySettings,
	}
}

func FindDiningBuddyCategory(settings DiningBuddySettings, categoryID string) (DiningBuddyCategorySetting, bool) {
	normalized := NormalizeDiningBuddySettings(settings)
	for _, category := range normalized.Categories {
		if category.ID == strings.TrimSpace(categoryID) {
			return category, true
		}
	}
	return DiningBuddyCategorySetting{}, false
}

func normalizeMerchantTaxonomyOptions(input []MerchantTaxonomyOption, defaults []MerchantTaxonomyOption) []MerchantTaxonomyOption {
	fallbackByKey := map[string]MerchantTaxonomyOption{}
	for _, item := range defaults {
		fallbackByKey[item.Key] = item
	}
	options := make([]MerchantTaxonomyOption, 0, len(defaults))
	seen := map[string]bool{}
	for _, item := range input {
		key := strings.TrimSpace(item.Key)
		fallback, ok := fallbackByKey[key]
		if !ok || seen[key] {
			continue
		}
		seen[key] = true
		option := fallback
		option.Label = defaultString(normalizeOptionalMultiline(item.Label), fallback.Label)
		option.Enabled = item.Enabled
		option.SortOrder = defaultInt(item.SortOrder, fallback.SortOrder)
		option.Aliases = normalizeStringList(item.Aliases)
		if len(option.Aliases) == 0 {
			option.Aliases = normalizeStringList(fallback.Aliases)
		}
		options = append(options, option)
	}
	for _, item := range defaults {
		if !seen[item.Key] {
			options = append(options, item)
		}
	}
	sort.SliceStable(options, func(i, j int) bool {
		if options[i].SortOrder == options[j].SortOrder {
			return options[i].Key < options[j].Key
		}
		return options[i].SortOrder < options[j].SortOrder
	})
	return options
}

func normalizeDiningBuddyCategories(input []DiningBuddyCategorySetting, defaults []DiningBuddyCategorySetting) []DiningBuddyCategorySetting {
	fallbackByID := map[string]DiningBuddyCategorySetting{}
	for _, item := range defaults {
		fallbackByID[item.ID] = item
	}
	categories := make([]DiningBuddyCategorySetting, 0, len(defaults))
	seen := map[string]bool{}
	for _, item := range input {
		id := strings.TrimSpace(item.ID)
		fallback, ok := fallbackByID[id]
		if !ok || seen[id] {
			continue
		}
		seen[id] = true
		category := fallback
		category.Label = defaultString(normalizeOptionalMultiline(item.Label), fallback.Label)
		category.Icon = defaultString(strings.TrimSpace(item.Icon), fallback.Icon)
		category.IconType = normalizeIconType(item.IconType, fallback.IconType)
		category.Enabled = item.Enabled
		category.SortOrder = defaultInt(item.SortOrder, fallback.SortOrder)
		category.Color = defaultString(strings.TrimSpace(item.Color), fallback.Color)
		categories = append(categories, category)
	}
	for _, item := range defaults {
		if !seen[item.ID] {
			categories = append(categories, item)
		}
	}
	sort.SliceStable(categories, func(i, j int) bool {
		if categories[i].SortOrder == categories[j].SortOrder {
			return categories[i].ID < categories[j].ID
		}
		return categories[i].SortOrder < categories[j].SortOrder
	})
	return categories
}

func normalizeDiningBuddyQuestions(input []DiningBuddyQuestionSetting) []DiningBuddyQuestionSetting {
	questions := make([]DiningBuddyQuestionSetting, 0, len(input))
	for _, item := range input {
		question := normalizeOptionalMultiline(item.Question)
		if question == "" {
			continue
		}
		options := make([]DiningBuddyQuestionOption, 0, len(item.Options))
		for _, option := range item.Options {
			text := normalizeOptionalMultiline(option.Text)
			if text == "" {
				continue
			}
			options = append(options, DiningBuddyQuestionOption{
				Text: text,
				Icon: strings.TrimSpace(option.Icon),
			})
		}
		if len(options) == 0 {
			continue
		}
		questions = append(questions, DiningBuddyQuestionSetting{
			Question: question,
			Options:  options,
		})
	}
	return questions
}

func normalizeHomeEntryRouteType(value string, fallback string) string {
	switch strings.TrimSpace(value) {
	case "feature", "category", "page", "external":
		return strings.TrimSpace(value)
	default:
		return fallback
	}
}

func normalizeHomeEntryRouteValue(routeType string, value string, fallback string) string {
	candidate := strings.TrimSpace(value)
	if candidate == "" {
		return fallback
	}
	switch routeType {
	case "feature":
		switch candidate {
		case "errand", "medicine", "dining_buddy", "charity":
			return candidate
		}
	case "category":
		switch candidate {
		case "food", "groupbuy", "dessert_drinks", "supermarket_convenience", "leisure_entertainment", "life_services":
			return candidate
		}
	case "page", "external":
		return candidate
	}
	return fallback
}

func normalizeIconType(value string, fallback string) string {
	switch strings.TrimSpace(value) {
	case "emoji", "image", "external":
		return strings.TrimSpace(value)
	default:
		return fallback
	}
}

func normalizeStringList(values []string) []string {
	if len(values) == 0 {
		return []string{}
	}
	seen := map[string]bool{}
	items := make([]string, 0, len(values))
	for _, value := range values {
		text := strings.TrimSpace(value)
		if text == "" || seen[text] {
			continue
		}
		seen[text] = true
		items = append(items, text)
	}
	return items
}

func defaultString(value string, fallback string) string {
	if strings.TrimSpace(value) == "" {
		return fallback
	}
	return value
}

func defaultInt(value int, fallback int) int {
	if value == 0 {
		return fallback
	}
	return value
}

func clampInt(value int, min int, max int) int {
	if value < min {
		return min
	}
	if value > max {
		return max
	}
	return value
}

func cloneHomeEntries(items []HomeEntrySetting) []HomeEntrySetting {
	if len(items) == 0 {
		return []HomeEntrySetting{}
	}
	result := make([]HomeEntrySetting, 0, len(items))
	for _, item := range items {
		copied := item
		copied.CityScopes = normalizeStringList(item.CityScopes)
		copied.ClientScopes = normalizeStringList(item.ClientScopes)
		result = append(result, copied)
	}
	return result
}

func cloneErrandServices(items []ErrandServiceSetting) []ErrandServiceSetting {
	if len(items) == 0 {
		return []ErrandServiceSetting{}
	}
	result := make([]ErrandServiceSetting, len(items))
	copy(result, items)
	return result
}

func cloneMerchantTaxonomyOptions(items []MerchantTaxonomyOption) []MerchantTaxonomyOption {
	if len(items) == 0 {
		return []MerchantTaxonomyOption{}
	}
	result := make([]MerchantTaxonomyOption, 0, len(items))
	for _, item := range items {
		copied := item
		copied.Aliases = normalizeStringList(item.Aliases)
		result = append(result, copied)
	}
	return result
}

func cloneRiderRankLevels(items []RiderRankLevelSetting) []RiderRankLevelSetting {
	if len(items) == 0 {
		return []RiderRankLevelSetting{}
	}
	result := make([]RiderRankLevelSetting, 0, len(items))
	for _, item := range items {
		copied := item
		copied.ThresholdRules = cloneStringSlice(item.ThresholdRules)
		result = append(result, copied)
	}
	return result
}

func cloneDiningBuddyCategories(items []DiningBuddyCategorySetting) []DiningBuddyCategorySetting {
	if len(items) == 0 {
		return []DiningBuddyCategorySetting{}
	}
	result := make([]DiningBuddyCategorySetting, len(items))
	copy(result, items)
	return result
}

func cloneDiningBuddyQuestions(items []DiningBuddyQuestionSetting) []DiningBuddyQuestionSetting {
	if len(items) == 0 {
		return []DiningBuddyQuestionSetting{}
	}
	result := make([]DiningBuddyQuestionSetting, 0, len(items))
	for _, item := range items {
		copied := DiningBuddyQuestionSetting{
			Question: item.Question,
			Options:  make([]DiningBuddyQuestionOption, len(item.Options)),
		}
		copy(copied.Options, item.Options)
		result = append(result, copied)
	}
	return result
}
