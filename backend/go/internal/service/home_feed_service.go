package service

import (
	"context"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/yuexiang/go-api/internal/repository"
	"gorm.io/gorm"
)

const (
	homePromotionObjectShop    = "shop"
	homePromotionObjectProduct = "product"

	homePromotionStatusDraft    = "draft"
	homePromotionStatusApproved = "approved"
	homePromotionStatusActive   = "active"
	homePromotionStatusRejected = "rejected"
	homePromotionStatusPaused   = "paused"
	homePromotionStatusEnded    = "ended"

	homePromotionLabelDefault = "推广"
)

type HomeFeedQuery struct {
	City             string
	BusinessCategory string
}

type HomePromotionListQuery struct {
	Status     string
	ObjectType string
	City       string
	Category   string
}

type HomePromotionPayload struct {
	ObjectType       string `json:"objectType"`
	TargetID         string `json:"targetId"`
	SlotPosition     int    `json:"slotPosition"`
	City             string `json:"city"`
	BusinessCategory string `json:"businessCategory"`
	Status           string `json:"status"`
	IsPositionLocked bool   `json:"isPositionLocked"`
	PromoteLabel     string `json:"promoteLabel"`
	ContractNo       string `json:"contractNo"`
	ServiceRecordNo  string `json:"serviceRecordNo"`
	Remark           string `json:"remark"`
	StartAt          string `json:"startAt"`
	EndAt            string `json:"endAt"`
}

type HomeFeedService struct {
	db           *gorm.DB
	shopRepo     repository.ShopRepository
	featuredRepo repository.FeaturedProductRepository
}

func NewHomeFeedService(db *gorm.DB, shopRepo repository.ShopRepository, featuredRepo repository.FeaturedProductRepository) *HomeFeedService {
	return &HomeFeedService{
		db:           db,
		shopRepo:     shopRepo,
		featuredRepo: featuredRepo,
	}
}

func (s *HomeFeedService) GetHomeFeed(ctx context.Context, query HomeFeedQuery) (map[string]interface{}, error) {
	shops, err := s.buildBaseShops(ctx, strings.TrimSpace(query.BusinessCategory))
	if err != nil {
		return nil, err
	}

	products, err := s.buildBaseProducts(ctx)
	if err != nil {
		return nil, err
	}

	campaigns, err := s.listEffectiveCampaigns(ctx, query)
	if err != nil {
		return nil, err
	}

	for _, campaign := range campaigns {
		switch campaign.ObjectType {
		case homePromotionObjectShop:
			item, itemErr := s.loadShopPromotionItem(ctx, campaign)
			if itemErr != nil || item == nil {
				continue
			}
			shops = upsertHomeFeedItem(shops, item, campaign.SlotPosition, homePromotionPositionSource(campaign))
		case homePromotionObjectProduct:
			item, itemErr := s.loadProductPromotionItem(ctx, campaign)
			if itemErr != nil || item == nil {
				continue
			}
			products = upsertHomeFeedItem(products, item, campaign.SlotPosition, homePromotionPositionSource(campaign))
		}
	}

	return map[string]interface{}{
		"products":  products,
		"shops":     shops,
		"campaigns": len(campaigns),
	}, nil
}

func (s *HomeFeedService) GetHomeSlots(ctx context.Context, query HomeFeedQuery) (map[string]interface{}, error) {
	feed, err := s.GetHomeFeed(ctx, query)
	if err != nil {
		return nil, err
	}
	feed["query"] = map[string]interface{}{
		"city":             strings.TrimSpace(query.City),
		"businessCategory": strings.TrimSpace(query.BusinessCategory),
	}
	return feed, nil
}

