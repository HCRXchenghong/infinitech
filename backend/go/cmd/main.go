package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"math"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"strconv"
	"strings"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"github.com/yuexiang/go-api/internal/config"
	"github.com/yuexiang/go-api/internal/handler"
	"github.com/yuexiang/go-api/internal/idkit"
	"github.com/yuexiang/go-api/internal/middleware"
	"github.com/yuexiang/go-api/internal/repository"
	"github.com/yuexiang/go-api/internal/service"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// @title 悦享e食 API
// @version 1.0
// @description 悦享e食后端服务 API 文档
// @host localhost:1029
// @BasePath /api

const (
	riderIncomeFreezeDuration = 24 * time.Hour
	riderIncomeBackfillBatch  = 200
	riderIncomeSettleBatch    = 500
	riderOnlineTTL            = 90 * time.Second
)

var errOrderNotDelivering = errors.New("order is not in delivering status")

func configureLogOutput() {
	logPath := filepath.Join("logs", "combined.log")
	if err := os.MkdirAll(filepath.Dir(logPath), 0o755); err != nil {
		log.Printf("⚠️ 创建日志目录失败: %v", err)
		return
	}

	logFile, err := os.OpenFile(logPath, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0o644)
	if err != nil {
		log.Printf("⚠️ 打开日志文件失败: %v", err)
		return
	}

	log.SetOutput(io.MultiWriter(os.Stdout, logFile))
	log.SetFlags(log.LstdFlags)
	log.Printf("📝 Go 日志输出文件: %s", logPath)
}

