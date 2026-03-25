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

type HTTPConfig struct {
	ReadTimeout       time.Duration
	ReadHeaderTimeout time.Duration
	WriteTimeout      time.Duration
	IdleTimeout       time.Duration
	ShutdownTimeout   time.Duration
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
			Host:            getEnv("DB_HOST", "127.0.0.1"),
			Port:            getEnv("DB_PORT", "5432"),
			User:            getEnv("DB_USER", "yuexiang_user"),
			Password:        getEnv("DB_PASSWORD", "yuexiang_password"),
			DBName:          getEnv("DB_NAME", "yuexiang"),
			Driver:          normalizeDatabaseDriver(getEnv("DB_DRIVER", "postgres")),
			DSN:             strings.TrimSpace(os.Getenv("DB_DSN")),
			MaxOpenConns:    getEnvInt("DB_MAX_OPEN_CONNS", 40),
			MaxIdleConns:    getEnvInt("DB_MAX_IDLE_CONNS", 20),
			ConnMaxLifetime: time.Duration(getEnvInt("DB_CONN_MAX_LIFETIME_MINUTES", 60)) * time.Minute,
			ConnMaxIdleTime: time.Duration(getEnvInt("DB_CONN_MAX_IDLE_TIME_MINUTES", 30)) * time.Minute,
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
		HTTP: HTTPConfig{
			ReadTimeout:       time.Duration(getEnvInt("HTTP_READ_TIMEOUT_SECONDS", 15)) * time.Second,
			ReadHeaderTimeout: time.Duration(getEnvInt("HTTP_READ_HEADER_TIMEOUT_SECONDS", 10)) * time.Second,
			WriteTimeout:      time.Duration(getEnvInt("HTTP_WRITE_TIMEOUT_SECONDS", 30)) * time.Second,
			IdleTimeout:       time.Duration(getEnvInt("HTTP_IDLE_TIMEOUT_SECONDS", 60)) * time.Second,
			ShutdownTimeout:   time.Duration(getEnvInt("HTTP_SHUTDOWN_TIMEOUT_SECONDS", 15)) * time.Second,
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

	return nil
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

func normalizeDatabaseDriver(value string) string {
	return strings.ToLower(strings.TrimSpace(value))
}

func defaultRedisRequired(env string) string {
	if isProductionLikeEnv(env) {
		return "true"
	}
	return "false"
}

func isProductionLikeEnv(env string) bool {
	switch strings.ToLower(strings.TrimSpace(env)) {
	case "production", "prod", "staging":
		return true
	default:
		return false
	}
}
