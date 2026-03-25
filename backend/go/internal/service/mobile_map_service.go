package service

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"github.com/yuexiang/go-api/internal/config"
)

const (
	defaultProxyMapSearchURL   = "http://127.0.0.1:8082/search"
	defaultProxyMapReverseURL  = "http://127.0.0.1:8082/reverse"
	defaultTiandituSearchURL   = "https://api.tianditu.gov.cn/search"
	defaultTiandituReverseURL  = "https://api.tianditu.gov.cn/geocoder"
	defaultTiandituMapBound    = "73.0,3.0,136.0,54.0"
	defaultTiandituSearchLevel = 11
	defaultTiandituNearbyLevel = 15
	defaultTiandituRadiusMeter = 3000
)

type MobileMapService struct {
	defaultSearchURL  string
	defaultReverseURL string
	defaultTimeout    time.Duration
	admin             *AdminService
}

func NewMobileMapService(cfg *config.Config, admin *AdminService) *MobileMapService {
	searchURL := strings.TrimSpace(cfg.Map.SearchURL)
	if searchURL == "" {
		searchURL = defaultProxyMapSearchURL
	}
	reverseURL := strings.TrimSpace(cfg.Map.ReverseURL)
	if reverseURL == "" {
		reverseURL = defaultProxyMapReverseURL
	}
	timeout := cfg.Map.Timeout
	if timeout <= 0 {
		timeout = DefaultMapTimeoutSec * time.Second
	}

	return &MobileMapService{
		defaultSearchURL:  searchURL,
		defaultReverseURL: reverseURL,
		defaultTimeout:    timeout,
		admin:             admin,
	}
}

type MapSearchInput struct {
	Keyword  string
	City     string
	Lat      string
	Lng      string
	Page     int
	PageSize int
}

type MapReverseInput struct {
	Lat string
	Lng string
}

func (s *MobileMapService) Search(ctx context.Context, input MapSearchInput) (map[string]interface{}, error) {
	return s.searchWithSettings(ctx, input, s.resolveSettings(ctx))
}

func (s *MobileMapService) ReverseGeocode(ctx context.Context, input MapReverseInput) (map[string]interface{}, error) {
	return s.reverseWithSettings(ctx, input, s.resolveSettings(ctx))
}

func (s *MobileMapService) searchWithSettings(ctx context.Context, input MapSearchInput, settings ServiceSettings) (map[string]interface{}, error) {
	keyword := strings.TrimSpace(input.Keyword)
	if keyword == "" {
		return nil, fmt.Errorf("keyword is required")
	}

	page := input.Page
	if page < 1 {
		page = 1
	}
	pageSize := input.PageSize
	if pageSize <= 0 {
		pageSize = 20
	}
	if pageSize > 50 {
		pageSize = 50
	}

	switch normalizeMapProvider(settings.MapProvider) {
	case "tianditu":
		return s.searchViaTianditu(ctx, input, settings, page, pageSize)
	default:
		return s.searchViaProxy(ctx, input, settings, page, pageSize)
	}
}

func (s *MobileMapService) reverseWithSettings(ctx context.Context, input MapReverseInput, settings ServiceSettings) (map[string]interface{}, error) {
	lat := strings.TrimSpace(input.Lat)
	lng := strings.TrimSpace(input.Lng)
	if lat == "" || lng == "" {
		return nil, fmt.Errorf("lat and lng are required")
	}

	switch normalizeMapProvider(settings.MapProvider) {
	case "tianditu":
		return s.reverseViaTianditu(ctx, input, settings)
	default:
		return s.reverseViaProxy(ctx, input, settings)
	}
}