func main() {
	configureLogOutput()

	// 加载环境变量
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found")
	}

	// 加载配置
	cfg := config.Load()
	if err := cfg.Validate(); err != nil {
		log.Fatal("Invalid configuration:", err)
	}
	log.Printf(
		"Runtime baseline: env=%s db_driver=%s redis_enabled=%t redis_required=%t",
		cfg.Env,
		cfg.Database.Driver,
		cfg.Redis.Enabled,
		cfg.Redis.Required,
	)
	if cfg.Database.AllowLegacyProductionDriver && cfg.UsesLegacyProductionDatabaseDriver() {
		log.Printf(
			"⚠️ legacy production database driver override enabled: db_driver=%s env=%s",
			cfg.Database.Driver,
			cfg.Env,
		)
	}

	// 初始化数据库
	db, err := repository.InitDB(cfg)
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}
	sqlDB, err := db.DB()
	if err != nil {
		log.Fatal("Failed to access database pool:", err)
	}

	// 自动迁移数据库表结构
	err = db.AutoMigrate(
		&repository.Notification{},
		&repository.NotificationReadRecord{},
		&repository.Admin{},
		&repository.User{},
		&repository.Rider{},
		&repository.Merchant{},
		&repository.Order{},
		&repository.AfterSalesRequest{},
		&repository.Setting{},
		&repository.Carousel{},
		&repository.PushMessage{},
		&repository.PublicAPI{},
		&repository.Shop{},
		&repository.Review{},
		&repository.UserFavorite{},
		&repository.UserAddress{},
		&repository.RiderReview{},
		&repository.Category{},
		&repository.Product{},
		&repository.Banner{},
		&repository.FeaturedProduct{},
		&repository.CooperationRequest{},
		&repository.InviteCode{},
		&repository.InviteRecord{},
		&repository.OnboardingInviteLink{},
		&repository.OnboardingInviteSubmission{},
		&repository.PointsGood{},
		&repository.PointsRedemption{},
		&repository.PointsLedger{},
		// 钱包 & 财务中心
		&repository.WalletAccount{},
		&repository.WalletTransaction{},
		&repository.RechargeOrder{},
		&repository.WithdrawRequest{},
		&repository.AdminWalletOperation{},
		&repository.FinancialLogAudit{},
		&repository.PaymentCallback{},
		&repository.IdempotencyRecord{},
		&repository.ReconciliationTask{},
		&repository.ExternalAuthSession{},
		&repository.CaptchaChallenge{},
		&repository.SMSVerificationCode{},
		&repository.MessageConversation{},
		&repository.SupportConversation{},
		&repository.SupportMessage{},
		&repository.DiningBuddyParty{},
		&repository.DiningBuddyPartyMember{},
		&repository.DiningBuddyMessage{},
		// 优惠券
		&repository.Coupon{},
		&repository.UserCoupon{},
		&repository.CouponIssueLog{},
		// 团购与运营通知
		&repository.GroupbuyDeal{},
		&repository.GroupbuyVoucher{},
		&repository.GroupbuyRedemptionLog{},
		&repository.EventOutbox{},
		&repository.OpNotification{},
		&repository.PushDevice{},
		&repository.PushDelivery{},
		&repository.PushTemplate{},
		&repository.HomePromotionCampaign{},
		// 统一ID基础设施
		&repository.IDCodebook{},
		&repository.IDSequence{},
		&repository.IDLegacyMapping{},
		&repository.IDMigrationAnomaly{},
	)
	if err != nil {
		log.Printf("⚠️  数据库迁移警告: %v", err)
	} else {
		log.Println("✅ 数据库表结构迁移成功")
	}

	if err := idkit.Bootstrap(db); err != nil {
		log.Printf("⚠️  统一ID引擎初始化失败: %v", err)
	} else {
		log.Println("✅ 统一ID引擎初始化成功")
	}

	if strings.ToLower(strings.TrimSpace(os.Getenv("UNIFIED_ID_BACKFILL_ON_STARTUP"))) != "false" {
		stats, backfillErr := idkit.BackfillMissing(db, 300)
		if backfillErr != nil {
			log.Printf("⚠️  统一ID历史回填失败: %v", backfillErr)
		} else {
			total := int64(0)
			for _, n := range stats {
				total += n
			}
			log.Printf("✅ 统一ID历史回填完成: rows=%d tables=%d", total, len(stats))
		}
	}

	// 兜底自愈：确保 shops 表的今日推荐字段已存在（兼容历史库迁移不完整场景）
	if err := ensureShopTodayRecommendColumns(db); err != nil {
		log.Printf("⚠️  今日推荐字段检查失败: %v", err)
	}

	// 钱包索引自愈：旧库 user_id 唯一索引会导致不同 user_type 账号冲突。
	if err := ensureWalletAccountIndexes(db); err != nil {
		log.Printf("⚠️  钱包索引检查失败: %v", err)
	}
	if err := ensurePushDeliveryIndexes(db); err != nil {
		log.Printf("鈿狅笍  鎺ㄩ€佸洖鎵х储寮曟鏌ュけ璐? %v", err)
	}
	if err := ensureShopMerchantTypeBackfill(db); err != nil {
		log.Printf("⚠️  商户类型字段回填失败: %v", err)
	}
	if err := ensureOrderBizTypeBackfill(db); err != nil {
		log.Printf("⚠️  订单业务类型字段回填失败: %v", err)
	}

	// 启动时做一次骑手收入账本修复，并开启定时结算任务（完成订单后冻结24h自动入账）
	if err := reconcileRiderIncome(db); err != nil {
		log.Printf("⚠️ 骑手收入初始化修复失败: %v", err)
	}
	go startRiderIncomeWorker(db)

	// 初始化 Redis（可选，失败不影响服务启动）
	rdb, err := repository.InitRedis(cfg)
	if err != nil {
		log.Fatal("Failed to initialize Redis:", err)
	}

	// 初始化仓库层
	repos := repository.NewRepositories(db, rdb)

	// 初始化服务层
	services := service.NewServices(repos, cfg)
	pushWorkerCtx, pushWorkerCancel := context.WithCancel(context.Background())
	defer pushWorkerCancel()
	if services.MobilePush != nil {
		go services.MobilePush.StartDeliveryWorker(pushWorkerCtx)
	}

	// 初始化处理器
	handlers := handler.NewHandlers(services)

	// 初始化骑手Handler
	handlers.Rider = handler.NewRiderHandler(db, rdb, services.Auth)

	// 初始化文件上传Handler
	handlers.FileUpload = handler.NewFileUploadHandler()

	// 初始化优惠券Handler
	couponRepo := repository.NewCouponRepository(db)
	couponService := service.NewCouponService(couponRepo, repos.Wallet)
	couponHandler := handler.NewCouponHandler(couponService)

	// 检查关键处理器是否初始化成功
	if handlers.SMS == nil {
		log.Fatal("❌ SMS Handler 初始化失败，请检查服务初始化")
	}
	if handlers.Auth == nil {
		log.Fatal("❌ Auth Handler 初始化失败，请检查服务初始化")
	}
	if handlers.Message == nil {
		log.Fatal("❌ Message Handler 初始化失败，请检查服务初始化")
	}
	if handlers.Notification == nil {
		log.Fatal("❌ Notification Handler 初始化失败，请检查服务初始化")
	}
	if handlers.Product == nil {
		log.Fatal("❌ Product Handler 初始化失败，请检查服务初始化")
	}
	log.Println("✅ 所有 Handler 初始化成功")

	// 设置 Gin 模式
	if cfg.Env == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	// 创建路由
	r := gin.New()
	if err := r.SetTrustedProxies(cfg.HTTP.TrustedProxies); err != nil {
		log.Fatal("Failed to configure trusted proxies:", err)
	}
	r.MaxMultipartMemory = cfg.HTTP.MaxMultipartMemory

	// 中间件
	r.Use(middleware.CORS())
	r.Use(middleware.RequestID())
	r.Use(middleware.Logger())
	r.Use(middleware.Recovery())
	r.Use(middleware.RequestBodyLimit(cfg.HTTP.MaxBodyBytes, cfg.HTTP.MaxUploadBytes))
	if cfg.HTTP.RateLimitEnabled {
		if rdb != nil {
			r.Use(middleware.RedisBackedRateLimit(rdb, "ratelimit:go:http", cfg.HTTP.RateLimitWindow, cfg.HTTP.RateLimitMax))
		} else {
			r.Use(middleware.GlobalRateLimit(cfg.HTTP.RateLimitWindow, cfg.HTTP.RateLimitMax))
		}
	}
	r.Use(middleware.UnifiedIDResolver(db))

	// 静态资源
	r.Static("/uploads", "./data/uploads")

	// 文件上传路由
	r.POST("/api/upload", handlers.FileUpload.Upload)

	// 健康检查
	healthHandler := func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status":    "ok",
			"service":   "go-api",
			"timestamp": time.Now().Format(time.RFC3339),
		})
	}
	readyHandler := func(c *gin.Context) {
		ctx, cancel := context.WithTimeout(c.Request.Context(), 2*time.Second)
		defer cancel()

		pushWorker := gin.H{}
		if services.MobilePush != nil {
			pushWorker = gin.H{
				"ok":     true,
				"worker": services.MobilePush.WorkerStatusSnapshot(ctx),
			}
		}

		if err := sqlDB.PingContext(ctx); err != nil {
			c.JSON(http.StatusServiceUnavailable, gin.H{
				"status":       "degraded",
				"service":      "go-api",
				"error":        "database not ready",
				"dependencies": gin.H{"pushWorker": pushWorker},
			})
			return
		}

		if cfg.Redis.Enabled && cfg.Redis.Required {
			if rdb == nil {
				c.JSON(http.StatusServiceUnavailable, gin.H{
					"status":  "degraded",
					"service": "go-api",
					"error":   "redis not initialized",
					"dependencies": gin.H{
						"database":   gin.H{"ok": true},
						"pushWorker": pushWorker,
					},
				})
				return
			}
			if err := rdb.Ping(ctx).Err(); err != nil {
				c.JSON(http.StatusServiceUnavailable, gin.H{
					"status":  "degraded",
					"service": "go-api",
					"error":   "redis not ready",
					"dependencies": gin.H{
						"database":   gin.H{"ok": true},
						"pushWorker": pushWorker,
					},
				})
				return
			}
		}

		c.JSON(http.StatusOK, gin.H{
			"status":    "ready",
			"service":   "go-api",
			"timestamp": time.Now().Format(time.RFC3339),
			"dependencies": gin.H{
				"database": gin.H{"ok": true},
				"redis": gin.H{
					"ok":       !cfg.Redis.Enabled || rdb != nil,
					"enabled":  cfg.Redis.Enabled,
					"required": cfg.Redis.Required,
				},
				"pushWorker": pushWorker,
			},
		})
	}
	r.GET("/health", healthHandler)
	r.GET("/ready", readyHandler)

	// API 路由
	api := r.Group("/api")
	api.Use(middleware.RequireRouteGuards(services.Auth, services.Admin))
	{
		api.GET("/health", healthHandler)
		api.GET("/ready", readyHandler)
		api.GET("/captcha", handlers.Captcha.Get)
		// 短信验证码相关（放在认证之前，因为注册/登录需要先验证码）
		sms := api.Group("/sms")
		{
			sms.POST("/request", handlers.SMS.RequestCode)          // 发送验证码
			sms.POST("/verify", handlers.SMS.VerifyCode)            // 验证验证码（删除）
			sms.POST("/verify-check", handlers.SMS.VerifyCodeCheck) // 验证验证码（不删除）
			sms.GET("/codes", handlers.SMS.ListVerificationCodes)   // 查看所有验证码（管理员）
		}

		// 管理端认证
		api.POST("/login", handlers.Admin.Login)
		api.POST("/send-admin-sms-code", handlers.Admin.SendAdminSMSCode)

		// 管理员账号管理
		api.GET("/admins", handlers.Admin.GetAdmins)
		api.POST("/admins", handlers.Admin.CreateAdmin)
		api.PUT("/admins/:id", handlers.Admin.UpdateAdmin)
		api.DELETE("/admins/:id", handlers.Admin.DeleteAdmin)
		api.POST("/admins/:id/reset-password", handlers.Admin.ResetAdminPassword)
		api.POST("/admins/change-password", handlers.Admin.ChangeOwnPassword)

		// 管理端数据（用户/骑手/商家）
		api.GET("/users", handlers.Admin.GetUsers)
		api.POST("/users", handlers.Admin.CreateUser)
		api.POST("/users/:id/reset-password", handlers.Admin.ResetUserPassword)
		api.POST("/users/:id/delete-orders", handlers.Admin.DeleteUserOrders)
		api.DELETE("/users/:id", handlers.Admin.DeleteUser)
		api.POST("/users/delete-all", handlers.Admin.DeleteAllUsers)
		api.GET("/users/export", handlers.Admin.ExportUsers)
		api.POST("/users/import", handlers.Admin.ImportUsers)

		api.GET("/riders", handlers.Admin.GetRiders)
		api.GET("/riders/:id", handlers.Admin.GetRiderByID)
		api.POST("/riders", handlers.Admin.CreateRider)
		api.PUT("/riders/:id", handlers.Admin.UpdateRider)
		api.PUT("/riders/:id/status", func(c *gin.Context) {
			riderId := c.Param("id")
			var req struct {
				IsOnline bool `json:"isOnline"`
			}
			if err := c.ShouldBindJSON(&req); err != nil {
				c.JSON(400, gin.H{"error": "Invalid request"})
				return
			}
			if err := db.Exec("UPDATE riders SET is_online = ? WHERE id = ?", req.IsOnline, riderId).Error; err != nil {
				c.JSON(500, gin.H{"error": "Failed to update status"})
				return
			}
			c.JSON(200, gin.H{"success": true})
		})
		api.GET("/riders/:id/stats", func(c *gin.Context) {
			if _, err := settleDueRiderIncomeTransactions(db, time.Now(), riderIncomeSettleBatch); err != nil {
				log.Printf("⚠️ rider stats 触发收入结算失败: %v", err)
			}

			riderId := c.Param("id")
			var rider repository.Rider
			if err := db.Where("id = ?", riderId).First(&rider).Error; err != nil {
				c.JSON(200, gin.H{
					"todayEarnings":  "0",
					"completedCount": 0,
					"onlineHours":    0,
					"onTimeRate":     0,
					"performance":    "暂无",
					"isOnline":       false,
				})
				return
			}

			// 计算在线时长（小时）
			now := time.Now()
			today := now.Format("2006-01-02")
			isOnline := rider.IsOnline && rider.UpdatedAt.After(now.Add(-riderOnlineTTL))
			onlineMinutes := 0
			if rider.LastOnlineDate == today {
				onlineMinutes = rider.TodayOnlineMinutes
			}
			// 如果当前在线，加上从开工到现在的时间
			if isOnline && rider.OnlineStartTime != nil {
				onlineMinutes += int(now.Sub(*rider.OnlineStartTime).Minutes())
			}
			onlineHours := float64(onlineMinutes) / 60.0

			// 计算今日完成单数
			todayStart := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
			var completedCount int64
			riderIdStr := riderId
			db.Model(&repository.Order{}).Where(
				"(rider_id = ? OR rider_id = ?) AND status = 'completed' AND updated_at >= ?",
				riderIdStr, rider.Phone, todayStart,
			).Count(&completedCount)

			// 今日收入来自骑手钱包收入流水（含冻结中和已入账，单位分）
			userIDs := []string{riderIdStr}
			resolvedWalletUserID := resolveRiderWalletUserID(db, riderIdStr, rider.Phone)
			if resolvedWalletUserID != "" && resolvedWalletUserID != riderIdStr {
				userIDs = append(userIDs, resolvedWalletUserID)
			}
			if rider.Phone != "" && rider.Phone != riderIdStr && rider.Phone != resolvedWalletUserID {
				userIDs = append(userIDs, rider.Phone)
			}
			var todayEarningsCents int64
			db.Model(&repository.WalletTransaction{}).
				Select("COALESCE(SUM(amount), 0)").
				Where("user_type = ? AND type = ? AND status IN ?", "rider", "income", []string{"pending", "success"}).
				Where("user_id IN ?", userIDs).
				Where("created_at >= ?", todayStart).
				Scan(&todayEarningsCents)
			todayEarnings := strconv.FormatFloat(float64(todayEarningsCents)/100.0, 'f', 2, 64)
			todayEarnings = strings.TrimRight(strings.TrimRight(todayEarnings, "0"), ".")
			if todayEarnings == "" {
				todayEarnings = "0"
			}

			// 计算准时率
			var totalDelivered, onTimeDelivered int64
			db.Model(&repository.Order{}).Where(
				"(rider_id = ? OR rider_id = ?) AND status = 'completed'",
				riderIdStr, rider.Phone,
			).Count(&totalDelivered)
			onTimeRate := 0
			if totalDelivered > 0 {
				// 简化：假设所有完成的都是准时的（后续可以加超时判断）
				onTimeDelivered = totalDelivered
				onTimeRate = int(onTimeDelivered * 100 / totalDelivered)
			}

			// 绩效评级
			performance := "暂无"
			if totalDelivered >= 100 {
				performance = "优秀"
			} else if totalDelivered >= 50 {
				performance = "良好"
			} else if totalDelivered >= 10 {
				performance = "一般"
			}

			c.JSON(200, gin.H{
				"todayEarnings":  todayEarnings,
				"completedCount": completedCount,
				"onlineHours":    int(onlineHours*10) / 10.0,
				"onTimeRate":     onTimeRate,
				"performance":    performance,
				// isOnline: 开工状态（持久化到数据库），用于骑手端重启后恢复状态
				"isOnline": rider.IsOnline,
				// isOnlineActive: 实时在线（心跳窗口内），用于需要实时在线判定的场景
				"isOnlineActive": isOnline,
			})
		})
		api.GET("/riders/:id/earnings", func(c *gin.Context) {
			if _, err := settleDueRiderIncomeTransactions(db, time.Now(), riderIncomeSettleBatch); err != nil {
				log.Printf("⚠️ rider earnings 触发收入结算失败: %v", err)
			}

			riderID := strings.TrimSpace(c.Param("id"))
			if riderID == "" {
				c.JSON(400, gin.H{"error": "rider id is required"})
				return
			}

			page := parsePositiveInt(c.Query("page"), 1)
			limit := parsePositiveInt(c.Query("limit"), 100)
			if limit > 500 {
				limit = 500
			}
			offset := (page - 1) * limit

			now := time.Now()
			startAt, endAt, monthLabel := parseMonthRange(c.Query("month"), now)

			var rider repository.Rider
			_ = db.Where("id = ?", riderID).First(&rider).Error

			userIDs := []string{riderID}
			resolvedWalletUserID := resolveRiderWalletUserID(db, riderID, rider.Phone)
			if resolvedWalletUserID != "" && resolvedWalletUserID != riderID {
				userIDs = append(userIDs, resolvedWalletUserID)
			}
			if rider.Phone != "" && rider.Phone != riderID && rider.Phone != resolvedWalletUserID {
				userIDs = append(userIDs, rider.Phone)
			}

			baseQuery := db.Model(&repository.WalletTransaction{}).
				Where("user_type = ? AND type = ?", "rider", "income").
				Where("user_id IN ?", userIDs).
				Where("created_at >= ? AND created_at < ?", startAt, endAt)

			var total int64
			if err := baseQuery.Count(&total).Error; err != nil {
				c.JSON(500, gin.H{"error": err.Error()})
				return
			}

			var txRows []repository.WalletTransaction
			if err := baseQuery.Order("created_at DESC").Offset(offset).Limit(limit).Find(&txRows).Error; err != nil {
				c.JSON(500, gin.H{"error": err.Error()})
				return
			}

			type earningsSummary struct {
				TotalIncome   int64
				SettledIncome int64
				PendingIncome int64
				OrderCount    int64
			}
			var summary earningsSummary
			if err := db.Model(&repository.WalletTransaction{}).
				Select(`
						COALESCE(SUM(amount), 0) AS total_income,
						COALESCE(SUM(CASE WHEN status = 'success' THEN amount ELSE 0 END), 0) AS settled_income,
						COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) AS pending_income,
						COUNT(*) AS order_count
					`).
				Where("user_type = ? AND type = ?", "rider", "income").
				Where("user_id IN ?", userIDs).
				Where("created_at >= ? AND created_at < ?", startAt, endAt).
				Scan(&summary).Error; err != nil {
				c.JSON(500, gin.H{"error": err.Error()})
				return
			}

			orderIDs := make([]uint, 0, len(txRows))
			orderIDSet := map[uint]struct{}{}
			for _, item := range txRows {
				if item.BusinessType != "order_income_freeze" {
					continue
				}
				id, err := strconv.ParseUint(strings.TrimSpace(item.BusinessID), 10, 64)
				if err != nil || id == 0 {
					continue
				}
				uid := uint(id)
				if _, exists := orderIDSet[uid]; exists {
					continue
				}
				orderIDSet[uid] = struct{}{}
				orderIDs = append(orderIDs, uid)
			}

			orderMap := map[string]repository.Order{}
			if len(orderIDs) > 0 {
				var orders []repository.Order
				if err := db.Where("id IN ?", orderIDs).Find(&orders).Error; err != nil {
					c.JSON(500, gin.H{"error": err.Error()})
					return
				}
				for _, order := range orders {
					orderMap[strconv.FormatUint(uint64(order.ID), 10)] = order
				}
			}

			items := make([]gin.H, 0, len(txRows))
			for _, txRow := range txRows {
				order := orderMap[strings.TrimSpace(txRow.BusinessID)]
				orderNo := order.DailyOrderID
				if strings.TrimSpace(orderNo) == "" {
					orderNo = strings.TrimSpace(txRow.BusinessID)
				}
				shopName := strings.TrimSpace(order.ShopName)
				title := "订单收入"
				if shopName != "" {
					title = "配送费 - " + shopName
				}

				items = append(items, gin.H{
					"transactionId": txRow.TransactionID,
					"orderId":       txRow.BusinessID,
					"orderNo":       orderNo,
					"shopName":      shopName,
					"title":         title,
					"amount":        txRow.Amount,
					"status":        txRow.Status,
					"createdAt":     txRow.CreatedAt,
					"availableAt":   txRow.CreatedAt.Add(riderIncomeFreezeDuration),
					"completedAt":   txRow.CompletedAt,
					"description":   txRow.Description,
				})
			}

			c.JSON(200, gin.H{
				"success": true,
				"summary": gin.H{
					"month":         monthLabel,
					"totalIncome":   summary.TotalIncome,
					"settledIncome": summary.SettledIncome,
					"pendingIncome": summary.PendingIncome,
					"orderCount":    summary.OrderCount,
				},
				"items": items,
				"pagination": gin.H{
					"page":  page,
					"limit": limit,
					"total": total,
				},
			})
		})
		api.GET("/riders/:id/orders", func(c *gin.Context) {
			if _, err := settleDueRiderIncomeTransactions(db, time.Now(), riderIncomeSettleBatch); err != nil {
				log.Printf("⚠️ rider orders 触发收入结算失败: %v", err)
			}

			riderID := c.Param("id")
			status := c.Query("status")

			var rider repository.Rider
			_ = db.Where("id = ?", riderID).First(&rider).Error

			query := db.Model(&repository.Order{})
			if rider.Phone != "" {
				query = query.Where("(rider_id = ? OR rider_id = ?)", riderID, rider.Phone)
			} else {
				query = query.Where("rider_id = ?", riderID)
			}
			query = query.Where("(biz_type = ? OR biz_type IS NULL OR biz_type = '')", "takeout")
			if status != "" {
				query = query.Where("status = ?", status)
			}

			var orders []repository.Order
			if err := query.Order("created_at DESC").Limit(200).Find(&orders).Error; err != nil {
				c.JSON(500, gin.H{"error": err.Error()})
				return
			}
			c.JSON(200, orders)
		})
		api.GET("/riders/orders/available", func(c *gin.Context) {
			// 骑手大厅仅展示已支付且尚未指派的待接单订单
			var orders []repository.Order
			if err := db.Model(&repository.Order{}).
				Where("status = ?", "pending").
				Where("(biz_type = ? OR biz_type IS NULL OR biz_type = '')", "takeout").
				Where("(rider_id IS NULL OR rider_id = '')").
				Where("payment_status = ?", "paid").
				Order("created_at DESC").
				Limit(200).
				Find(&orders).Error; err != nil {
				c.JSON(500, gin.H{"error": err.Error()})
				return
			}
			c.JSON(200, orders)
		})

		// 骑手个人信息管理
		api.PUT("/riders/:id/avatar", handlers.Rider.UpdateAvatar)
		api.GET("/riders/:id/profile", handlers.Rider.GetProfile)
		api.PUT("/riders/:id/profile", handlers.Rider.UpdateProfile)
		api.POST("/riders/:id/cert", handlers.Rider.UploadCert)
		api.POST("/riders/:id/change-phone", handlers.Rider.SecureChangePhone)
		api.POST("/riders/:id/change-password", handlers.Rider.ChangePassword)
		api.GET("/riders/:id/rank", handlers.Rider.GetRank)
		api.GET("/riders/rank-list", handlers.Rider.GetRankList)
		api.PUT("/riders/:id/online-status", handlers.Rider.UpdateOnlineStatus)
		api.POST("/riders/:id/heartbeat", handlers.Rider.Heartbeat)

		api.DELETE("/riders/:id", handlers.Admin.DeleteUser)
		api.POST("/riders/:id/reset-password", handlers.Admin.ResetRiderPassword)
		api.POST("/riders/:id/delete-orders", handlers.Admin.DeleteRiderOrders)
		api.POST("/riders/delete-all", handlers.Admin.DeleteAllRiders)
		api.GET("/riders/export", handlers.Admin.ExportRiders)
		api.POST("/riders/import", handlers.Admin.ImportRiders)

		api.GET("/merchants", handlers.Admin.GetMerchants)
		api.POST("/merchants", handlers.Admin.CreateMerchant)
		api.POST("/merchants/delete-all", handlers.Admin.DeleteAllMerchants)
		api.GET("/merchants/export", handlers.Admin.ExportMerchants)
		api.POST("/merchants/import", handlers.Admin.ImportMerchants)
		api.GET("/merchant/:id", handlers.Admin.GetMerchant)
		api.PUT("/merchants/:id", handlers.Admin.UpdateMerchant)
		api.POST("/merchants/:id/reset-password", handlers.Admin.ResetMerchantPassword)
		api.DELETE("/merchants/:id", handlers.Admin.DeleteMerchant)

		api.POST("/reorganize-role-ids/customer", handlers.Admin.ReorganizeUserRoleIDs)
		api.POST("/reorganize-role-ids/rider", handlers.Admin.ReorganizeRiderRoleIDs)
		api.POST("/reorganize-role-ids/merchant", handlers.Admin.ReorganizeMerchantRoleIDs)

		// 管理端统计
		api.GET("/stats", handlers.Admin.GetStats)
		api.GET("/user-ranks", handlers.Admin.GetUserRanks)
		api.GET("/rider-ranks", handlers.Admin.GetRiderRanks)

		// 管理端设置与内容
		api.GET("/debug-mode", handlers.AdminSettings.GetDebugMode)
		api.POST("/debug-mode", handlers.AdminSettings.UpdateDebugMode)
		api.GET("/sms-config", handlers.AdminSettings.GetSMSConfig)
		api.POST("/sms-config", handlers.AdminSettings.UpdateSMSConfig)
		api.GET("/weather-config", handlers.AdminSettings.GetWeatherConfig)
		api.POST("/weather-config", handlers.AdminSettings.UpdateWeatherConfig)
		api.GET("/wechat-login-config", handlers.AdminSettings.GetWechatLoginConfig)
		api.POST("/wechat-login-config", handlers.AdminSettings.UpdateWechatLoginConfig)
		api.GET("/service-settings", handlers.AdminSettings.GetServiceSettings)
		api.POST("/service-settings", handlers.AdminSettings.UpdateServiceSettings)
		api.GET("/charity-settings", handlers.AdminSettings.GetCharitySettings)
		api.POST("/charity-settings", handlers.AdminSettings.UpdateCharitySettings)
		api.GET("/vip-settings", handlers.AdminSettings.GetVIPSettings)
		api.POST("/vip-settings", handlers.AdminSettings.UpdateVIPSettings)
		api.GET("/coin-ratio", handlers.AdminSettings.GetCoinRatio)
		api.POST("/coin-ratio", handlers.AdminSettings.UpdateCoinRatio)

		api.GET("/pay-config/mode", handlers.AdminSettings.GetPayMode)
		api.POST("/pay-config/mode", handlers.AdminSettings.UpdatePayMode)
		api.GET("/pay-config/wxpay", handlers.AdminSettings.GetWxpayConfig)
		api.POST("/pay-config/wxpay", handlers.AdminSettings.UpdateWxpayConfig)
		api.GET("/pay-config/alipay", handlers.AdminSettings.GetAlipayConfig)
		api.POST("/pay-config/alipay", handlers.AdminSettings.UpdateAlipayConfig)
		api.GET("/payment-notices", handlers.AdminSettings.GetPaymentNotices)
		api.POST("/payment-notices", handlers.AdminSettings.UpdatePaymentNotices)
		api.GET("/carousel-settings", handlers.AdminSettings.GetCarouselSettings)
		api.POST("/carousel-settings", handlers.AdminSettings.UpdateCarouselSettings)

		api.GET("/carousel", handlers.AdminSettings.GetCarousel)
		api.POST("/carousel", handlers.AdminSettings.CreateCarousel)
		api.PUT("/carousel/:id", handlers.AdminSettings.UpdateCarousel)
		api.DELETE("/carousel/:id", handlers.AdminSettings.DeleteCarousel)

		api.GET("/push-messages", handlers.AdminSettings.GetPushMessages)
		api.POST("/push-messages", handlers.AdminSettings.CreatePushMessage)
		api.GET("/push-messages/:id/stats", handlers.AdminSettings.GetPushMessageStats)
		api.GET("/push-messages/:id/deliveries", handlers.AdminSettings.GetPushMessageDeliveries)
		api.PUT("/push-messages/:id", handlers.AdminSettings.UpdatePushMessage)
		api.DELETE("/push-messages/:id", handlers.AdminSettings.DeletePushMessage)

		api.GET("/public-apis", handlers.AdminSettings.GetPublicAPIs)
		api.POST("/public-apis", handlers.AdminSettings.CreatePublicAPI)
		api.PUT("/public-apis/:id", handlers.AdminSettings.UpdatePublicAPI)
		api.DELETE("/public-apis/:id", handlers.AdminSettings.DeletePublicAPI)

		api.POST("/upload-image", handlers.AdminSettings.UploadImage)
		api.GET("/app-download-config", handlers.AdminSettings.GetAppDownloadConfig)
		api.GET("/weather", handlers.AdminSettings.GetWeather)
		api.GET("/public/runtime-settings", handlers.AdminSettings.GetPublicRuntimeSettings)
		api.GET("/public/charity-settings", handlers.AdminSettings.GetPublicCharitySettings)
		api.GET("/public/vip-settings", handlers.AdminSettings.GetPublicVIPSettings)
		api.GET("/home/feed", handlers.HomeFeed.GetHomeFeed)

		appDownloadAdmin := api.Group("")
		appDownloadAdmin.Use(middleware.RequireAdmin(services.Admin))
		{
			appDownloadAdmin.POST("/app-download-config", handlers.AdminSettings.UpdateAppDownloadConfig)
			appDownloadAdmin.POST("/upload/package", handlers.AdminSettings.UploadPackage)
		}

		// 认证相关
		api.POST("/auth/login", handlers.Auth.Login)
		api.POST("/auth/register", handlers.Auth.Register)
		api.GET("/auth/wechat/start", handlers.Auth.WechatStart)
		api.GET("/auth/wechat/callback", handlers.Auth.WechatCallback)
		api.GET("/auth/wechat/session", handlers.Auth.ConsumeWechatSession)
		api.POST("/auth/wechat/bind-login", handlers.Auth.WechatBindLogin)
		api.POST("/auth/verify", handlers.Auth.VerifyToken)
		api.POST("/auth/refresh", handlers.Auth.RefreshToken)
		api.POST("/auth/rider/login", handlers.Auth.RiderLogin)
		api.POST("/auth/merchant/login", handlers.Auth.MerchantLogin)
		api.POST("/auth/set-new-password", handlers.Auth.SetNewPassword)
		api.POST("/auth/rider/set-new-password", handlers.Auth.RiderSetNewPassword)
		api.POST("/auth/merchant/set-new-password", handlers.Auth.MerchantSetNewPassword)

		// 商家相关
		api.GET("/shops/categories", handlers.Shop.GetShopCategories)

		// 优惠券相关（必须在 /shops/:id 之前，避免路由冲突）
		// 管理端 - 优惠券管理
		api.POST("/coupons", couponHandler.CreateCoupon)
		api.PUT("/coupons/:id", couponHandler.UpdateCoupon)
		api.DELETE("/coupons/:id", couponHandler.DeleteCoupon)
		api.GET("/coupons/:id", couponHandler.GetCouponByID)
		api.GET("/shops/:id/coupons", couponHandler.GetShopCoupons)
		api.GET("/shops/:id/coupons/active", couponHandler.GetActiveCoupons)
		api.GET("/admin/coupons", couponHandler.AdminListCoupons)
		api.POST("/admin/coupons", couponHandler.CreateCoupon)
		api.GET("/admin/coupons/:couponId/issue-logs", couponHandler.AdminListCouponIssueLogs)
		api.POST("/admin/coupons/:couponId/issue", couponHandler.AdminIssueCouponToPhone)

		// 用户端 - 优惠券操作
		api.POST("/coupons/:couponId/receive", couponHandler.ReceiveCoupon)
		api.GET("/coupons/user", couponHandler.GetUserCoupons)
		api.GET("/coupons/available", couponHandler.GetAvailableCoupons)
		api.GET("/coupon-links/:token", couponHandler.PublicGetCouponByToken)
		api.POST("/coupon-links/:token/claim", couponHandler.PublicClaimCouponByToken)

		// 商家基本路由
		api.GET("/shops", handlers.Shop.GetShops)
		api.GET("/shops/today-recommended", handlers.Shop.GetTodayRecommendedShops)
		api.GET("/shops/:id", handlers.Shop.GetShopDetail)
		api.GET("/shops/:id/menu", handlers.Shop.GetShopMenu)
		api.GET("/shops/:id/reviews", handlers.Shop.GetShopReviews)
		api.POST("/shops", handlers.Shop.CreateShop)
		api.PUT("/shops/:id", handlers.Shop.UpdateShop)
		api.POST("/shops/:id/today-recommend/move", handlers.Shop.MoveTodayRecommendPosition)
		api.DELETE("/shops/:id", handlers.Shop.DeleteShop)

		// 商户店铺管理
		api.GET("/merchants/:merchantId/shops", handlers.Shop.GetMerchantShops)

		// 评价管理
		api.POST("/reviews", handlers.Shop.CreateReview)
		api.PUT("/reviews/:id", handlers.Shop.UpdateReview)
		api.DELETE("/reviews/:id", handlers.Shop.DeleteReview)
		api.POST("/rider-reviews/submit", handlers.Rider.CreateReview)
		api.GET("/riders/:id/rating", handlers.Rider.GetRating)

		adminRiderReviews := api.Group("")
		adminRiderReviews.Use(middleware.RequireAdmin(services.Admin))
		{
			adminRiderReviews.POST("/rider-reviews", handlers.Rider.CreateReview)
			adminRiderReviews.PUT("/rider-reviews/:id", handlers.Rider.UpdateReview)
			adminRiderReviews.DELETE("/rider-reviews/:id", handlers.Rider.DeleteReview)
			adminRiderReviews.GET("/riders/:id/reviews", handlers.Rider.GetReviews)
		}

		// 订单相关（注意：更具体的路由必须放在更通用的路由之前）
		api.GET("/orders", handlers.Admin.GetOrders)
		api.GET("/orders/export", handlers.Admin.ExportOrders)
		api.POST("/orders/import", handlers.Admin.ImportOrders)
		api.POST("/orders/delete-all", handlers.Admin.DeleteAllOrders)
		api.POST("/admin/clear-all-data", handlers.Admin.ClearAllData)
		api.POST("/orders", handlers.Order.CreateOrder)
		api.POST("/orders/:id/dispatch", func(c *gin.Context) {
			orderID := strings.TrimSpace(c.Param("id"))
			if orderID == "" {
				c.JSON(400, gin.H{"error": "order id is required"})
				return
			}

			var targetOrder repository.Order
			if err := db.Where("id = ?", orderID).First(&targetOrder).Error; err != nil {
				if errors.Is(err, gorm.ErrRecordNotFound) {
					c.JSON(404, gin.H{"error": "order not found"})
					return
				}
				c.JSON(500, gin.H{"error": err.Error()})
				return
			}
			if strings.EqualFold(strings.TrimSpace(targetOrder.BizType), "groupbuy") {
				c.JSON(409, gin.H{"error": "groupbuy order does not support dispatch"})
				return
			}

			if getOperatorRole(c) == "merchant" {
				merchantID := getMerchantID(c)
				if merchantID <= 0 {
					c.JSON(401, gin.H{"error": "merchant identity is missing"})
					return
				}
				owned, err := merchantOwnsOrder(db, &targetOrder, merchantID)
				if err != nil {
					c.JSON(500, gin.H{"error": err.Error()})
					return
				}
				if !owned {
					c.JSON(403, gin.H{"error": "no permission to dispatch this order"})
					return
				}
			}

			onlineCutoff := time.Now().Add(-riderOnlineTTL)

			var riders []repository.Rider
			if err := db.Model(&repository.Rider{}).
				Where("is_online = ? AND updated_at >= ?", true, onlineCutoff).
				Order("updated_at ASC, id ASC").
				Limit(200).
				Find(&riders).Error; err != nil {
				c.JSON(500, gin.H{"error": err.Error()})
				return
			}
			if len(riders) == 0 {
				c.JSON(409, gin.H{"error": "no online rider available"})
				return
			}

			selected := riders[0]
			selectedLoad := int64(1 << 62)
			activeStatuses := []string{"pending", "accepted", "delivering"}

			for _, rider := range riders {
				riderIDStr := strconv.FormatUint(uint64(rider.ID), 10)
				var activeCount int64
				if err := db.Model(&repository.Order{}).
					Where("(rider_id = ? OR rider_id = ?)", riderIDStr, rider.Phone).
					Where("status IN ?", activeStatuses).
					Count(&activeCount).Error; err != nil {
					c.JSON(500, gin.H{"error": err.Error()})
					return
				}

				if activeCount < selectedLoad {
					selected = rider
					selectedLoad = activeCount
				}
			}

			selectedIDStr := strconv.FormatUint(uint64(selected.ID), 10)
			result := db.Model(&repository.Order{}).
				Where("id = ?", orderID).
				Where("status = ?", "pending").
				Where("(biz_type = ? OR biz_type IS NULL OR biz_type = '')", "takeout").
				Where("(rider_id IS NULL OR rider_id = '')").
				Updates(map[string]interface{}{
					"rider_id":    selectedIDStr,
					"rider_name":  selected.Name,
					"rider_phone": selected.Phone,
					"status":      "accepted",
					"accepted_at": time.Now(),
				})

			if result.Error != nil {
				c.JSON(500, gin.H{"error": result.Error.Error()})
				return
			}
			if result.RowsAffected == 0 {
				c.JSON(409, gin.H{"error": "order cannot be dispatched"})
				return
			}

			var order repository.Order
			if err := db.Where("id = ?", orderID).First(&order).Error; err != nil {
				c.JSON(500, gin.H{"error": err.Error()})
				return
			}

			c.JSON(200, gin.H{
				"success": true,
				"message": "dispatch success",
				"rider": gin.H{
					"id":    selected.UID,
					"name":  selected.Name,
					"phone": selected.Phone,
				},
				"order": order,
			})
		})
		api.POST("/orders/:id/accept", func(c *gin.Context) {
			orderID := c.Param("id")
			var req struct {
				RiderID string `json:"rider_id"`
			}
			if err := c.ShouldBindJSON(&req); err != nil {
				c.JSON(400, gin.H{"error": "Invalid request"})
				return
			}

			riderID := strings.TrimSpace(req.RiderID)
			if riderID == "" {
				c.JSON(400, gin.H{"error": "rider_id is required"})
				return
			}

			updates := map[string]interface{}{
				"rider_id":    riderID,
				"status":      "accepted",
				"accepted_at": time.Now(),
			}

			var rider repository.Rider
			if err := db.Where("id = ? OR phone = ?", riderID, riderID).First(&rider).Error; err == nil {
				if rider.Name != "" {
					updates["rider_name"] = rider.Name
				}
				if rider.Phone != "" {
					updates["rider_phone"] = rider.Phone
				}
			}

			result := db.Model(&repository.Order{}).
				Where("id = ?", orderID).
				Where("status = ?", "pending").
				Where("(biz_type = ? OR biz_type IS NULL OR biz_type = '')", "takeout").
				Where("payment_status = ?", "paid").
				Where("(rider_id IS NULL OR rider_id = '')").
				Updates(updates)

			if result.Error != nil {
				c.JSON(500, gin.H{"error": result.Error.Error()})
				return
			}
			if result.RowsAffected == 0 {
				c.JSON(409, gin.H{"error": "order is unavailable"})
				return
			}

			var order repository.Order
			if err := db.Where("id = ?", orderID).First(&order).Error; err != nil {
				c.JSON(500, gin.H{"error": err.Error()})
				return
			}
			c.JSON(200, gin.H{"success": true, "data": order})
		})
		api.POST("/orders/:id/pickup", func(c *gin.Context) {
			orderID := c.Param("id")
			query := db.Model(&repository.Order{}).
				Where("id = ?", orderID).
				Where("status IN ?", []string{"pending", "accepted"}).
				Where("(biz_type = ? OR biz_type IS NULL OR biz_type = '')", "takeout").
				Where("rider_id IS NOT NULL AND rider_id <> ''")
			if getOperatorRole(c) == "rider" {
				riderIDs := getRiderIdentities(c)
				if len(riderIDs) == 0 {
					c.JSON(401, gin.H{"error": "rider identity is missing"})
					return
				}
				query = query.Where("(rider_id IN ? OR rider_phone IN ?)", riderIDs, riderIDs)
			}

			result := query.Updates(map[string]interface{}{
				"status": "delivering",
			})
			if result.Error != nil {
				c.JSON(500, gin.H{"error": result.Error.Error()})
				return
			}
			if result.RowsAffected == 0 {
				c.JSON(409, gin.H{"error": "order is not ready for pickup"})
				return
			}

			var order repository.Order
			if err := db.Where("id = ?", orderID).First(&order).Error; err != nil {
				c.JSON(500, gin.H{"error": err.Error()})
				return
			}
			c.JSON(200, gin.H{"success": true, "data": order})
		})
		api.POST("/orders/:id/deliver", func(c *gin.Context) {
			orderID := c.Param("id")
			role := getOperatorRole(c)
			riderIDs := getRiderIdentities(c)
			if role == "rider" && len(riderIDs) == 0 {
				c.JSON(401, gin.H{"error": "rider identity is missing"})
				return
			}
			var order repository.Order
			if err := db.Transaction(func(tx *gorm.DB) error {
				now := time.Now()
				updateQuery := tx.Model(&repository.Order{}).
					Where("id = ?", orderID).
					Where("status = ?", "delivering")
				updateQuery = updateQuery.Where("(biz_type = ? OR biz_type IS NULL OR biz_type = '')", "takeout")
				if role == "rider" {
					updateQuery = updateQuery.Where("(rider_id IN ? OR rider_phone IN ?)", riderIDs, riderIDs)
				}
				result := updateQuery.Updates(map[string]interface{}{
					"status":       "completed",
					"completed_at": now,
				})
				if result.Error != nil {
					return result.Error
				}
				if result.RowsAffected == 0 {
					return errOrderNotDelivering
				}

				if err := tx.Where("id = ?", orderID).First(&order).Error; err != nil {
					return err
				}

				completedAt := now
				if order.CompletedAt != nil {
					completedAt = *order.CompletedAt
				}
				_, err := createRiderIncomeFreezeTransaction(tx, &order, completedAt)
				return err
			}); err != nil {
				if errors.Is(err, errOrderNotDelivering) {
					c.JSON(409, gin.H{"error": "order is not in delivering status"})
					return
				}
				c.JSON(500, gin.H{"error": err.Error()})
				return
			}
			c.JSON(200, gin.H{"success": true, "data": order})
		})
		api.POST("/orders/:id/reviewed", handlers.Order.MarkOrderReviewed)
		api.POST("/orders/:id/exception-report", handlers.Order.ReportOrderException)
		api.GET("/orders/user/:userId", handlers.Order.GetUserOrders) // 必须在 /orders/:id 之前
		api.GET("/orders/:id", handlers.Order.GetOrderDetail)

		// 售后申请
		api.POST("/after-sales", handlers.AfterSales.Create)
		api.GET("/after-sales", handlers.AfterSales.List)
		api.GET("/after-sales/user/:userId", handlers.AfterSales.ListByUserID)
		api.POST("/after-sales/clear", handlers.AfterSales.Clear)
		api.PUT("/after-sales/:id/status", handlers.AfterSales.UpdateStatus)
		api.POST("/merchant/groupbuy/refunds", handlers.AfterSales.CreateMerchantGroupbuyRefund)

		// 团购券
		api.GET("/groupbuy/vouchers", handlers.Groupbuy.ListUserVouchers)
		api.GET("/groupbuy/vouchers/:id/qrcode", handlers.Groupbuy.GetVoucherQRCode)
		api.POST("/merchant/groupbuy/vouchers/redeem-by-scan", handlers.Groupbuy.RedeemByScan)

		// 运营通知
		api.GET("/op-notifications", handlers.OpNotification.List)
		api.POST("/op-notifications/:id/read", handlers.OpNotification.MarkRead)

		// 积分相关
		api.GET("/points/balance", handlers.Points.GetBalance)
		api.GET("/points/goods", handlers.Points.ListGoods)
		api.POST("/points/goods", handlers.Points.CreateGood)
		api.PUT("/points/goods/:id", handlers.Points.UpdateGood)
		api.DELETE("/points/goods/:id", handlers.Points.DeleteGood)
		api.POST("/points/redeem", handlers.Points.Redeem)
		api.POST("/points/earn", handlers.Points.Earn)
		api.POST("/points/refund", handlers.Points.Refund)
		api.GET("/points/redemptions", handlers.Points.ListRedemptions)
		api.PUT("/points/redemptions/:id", handlers.Points.UpdateRedemption)

		// 商务合作
		api.POST("/cooperations", handlers.Cooperation.Create)
		api.GET("/cooperations", handlers.Cooperation.List)
		api.PUT("/cooperations/:id", handlers.Cooperation.Update)

		// 邀请好友
		api.GET("/invite/code", handlers.Invite.GetCode)
		api.POST("/invite/share", handlers.Invite.Share)
		api.GET("/invite/codes", handlers.Invite.ListCodes)
		api.GET("/invite/records", handlers.Invite.ListRecords)

		// 入驻邀请链接（公开页）
		api.GET("/onboarding/invites/:token", handlers.OnboardingInvite.PublicGetInvite)
		api.POST("/onboarding/invites/:token/submit", handlers.OnboardingInvite.PublicSubmitInvite)

		// 入驻邀请链接（管理端）
		onboardingAdmin := api.Group("/admin/onboarding/invites")
		onboardingAdmin.Use(middleware.RequireAdmin(services.Admin))
		{
			onboardingAdmin.POST("", handlers.OnboardingInvite.AdminCreateInvite)
			onboardingAdmin.GET("", handlers.OnboardingInvite.AdminListInvites)
			onboardingAdmin.POST("/:id/revoke", handlers.OnboardingInvite.AdminRevokeInvite)
			onboardingAdmin.GET("/submissions", handlers.OnboardingInvite.AdminListSubmissions)
		}

		// 用户侧收藏与评价
		api.GET("/user/:id/favorites", handlers.Shop.GetUserFavorites)
		api.POST("/user/:id/favorites", handlers.Shop.AddUserFavorite)
		api.DELETE("/user/:id/favorites/:shopId", handlers.Shop.DeleteUserFavorite)
		api.GET("/user/:id/favorites/:shopId/status", handlers.Shop.GetUserFavoriteStatus)
		api.GET("/user/:id/reviews", handlers.Shop.GetUserReviews)

		// 用户相关
		api.GET("/user/:id", handlers.User.GetUser)
		api.PUT("/user/:id", handlers.User.UpdateProfile)
		api.POST("/user/:id/change-phone", handlers.User.ChangePhone)
		api.GET("/user/:id/addresses", handlers.User.ListAddresses)
		api.GET("/user/:id/addresses/default", handlers.User.GetDefaultAddress)
		api.POST("/user/:id/addresses", handlers.User.CreateAddress)
		api.PUT("/user/:id/addresses/:addressId", handlers.User.UpdateAddress)
		api.DELETE("/user/:id/addresses/:addressId", handlers.User.DeleteAddress)
		api.POST("/user/:id/addresses/:addressId/default", handlers.User.SetDefaultAddress)

		// 消息相关（注意：更具体的路由必须放在更通用的路由之前）
		messages := api.Group("/messages")
		{
			messages.GET("/targets/search", handlers.Message.SearchTargets)
			messages.POST("/conversations/upsert", handlers.Message.UpsertConversation)
			messages.POST("/conversations/read-all", handlers.Message.MarkAllConversationsRead)
			messages.POST("/conversations/:chatId/read", handlers.Message.MarkConversationRead)
			messages.POST("/sync", handlers.Message.SyncMessage)
			messages.GET("/conversations", handlers.Message.GetConversations) // 必须在 /:roomId 之前
			messages.GET("/:roomId", handlers.Message.GetMessageHistory)
		}

		// 通知相关
		diningBuddy := api.Group("/dining-buddy")
		{
			diningBuddy.GET("/parties", handlers.DiningBuddy.ListParties)
			diningBuddy.POST("/parties", handlers.DiningBuddy.CreateParty)
			diningBuddy.POST("/parties/:id/join", handlers.DiningBuddy.JoinParty)
			diningBuddy.GET("/parties/:id/messages", handlers.DiningBuddy.ListMessages)
			diningBuddy.POST("/parties/:id/messages", handlers.DiningBuddy.SendMessage)
		}

		medicine := api.Group("/medicine")
		{
			medicine.POST("/consult", handlers.Medicine.Consult)
		}

		api.GET("/notifications", handlers.Notification.GetNotificationList)
		api.GET("/notifications/:id", handlers.Notification.GetNotificationDetail)
		api.POST("/notifications/:id/read", handlers.Notification.MarkRead)
		api.POST("/notifications/read-all", handlers.Notification.MarkAllRead)

		// iOS 原生移动端能力（Push / Map）
		api.POST("/mobile/push/devices/register", handlers.MobilePush.RegisterDevice)
		api.POST("/mobile/push/devices/unregister", handlers.MobilePush.UnregisterDevice)
		api.POST("/mobile/push/ack", handlers.MobilePush.Ack)
		api.GET("/mobile/maps/search", handlers.MobileMap.Search)
		api.GET("/mobile/maps/reverse-geocode", handlers.MobileMap.ReverseGeocode)

		// 通知管理（管理端）
		notificationAdmin := api.Group("/notifications/admin")
		{
			notificationAdmin.GET("/all", handlers.Notification.GetAllNotifications)
			notificationAdmin.GET("/:id", handlers.Notification.GetNotificationByIDAdmin)
			notificationAdmin.POST("", handlers.Notification.CreateNotification)
			notificationAdmin.PUT("/:id", handlers.Notification.UpdateNotification)
			notificationAdmin.DELETE("/:id", handlers.Notification.DeleteNotification)
		}

		// 商品相关（注意：更具体的路由必须放在更通用的路由之前）
		api.GET("/categories", handlers.Product.GetCategories)
		api.GET("/products", handlers.Product.GetProducts)
		api.GET("/products/featured", handlers.Product.GetFeaturedProducts)
		api.GET("/products/:id", handlers.Product.GetProductDetail)
		api.GET("/banners", handlers.Product.GetBanners)

		merchantWritableProduct := api.Group("")
		merchantWritableProduct.Use(middleware.RequireMerchantOrAdmin(services.Auth, services.Admin))
		{
			merchantWritableProduct.POST("/categories", handlers.Product.CreateCategory)
			merchantWritableProduct.PUT("/categories/:id", handlers.Product.UpdateCategory)
			merchantWritableProduct.DELETE("/categories/:id", handlers.Product.DeleteCategory)

			merchantWritableProduct.POST("/products", handlers.Product.CreateProduct)
			merchantWritableProduct.PUT("/products/:id", handlers.Product.UpdateProduct)
			merchantWritableProduct.DELETE("/products/:id", handlers.Product.DeleteProduct)

			merchantWritableProduct.POST("/banners", handlers.Product.CreateBanner)
			merchantWritableProduct.PUT("/banners/:id", handlers.Product.UpdateBanner)
			merchantWritableProduct.DELETE("/banners/:id", handlers.Product.DeleteBanner)
		}

		// 今日推荐管理（管理端使用）
		api.GET("/featured-products", handlers.FeaturedProduct.GetFeaturedProducts)
		api.POST("/featured-products", handlers.FeaturedProduct.AddFeaturedProduct)
		api.DELETE("/featured-products/:id", handlers.FeaturedProduct.RemoveFeaturedProduct)
		api.PUT("/featured-products/:id/position", handlers.FeaturedProduct.UpdateFeaturedProductPosition)
		api.GET("/home-campaigns", handlers.HomeFeed.ListCampaigns)
		api.POST("/home-campaigns", handlers.HomeFeed.CreateCampaign)
		api.PUT("/home-campaigns/:id", handlers.HomeFeed.UpdateCampaign)
		api.POST("/home-campaigns/:id/:action", handlers.HomeFeed.ChangeCampaignStatus)
		api.GET("/home-slots", handlers.HomeFeed.GetHomeSlots)
		api.PUT("/home-slots", handlers.HomeFeed.UpsertLockedSlot)

		// 文件上传
		api.POST("/upload/image", handlers.Upload.UploadImage)

		// 同步相关（用于本地 SQLite 缓存）
		api.GET("/sync/state", handlers.Sync.GetSyncState)
		api.GET("/sync/:dataset", handlers.Sync.GetSyncData)

		// 钱包相关（用户端）
		wallet := api.Group("/wallet")
		{
			wallet.GET("/balance", handlers.Wallet.GetBalance)
			wallet.GET("/transactions", handlers.Wallet.ListTransactions)
			wallet.POST("/recharge", handlers.Wallet.Recharge)
			wallet.POST("/payment", handlers.Wallet.Payment)
			wallet.POST("/withdraw", handlers.Wallet.Withdraw)
			wallet.GET("/withdraw/records", handlers.Wallet.ListWithdrawRecords)
		}

		// 支付回调
		api.POST("/payment/callback/wechat", handlers.Payment.WechatCallback)
		api.POST("/payment/callback/alipay", handlers.Payment.AlipayCallback)

		// 财务中心（admin）
		financial := api.Group("/admin/financial")
		{
			financial.GET("/overview", handlers.Financial.GetOverview)
			financial.GET("/statistics", handlers.Financial.GetStatistics)
			financial.GET("/user-details", handlers.Financial.GetUserDetails)
			financial.GET("/export", handlers.Financial.Export)
			financial.GET("/transaction-logs", handlers.Financial.GetTransactionLogs)
			financial.POST("/transaction-logs/delete", handlers.Financial.DeleteTransactionLog)
			financial.POST("/transaction-logs/clear", handlers.Financial.ClearTransactionLogs)
		}

		// Admin 钱包操作
		adminWallet := api.Group("/admin/wallet")
		{
			adminWallet.POST("/add-balance", handlers.AdminWallet.AddBalance)
			adminWallet.POST("/deduct-balance", handlers.AdminWallet.DeductBalance)
			adminWallet.POST("/freeze", handlers.AdminWallet.FreezeAccount)
			adminWallet.POST("/unfreeze", handlers.AdminWallet.UnfreezeAccount)
			adminWallet.POST("/recharge", handlers.AdminWallet.AdminRecharge)
			adminWallet.GET("/operations", handlers.AdminWallet.ListOperations)
			adminWallet.GET("/withdraw-requests", handlers.AdminWallet.ListWithdrawRequests)
			adminWallet.POST("/withdraw-requests/review", handlers.AdminWallet.ReviewWithdraw)
		}
	}

	// 404 处理（返回 JSON 而不是 HTML）
	r.NoRoute(func(c *gin.Context) {
		log.Printf("❌ [404] 路由不存在: %s %s", c.Request.Method, c.Request.URL.Path)
		c.Header("Content-Type", "application/json")
		c.JSON(404, gin.H{
			"success": false,
			"error":   "路由不存在",
			"message": "请求的路由不存在: " + c.Request.Method + " " + c.Request.URL.Path,
			"path":    c.Request.URL.Path,
			"method":  c.Request.Method,
		})
	})

	// 添加路由调试信息
	log.Println("📋 已注册的路由:")
	log.Println("  POST /api/sms/request")
	log.Println("  POST /api/sms/verify")
	log.Println("  POST /api/sms/verify-check")
	log.Println("  GET  /api/captcha")
	log.Println("  POST /api/auth/login")
	log.Println("  POST /api/auth/register")
	log.Println("  GET  /api/messages/targets/search")
	log.Println("  POST /api/messages/conversations/upsert")
	log.Println("  POST /api/messages/conversations/read-all")
	log.Println("  POST /api/messages/conversations/:chatId/read")
	log.Println("  POST /api/messages/sync")
	log.Println("  GET  /api/messages/conversations")
	log.Println("  GET  /api/messages/:roomId")
	log.Println("  GET  /api/dining-buddy/parties")
	log.Println("  POST /api/dining-buddy/parties")
	log.Println("  POST /api/dining-buddy/parties/:id/join")
	log.Println("  GET  /api/dining-buddy/parties/:id/messages")
	log.Println("  POST /api/dining-buddy/parties/:id/messages")
	log.Println("  POST /api/medicine/consult")
	log.Println("  GET  /api/notifications")
	log.Println("  GET  /api/notifications/:id")
	log.Println("  POST /api/mobile/push/devices/register")
	log.Println("  POST /api/mobile/push/devices/unregister")
	log.Println("  POST /api/mobile/push/ack")
	log.Println("  GET  /api/mobile/maps/search")
	log.Println("  GET  /api/mobile/maps/reverse-geocode")

	// 启动服务
	port := cfg.Port
	if port == "" {
		port = "1029"
	}

	log.Printf("🚀 Go API Server running on port %s", port)
	server := &http.Server{
		Addr:              ":" + port,
		Handler:           r,
		ReadTimeout:       cfg.HTTP.ReadTimeout,
		ReadHeaderTimeout: cfg.HTTP.ReadHeaderTimeout,
		WriteTimeout:      cfg.HTTP.WriteTimeout,
		IdleTimeout:       cfg.HTTP.IdleTimeout,
	}

	serverErrors := make(chan error, 1)
	go func() {
		log.Printf("Go API Server listening on port %s", port)
		log.Printf(
			"HTTP timeouts read=%s read_header=%s write=%s idle=%s",
			cfg.HTTP.ReadTimeout,
			cfg.HTTP.ReadHeaderTimeout,
			cfg.HTTP.WriteTimeout,
			cfg.HTTP.IdleTimeout,
		)
		serverErrors <- server.ListenAndServe()
	}()

	stopSignals := make(chan os.Signal, 1)
	signal.Notify(stopSignals, syscall.SIGINT, syscall.SIGTERM)

	select {
	case err := <-serverErrors:
		if err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Fatal("Failed to start server:", err)
		}
	case sig := <-stopSignals:
		log.Printf("Shutdown signal received: %s", sig.String())
		pushWorkerCancel()
		shutdownCtx, cancel := context.WithTimeout(context.Background(), cfg.HTTP.ShutdownTimeout)
		defer cancel()
		if err := server.Shutdown(shutdownCtx); err != nil {
			log.Fatal("Graceful shutdown failed:", err)
		}
		log.Println("Go API Server stopped")
	}
}

