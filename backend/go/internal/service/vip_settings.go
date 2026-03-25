package service

import "fmt"

type VIPBenefit struct {
	Icon   string `json:"icon"`
	Title  string `json:"title"`
	Desc   string `json:"desc"`
	Detail string `json:"detail"`
}

type VIPLevel struct {
	Name           string       `json:"name"`
	StyleClass     string       `json:"style_class"`
	Tagline        string       `json:"tagline"`
	ThresholdLabel string       `json:"threshold_label"`
	ThresholdValue int          `json:"threshold_value"`
	Multiplier     int          `json:"multiplier"`
	IsBlackGold    bool         `json:"is_black_gold"`
	Benefits       []VIPBenefit `json:"benefits"`
}

type VIPTask struct {
	Title       string `json:"title"`
	Description string `json:"description"`
	RewardText  string `json:"reward_text"`
	ActionLabel string `json:"action_label"`
}

type VIPSettings struct {
	Enabled             bool       `json:"enabled"`
	PageTitle           string     `json:"page_title"`
	RulesTitle          string     `json:"rules_title"`
	BenefitSectionTitle string     `json:"benefit_section_title"`
	BenefitSectionTag   string     `json:"benefit_section_tag"`
	BenefitSectionTip   string     `json:"benefit_section_tip"`
	TasksSectionTitle   string     `json:"tasks_section_title"`
	TasksSectionTip     string     `json:"tasks_section_tip"`
	PointsSectionTitle  string     `json:"points_section_title"`
	PointsSectionTip    string     `json:"points_section_tip"`
	ServiceButtonText   string     `json:"service_button_text"`
	StandardActionText  string     `json:"standard_action_text"`
	PremiumActionText   string     `json:"premium_action_text"`
	PointRules          []string   `json:"point_rules"`
	Levels              []VIPLevel `json:"levels"`
	GrowthTasks         []VIPTask  `json:"growth_tasks"`
}

type PublicVIPSettings struct {
	Enabled             bool       `json:"enabled"`
	PageTitle           string     `json:"page_title"`
	RulesTitle          string     `json:"rules_title"`
	BenefitSectionTitle string     `json:"benefit_section_title"`
	BenefitSectionTag   string     `json:"benefit_section_tag"`
	BenefitSectionTip   string     `json:"benefit_section_tip"`
	TasksSectionTitle   string     `json:"tasks_section_title"`
	TasksSectionTip     string     `json:"tasks_section_tip"`
	PointsSectionTitle  string     `json:"points_section_title"`
	PointsSectionTip    string     `json:"points_section_tip"`
	ServiceButtonText   string     `json:"service_button_text"`
	StandardActionText  string     `json:"standard_action_text"`
	PremiumActionText   string     `json:"premium_action_text"`
	PointRules          []string   `json:"point_rules"`
	Levels              []VIPLevel `json:"levels"`
	GrowthTasks         []VIPTask  `json:"growth_tasks"`
}