func (s *MobileMapService) searchViaProxy(ctx context.Context, input MapSearchInput, settings ServiceSettings, page int, pageSize int) (map[string]interface{}, error) {
	queryText := strings.TrimSpace(input.Keyword)
	if city := strings.TrimSpace(input.City); city != "" {
		queryText = strings.TrimSpace(city + " " + queryText)
	}

	target, err := url.Parse(s.resolveSearchEndpoint(settings))
	if err != nil {
		return nil, err
	}
	q := target.Query()
	q.Set("q", queryText)
	q.Set("format", "jsonv2")
	q.Set("addressdetails", "1")
	q.Set("limit", strconv.Itoa(pageSize))
	q.Set("countrycodes", "cn")
	target.RawQuery = q.Encode()

	var raw []map[string]interface{}
	if err := s.doJSON(ctx, settings, http.MethodGet, target.String(), &raw); err != nil {
		return nil, err
	}

	list := make([]map[string]interface{}, 0, len(raw))
	for _, item := range raw {
		lat, _ := strconv.ParseFloat(strings.TrimSpace(fmt.Sprintf("%v", item["lat"])), 64)
		lng, _ := strconv.ParseFloat(strings.TrimSpace(fmt.Sprintf("%v", item["lon"])), 64)
		list = append(list, map[string]interface{}{
			"id":          fmt.Sprintf("%v", item["place_id"]),
			"name":        strings.TrimSpace(fmt.Sprintf("%v", item["name"])),
			"displayName": strings.TrimSpace(fmt.Sprintf("%v", item["display_name"])),
			"address":     item["address"],
			"latitude":    lat,
			"longitude":   lng,
		})
	}

	return map[string]interface{}{
		"list":     list,
		"page":     page,
		"pageSize": pageSize,
		"total":    len(list),
	}, nil
}

func (s *MobileMapService) reverseViaProxy(ctx context.Context, input MapReverseInput, settings ServiceSettings) (map[string]interface{}, error) {
	target, err := url.Parse(s.resolveReverseEndpoint(settings))
	if err != nil {
		return nil, err
	}
	q := target.Query()
	q.Set("lat", strings.TrimSpace(input.Lat))
	q.Set("lon", strings.TrimSpace(input.Lng))
	q.Set("format", "jsonv2")
	q.Set("addressdetails", "1")
	target.RawQuery = q.Encode()

	var raw map[string]interface{}
	if err := s.doJSON(ctx, settings, http.MethodGet, target.String(), &raw); err != nil {
		return nil, err
	}

	latF, _ := strconv.ParseFloat(strings.TrimSpace(input.Lat), 64)
	lngF, _ := strconv.ParseFloat(strings.TrimSpace(input.Lng), 64)
	return map[string]interface{}{
		"displayName": strings.TrimSpace(fmt.Sprintf("%v", raw["display_name"])),
		"address":     raw["address"],
		"latitude":    latF,
		"longitude":   lngF,
	}, nil
}

func (s *MobileMapService) searchViaTianditu(ctx context.Context, input MapSearchInput, settings ServiceSettings, page int, pageSize int) (map[string]interface{}, error) {
	if strings.TrimSpace(settings.MapAPIKey) == "" {
		return nil, fmt.Errorf("map api key is required for tianditu provider")
	}

	target, err := url.Parse(s.resolveSearchEndpoint(settings))
	if err != nil {
		return nil, err
	}

	postStr, err := buildTiandituSearchPostStr(input, page, pageSize)
	if err != nil {
		return nil, err
	}

	q := target.Query()
	q.Set("postStr", postStr)
	q.Set("type", "query")
	q.Set("tk", strings.TrimSpace(settings.MapAPIKey))
	target.RawQuery = q.Encode()

	var raw map[string]interface{}
	if err := s.doJSON(ctx, settings, http.MethodGet, target.String(), &raw); err != nil {
		return nil, err
	}

	list := parseTiandituSearchList(raw)
	total := parseAnyInt(raw["count"])
	if total < len(list) {
		total = len(list)
	}

	return map[string]interface{}{
		"list":     list,
		"page":     page,
		"pageSize": pageSize,
		"total":    total,
	}, nil
}

