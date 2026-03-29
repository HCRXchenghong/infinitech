package config

import (
	"fmt"
	"log"
	"os"
	"strconv"
	"strings"
	"time"
)

type Config struct {
	Env      string
	Port     string
	Database DatabaseConfig
	Redis    RedisConfig
	JWT      JWTConfig
	Invite   InviteConfig
	Map      MapConfig
	Push     PushConfig
	HTTP     HTTPConfig
}

type DatabaseConfig struct {
	Host     string
	Port     string
	User     string
	Password string
	DBName   string
	Driver   string
	DSN      string

	AllowLegacyProductionDriver bool

	MaxOpenConns    int
	MaxIdleConns    int
	ConnMaxLifetime time.Duration
	ConnMaxIdleTime time.Duration
}

type RedisConfig struct {
	Host     string
	Port     string
	Password string
	DB       int
	Enabled  bool
	Required bool
}

type JWTConfig struct {
	Secret             string
	ExpiresIn          string
	AccessTokenExpiry  time.Duration
	RefreshTokenExpiry time.Duration
}

type InviteConfig struct {
	RegisterRewardPoints int
}

type MapConfig struct {
	SearchURL  string
	ReverseURL string
	Timeout    time.Duration
}

type PushConfig struct {
	DispatchEnabled   bool
	DispatchProvider  string
	WebhookURL        string
	WebhookSecret     string
	WebhookAuthHeader string
	WebhookAuthValue  string
	RequestTimeout    time.Duration
	PollInterval      time.Duration
	BatchSize         int
	MaxRetries        int
	RetryBackoff      time.Duration
	ReadyMaxQueue     int64
	ReadyMaxQueueAge  time.Duration
}

type HTTPConfig struct {
	ReadTimeout        time.Duration
	ReadHeaderTimeout  time.Duration
	WriteTimeout       time.Duration
	IdleTimeout        time.Duration
	ShutdownTimeout    time.Duration
	SlowRequestWarn    time.Duration
	MaxBodyBytes       int64
	MaxUploadBytes     int64
	MaxMultipartMemory int64
	RateLimitEnabled   bool
	RateLimitWindow    time.Duration
	RateLimitMax       int
	TrustedProxies     []string
}