func (s *HomeFeedService) ListCampaigns(ctx context.Context, query HomePromotionListQuery) (map[string]interface{}, error) {
	var campaigns []repository.HomePromotionCampaign

	dbQuery := s.db.WithContext(ctx).Model(&repository.HomePromotionCampaign{})
	if status := normalizeHomePromotionStatus(query.Status, ""); status != "" {
		dbQuery = dbQuery.Where("status = ?", status)
	}
	if objectType := normalizeHomePromotionObjectType(query.ObjectType); objectType != "" {
		dbQuery = dbQuery.Where("object_type = ?", objectType)
	}
	if city := strings.TrimSpace(query.City); city != "" {
		dbQuery = dbQuery.Where("city = ?", city)
	}
	if category := strings.TrimSpace(query.Category); category != "" {
		dbQuery = dbQuery.Where("business_category = ?", category)
	}

	if err := dbQuery.Order("updated_at DESC").Find(&campaigns).Error; err != nil {
		return nil, err
	}

	items := make([]map[string]interface{}, 0, len(campaigns))
	for _, campaign := range campaigns {
		item := homePromotionCampaignToMap(campaign)
		targetName, err := s.lookupCampaignTargetName(ctx, campaign)
		if err == nil {
			item["targetName"] = targetName
		}
		item["effectiveStatus"] = effectiveCampaignStatus(campaign, time.Now())
		items = append(items, item)
	}

	return map[string]interface{}{
		"campaigns": items,
		"total":     len(items),
	}, nil
}

func (s *HomeFeedService) CreateCampaign(ctx context.Context, payload HomePromotionPayload) (*repository.HomePromotionCampaign, error) {
	campaign, err := s.buildCampaignModel(ctx, payload, nil)
	if err != nil {
		return nil, err
	}
	if err := s.db.WithContext(ctx).Create(campaign).Error; err != nil {
		return nil, err
	}
	return campaign, nil
}

func (s *HomeFeedService) UpdateCampaign(ctx context.Context, id string, payload HomePromotionPayload) (*repository.HomePromotionCampaign, error) {
	resolvedID, err := resolveEntityID(ctx, s.db, "home_promotion_campaigns", id)
	if err != nil {
		return nil, err
	}

	var current repository.HomePromotionCampaign
	if err := s.db.WithContext(ctx).Where("id = ?", resolvedID).First(&current).Error; err != nil {
		return nil, err
	}

	campaign, err := s.buildCampaignModel(ctx, payload, &current)
	if err != nil {
		return nil, err
	}
	campaign.ID = current.ID
	campaign.UnifiedIdentity = current.UnifiedIdentity
	campaign.CreatedAt = current.CreatedAt

	if err := s.db.WithContext(ctx).Model(&repository.HomePromotionCampaign{}).Where("id = ?", current.ID).Updates(campaign).Error; err != nil {
		return nil, err
	}

	if err := s.db.WithContext(ctx).Where("id = ?", current.ID).First(&current).Error; err != nil {
		return nil, err
	}
	return &current, nil
}

func (s *HomeFeedService) ChangeCampaignStatus(ctx context.Context, id string, action string) (*repository.HomePromotionCampaign, error) {
	resolvedID, err := resolveEntityID(ctx, s.db, "home_promotion_campaigns", id)
	if err != nil {
		return nil, err
	}

	var campaign repository.HomePromotionCampaign
	if err := s.db.WithContext(ctx).Where("id = ?", resolvedID).First(&campaign).Error; err != nil {
		return nil, err
	}

	nextStatus := mapHomePromotionActionToStatus(action, campaign.Status)
	if nextStatus == "" {
		return nil, fmt.Errorf("unsupported campaign action: %s", action)
	}

	updates := map[string]interface{}{
		"status": nextStatus,
	}
	if nextStatus == homePromotionStatusApproved || nextStatus == homePromotionStatusActive {
		now := time.Now()
		updates["approved_at"] = &now
		if adminID := authContextInt64(ctx, "admin_id"); adminID > 0 {
			updates["approved_by_admin_id"] = uint(adminID)
		}
	}

	if err := s.db.WithContext(ctx).Model(&repository.HomePromotionCampaign{}).Where("id = ?", campaign.ID).Updates(updates).Error; err != nil {
		return nil, err
	}
	if err := s.db.WithContext(ctx).Where("id = ?", campaign.ID).First(&campaign).Error; err != nil {
		return nil, err
	}
	return &campaign, nil
}