func (s *MobileMapService) reverseViaTianditu(ctx context.Context, input MapReverseInput, settings ServiceSettings) (map[string]interface{}, error) {
	if strings.TrimSpace(settings.MapAPIKey) == "" {
		return nil, fmt.Errorf("map api key is required for tianditu provider")
	}

	target, err := url.Parse(s.resolveReverseEndpoint(settings))
	if err != nil {
		return nil, err
	}

	postStr, err := buildTiandituReversePostStr(input)
	if err != nil {
		return nil, err
	}

	q := target.Query()
	q.Set("postStr", postStr)
	q.Set("type", "geocode")
	q.Set("tk", strings.TrimSpace(settings.MapAPIKey))
	target.RawQuery = q.Encode()

	var raw map[string]interface{}
	if err := s.doJSON(ctx, settings, http.MethodGet, target.String(), &raw); err != nil {
		return nil, err
	}

	result, _ := raw["result"].(map[string]interface{})
	addressComponent, _ := result["addressComponent"].(map[string]interface{})
	location, _ := result["location"].(map[string]interface{})

	lat := strings.TrimSpace(input.Lat)
	lng := strings.TrimSpace(input.Lng)
	if parsed := strings.TrimSpace(fmt.Sprintf("%v", location["lat"])); parsed != "" {
		lat = parsed
	}
	if parsed := strings.TrimSpace(fmt.Sprintf("%v", location["lon"])); parsed != "" {
		lng = parsed
	}
	latF, _ := strconv.ParseFloat(lat, 64)
	lngF, _ := strconv.ParseFloat(lng, 64)

	displayName := strings.TrimSpace(fmt.Sprintf("%v", result["formatted_address"]))
	if displayName == "" {
		displayName = buildTiandituAddressText(addressComponent)
	}

	return map[string]interface{}{
		"displayName": displayName,
		"address":     addressComponent,
		"latitude":    latF,
		"longitude":   lngF,
	}, nil
}

func (s *MobileMapService) resolveSettings(ctx context.Context) ServiceSettings {
	settings := DefaultServiceSettings()
	settings.MapSearchURL = s.defaultSearchURL
	settings.MapReverseURL = s.defaultReverseURL
	settings.MapTimeoutSec = int(s.defaultTimeout / time.Second)
	if settings.MapTimeoutSec <= 0 {
		settings.MapTimeoutSec = DefaultMapTimeoutSec
	}

	if s.admin == nil {
		return settings
	}

	stored := DefaultServiceSettings()
	if err := s.admin.GetSetting(ctx, "service_settings", &stored); err != nil {
		return settings
	}
	stored = NormalizeServiceSettings(stored)
	if stored.MapProvider != "" {
		settings.MapProvider = stored.MapProvider
	}
	if stored.MapSearchURL != "" {
		settings.MapSearchURL = stored.MapSearchURL
	}
	if stored.MapReverseURL != "" {
		settings.MapReverseURL = stored.MapReverseURL
	}
	if stored.MapAPIKey != "" {
		settings.MapAPIKey = stored.MapAPIKey
	}
	if stored.MapTileTemplate != "" {
		settings.MapTileTemplate = stored.MapTileTemplate
	}
	if stored.MapTimeoutSec > 0 {
		settings.MapTimeoutSec = stored.MapTimeoutSec
	}
	return settings
}

func (s *MobileMapService) resolveSearchEndpoint(settings ServiceSettings) string {
	explicit := strings.TrimSpace(settings.MapSearchURL)
	if explicit != "" {
		return explicit
	}
	if normalizeMapProvider(settings.MapProvider) == "tianditu" {
		return defaultTiandituSearchURL
	}
	if strings.TrimSpace(s.defaultSearchURL) != "" {
		return s.defaultSearchURL
	}
	return defaultProxyMapSearchURL
}