func Load() *Config {
	env := getEnv("ENV", getEnv("NODE_ENV", "development"))
	jwtSecret := strings.TrimSpace(os.Getenv("JWT_SECRET"))
	if jwtSecret == "" {
		log.Fatal("JWT_SECRET environment variable is required")
	}
	if len(jwtSecret) < 32 {
		log.Fatal("JWT_SECRET must be at least 32 characters long")
	}

	return &Config{
		Env:  env,
		Port: getEnv("GO_API_PORT", "1029"),
		Database: DatabaseConfig{
			Host:                        getEnv("DB_HOST", "127.0.0.1"),
			Port:                        getEnv("DB_PORT", "5432"),
			User:                        getEnv("DB_USER", "yuexiang_user"),
			Password:                    getEnv("DB_PASSWORD", "yuexiang_password"),
			DBName:                      getEnv("DB_NAME", "yuexiang"),
			Driver:                      normalizeDatabaseDriver(getEnv("DB_DRIVER", "postgres")),
			DSN:                         strings.TrimSpace(os.Getenv("DB_DSN")),
			AllowLegacyProductionDriver: strings.EqualFold(getEnv("ALLOW_LEGACY_PRODUCTION_DB_DRIVER", "false"), "true"),
			MaxOpenConns:                getEnvInt("DB_MAX_OPEN_CONNS", 40),
			MaxIdleConns:                getEnvInt("DB_MAX_IDLE_CONNS", 20),
			ConnMaxLifetime:             time.Duration(getEnvInt("DB_CONN_MAX_LIFETIME_MINUTES", 60)) * time.Minute,
			ConnMaxIdleTime:             time.Duration(getEnvInt("DB_CONN_MAX_IDLE_TIME_MINUTES", 30)) * time.Minute,
		},
		Redis: RedisConfig{
			Host:     getEnv("REDIS_HOST", "127.0.0.1"),
			Port:     getEnv("REDIS_PORT", "2550"),
			Password: getEnv("REDIS_PASSWORD", ""),
			DB:       getEnvInt("REDIS_DB", 0),
			Enabled:  strings.EqualFold(getEnv("REDIS_ENABLED", "true"), "true"),
			Required: strings.EqualFold(getEnv("REDIS_REQUIRED", defaultRedisRequired(env)), "true"),
		},
		JWT: JWTConfig{
			Secret:             jwtSecret,
			ExpiresIn:          getEnv("JWT_EXPIRES_IN", "7d"),
			AccessTokenExpiry:  2 * time.Hour,
			RefreshTokenExpiry: 30 * 24 * time.Hour,
		},
		Invite: InviteConfig{
			RegisterRewardPoints: max(getEnvInt("INVITE_REGISTER_REWARD_POINTS", 20), 0),
		},
		Map: MapConfig{
			SearchURL:  getEnv("MAP_SEARCH_URL", getEnv("OSM_GEOCODER_SEARCH_URL", "http://127.0.0.1:8082/search")),
			ReverseURL: getEnv("MAP_REVERSE_URL", getEnv("OSM_GEOCODER_REVERSE_URL", "http://127.0.0.1:8082/reverse")),
			Timeout:    time.Duration(getEnvInt("MAP_TIMEOUT_SECONDS", getEnvInt("OSM_GEOCODER_TIMEOUT_SECONDS", 5))) * time.Second,
		},
		Push: PushConfig{
			DispatchEnabled:   strings.EqualFold(getEnv("PUSH_DISPATCH_ENABLED", "false"), "true"),
			DispatchProvider:  strings.ToLower(strings.TrimSpace(getEnv("PUSH_DISPATCH_PROVIDER", "log"))),
			WebhookURL:        strings.TrimSpace(os.Getenv("PUSH_DISPATCH_WEBHOOK_URL")),
			WebhookSecret:     strings.TrimSpace(os.Getenv("PUSH_DISPATCH_WEBHOOK_SECRET")),
			WebhookAuthHeader: strings.TrimSpace(os.Getenv("PUSH_DISPATCH_WEBHOOK_AUTH_HEADER")),
			WebhookAuthValue:  strings.TrimSpace(os.Getenv("PUSH_DISPATCH_WEBHOOK_AUTH_VALUE")),
			RequestTimeout:    time.Duration(getEnvInt("PUSH_DISPATCH_TIMEOUT_SECONDS", 5)) * time.Second,
			PollInterval:      time.Duration(getEnvInt("PUSH_DISPATCH_POLL_SECONDS", 15)) * time.Second,
			BatchSize:         getEnvInt("PUSH_DISPATCH_BATCH_SIZE", 100),
			MaxRetries:        getEnvInt("PUSH_DISPATCH_MAX_RETRIES", 5),
			RetryBackoff:      time.Duration(getEnvInt("PUSH_DISPATCH_RETRY_BACKOFF_SECONDS", 60)) * time.Second,
			ReadyMaxQueue:     int64(getEnvInt("PUSH_READY_MAX_QUEUE", 5000)),
			ReadyMaxQueueAge:  time.Duration(getEnvInt("PUSH_READY_MAX_QUEUE_AGE_SECONDS", 1800)) * time.Second,
		},
		HTTP: HTTPConfig{
			ReadTimeout:        time.Duration(getEnvInt("HTTP_READ_TIMEOUT_SECONDS", 15)) * time.Second,
			ReadHeaderTimeout:  time.Duration(getEnvInt("HTTP_READ_HEADER_TIMEOUT_SECONDS", 10)) * time.Second,
			WriteTimeout:       time.Duration(getEnvInt("HTTP_WRITE_TIMEOUT_SECONDS", 30)) * time.Second,
			IdleTimeout:        time.Duration(getEnvInt("HTTP_IDLE_TIMEOUT_SECONDS", 60)) * time.Second,
			ShutdownTimeout:    time.Duration(getEnvInt("HTTP_SHUTDOWN_TIMEOUT_SECONDS", 15)) * time.Second,
			SlowRequestWarn:    time.Duration(getEnvInt("HTTP_SLOW_REQUEST_WARN_MS", defaultHTTPSlowRequestWarnMS(env))) * time.Millisecond,
			MaxBodyBytes:       int64(getEnvInt("HTTP_MAX_BODY_BYTES", 1024*1024)),
			MaxUploadBytes:     int64(getEnvInt("HTTP_MAX_UPLOAD_BYTES", 12*1024*1024)),
			MaxMultipartMemory: int64(getEnvInt("HTTP_MAX_MULTIPART_MEMORY_BYTES", 8*1024*1024)),
			RateLimitEnabled:   strings.EqualFold(getEnv("HTTP_RATE_LIMIT_ENABLED", "true"), "true"),
			RateLimitWindow:    time.Duration(getEnvInt("HTTP_RATE_LIMIT_WINDOW_SECONDS", 60)) * time.Second,
			RateLimitMax:       getEnvInt("HTTP_RATE_LIMIT_MAX_REQUESTS", defaultHTTPRateLimitMax(env)),
			TrustedProxies:     parseCSV(getEnv("TRUSTED_PROXY_CIDRS", "127.0.0.1,::1")),
		},
	}
}