func DefaultVIPSettings() VIPSettings {
	return VIPSettings{
		Enabled:             true,
		PageTitle:           "会员中心",
		RulesTitle:          "会员权益规则",
		BenefitSectionTitle: "权益全景",
		BenefitSectionTag:   "VIP专享",
		BenefitSectionTip:   "点击查看详情",
		TasksSectionTitle:   "成长任务",
		TasksSectionTip:     "完成任务，逐步解锁更多等级权益",
		PointsSectionTitle:  "积分好礼",
		PointsSectionTip:    "积分商品由积分商城实时维护",
		ServiceButtonText:   "客服",
		StandardActionText:  "立即去点餐升级",
		PremiumActionText:   "联系专属客服",
		PointRules: []string{
			"平台消费 1 元 = 1 积分，按实付金额累计。",
			"会员倍数积分会在基础积分上额外叠加。",
			"退款订单对应积分会同步扣回。",
			"积分有效期与兑换规则以积分商城说明为准。",
		},
		Levels: []VIPLevel{
			{
				Name:           "优享VIP",
				StyleClass:     "level-quality",
				Tagline:        "日常省一点，从这里开始",
				ThresholdLabel: "成长值 800",
				ThresholdValue: 800,
				Multiplier:     1,
				IsBlackGold:    false,
				Benefits: []VIPBenefit{
					{Icon: "/static/icons/star.svg", Title: "积分", Desc: "消费返积分", Detail: "平台消费 1 元可累计 1 积分，按订单实付金额计算。"},
					{Icon: "/static/icons/gift.svg", Title: "兑换好礼", Desc: "积分兑换权益", Detail: "积分可在积分商城兑换实物商品、会员卡和平台权益。"},
					{Icon: "/static/icons/clock.svg", Title: "超时赔付", Desc: "超时自动补偿", Detail: "订单超过承诺时效后，平台可按规则发放补偿。"},
				},
			},
			{
				Name:           "黄金VIP",
				StyleClass:     "level-gold",
				Tagline:        "返利升级，权益更进一步",
				ThresholdLabel: "成长值 3000",
				ThresholdValue: 3000,
				Multiplier:     2,
				IsBlackGold:    false,
				Benefits: []VIPBenefit{
					{Icon: "/static/icons/ticket.svg", Title: "2元无门槛券", Desc: "每月 1 张", Detail: "每月发放 1 张 2 元无门槛券，面向指定业务场景可用。"},
					{Icon: "/static/icons/clock.svg", Title: "超时赔付", Desc: "超时自动补偿", Detail: "订单超过承诺时效后，平台可按规则发放补偿。"},
					{Icon: "/static/icons/star.svg", Title: "双倍积分", Desc: "积分翻倍累计", Detail: "在基础积分之上额外发放 1 倍会员积分。"},
					{Icon: "/static/icons/gift.svg", Title: "兑换好礼", Desc: "积分兑换权益", Detail: "积分可在积分商城兑换实物商品、会员卡和平台权益。"},
				},
			},
			{
				Name:           "尊享VIP",
				StyleClass:     "level-premium",
				Tagline:        "更多特权，服务更快一步",
				ThresholdLabel: "成长值 5000",
				ThresholdValue: 5000,
				Multiplier:     2,
				IsBlackGold:    false,
				Benefits: []VIPBenefit{
					{Icon: "/static/icons/ticket.svg", Title: "2元无门槛券", Desc: "每月 1 张", Detail: "每月发放 1 张 2 元无门槛券，面向指定业务场景可用。"},
					{Icon: "/static/icons/bike.svg", Title: "免配送费", Desc: "每月 1 次", Detail: "每月可享 1 次免配送费权益。"},
					{Icon: "/static/icons/clock.svg", Title: "超时赔付", Desc: "超时自动补偿", Detail: "订单超过承诺时效后，平台可按规则发放补偿。"},
					{Icon: "/static/icons/star.svg", Title: "双倍积分", Desc: "积分翻倍累计", Detail: "在基础积分之上额外发放 1 倍会员积分。"},
					{Icon: "/static/icons/gift.svg", Title: "兑换好礼", Desc: "积分兑换权益", Detail: "积分可在积分商城兑换实物商品、会员卡和平台权益。"},
					{Icon: "/static/icons/headphones.svg", Title: "专属客服", Desc: "优先响应支持", Detail: "会员问题支持优先接入，保障处理效率。"},
				},
			},
			{
				Name:           "黑金VIP",
				StyleClass:     "level-supreme",
				Tagline:        "黑金尊享，服务与补贴双升级",
				ThresholdLabel: "成长值 8000",
				ThresholdValue: 8000,
				Multiplier:     3,
				IsBlackGold:    true,
				Benefits: []VIPBenefit{
					{Icon: "/static/icons/ticket.svg", Title: "2元无门槛券", Desc: "每月 2 张", Detail: "每月发放 2 张 2 元无门槛券，面向指定业务场景可用。"},
					{Icon: "/static/icons/bike.svg", Title: "免配送费", Desc: "每月 2 次", Detail: "每月可享 2 次免配送费权益。"},
					{Icon: "/static/icons/clock.svg", Title: "超时赔付", Desc: "超时自动补偿", Detail: "订单超过承诺时效后，平台可按规则发放补偿。"},
					{Icon: "/static/icons/star.svg", Title: "三倍积分", Desc: "积分三倍累计", Detail: "在基础积分之上额外发放 2 倍会员积分。"},
					{Icon: "/static/icons/gift.svg", Title: "兑换好礼", Desc: "积分兑换权益", Detail: "积分可在积分商城兑换实物商品、会员卡和平台权益。"},
					{Icon: "/static/icons/headphones.svg", Title: "24h客服", Desc: "一对一专属支持", Detail: "黑金会员可享受一对一专属服务支持。"},
				},
			},
		},
		GrowthTasks: []VIPTask{
			{Title: "完成 1 笔早餐订单", Description: "解锁本周首笔早餐订单成长奖励", RewardText: "+80 成长值", ActionLabel: "去下单"},
			{Title: "本周完成 5 笔订单", Description: "保持活跃消费，累计会员成长值", RewardText: "+200 成长值", ActionLabel: "去点餐"},
			{Title: "连续 3 天下单", Description: "连续活跃可提升等级成长速度", RewardText: "+120 成长值", ActionLabel: "去完成"},
			{Title: "浏览新品推荐", Description: "查看新品专区可获得轻量成长奖励", RewardText: "+20 成长值", ActionLabel: "去看看"},
		},
	}
}