func ensureShopTodayRecommendColumns(db *gorm.DB) error {
	migrator := db.Migrator()

	if !migrator.HasColumn(&repository.Shop{}, "IsTodayRecommended") {
		if err := migrator.AddColumn(&repository.Shop{}, "IsTodayRecommended"); err != nil {
			return fmt.Errorf("add column is_today_recommended failed: %w", err)
		}
	}

	if !migrator.HasColumn(&repository.Shop{}, "TodayRecommendPosition") {
		if err := migrator.AddColumn(&repository.Shop{}, "TodayRecommendPosition"); err != nil {
			return fmt.Errorf("add column today_recommend_position failed: %w", err)
		}
	}

	return nil
}

func ensureWalletAccountIndexes(db *gorm.DB) error {
	if !db.Migrator().HasTable(&repository.WalletAccount{}) {
		return nil
	}

	// 历史 SQLite 版本把 user_id 设成了全局唯一，导致 customer/rider/merchant 同一个 user_id 冲突。
	// 修复策略：改为 (user_id, user_type) 组合唯一。
	if strings.EqualFold(db.Dialector.Name(), "sqlite") {
		if err := db.Exec("DROP INDEX IF EXISTS idx_wallet_accounts_user_id").Error; err != nil {
			return fmt.Errorf("drop legacy wallet user_id unique index failed: %w", err)
		}
		if err := db.Exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_wallet_accounts_user_identity ON wallet_accounts(user_id, user_type)").Error; err != nil {
			return fmt.Errorf("create wallet composite unique index failed: %w", err)
		}
		if err := db.Exec("CREATE INDEX IF NOT EXISTS idx_wallet_accounts_user_id ON wallet_accounts(user_id)").Error; err != nil {
			return fmt.Errorf("create wallet user_id index failed: %w", err)
		}
	}

	return nil
}