func (s *HomeFeedService) UpsertLockedSlot(ctx context.Context, payload HomePromotionPayload) (*repository.HomePromotionCampaign, error) {
	payload.IsPositionLocked = true
	if strings.TrimSpace(payload.Status) == "" {
		payload.Status = homePromotionStatusApproved
	}

	objectType := normalizeHomePromotionObjectType(payload.ObjectType)
	if objectType == "" {
		return nil, fmt.Errorf("objectType is required")
	}

	targetLegacyID, targetPublicID, err := s.resolveCampaignTarget(ctx, objectType, payload.TargetID)
	if err != nil {
		return nil, err
	}

	var existing repository.HomePromotionCampaign
	err = s.db.WithContext(ctx).
		Where("object_type = ? AND target_legacy_id = ? AND city = ? AND business_category = ? AND is_position_locked = ?",
			objectType,
			targetLegacyID,
			strings.TrimSpace(payload.City),
			strings.TrimSpace(payload.BusinessCategory),
			true,
		).
		First(&existing).Error
	if err != nil && err != gorm.ErrRecordNotFound {
		return nil, err
	}

	if err == gorm.ErrRecordNotFound {
		return s.CreateCampaign(ctx, payload)
	}

	payload.TargetID = targetPublicID
	return s.UpdateCampaign(ctx, existing.UID, payload)
}

func (s *HomeFeedService) buildCampaignModel(ctx context.Context, payload HomePromotionPayload, current *repository.HomePromotionCampaign) (*repository.HomePromotionCampaign, error) {
	objectType := normalizeHomeFeedString(payload.ObjectType, currentObjectType(current))
	if objectType == "" {
		return nil, fmt.Errorf("objectType is required")
	}

	targetID := strings.TrimSpace(normalizeHomeFeedString(payload.TargetID, currentTargetID(current)))
	if targetID == "" {
		return nil, fmt.Errorf("targetId is required")
	}

	targetLegacyID, targetPublicID, err := s.resolveCampaignTarget(ctx, objectType, targetID)
	if err != nil {
		return nil, err
	}

	slotPosition := payload.SlotPosition
	if slotPosition <= 0 && current != nil {
		slotPosition = current.SlotPosition
	}
	if slotPosition <= 0 {
		return nil, fmt.Errorf("slotPosition must be greater than 0")
	}

	startAt, err := parseCampaignTime(normalizeHomeFeedString(payload.StartAt, currentTime(current, true)))
	if err != nil {
		return nil, fmt.Errorf("invalid startAt: %w", err)
	}
	endAt, err := parseCampaignTime(normalizeHomeFeedString(payload.EndAt, currentTime(current, false)))
	if err != nil {
		return nil, fmt.Errorf("invalid endAt: %w", err)
	}
	if !endAt.After(startAt) {
		return nil, fmt.Errorf("endAt must be later than startAt")
	}

	status := normalizeHomePromotionStatus(payload.Status, currentStatus(current))
	if status == "" {
		return nil, fmt.Errorf("status is invalid")
	}
	label := strings.TrimSpace(payload.PromoteLabel)
	if label == "" {
		label = homePromotionLabelDefault
	}

	campaign := &repository.HomePromotionCampaign{
		ObjectType:       objectType,
		TargetLegacyID:   targetLegacyID,
		TargetPublicID:   targetPublicID,
		SlotPosition:     slotPosition,
		City:             strings.TrimSpace(normalizeHomeFeedString(payload.City, currentString(current, "city"))),
		BusinessCategory: strings.TrimSpace(normalizeHomeFeedString(payload.BusinessCategory, currentString(current, "businessCategory"))),
		Status:           status,
		IsPositionLocked: payload.IsPositionLocked || currentLocked(current),
		PromoteLabel:     label,
		ContractNo:       strings.TrimSpace(normalizeHomeFeedString(payload.ContractNo, currentString(current, "contractNo"))),
		ServiceRecordNo:  strings.TrimSpace(normalizeHomeFeedString(payload.ServiceRecordNo, currentString(current, "serviceRecordNo"))),
		Remark:           strings.TrimSpace(normalizeHomeFeedString(payload.Remark, currentString(current, "remark"))),
		StartAt:          startAt,
		EndAt:            endAt,
	}

	if current != nil {
		campaign.ApprovedAt = current.ApprovedAt
		campaign.ApprovedByAdminID = current.ApprovedByAdminID
	}
	if status == homePromotionStatusApproved || status == homePromotionStatusActive {
		now := time.Now()
		if campaign.ApprovedAt == nil {
			campaign.ApprovedAt = &now
		}
		if adminID := authContextInt64(ctx, "admin_id"); adminID > 0 {
			value := uint(adminID)
			campaign.ApprovedByAdminID = &value
		}
	}

	return campaign, nil
}