func NormalizeVIPSettings(input VIPSettings) VIPSettings {
	defaults := DefaultVIPSettings()
	settings := defaults

	settings.Enabled = input.Enabled
	settings.PageTitle = normalizeVIPText(input.PageTitle, defaults.PageTitle)
	settings.RulesTitle = normalizeVIPText(input.RulesTitle, defaults.RulesTitle)
	settings.BenefitSectionTitle = normalizeVIPText(input.BenefitSectionTitle, defaults.BenefitSectionTitle)
	settings.BenefitSectionTag = normalizeVIPText(input.BenefitSectionTag, defaults.BenefitSectionTag)
	settings.BenefitSectionTip = normalizeVIPText(input.BenefitSectionTip, defaults.BenefitSectionTip)
	settings.TasksSectionTitle = normalizeVIPText(input.TasksSectionTitle, defaults.TasksSectionTitle)
	settings.TasksSectionTip = normalizeVIPText(input.TasksSectionTip, defaults.TasksSectionTip)
	settings.PointsSectionTitle = normalizeVIPText(input.PointsSectionTitle, defaults.PointsSectionTitle)
	settings.PointsSectionTip = normalizeVIPText(input.PointsSectionTip, defaults.PointsSectionTip)
	settings.ServiceButtonText = normalizeVIPText(input.ServiceButtonText, defaults.ServiceButtonText)
	settings.StandardActionText = normalizeVIPText(input.StandardActionText, defaults.StandardActionText)
	settings.PremiumActionText = normalizeVIPText(input.PremiumActionText, defaults.PremiumActionText)
	settings.PointRules = normalizeVIPRules(input.PointRules)
	settings.Levels = normalizeVIPLevels(input.Levels)
	settings.GrowthTasks = normalizeVIPTasks(input.GrowthTasks)

	if len(settings.PointRules) == 0 {
		settings.PointRules = cloneStringSlice(defaults.PointRules)
	}
	if len(settings.Levels) == 0 {
		settings.Levels = cloneVIPLevels(defaults.Levels)
	}
	if len(settings.GrowthTasks) == 0 {
		settings.GrowthTasks = cloneVIPTasks(defaults.GrowthTasks)
	}

	return settings
}