func ensurePushDeliveryIndexes(db *gorm.DB) error {
	if !db.Migrator().HasTable(&repository.PushDelivery{}) {
		return nil
	}

	migrator := db.Migrator()
	if migrator.HasIndex(&repository.PushDelivery{}, "idx_push_deliveries_message_id") {
		if err := migrator.DropIndex(&repository.PushDelivery{}, "idx_push_deliveries_message_id"); err != nil {
			return fmt.Errorf("drop legacy push delivery message unique index failed: %w", err)
		}
	}

	if !migrator.HasIndex(&repository.PushDelivery{}, "uniq_push_delivery_message_user") {
		if err := migrator.CreateIndex(&repository.PushDelivery{}, "uniq_push_delivery_message_user"); err != nil {
			return fmt.Errorf("create push delivery composite unique index failed: %w", err)
		}
	}

	if !migrator.HasIndex(&repository.PushDelivery{}, "idx_push_delivery_message") {
		if err := migrator.CreateIndex(&repository.PushDelivery{}, "idx_push_delivery_message"); err != nil {
			return fmt.Errorf("create push delivery message index failed: %w", err)
		}
	}

	return nil
}

func ensureShopMerchantTypeBackfill(db *gorm.DB) error {
	if !db.Migrator().HasTable(&repository.Shop{}) {
		return nil
	}
	if !db.Migrator().HasColumn(&repository.Shop{}, "MerchantType") {
		if err := db.Migrator().AddColumn(&repository.Shop{}, "MerchantType"); err != nil {
			return fmt.Errorf("add shops.merchant_type failed: %w", err)
		}
	}

	steps := []string{
		`UPDATE shops SET merchant_type = lower(trim(merchant_type))
		WHERE merchant_type IS NOT NULL AND trim(merchant_type) <> ''`,
		`UPDATE shops SET merchant_type = 'groupbuy' WHERE merchant_type IN ('团购类', '团购')`,
		`UPDATE shops SET merchant_type = 'hybrid' WHERE merchant_type IN ('混合类', '混合', 'mixed')`,
		`UPDATE shops SET merchant_type = 'takeout' WHERE merchant_type IN ('外卖类', '外卖')`,
		`UPDATE shops
		SET merchant_type = 'groupbuy'
		WHERE (merchant_type IS NULL OR trim(merchant_type) = '')
		AND order_type IN ('团购类', '团购', 'groupbuy', 'GROUPBUY')`,
		`UPDATE shops
		SET merchant_type = 'hybrid'
		WHERE (merchant_type IS NULL OR trim(merchant_type) = '')
		AND order_type IN ('混合类', '混合', 'hybrid', 'HYBRID', 'mixed', 'MIXED')`,
		`UPDATE shops SET merchant_type = 'takeout' WHERE merchant_type IS NULL OR trim(merchant_type) = ''`,
		`UPDATE shops
		SET merchant_type = 'takeout'
		WHERE lower(trim(merchant_type)) NOT IN ('takeout', 'groupbuy', 'hybrid')`,
	}
	for _, sql := range steps {
		if err := db.Exec(sql).Error; err != nil {
			return err
		}
	}
	return nil
}