func (s *HomeFeedService) resolveCampaignTarget(ctx context.Context, objectType, targetID string) (uint, string, error) {
	switch objectType {
	case homePromotionObjectShop:
		resolvedID, err := resolveEntityID(ctx, s.db, "shops", targetID)
		if err != nil {
			return 0, "", err
		}
		var shop repository.Shop
		if err := s.db.WithContext(ctx).Where("id = ?", resolvedID).First(&shop).Error; err != nil {
			return 0, "", err
		}
		return shop.ID, normalizeHomeFeedString(shop.UID, strconv.FormatUint(uint64(shop.ID), 10)), nil
	case homePromotionObjectProduct:
		resolvedID, err := resolveEntityID(ctx, s.db, "products", targetID)
		if err != nil {
			return 0, "", err
		}
		var product repository.Product
		if err := s.db.WithContext(ctx).Where("id = ?", resolvedID).First(&product).Error; err != nil {
			return 0, "", err
		}
		return product.ID, normalizeHomeFeedString(product.UID, strconv.FormatUint(uint64(product.ID), 10)), nil
	default:
		return 0, "", fmt.Errorf("unsupported objectType: %s", objectType)
	}
}

func (s *HomeFeedService) buildBaseShops(ctx context.Context, category string) ([]map[string]interface{}, error) {
	result, err := s.shopRepo.GetShops(ctx, category, false)
	if err != nil {
		return nil, err
	}

	shops, ok := result.([]map[string]interface{})
	if ok {
		for index := range shops {
			shops[index]["isPromoted"] = false
			shops[index]["promoteLabel"] = ""
			shops[index]["positionSource"] = "organic"
		}
		return shops, nil
	}

	return []map[string]interface{}{}, nil
}

func (s *HomeFeedService) buildBaseProducts(ctx context.Context) ([]map[string]interface{}, error) {
	result, err := s.featuredRepo.GetFeaturedProducts(ctx)
	if err != nil {
		return nil, err
	}

	rawItems, ok := result.([]map[string]interface{})
	if !ok {
		return []map[string]interface{}{}, nil
	}

	items := make([]map[string]interface{}, 0, len(rawItems))
	for _, item := range rawItems {
		productLegacyID := parseUintAny(item["productId"])
		var product repository.Product
		if productLegacyID > 0 {
			if err := s.db.WithContext(ctx).Where("id = ?", productLegacyID).First(&product).Error; err == nil {
				item["id"] = normalizeHomeFeedString(product.UID, strconv.FormatUint(uint64(product.ID), 10))
				item["legacyId"] = product.ID
				item["shopId"] = product.ShopID
				item["name"] = normalizeHomeFeedString(stringValue(item["productName"]), product.Name)
				item["image"] = normalizeHomeFeedString(stringValue(item["productImage"]), product.Image)
			}
		}
		item["isPromoted"] = false
		item["promoteLabel"] = ""
		item["positionSource"] = "featured"
		items = append(items, item)
	}
	return items, nil
}

