package service

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

func TestMobileMapServiceSearchViaTianditu(t *testing.T) {
	var lastType string
	var lastTK string
	var lastPostStr string

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		lastType = r.URL.Query().Get("type")
		lastTK = r.URL.Query().Get("tk")
		lastPostStr = r.URL.Query().Get("postStr")
		_ = json.NewEncoder(w).Encode(map[string]interface{}{
			"count": 1,
			"pois": []map[string]interface{}{
				{
					"hotPointID": "poi-1",
					"name":       "测试门店",
					"address":    "北京市海淀区中关村大街1号",
					"province":   "北京市",
					"city":       "北京市",
					"county":     "海淀区",
					"typeName":   "餐饮服务",
					"lonlat":     "116.123000,39.456000",
				},
			},
		})
	}))
	defer server.Close()

	svc := &MobileMapService{defaultTimeout: 5 * time.Second}
	result, err := svc.searchWithSettings(context.Background(), MapSearchInput{
		Keyword:  "餐厅",
		Page:     2,
		PageSize: 10,
	}, ServiceSettings{
		MapProvider:   "tianditu",
		MapSearchURL:  server.URL,
		MapAPIKey:     "tk-test",
		MapTimeoutSec: 5,
	})
	if err != nil {
		t.Fatalf("searchViaTianditu returned error: %v", err)
	}

	if lastType != "query" {
		t.Fatalf("expected query type, got %q", lastType)
	}
	if lastTK != "tk-test" {
		t.Fatalf("expected tk-test, got %q", lastTK)
	}
	if !strings.Contains(lastPostStr, "\"queryType\":\"1\"") {
		t.Fatalf("expected ordinary search queryType in postStr, got %s", lastPostStr)
	}
	if !strings.Contains(lastPostStr, "\"start\":\"10\"") {
		t.Fatalf("expected pagination start offset in postStr, got %s", lastPostStr)
	}

	list, _ := result["list"].([]map[string]interface{})
	if len(list) != 1 {
		t.Fatalf("expected one result, got %#v", result["list"])
	}
	if list[0]["name"] != "测试门店" {
		t.Fatalf("unexpected result name: %#v", list[0]["name"])
	}
	if result["total"] != 1 {
		t.Fatalf("unexpected total: %#v", result["total"])
	}
}

func TestMobileMapServiceReverseViaTianditu(t *testing.T) {
	var lastType string
	var lastTK string
	var lastPostStr string

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		lastType = r.URL.Query().Get("type")
		lastTK = r.URL.Query().Get("tk")
		lastPostStr = r.URL.Query().Get("postStr")
		_ = json.NewEncoder(w).Encode(map[string]interface{}{
			"status": "0",
			"msg":    "ok",
			"result": map[string]interface{}{
				"formatted_address": "北京市海淀区中关村大街1号",
				"location": map[string]interface{}{
					"lon": "116.123000",
					"lat": "39.456000",
				},
				"addressComponent": map[string]interface{}{
					"province": "北京市",
					"city":     "北京市",
					"county":   "海淀区",
					"address":  "中关村大街1号",
				},
			},
		})
	}))
	defer server.Close()

	svc := &MobileMapService{defaultTimeout: 5 * time.Second}
	result, err := svc.reverseWithSettings(context.Background(), MapReverseInput{
		Lat: "39.456",
		Lng: "116.123",
	}, ServiceSettings{
		MapProvider:   "tianditu",
		MapReverseURL: server.URL,
		MapAPIKey:     "tk-test",
		MapTimeoutSec: 5,
	})
	if err != nil {
		t.Fatalf("reverseViaTianditu returned error: %v", err)
	}

	if lastType != "geocode" {
		t.Fatalf("expected geocode type, got %q", lastType)
	}
	if lastTK != "tk-test" {
		t.Fatalf("expected tk-test, got %q", lastTK)
	}
	if !strings.Contains(lastPostStr, "\"lon\":116.123") || !strings.Contains(lastPostStr, "\"lat\":39.456") {
		t.Fatalf("unexpected reverse postStr: %s", lastPostStr)
	}
	if result["displayName"] != "北京市海淀区中关村大街1号" {
		t.Fatalf("unexpected displayName: %#v", result["displayName"])
	}
	if result["latitude"] != 39.456 {
		t.Fatalf("unexpected latitude: %#v", result["latitude"])
	}
	if result["longitude"] != 116.123 {
		t.Fatalf("unexpected longitude: %#v", result["longitude"])
	}
}