func (c *Config) Validate() error {
	driver := normalizeDatabaseDriver(c.Database.Driver)
	switch driver {
	case "postgres", "mysql", "sqlite":
	default:
		return fmt.Errorf("unsupported DB_DRIVER %q", c.Database.Driver)
	}

	if isProductionLikeEnv(c.Env) && driver == "sqlite" {
		return fmt.Errorf("DB_DRIVER=sqlite is not allowed in %s environment", c.Env)
	}

	if isProductionLikeEnv(c.Env) && driver != "postgres" && !c.Database.AllowLegacyProductionDriver {
		return fmt.Errorf(
			"DB_DRIVER=%s is not allowed in %s environment; production baseline requires postgres (set ALLOW_LEGACY_PRODUCTION_DB_DRIVER=true only for emergency compatibility)",
			driver,
			c.Env,
		)
	}

	if driver != "sqlite" && strings.TrimSpace(c.Database.DSN) == "" {
		if strings.TrimSpace(c.Database.Host) == "" || strings.TrimSpace(c.Database.Port) == "" || strings.TrimSpace(c.Database.User) == "" || strings.TrimSpace(c.Database.DBName) == "" {
			return fmt.Errorf("database connection settings are incomplete for driver %s", driver)
		}
	}

	if c.Redis.Required && !c.Redis.Enabled {
		return fmt.Errorf("Redis is required but REDIS_ENABLED=false")
	}

	if c.Database.MaxOpenConns <= 0 {
		return fmt.Errorf("DB_MAX_OPEN_CONNS must be greater than 0")
	}
	if c.Database.MaxIdleConns < 0 {
		return fmt.Errorf("DB_MAX_IDLE_CONNS must be 0 or greater")
	}
	if c.Database.ConnMaxLifetime <= 0 {
		return fmt.Errorf("DB_CONN_MAX_LIFETIME_MINUTES must be greater than 0")
	}
	if c.Database.ConnMaxIdleTime <= 0 {
		return fmt.Errorf("DB_CONN_MAX_IDLE_TIME_MINUTES must be greater than 0")
	}

	if c.Push.DispatchEnabled {
		switch c.Push.DispatchProvider {
		case "log", "webhook":
		default:
			return fmt.Errorf("unsupported PUSH_DISPATCH_PROVIDER %q", c.Push.DispatchProvider)
		}
		if isProductionLikeEnv(c.Env) && c.Push.DispatchProvider == "log" {
			return fmt.Errorf("PUSH_DISPATCH_PROVIDER=log is not allowed in %s environment", c.Env)
		}
		if c.Push.DispatchProvider == "webhook" && strings.TrimSpace(c.Push.WebhookURL) == "" {
			return fmt.Errorf("PUSH_DISPATCH_WEBHOOK_URL is required when PUSH_DISPATCH_PROVIDER=webhook")
		}
		if (c.Push.WebhookAuthHeader == "") != (c.Push.WebhookAuthValue == "") {
			return fmt.Errorf("PUSH_DISPATCH_WEBHOOK_AUTH_HEADER and PUSH_DISPATCH_WEBHOOK_AUTH_VALUE must be configured together")
		}
		if isProductionLikeEnv(c.Env) && c.Push.WebhookSecret == "" && c.Push.WebhookAuthValue == "" {
			return fmt.Errorf("production webhook push dispatch requires PUSH_DISPATCH_WEBHOOK_SECRET or PUSH_DISPATCH_WEBHOOK_AUTH_HEADER/PUSH_DISPATCH_WEBHOOK_AUTH_VALUE")
		}
	}
	if c.Push.RequestTimeout <= 0 {
		return fmt.Errorf("PUSH_DISPATCH_TIMEOUT_SECONDS must be greater than 0")
	}
	if c.Push.PollInterval <= 0 {
		return fmt.Errorf("PUSH_DISPATCH_POLL_SECONDS must be greater than 0")
	}
	if c.Push.BatchSize <= 0 {
		return fmt.Errorf("PUSH_DISPATCH_BATCH_SIZE must be greater than 0")
	}
	if c.Push.MaxRetries < 0 {
		return fmt.Errorf("PUSH_DISPATCH_MAX_RETRIES must be 0 or greater")
	}
	if c.Push.RetryBackoff <= 0 {
		return fmt.Errorf("PUSH_DISPATCH_RETRY_BACKOFF_SECONDS must be greater than 0")
	}
	if c.Push.ReadyMaxQueue < 0 {
		return fmt.Errorf("PUSH_READY_MAX_QUEUE must be 0 or greater")
	}
	if c.Push.ReadyMaxQueueAge < 0 {
		return fmt.Errorf("PUSH_READY_MAX_QUEUE_AGE_SECONDS must be 0 or greater")
	}

	if c.HTTP.MaxBodyBytes <= 0 {
		return fmt.Errorf("HTTP_MAX_BODY_BYTES must be greater than 0")
	}
	if c.HTTP.SlowRequestWarn <= 0 {
		return fmt.Errorf("HTTP_SLOW_REQUEST_WARN_MS must be greater than 0")
	}
	if c.HTTP.MaxUploadBytes <= 0 {
		return fmt.Errorf("HTTP_MAX_UPLOAD_BYTES must be greater than 0")
	}
	if c.HTTP.MaxUploadBytes < c.HTTP.MaxBodyBytes {
		return fmt.Errorf("HTTP_MAX_UPLOAD_BYTES must be greater than or equal to HTTP_MAX_BODY_BYTES")
	}
	if c.HTTP.MaxMultipartMemory <= 0 {
		return fmt.Errorf("HTTP_MAX_MULTIPART_MEMORY_BYTES must be greater than 0")
	}
	if c.HTTP.RateLimitEnabled {
		if c.HTTP.RateLimitWindow <= 0 {
			return fmt.Errorf("HTTP_RATE_LIMIT_WINDOW_SECONDS must be greater than 0")
		}
		if c.HTTP.RateLimitMax <= 0 {
			return fmt.Errorf("HTTP_RATE_LIMIT_MAX_REQUESTS must be greater than 0")
		}
	}

	return nil
}