func ensureOrderBizTypeBackfill(db *gorm.DB) error {
	if !db.Migrator().HasTable(&repository.Order{}) {
		return nil
	}
	if !db.Migrator().HasColumn(&repository.Order{}, "BizType") {
		if err := db.Migrator().AddColumn(&repository.Order{}, "BizType"); err != nil {
			return fmt.Errorf("add orders.biz_type failed: %w", err)
		}
	}

	steps := []string{
		`UPDATE orders SET biz_type = lower(trim(biz_type))
		WHERE biz_type IS NOT NULL AND trim(biz_type) <> ''`,
		`UPDATE orders SET biz_type = 'groupbuy' WHERE biz_type IN ('团购类', '团购')`,
		`UPDATE orders SET biz_type = 'takeout' WHERE biz_type IN ('外卖类', '外卖')`,
		`UPDATE orders SET biz_type = 'groupbuy'
		WHERE status IN ('pending_payment', 'paid_unused', 'redeemed', 'refunding', 'refunded', 'expired')`,
		`UPDATE orders SET biz_type = 'takeout' WHERE biz_type IS NULL OR trim(biz_type) = ''`,
		`UPDATE orders
		SET biz_type = 'takeout'
		WHERE lower(trim(biz_type)) NOT IN ('takeout', 'groupbuy')`,
	}
	for _, sql := range steps {
		if err := db.Exec(sql).Error; err != nil {
			return err
		}
	}
	return nil
}