func (s *HomeFeedService) listEffectiveCampaigns(ctx context.Context, query HomeFeedQuery) ([]repository.HomePromotionCampaign, error) {
	var campaigns []repository.HomePromotionCampaign
	now := time.Now()

	dbQuery := s.db.WithContext(ctx).Model(&repository.HomePromotionCampaign{}).
		Where("status IN ?", []string{homePromotionStatusApproved, homePromotionStatusActive}).
		Where("start_at <= ? AND end_at >= ?", now, now)

	if city := strings.TrimSpace(query.City); city != "" {
		dbQuery = dbQuery.Where("(city = '' OR city IS NULL OR city = ?)", city)
	}
	if category := strings.TrimSpace(query.BusinessCategory); category != "" {
		dbQuery = dbQuery.Where("(business_category = '' OR business_category IS NULL OR business_category = ?)", category)
	}

	err := dbQuery.
		Order("is_position_locked DESC").
		Order("slot_position ASC").
		Order("updated_at DESC").
		Find(&campaigns).Error
	if err != nil {
		return nil, err
	}

	return campaigns, nil
}

func (s *HomeFeedService) loadShopPromotionItem(ctx context.Context, campaign repository.HomePromotionCampaign) (map[string]interface{}, error) {
	var shop repository.Shop
	if err := s.db.WithContext(ctx).Where("id = ? AND is_active = ?", campaign.TargetLegacyID, true).First(&shop).Error; err != nil {
		return nil, err
	}

	return map[string]interface{}{
		"id":                     normalizeHomeFeedString(shop.UID, strconv.FormatUint(uint64(shop.ID), 10)),
		"legacyId":               shop.ID,
		"merchant_id":            shop.MerchantID,
		"name":                   shop.Name,
		"rating":                 shop.Rating,
		"monthlySales":           shop.MonthlySales,
		"minPrice":               shop.MinPrice,
		"deliveryPrice":          shop.DeliveryPrice,
		"deliveryTime":           shop.DeliveryTime,
		"distance":               shop.Distance,
		"isTodayRecommended":     shop.IsTodayRecommended,
		"todayRecommendPosition": shop.TodayRecommendPosition,
		"isPromoted":             true,
		"promoteLabel":           normalizePromotionLabel(campaign.PromoteLabel),
		"campaignId":             normalizeHomeFeedString(campaign.UID, strconv.FormatUint(uint64(campaign.ID), 10)),
	}, nil
}

func (s *HomeFeedService) loadProductPromotionItem(ctx context.Context, campaign repository.HomePromotionCampaign) (map[string]interface{}, error) {
	var product repository.Product
	if err := s.db.WithContext(ctx).Where("id = ? AND is_active = ?", campaign.TargetLegacyID, true).First(&product).Error; err != nil {
		return nil, err
	}

	var shopName string
	if product.ShopID > 0 {
		var shop repository.Shop
		if err := s.db.WithContext(ctx).Select("name").Where("id = ?", product.ShopID).First(&shop).Error; err == nil {
			shopName = shop.Name
		}
	}

	return map[string]interface{}{
		"id":            normalizeHomeFeedString(product.UID, strconv.FormatUint(uint64(product.ID), 10)),
		"legacyId":      product.ID,
		"productId":     product.ID,
		"shopId":        product.ShopID,
		"name":          product.Name,
		"productName":   product.Name,
		"shopName":      shopName,
		"price":         product.Price,
		"originalPrice": product.OriginalPrice,
		"image":         product.Image,
		"productImage":  product.Image,
		"monthlySales":  product.MonthlySales,
		"rating":        product.Rating,
		"isPromoted":    true,
		"promoteLabel":  normalizePromotionLabel(campaign.PromoteLabel),
		"campaignId":    normalizeHomeFeedString(campaign.UID, strconv.FormatUint(uint64(campaign.ID), 10)),
	}, nil
}