func (c *Config) IsProductionLike() bool {
	return isProductionLikeEnv(c.Env)
}

func (c *Config) UsesLegacyProductionDatabaseDriver() bool {
	driver := normalizeDatabaseDriver(c.Database.Driver)
	return c.IsProductionLike() && driver != "postgres"
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvInt(key string, defaultValue int) int {
	value := os.Getenv(key)
	if value == "" {
		return defaultValue
	}
	parsed, err := strconv.Atoi(value)
	if err != nil {
		return defaultValue
	}
	return parsed
}

func max(value int, floor int) int {
	if value < floor {
		return floor
	}
	return value
}

func parseCSV(raw string) []string {
	parts := strings.Split(strings.TrimSpace(raw), ",")
	result := make([]string, 0, len(parts))
	for _, part := range parts {
		value := strings.TrimSpace(part)
		if value != "" {
			result = append(result, value)
		}
	}
	return result
}

func normalizeDatabaseDriver(value string) string {
	return strings.ToLower(strings.TrimSpace(value))
}

func defaultRedisRequired(env string) string {
	if isProductionLikeEnv(env) {
		return "true"
	}
	return "false"
}

func defaultHTTPRateLimitMax(env string) int {
	if isProductionLikeEnv(env) {
		return 1200
	}
	return 6000
}

func defaultHTTPSlowRequestWarnMS(env string) int {
	if isProductionLikeEnv(env) {
		return 1200
	}
	return 2500
}

func isProductionLikeEnv(env string) bool {
	switch strings.ToLower(strings.TrimSpace(env)) {
	case "production", "prod", "staging":
		return true
	default:
		return false
	}
}