func startRiderIncomeWorker(db *gorm.DB) {
	ticker := time.NewTicker(time.Minute)
	defer ticker.Stop()

	for range ticker.C {
		if err := reconcileRiderIncome(db); err != nil {
			log.Printf("⚠️ 骑手收入定时结算失败: %v", err)
		}
	}
}

func reconcileRiderIncome(db *gorm.DB) error {
	now := time.Now()

	created, err := backfillMissingRiderIncomeTransactions(db, now, riderIncomeBackfillBatch)
	if err != nil {
		return err
	}
	settled, err := settleDueRiderIncomeTransactions(db, now, riderIncomeSettleBatch)
	if err != nil {
		return err
	}

	if created > 0 || settled > 0 {
		log.Printf("✅ 骑手收入修复完成: backfill=%d settled=%d", created, settled)
	}
	return nil
}

func backfillMissingRiderIncomeTransactions(db *gorm.DB, now time.Time, limit int) (int, error) {
	if limit <= 0 {
		limit = 100
	}

	// 为了兼容不同数据库方言，不做 SQL JOIN/CAST，改为分步筛选。
	var candidates []repository.Order
	if err := db.Model(&repository.Order{}).
		Where("status = ?", "completed").
		Where("payment_status = ?", "paid").
		Where("rider_id IS NOT NULL AND rider_id <> ''").
		Order("completed_at ASC").
		Limit(limit * 3).
		Find(&candidates).Error; err != nil {
		return 0, err
	}

	created := 0
	for _, item := range candidates {
		if created >= limit {
			break
		}

		order := item
		businessID := strconv.FormatUint(uint64(order.ID), 10)
		var exists int64
		if err := db.Model(&repository.WalletTransaction{}).
			Where("business_type = ? AND business_id = ?", "order_income_freeze", businessID).
			Count(&exists).Error; err != nil {
			return created, err
		}
		if exists > 0 {
			continue
		}

		err := db.Transaction(func(tx *gorm.DB) error {
			if err := tx.Where("id = ?", order.ID).First(&order).Error; err != nil {
				return err
			}
			if strings.ToLower(strings.TrimSpace(order.Status)) != "completed" {
				return nil
			}
			if strings.ToLower(strings.TrimSpace(order.PaymentStatus)) != "paid" {
				return nil
			}

			createdAt := now
			if order.CompletedAt != nil && !order.CompletedAt.IsZero() {
				createdAt = *order.CompletedAt
			}
			inserted, err := createRiderIncomeFreezeTransaction(tx, &order, createdAt)
			if err != nil {
				return err
			}
			if inserted {
				created++
			}
			return nil
		})
		if err != nil {
			return created, err
		}
	}

	return created, nil
}