func (s *HomeFeedService) lookupCampaignTargetName(ctx context.Context, campaign repository.HomePromotionCampaign) (string, error) {
	switch campaign.ObjectType {
	case homePromotionObjectShop:
		var shop repository.Shop
		if err := s.db.WithContext(ctx).Select("name").Where("id = ?", campaign.TargetLegacyID).First(&shop).Error; err != nil {
			return "", err
		}
		return shop.Name, nil
	case homePromotionObjectProduct:
		var product repository.Product
		if err := s.db.WithContext(ctx).Select("name").Where("id = ?", campaign.TargetLegacyID).First(&product).Error; err != nil {
			return "", err
		}
		return product.Name, nil
	default:
		return "", nil
	}
}

func upsertHomeFeedItem(items []map[string]interface{}, item map[string]interface{}, slotPosition int, positionSource string) []map[string]interface{} {
	next := make([]map[string]interface{}, 0, len(items)+1)
	targetPublicID := stringValue(item["id"])
	targetLegacyID := parseUintAny(item["legacyId"])

	for _, existing := range items {
		if sameHomeFeedEntity(existing, targetPublicID, targetLegacyID) {
			continue
		}
		next = append(next, existing)
	}

	item["isPromoted"] = true
	item["promoteLabel"] = normalizePromotionLabel(stringValue(item["promoteLabel"]))
	item["positionSource"] = positionSource

	insertAt := slotPosition - 1
	if insertAt < 0 {
		insertAt = 0
	}
	if insertAt > len(next) {
		insertAt = len(next)
	}

	next = append(next, nil)
	copy(next[insertAt+1:], next[insertAt:])
	next[insertAt] = item
	return next
}

func sameHomeFeedEntity(item map[string]interface{}, publicID string, legacyID uint) bool {
	if publicID != "" && strings.TrimSpace(stringValue(item["id"])) == publicID {
		return true
	}
	if legacyID > 0 && parseUintAny(item["legacyId"]) == legacyID {
		return true
	}
	if legacyID > 0 && parseUintAny(item["productId"]) == legacyID {
		return true
	}
	return false
}

func homePromotionCampaignToMap(campaign repository.HomePromotionCampaign) map[string]interface{} {
	return map[string]interface{}{
		"id":                normalizeHomeFeedString(campaign.UID, strconv.FormatUint(uint64(campaign.ID), 10)),
		"legacyId":          campaign.ID,
		"objectType":        campaign.ObjectType,
		"targetId":          campaign.TargetPublicID,
		"targetLegacyId":    campaign.TargetLegacyID,
		"slotPosition":      campaign.SlotPosition,
		"city":              campaign.City,
		"businessCategory":  campaign.BusinessCategory,
		"status":            campaign.Status,
		"isPositionLocked":  campaign.IsPositionLocked,
		"promoteLabel":      normalizePromotionLabel(campaign.PromoteLabel),
		"contractNo":        campaign.ContractNo,
		"serviceRecordNo":   campaign.ServiceRecordNo,
		"remark":            campaign.Remark,
		"startAt":           campaign.StartAt,
		"endAt":             campaign.EndAt,
		"approvedAt":        campaign.ApprovedAt,
		"approvedByAdminId": campaign.ApprovedByAdminID,
		"created_at":        campaign.CreatedAt,
		"updated_at":        campaign.UpdatedAt,
	}
}

func parseCampaignTime(raw string) (time.Time, error) {
	text := strings.TrimSpace(raw)
	if text == "" {
		return time.Time{}, fmt.Errorf("time is required")
	}

	layouts := []string{
		time.RFC3339,
		"2006-01-02 15:04:05",
		"2006-01-02 15:04",
		"2006-01-02",
	}
	for _, layout := range layouts {
		if parsed, err := time.ParseInLocation(layout, text, time.Local); err == nil {
			return parsed, nil
		}
	}
	return time.Time{}, fmt.Errorf("unsupported time format")
}

func normalizeHomePromotionObjectType(value string) string {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case homePromotionObjectShop:
		return homePromotionObjectShop
	case homePromotionObjectProduct:
		return homePromotionObjectProduct
	default:
		return ""
	}
}