func (s *MobileMapService) resolveReverseEndpoint(settings ServiceSettings) string {
	explicit := strings.TrimSpace(settings.MapReverseURL)
	if explicit != "" {
		return explicit
	}
	if normalizeMapProvider(settings.MapProvider) == "tianditu" {
		return defaultTiandituReverseURL
	}
	if strings.TrimSpace(s.defaultReverseURL) != "" {
		return s.defaultReverseURL
	}
	return defaultProxyMapReverseURL
}

func (s *MobileMapService) httpClient(settings ServiceSettings) *http.Client {
	timeout := time.Duration(settings.MapTimeoutSec) * time.Second
	if timeout <= 0 {
		timeout = s.defaultTimeout
	}
	if timeout <= 0 {
		timeout = DefaultMapTimeoutSec * time.Second
	}
	return &http.Client{Timeout: timeout}
}

func (s *MobileMapService) doJSON(ctx context.Context, settings ServiceSettings, method string, rawURL string, target interface{}) error {
	req, err := http.NewRequestWithContext(ctx, method, rawURL, nil)
	if err != nil {
		return err
	}
	req.Header.Set("Accept", "application/json")
	req.Header.Set("User-Agent", "yuexiang-mobile-map/1.0")

	resp, err := s.httpClient(settings).Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("map request failed: status=%d", resp.StatusCode)
	}
	return json.NewDecoder(resp.Body).Decode(target)
}

func buildTiandituSearchPostStr(input MapSearchInput, page int, pageSize int) (string, error) {
	keyword := strings.TrimSpace(input.Keyword)
	if keyword == "" {
		return "", fmt.Errorf("keyword is required")
	}
	if city := strings.TrimSpace(input.City); city != "" {
		keyword = strings.TrimSpace(city + " " + keyword)
	}

	payload := map[string]interface{}{
		"keyWord":   keyword,
		"queryType": "1",
		"start":     strconv.Itoa((page - 1) * pageSize),
		"count":     strconv.Itoa(pageSize),
		"level":     strconv.Itoa(defaultTiandituSearchLevel),
		"mapBound":  defaultTiandituMapBound,
		"show":      "2",
	}

	if lng, lat, ok := parseCoordinatePair(input.Lng, input.Lat); ok {
		payload["queryType"] = "3"
		payload["level"] = strconv.Itoa(defaultTiandituNearbyLevel)
		payload["mapBound"] = buildNearbyMapBound(lng, lat)
		payload["pointLonlat"] = formatLonLat(lng, lat)
		payload["queryRadius"] = strconv.Itoa(defaultTiandituRadiusMeter)
	}

	encoded, err := json.Marshal(payload)
	if err != nil {
		return "", err
	}
	return string(encoded), nil
}

func buildTiandituReversePostStr(input MapReverseInput) (string, error) {
	lng, lat, ok := parseCoordinatePair(input.Lng, input.Lat)
	if !ok {
		return "", fmt.Errorf("lat and lng are required")
	}

	encoded, err := json.Marshal(map[string]interface{}{
		"lon": lng,
		"lat": lat,
		"ver": 1,
	})
	if err != nil {
		return "", err
	}
	return string(encoded), nil
}

