package idkit

import "regexp"

const (
	Prefix              = "250724"
	DefaultBucket       = "99"
	MaxSequence   int64 = 999999
)

var (
	UIDPattern  = regexp.MustCompile(`^\d{14}$`)
	TSIDPattern = regexp.MustCompile(`^\d{24}$`)
)

// BucketDomains defines the canonical bucket code dictionary.
var BucketDomains = map[string]string{
	"00": "users",
	"10": "riders",
	"20": "merchants",
	"30": "admins",
	"40": "shops",
	"41": "categories",
	"42": "products",
	"43": "banners",
	"44": "featured_products",
	"45": "carousels",
	"46": "settings_and_public_apis",
	"50": "orders",
	"51": "reviews",
	"52": "rider_reviews",
	"53": "groupbuy",
	"54": "daily_order_no",
	"55": "after_sales",
	"60": "coupons",
	"61": "user_coupons",
	"62": "invite_codes",
	"63": "invite_records",
	"64": "points_goods",
	"65": "points_redemptions",
	"66": "points_ledger",
	"67": "onboarding_invite_links",
	"68": "onboarding_invite_submissions",
	"70": "wallet_accounts",
	"71": "recharge_orders",
	"72": "wallet_transactions",
	"73": "withdraw_requests",
	"74": "admin_wallet_operations",
	"75": "reconciliation_tasks",
	"76": "payment_callbacks",
	"77": "idempotency_records",
	"78": "sms_verification_codes",
	"80": "notifications",
	"81": "push_and_op_notifications",
	"82": "cooperation_and_favorites",
	"83": "chat",
	"90": "open_claw_configs",
	"91": "open_claw_staffs",
	"92": "open_claw_conversations",
	"93": "open_claw_messages",
	"94": "open_claw_tasks",
	"95": "open_claw_mcps",
	"96": "open_claw_skills",
	"97": "reserved_extension",
	"98": "reserved_extension_2",
	"99": "overflow_and_fallback",
}

// TableBuckets maps table names to bucket codes.
var TableBuckets = map[string]string{
	"admins":                        "30",
	"users":                         "00",
	"riders":                        "10",
	"merchants":                     "20",
	"shops":                         "40",
	"categories":                    "41",
	"products":                      "42",
	"banners":                       "43",
	"featured_products":             "44",
	"carousels":                     "45",
	"settings":                      "46",
	"public_apis":                   "46",
	"orders":                        "50",
	"reviews":                       "51",
	"rider_reviews":                 "52",
	"groupbuy_deals":                "53",
	"groupbuy_vouchers":             "53",
	"groupbuy_redemption_logs":      "53",
	"after_sales_requests":          "55",
	"coupons":                       "60",
	"user_coupons":                  "61",
	"invite_codes":                  "62",
	"invite_records":                "63",
	"points_goods":                  "64",
	"points_redemptions":            "65",
	"points_ledger":                 "66",
	"onboarding_invite_links":       "67",
	"onboarding_invite_submissions": "68",
	"wallet_accounts":               "70",
	"recharge_orders":               "71",
	"wallet_transactions":           "72",
	"withdraw_requests":             "73",
	"admin_wallet_operations":       "74",
	"financial_statistics":          "75",
	"user_financial_details":        "75",
	"reconciliation_tasks":          "75",
	"payment_callbacks":             "76",
	"idempotency_records":           "77",
	"sms_verification_codes":        "78",
	"notifications":                 "80",
	"push_messages":                 "81",
	"op_notifications":              "81",
	"cooperation_requests":          "82",
	"user_favorites":                "82",
	"dining_buddy_parties":          "83",
	"dining_buddy_party_members":    "83",
	"dining_buddy_messages":         "83",
	"open_claw_configs":             "90",
	"open_claw_staffs":              "91",
	"open_claw_conversations":       "92",
	"open_claw_messages":            "93",
	"open_claw_tasks":               "94",
	"open_claw_mcps":                "95",
	"open_claw_skills":              "96",
	"event_outbox":                  "97",
}

func BucketForTable(table string) string {
	if code, ok := TableBuckets[table]; ok {
		return code
	}
	return DefaultBucket
}

func DomainForBucket(bucket string) string {
	if domain, ok := BucketDomains[bucket]; ok {
		return domain
	}
	return BucketDomains[DefaultBucket]
}