func settleDueRiderIncomeTransactions(db *gorm.DB, now time.Time, limit int) (int, error) {
	if limit <= 0 {
		limit = 100
	}
	cutoff := now.Add(-riderIncomeFreezeDuration)

	var dueRows []repository.WalletTransaction
	if err := db.Model(&repository.WalletTransaction{}).
		Where("user_type = ? AND type = ? AND business_type = ? AND status = ? AND created_at <= ?",
			"rider", "income", "order_income_freeze", "pending", cutoff).
		Order("created_at ASC").
		Limit(limit).
		Find(&dueRows).Error; err != nil {
		return 0, err
	}

	settled := 0
	for _, row := range dueRows {
		txID := row.ID
		err := db.Transaction(func(tx *gorm.DB) error {
			ok, err := settleRiderIncomeTransactionTx(tx, txID, now)
			if err != nil {
				return err
			}
			if ok {
				settled++
			}
			return nil
		})
		if err != nil {
			return settled, err
		}
	}

	return settled, nil
}

func createRiderIncomeFreezeTransaction(tx *gorm.DB, order *repository.Order, createdAt time.Time) (bool, error) {
	if order == nil {
		return false, nil
	}

	incomeCents := parseRiderIncomeCents(*order)
	if incomeCents <= 0 {
		return false, nil
	}

	riderWalletUserID := resolveRiderWalletUserID(tx, order.RiderID, order.RiderPhone)
	if strings.TrimSpace(riderWalletUserID) == "" {
		return false, nil
	}

	idempotencyRaw := fmt.Sprintf("rider_income_order_%d", order.ID)
	var existing repository.WalletTransaction
	if err := tx.Where("idempotency_key = ? OR idempotency_key_raw = ?", idempotencyRaw, idempotencyRaw).First(&existing).Error; err == nil {
		if order.RiderIncome <= 0 {
			if err := tx.Model(&repository.Order{}).Where("id = ?", order.ID).Update("rider_income", incomeCents).Error; err != nil {
				return false, err
			}
			order.RiderIncome = incomeCents
		}
		return false, nil
	} else if !errors.Is(err, gorm.ErrRecordNotFound) {
		return false, err
	}

	account, err := ensureWalletAccountTx(tx, riderWalletUserID, "rider")
	if err != nil {
		return false, err
	}

	ctx := context.Background()
	if tx.Statement != nil && tx.Statement.Context != nil {
		ctx = tx.Statement.Context
	}
	idempotencyKey, _, err := idkit.NextUIDWithDB(ctx, tx, "77")
	if err != nil {
		return false, err
	}
	transactionID, _, err := idkit.NextUIDWithDB(ctx, tx, "72")
	if err != nil {
		return false, err
	}
	businessID := strconv.FormatUint(uint64(order.ID), 10)

	frozenAfter := account.FrozenBalance + incomeCents
	totalAfter := account.Balance + frozenAfter
	if err := tx.Model(&repository.WalletAccount{}).
		Where("id = ?", account.ID).
		Updates(map[string]interface{}{
			"frozen_balance":      frozenAfter,
			"total_balance":       totalAfter,
			"last_transaction_id": transactionID,
			"last_transaction_at": createdAt,
		}).Error; err != nil {
		return false, err
	}

	if order.RiderIncome <= 0 {
		if err := tx.Model(&repository.Order{}).Where("id = ?", order.ID).Update("rider_income", incomeCents).Error; err != nil {
			return false, err
		}
		order.RiderIncome = incomeCents
	}

	requestPayload, _ := json.Marshal(map[string]interface{}{
		"orderId":     order.ID,
		"riderId":     riderWalletUserID,
		"incomeCents": incomeCents,
		"freezeHours": int(riderIncomeFreezeDuration.Hours()),
	})
	txRecord := &repository.WalletTransaction{
		TransactionID:     transactionID,
		TransactionIDRaw:  "",
		IdempotencyKey:    idempotencyKey,
		IdempotencyKeyRaw: idempotencyRaw,
		UserID:            riderWalletUserID,
		UserType:          "rider",
		Type:              "income",
		BusinessType:      "order_income_freeze",
		BusinessID:        businessID,
		Amount:            incomeCents,
		BalanceBefore:     account.Balance,
		BalanceAfter:      account.Balance,
		PaymentMethod:     "ifpay",
		PaymentChannel:    "order",
		Status:            "pending",
		Description:       "订单收入冻结中，24小时后自动入账",
		RequestData:       string(requestPayload),
		CreatedAt:         createdAt,
		UpdatedAt:         createdAt,
	}
	if err := tx.Create(txRecord).Error; err != nil {
		return false, err
	}

	return true, nil
}