func ValidateVIPSettings(input VIPSettings) error {
	settings := NormalizeVIPSettings(input)

	if len(settings.PageTitle) > 64 {
		return fmt.Errorf("page_title is too long")
	}
	if len(settings.RulesTitle) > 64 {
		return fmt.Errorf("rules_title is too long")
	}
	if len(settings.BenefitSectionTitle) > 64 {
		return fmt.Errorf("benefit_section_title is too long")
	}
	if len(settings.BenefitSectionTag) > 32 {
		return fmt.Errorf("benefit_section_tag is too long")
	}
	if len(settings.BenefitSectionTip) > 64 {
		return fmt.Errorf("benefit_section_tip is too long")
	}
	if len(settings.TasksSectionTitle) > 64 {
		return fmt.Errorf("tasks_section_title is too long")
	}
	if len(settings.TasksSectionTip) > 120 {
		return fmt.Errorf("tasks_section_tip is too long")
	}
	if len(settings.PointsSectionTitle) > 64 {
		return fmt.Errorf("points_section_title is too long")
	}
	if len(settings.PointsSectionTip) > 120 {
		return fmt.Errorf("points_section_tip is too long")
	}
	if len(settings.ServiceButtonText) > 32 {
		return fmt.Errorf("service_button_text is too long")
	}
	if len(settings.StandardActionText) > 64 {
		return fmt.Errorf("standard_action_text is too long")
	}
	if len(settings.PremiumActionText) > 64 {
		return fmt.Errorf("premium_action_text is too long")
	}
	if len(settings.PointRules) > 20 {
		return fmt.Errorf("point_rules exceeds maximum size")
	}
	for _, rule := range settings.PointRules {
		if len(rule) > 200 {
			return fmt.Errorf("point_rules item is too long")
		}
	}
	if len(settings.Levels) == 0 || len(settings.Levels) > 8 {
		return fmt.Errorf("levels count is invalid")
	}

	prevThreshold := 0
	for _, level := range settings.Levels {
		if len(level.Name) == 0 || len(level.Name) > 32 {
			return fmt.Errorf("level.name is invalid")
		}
		if len(level.StyleClass) > 32 {
			return fmt.Errorf("level.style_class is too long")
		}
		if len(level.Tagline) > 120 {
			return fmt.Errorf("level.tagline is too long")
		}
		if len(level.ThresholdLabel) > 64 {
			return fmt.Errorf("level.threshold_label is too long")
		}
		if level.ThresholdValue <= 0 || level.ThresholdValue < prevThreshold {
			return fmt.Errorf("level.threshold_value is invalid")
		}
		prevThreshold = level.ThresholdValue
		if level.Multiplier < 1 || level.Multiplier > 10 {
			return fmt.Errorf("level.multiplier is invalid")
		}
		if len(level.Benefits) == 0 || len(level.Benefits) > 12 {
			return fmt.Errorf("level.benefits count is invalid")
		}
		for _, benefit := range level.Benefits {
			if len(benefit.Icon) > 256 {
				return fmt.Errorf("level.benefit.icon is too long")
			}
			if len(benefit.Title) == 0 || len(benefit.Title) > 32 {
				return fmt.Errorf("level.benefit.title is invalid")
			}
			if len(benefit.Desc) > 64 {
				return fmt.Errorf("level.benefit.desc is too long")
			}
			if len(benefit.Detail) > 300 {
				return fmt.Errorf("level.benefit.detail is too long")
			}
		}
	}

	if len(settings.GrowthTasks) > 20 {
		return fmt.Errorf("growth_tasks exceeds maximum size")
	}
	for _, task := range settings.GrowthTasks {
		if len(task.Title) == 0 || len(task.Title) > 80 {
			return fmt.Errorf("growth_task.title is invalid")
		}
		if len(task.Description) > 160 {
			return fmt.Errorf("growth_task.description is too long")
		}
		if len(task.RewardText) > 64 {
			return fmt.Errorf("growth_task.reward_text is too long")
		}
		if len(task.ActionLabel) > 32 {
			return fmt.Errorf("growth_task.action_label is too long")
		}
	}

	return nil
}

func BuildPublicVIPSettings(input VIPSettings) PublicVIPSettings {
	settings := NormalizeVIPSettings(input)
	return PublicVIPSettings{
		Enabled:             settings.Enabled,
		PageTitle:           settings.PageTitle,
		RulesTitle:          settings.RulesTitle,
		BenefitSectionTitle: settings.BenefitSectionTitle,
		BenefitSectionTag:   settings.BenefitSectionTag,
		BenefitSectionTip:   settings.BenefitSectionTip,
		TasksSectionTitle:   settings.TasksSectionTitle,
		TasksSectionTip:     settings.TasksSectionTip,
		PointsSectionTitle:  settings.PointsSectionTitle,
		PointsSectionTip:    settings.PointsSectionTip,
		ServiceButtonText:   settings.ServiceButtonText,
		StandardActionText:  settings.StandardActionText,
		PremiumActionText:   settings.PremiumActionText,
		PointRules:          cloneStringSlice(settings.PointRules),
		Levels:              cloneVIPLevels(settings.Levels),
		GrowthTasks:         cloneVIPTasks(settings.GrowthTasks),
	}
}