func parseTiandituSearchList(raw map[string]interface{}) []map[string]interface{} {
	pois, _ := raw["pois"].([]interface{})
	list := make([]map[string]interface{}, 0, len(pois))
	for _, item := range pois {
		poi, ok := item.(map[string]interface{})
		if !ok {
			continue
		}
		lng, lat := parseLonLatString(fmt.Sprintf("%v", poi["lonlat"]))
		address := map[string]interface{}{
			"address":    strings.TrimSpace(fmt.Sprintf("%v", poi["address"])),
			"province":   strings.TrimSpace(fmt.Sprintf("%v", poi["province"])),
			"city":       strings.TrimSpace(fmt.Sprintf("%v", poi["city"])),
			"county":     strings.TrimSpace(fmt.Sprintf("%v", poi["county"])),
			"typeName":   strings.TrimSpace(fmt.Sprintf("%v", poi["typeName"])),
			"source":     strings.TrimSpace(fmt.Sprintf("%v", poi["source"])),
			"adminCode":  strings.TrimSpace(fmt.Sprintf("%v", poi["adminCode"])),
			"addressAll": buildTiandituAddressText(poi),
		}
		name := strings.TrimSpace(fmt.Sprintf("%v", poi["name"]))
		displayName := name
		addressText := strings.TrimSpace(fmt.Sprintf("%v", poi["address"]))
		if addressText == "" {
			addressText = buildTiandituAddressText(poi)
		}
		if addressText != "" && !strings.Contains(displayName, addressText) {
			displayName = strings.TrimSpace(name + " " + addressText)
		}
		list = append(list, map[string]interface{}{
			"id":          pickFirstNonEmpty(fmt.Sprintf("%v", poi["hotPointID"]), fmt.Sprintf("%v", poi["lonlat"]), name),
			"name":        name,
			"displayName": displayName,
			"address":     address,
			"latitude":    lat,
			"longitude":   lng,
		})
	}
	return list
}

func buildTiandituAddressText(source map[string]interface{}) string {
	parts := []string{
		strings.TrimSpace(fmt.Sprintf("%v", source["province"])),
		strings.TrimSpace(fmt.Sprintf("%v", source["city"])),
		strings.TrimSpace(fmt.Sprintf("%v", source["county"])),
		strings.TrimSpace(fmt.Sprintf("%v", source["address"])),
	}
	merged := make([]string, 0, len(parts))
	for _, part := range parts {
		if part == "" {
			continue
		}
		if len(merged) > 0 && merged[len(merged)-1] == part {
			continue
		}
		merged = append(merged, part)
	}
	return strings.TrimSpace(strings.Join(merged, ""))
}

func parseCoordinatePair(lngRaw string, latRaw string) (float64, float64, bool) {
	lng, err := strconv.ParseFloat(strings.TrimSpace(lngRaw), 64)
	if err != nil {
		return 0, 0, false
	}
	lat, err := strconv.ParseFloat(strings.TrimSpace(latRaw), 64)
	if err != nil {
		return 0, 0, false
	}
	return lng, lat, true
}

func parseLonLatString(value string) (float64, float64) {
	parts := strings.Split(strings.TrimSpace(value), ",")
	if len(parts) != 2 {
		return 0, 0
	}
	lng, _ := strconv.ParseFloat(strings.TrimSpace(parts[0]), 64)
	lat, _ := strconv.ParseFloat(strings.TrimSpace(parts[1]), 64)
	return lng, lat
}

func buildNearbyMapBound(lng float64, lat float64) string {
	const delta = 0.08
	minLng := lng - delta
	maxLng := lng + delta
	minLat := lat - delta
	maxLat := lat + delta
	return strings.Join([]string{
		strconv.FormatFloat(minLng, 'f', 6, 64),
		strconv.FormatFloat(minLat, 'f', 6, 64),
		strconv.FormatFloat(maxLng, 'f', 6, 64),
		strconv.FormatFloat(maxLat, 'f', 6, 64),
	}, ",")
}

func formatLonLat(lng float64, lat float64) string {
	return strings.Join([]string{
		strconv.FormatFloat(lng, 'f', 6, 64),
		strconv.FormatFloat(lat, 'f', 6, 64),
	}, ",")
}

func parseAnyInt(value interface{}) int {
	switch typed := value.(type) {
	case float64:
		return int(typed)
	case float32:
		return int(typed)
	case int:
		return typed
	case int64:
		return int(typed)
	case int32:
		return int(typed)
	case string:
		parsed, _ := strconv.Atoi(strings.TrimSpace(typed))
		return parsed
	default:
		return 0
	}
}

func pickFirstNonEmpty(values ...string) string {
	for _, value := range values {
		if text := strings.TrimSpace(value); text != "" {
			return text
		}
	}
	return ""
}