func normalizeHomePromotionStatus(value string, fallback string) string {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case homePromotionStatusDraft:
		return homePromotionStatusDraft
	case homePromotionStatusApproved:
		return homePromotionStatusApproved
	case homePromotionStatusActive:
		return homePromotionStatusActive
	case homePromotionStatusRejected:
		return homePromotionStatusRejected
	case homePromotionStatusPaused:
		return homePromotionStatusPaused
	case homePromotionStatusEnded:
		return homePromotionStatusEnded
	case "":
		fallback = strings.ToLower(strings.TrimSpace(fallback))
		if fallback == "" {
			return homePromotionStatusDraft
		}
		return normalizeHomePromotionStatus(fallback, "")
	default:
		return ""
	}
}

func normalizePromotionLabel(label string) string {
	label = strings.TrimSpace(label)
	if label == "" {
		return homePromotionLabelDefault
	}
	return label
}

func mapHomePromotionActionToStatus(action string, current string) string {
	switch strings.ToLower(strings.TrimSpace(action)) {
	case "approve":
		return homePromotionStatusApproved
	case "reject":
		return homePromotionStatusRejected
	case "pause":
		return homePromotionStatusPaused
	case "resume":
		if current == homePromotionStatusEnded {
			return homePromotionStatusEnded
		}
		return homePromotionStatusApproved
	default:
		return ""
	}
}

func homePromotionPositionSource(campaign repository.HomePromotionCampaign) string {
	if campaign.IsPositionLocked {
		return "manual_locked"
	}
	return "paid_campaign"
}

func effectiveCampaignStatus(campaign repository.HomePromotionCampaign, now time.Time) string {
	if campaign.Status == homePromotionStatusApproved || campaign.Status == homePromotionStatusActive {
		if now.Before(campaign.StartAt) {
			return "scheduled"
		}
		if now.After(campaign.EndAt) {
			return homePromotionStatusEnded
		}
		return homePromotionStatusActive
	}
	return campaign.Status
}

func stringValue(value interface{}) string {
	return strings.TrimSpace(fmt.Sprintf("%v", value))
}

func parseUintAny(value interface{}) uint {
	switch v := value.(type) {
	case uint:
		return v
	case uint64:
		return uint(v)
	case int:
		if v > 0 {
			return uint(v)
		}
	case int64:
		if v > 0 {
			return uint(v)
		}
	case float64:
		if v > 0 {
			return uint(v)
		}
	case string:
		parsed, err := strconv.ParseUint(strings.TrimSpace(v), 10, 64)
		if err == nil {
			return uint(parsed)
		}
	}
	return 0
}

func normalizeHomeFeedString(values ...string) string {
	for _, value := range values {
		value = strings.TrimSpace(value)
		if value != "" {
			return value
		}
	}
	return ""
}

func currentObjectType(campaign *repository.HomePromotionCampaign) string {
	if campaign == nil {
		return ""
	}
	return campaign.ObjectType
}

func currentTargetID(campaign *repository.HomePromotionCampaign) string {
	if campaign == nil {
		return ""
	}
	return campaign.TargetPublicID
}

func currentStatus(campaign *repository.HomePromotionCampaign) string {
	if campaign == nil {
		return homePromotionStatusDraft
	}
	return campaign.Status
}

func currentLocked(campaign *repository.HomePromotionCampaign) bool {
	return campaign != nil && campaign.IsPositionLocked
}

func currentTime(campaign *repository.HomePromotionCampaign, start bool) string {
	if campaign == nil {
		return ""
	}
	if start {
		return campaign.StartAt.Format(time.RFC3339)
	}
	return campaign.EndAt.Format(time.RFC3339)
}

func currentString(campaign *repository.HomePromotionCampaign, field string) string {
	if campaign == nil {
		return ""
	}
	switch field {
	case "city":
		return campaign.City
	case "businessCategory":
		return campaign.BusinessCategory
	case "contractNo":
		return campaign.ContractNo
	case "serviceRecordNo":
		return campaign.ServiceRecordNo
	case "remark":
		return campaign.Remark
	default:
		return ""
	}
}