func normalizeVIPText(value, fallback string) string {
	normalized := normalizeOptionalMultiline(value)
	if normalized == "" {
		return fallback
	}
	return normalized
}

func normalizeVIPRules(items []string) []string {
	return normalizeRuntimeStringList(items)
}

func normalizeVIPBenefits(items []VIPBenefit) []VIPBenefit {
	if len(items) == 0 {
		return []VIPBenefit{}
	}

	result := make([]VIPBenefit, 0, len(items))
	for _, item := range items {
		benefit := VIPBenefit{
			Icon:   normalizeOptionalMultiline(item.Icon),
			Title:  normalizeOptionalMultiline(item.Title),
			Desc:   normalizeOptionalMultiline(item.Desc),
			Detail: normalizeOptionalMultiline(item.Detail),
		}
		if benefit.Title == "" && benefit.Desc == "" && benefit.Detail == "" && benefit.Icon == "" {
			continue
		}
		result = append(result, benefit)
	}
	return result
}

func normalizeVIPLevels(items []VIPLevel) []VIPLevel {
	if len(items) == 0 {
		return []VIPLevel{}
	}

	result := make([]VIPLevel, 0, len(items))
	for _, item := range items {
		level := VIPLevel{
			Name:           normalizeOptionalMultiline(item.Name),
			StyleClass:     normalizeOptionalMultiline(item.StyleClass),
			Tagline:        normalizeOptionalMultiline(item.Tagline),
			ThresholdLabel: normalizeOptionalMultiline(item.ThresholdLabel),
			ThresholdValue: item.ThresholdValue,
			Multiplier:     item.Multiplier,
			IsBlackGold:    item.IsBlackGold,
			Benefits:       normalizeVIPBenefits(item.Benefits),
		}
		if level.Name == "" && level.ThresholdValue == 0 && len(level.Benefits) == 0 {
			continue
		}
		if level.StyleClass == "" {
			level.StyleClass = "level-quality"
		}
		if level.Multiplier <= 0 {
			level.Multiplier = 1
		}
		result = append(result, level)
	}
	return result
}

func normalizeVIPTasks(items []VIPTask) []VIPTask {
	if len(items) == 0 {
		return []VIPTask{}
	}

	result := make([]VIPTask, 0, len(items))
	for _, item := range items {
		task := VIPTask{
			Title:       normalizeOptionalMultiline(item.Title),
			Description: normalizeOptionalMultiline(item.Description),
			RewardText:  normalizeOptionalMultiline(item.RewardText),
			ActionLabel: normalizeOptionalMultiline(item.ActionLabel),
		}
		if task.Title == "" && task.Description == "" && task.RewardText == "" && task.ActionLabel == "" {
			continue
		}
		if task.ActionLabel == "" {
			task.ActionLabel = "去完成"
		}
		result = append(result, task)
	}
	return result
}

func cloneVIPBenefits(items []VIPBenefit) []VIPBenefit {
	if len(items) == 0 {
		return []VIPBenefit{}
	}
	cloned := make([]VIPBenefit, len(items))
	copy(cloned, items)
	return cloned
}

func cloneVIPLevels(items []VIPLevel) []VIPLevel {
	if len(items) == 0 {
		return []VIPLevel{}
	}
	cloned := make([]VIPLevel, 0, len(items))
	for _, item := range items {
		cloned = append(cloned, VIPLevel{
			Name:           item.Name,
			StyleClass:     item.StyleClass,
			Tagline:        item.Tagline,
			ThresholdLabel: item.ThresholdLabel,
			ThresholdValue: item.ThresholdValue,
			Multiplier:     item.Multiplier,
			IsBlackGold:    item.IsBlackGold,
			Benefits:       cloneVIPBenefits(item.Benefits),
		})
	}
	return cloned
}

func cloneVIPTasks(items []VIPTask) []VIPTask {
	if len(items) == 0 {
		return []VIPTask{}
	}
	cloned := make([]VIPTask, len(items))
	copy(cloned, items)
	return cloned
}