func settleRiderIncomeTransactionTx(tx *gorm.DB, txID uint, now time.Time) (bool, error) {
	var incomeTx repository.WalletTransaction
	if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Where("id = ?", txID).First(&incomeTx).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return false, nil
		}
		return false, err
	}
	if incomeTx.Status != "pending" {
		return false, nil
	}

	account, err := ensureWalletAccountTx(tx, strings.TrimSpace(incomeTx.UserID), strings.TrimSpace(incomeTx.UserType))
	if err != nil {
		return false, err
	}
	if account.FrozenBalance < incomeTx.Amount {
		return false, fmt.Errorf("wallet frozen balance is not enough for tx %s", incomeTx.TransactionID)
	}

	balanceAfter := account.Balance + incomeTx.Amount
	frozenAfter := account.FrozenBalance - incomeTx.Amount
	totalAfter := balanceAfter + frozenAfter
	if err := tx.Model(&repository.WalletAccount{}).
		Where("id = ?", account.ID).
		Updates(map[string]interface{}{
			"balance":             balanceAfter,
			"frozen_balance":      frozenAfter,
			"total_balance":       totalAfter,
			"last_transaction_id": incomeTx.TransactionID,
			"last_transaction_at": now,
		}).Error; err != nil {
		return false, err
	}

	responsePayload, _ := json.Marshal(map[string]interface{}{
		"status":        "success",
		"settledAmount": incomeTx.Amount,
		"settledAt":     now.Format(time.RFC3339),
	})
	if err := tx.Model(&repository.WalletTransaction{}).
		Where("id = ?", incomeTx.ID).
		Updates(map[string]interface{}{
			"status":        "success",
			"balance_after": balanceAfter,
			"response_data": string(responsePayload),
			"completed_at":  now,
			"updated_at":    now,
		}).Error; err != nil {
		return false, err
	}

	return true, nil
}

func parseRiderIncomeCents(order repository.Order) int64 {
	if order.RiderIncome > 0 {
		return order.RiderIncome
	}
	if order.DeliveryFee > 0 {
		return int64(math.Round(order.DeliveryFee * 100))
	}
	if order.RiderQuotedPrice > 0 {
		return int64(math.Round(order.RiderQuotedPrice * 100))
	}
	if order.TotalPrice > 0 {
		return int64(math.Round(order.TotalPrice * 100))
	}
	return 0
}

func resolveRiderWalletUserID(db *gorm.DB, riderID, riderPhone string) string {
	idText := strings.TrimSpace(riderID)
	phoneText := strings.TrimSpace(riderPhone)
	if idText == "" {
		idText = phoneText
	}
	if idText == "" {
		return ""
	}

	var rider repository.Rider
	if err := db.Where("id = ?", idText).First(&rider).Error; err == nil {
		return strconv.FormatUint(uint64(rider.ID), 10)
	}
	if err := db.Where("phone = ?", idText).First(&rider).Error; err == nil {
		return strconv.FormatUint(uint64(rider.ID), 10)
	}
	if phoneText != "" {
		if err := db.Where("phone = ?", phoneText).First(&rider).Error; err == nil {
			return strconv.FormatUint(uint64(rider.ID), 10)
		}
	}
	return idText
}

func ensureWalletAccountTx(tx *gorm.DB, userID, userType string) (*repository.WalletAccount, error) {
	var account repository.WalletAccount
	err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
		Where("user_id = ? AND user_type = ?", userID, userType).
		First(&account).Error
	if err == nil {
		return &account, nil
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}

	account = repository.WalletAccount{
		UserID:        userID,
		UserType:      userType,
		Balance:       0,
		FrozenBalance: 0,
		TotalBalance:  0,
		Status:        "active",
	}
	if err := tx.Create(&account).Error; err != nil {
		var retry repository.WalletAccount
		if retryErr := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			Where("user_id = ? AND user_type = ?", userID, userType).
			First(&retry).Error; retryErr == nil {
			return &retry, nil
		}
		return nil, err
	}
	return &account, nil
}

func parsePositiveInt(raw string, fallback int) int {
	value, err := strconv.Atoi(strings.TrimSpace(raw))
	if err != nil || value <= 0 {
		return fallback
	}
	return value
}

func parseMonthRange(monthRaw string, now time.Time) (time.Time, time.Time, string) {
	monthText := strings.TrimSpace(monthRaw)
	if monthText == "" {
		monthText = now.Format("2006-01")
	}

	parsed, err := time.ParseInLocation("2006-01", monthText, now.Location())
	if err != nil {
		parsed = time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
	}

	start := time.Date(parsed.Year(), parsed.Month(), 1, 0, 0, 0, 0, now.Location())
	end := start.AddDate(0, 1, 0)
	return start, end, start.Format("2006-01")
}

func getOperatorRole(c *gin.Context) string {
	if c == nil {
		return ""
	}
	return strings.ToLower(strings.TrimSpace(c.GetString("operator_role")))
}

func getMerchantID(c *gin.Context) int64 {
	if c == nil {
		return 0
	}
	value, ok := c.Get("merchant_id")
	if !ok {
		return 0
	}
	switch v := value.(type) {
	case int64:
		if v > 0 {
			return v
		}
	case int:
		if v > 0 {
			return int64(v)
		}
	case uint64:
		if v > 0 {
			return int64(v)
		}
	case uint:
		if v > 0 {
			return int64(v)
		}
	case string:
		parsed, err := strconv.ParseInt(strings.TrimSpace(v), 10, 64)
		if err == nil && parsed > 0 {
			return parsed
		}
	}
	return 0
}

func getRiderIdentities(c *gin.Context) []string {
	if c == nil {
		return nil
	}
	values := make([]string, 0, 2)
	add := func(raw string) {
		raw = strings.TrimSpace(raw)
		if raw == "" {
			return
		}
		for _, existing := range values {
			if existing == raw {
				return
			}
		}
		values = append(values, raw)
	}

	if value, ok := c.Get("rider_id"); ok {
		switch v := value.(type) {
		case int64:
			add(strconv.FormatInt(v, 10))
		case int:
			add(strconv.Itoa(v))
		case uint:
			add(strconv.FormatUint(uint64(v), 10))
		case uint64:
			add(strconv.FormatUint(v, 10))
		case string:
			add(v)
		}
	}
	if value, ok := c.Get("rider_phone"); ok {
		if phone, ok := value.(string); ok {
			add(phone)
		}
	}
	return values
}

func merchantOwnsOrder(db *gorm.DB, order *repository.Order, merchantID int64) (bool, error) {
	if db == nil || order == nil || merchantID <= 0 {
		return false, nil
	}
	if strings.TrimSpace(order.MerchantID) == strconv.FormatInt(merchantID, 10) {
		return true, nil
	}
	return merchantOwnsShopID(db, merchantID, order.ShopID)
}

func merchantOwnsShopID(db *gorm.DB, merchantID int64, shopID string) (bool, error) {
	if db == nil || merchantID <= 0 {
		return false, nil
	}
	shopID = strings.TrimSpace(shopID)
	if shopID == "" {
		return false, nil
	}
	shopIDNum, err := strconv.ParseUint(shopID, 10, 64)
	if err != nil || shopIDNum == 0 {
		return false, nil
	}

	var total int64
	if err := db.Model(&repository.Shop{}).
		Where("id = ? AND merchant_id = ?", uint(shopIDNum), merchantID).
		Count(&total).Error; err != nil {
		return false, err
	}
	return total > 0, nil
}
