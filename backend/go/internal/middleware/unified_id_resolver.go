package middleware

import (
	"bytes"
	"encoding/json"
	"io"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/yuexiang/go-api/internal/idkit"
	"gorm.io/gorm"
)

func isChatIdentityKey(key string) bool {
	switch strings.ToLower(strings.TrimSpace(key)) {
	case "chatid", "chat_id", "roomid", "room_id":
		return true
	default:
		return false
	}
}

func looksLikeIDKey(key string) bool {
	k := strings.ToLower(strings.TrimSpace(key))
	if k == "" {
		return false
	}
	if isChatIdentityKey(k) {
		// chatId/roomId represent conversation identifiers, not entity primary keys.
		return false
	}
	if k == "id" || k == "tsid" {
		return true
	}
	if strings.HasSuffix(k, "id") || strings.HasSuffix(k, "_id") {
		return true
	}
	if strings.HasSuffix(k, "tsid") || strings.HasSuffix(k, "_tsid") {
		return true
	}
	return false
}

func legacyAliasKey(key string) string {
	trimmed := strings.TrimSpace(key)
	if trimmed == "" {
		return ""
	}

	lower := strings.ToLower(trimmed)
	if lower == "tsid" {
		return "id"
	}
	if strings.HasSuffix(lower, "_tsid") {
		return trimmed[:len(trimmed)-len("_tsid")] + "_id"
	}
	if strings.HasSuffix(trimmed, "Tsid") {
		return trimmed[:len(trimmed)-len("Tsid")] + "Id"
	}
	return ""
}

func setContextStringOnce(c *gin.Context, key, value string) {
	value = strings.TrimSpace(value)
	if value == "" {
		return
	}
	if existing, ok := c.Get(key); ok {
		if existingText, castOK := existing.(string); castOK && strings.TrimSpace(existingText) != "" {
			return
		}
	}
	c.Set(key, value)
}

func recordEntityUnifiedID(c *gin.Context, key, raw string) {
	value := strings.TrimSpace(raw)
	if value == "" {
		return
	}

	lowerKey := strings.ToLower(strings.TrimSpace(key))
	if idkit.TSIDPattern.MatchString(value) {
		setContextStringOnce(c, "entity_tsid", value)
		return
	}
	if idkit.UIDPattern.MatchString(value) {
		setContextStringOnce(c, "entity_uid", value)
		return
	}
	if strings.Contains(lowerKey, "tsid") && len(value) == 24 {
		setContextStringOnce(c, "entity_tsid", value)
	}
}

func resolveLegacyID(c *gin.Context, db *gorm.DB, raw string) (string, bool) {
	value := strings.TrimSpace(raw)
	if value == "" {
		return "", false
	}

	if idkit.UIDPattern.MatchString(value) {
		_, legacy, ok, err := idkit.ResolveLegacyByUID(c.Request.Context(), db, value)
		if err != nil || !ok {
			return "", false
		}
		return legacy, true
	}

	if idkit.TSIDPattern.MatchString(value) {
		_, legacy, ok, err := idkit.ResolveLegacyByTSID(c.Request.Context(), db, value)
		if err != nil || !ok {
			return "", false
		}
		return legacy, true
	}

	return "", false
}

func rewriteBodyIDs(c *gin.Context, db *gorm.DB, node interface{}) (bool, interface{}) {
	switch current := node.(type) {
	case map[string]interface{}:
		changed := false
		for key, value := range current {
			if text, ok := value.(string); ok && looksLikeIDKey(key) {
				recordEntityUnifiedID(c, key, text)
				if legacy, resolved := resolveLegacyID(c, db, text); resolved {
					current[key] = legacy
					if alias := legacyAliasKey(key); alias != "" && alias != key {
						if _, exists := current[alias]; !exists {
							current[alias] = legacy
						}
					}
					changed = true
					continue
				}
			}
			subChanged, subValue := rewriteBodyIDs(c, db, value)
			if subChanged {
				current[key] = subValue
				changed = true
			}
		}
		return changed, current
	case []interface{}:
		changed := false
		for idx, value := range current {
			subChanged, subValue := rewriteBodyIDs(c, db, value)
			if subChanged {
				current[idx] = subValue
				changed = true
			}
		}
		return changed, current
	default:
		return false, node
	}
}

// UnifiedIDResolver rewrites unified ID params/query to legacy values for old handlers.
func UnifiedIDResolver(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		if db == nil {
			c.Next()
			return
		}

		legacyHit := false
		for i := range c.Params {
			if isChatIdentityKey(c.Params[i].Key) {
				continue
			}
			recordEntityUnifiedID(c, c.Params[i].Key, c.Params[i].Value)
			if legacy, ok := resolveLegacyID(c, db, c.Params[i].Value); ok {
				c.Params[i].Value = legacy
				legacyHit = true
			}
		}

		query := c.Request.URL.Query()
		changed := false
		aliasUpdates := make(map[string][]string)
		for key, values := range query {
			if !looksLikeIDKey(key) {
				continue
			}
			alias := legacyAliasKey(key)
			for idx, value := range values {
				recordEntityUnifiedID(c, key, value)
				if legacy, ok := resolveLegacyID(c, db, value); ok {
					values[idx] = legacy
					if alias != "" && alias != key {
						aliasUpdates[alias] = append(aliasUpdates[alias], legacy)
					}
					changed = true
					legacyHit = true
				}
			}
			query[key] = values
		}
		for alias, values := range aliasUpdates {
			query[alias] = append(query[alias], values...)
			changed = true
		}
		if changed {
			c.Request.URL.RawQuery = query.Encode()
		}

		contentType := strings.ToLower(strings.TrimSpace(c.GetHeader("Content-Type")))
		if strings.Contains(contentType, "application/json") && c.Request.Body != nil {
			rawBody, readErr := io.ReadAll(c.Request.Body)
			if readErr == nil && len(rawBody) > 0 {
				var payload interface{}
				if err := json.Unmarshal(rawBody, &payload); err == nil {
					if bodyChanged, rewritten := rewriteBodyIDs(c, db, payload); bodyChanged {
						encoded, marshalErr := json.Marshal(rewritten)
						if marshalErr == nil {
							c.Request.Body = io.NopCloser(bytes.NewReader(encoded))
							legacyHit = true
						} else {
							c.Request.Body = io.NopCloser(bytes.NewReader(rawBody))
						}
					} else {
						c.Request.Body = io.NopCloser(bytes.NewReader(rawBody))
					}
				} else {
					c.Request.Body = io.NopCloser(bytes.NewReader(rawBody))
				}
			}
		}

		if legacyHit {
			c.Set("legacy_hit", true)
		}

		c.Next()
	}
}
