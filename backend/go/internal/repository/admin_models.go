package repository

import "time"

// Admin represents admin account.
type Admin struct {
	ID uint `gorm:"primaryKey" json:"legacyId,omitempty"`
	UnifiedIdentity
	Phone        string    `gorm:"size:20;uniqueIndex;not null" json:"phone"`
	Name         string    `gorm:"size:50" json:"name"`
	PasswordHash string    `gorm:"size:255" json:"-"`
	Type         string    `gorm:"size:20;default:super_admin" json:"type"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

func (Admin) TableName() string {
	return "admins"
}

// Rider represents rider account.
type Rider struct {
	ID uint `gorm:"primaryKey" json:"legacyId,omitempty"`
	UnifiedIdentity
	RoleID       int     `gorm:"index" json:"role_id"`
	Phone        string  `gorm:"size:20;uniqueIndex" json:"phone"`
	Name         string  `gorm:"size:50" json:"name"`
	PasswordHash string  `gorm:"size:255" json:"-"`
	IsOnline     bool    `gorm:"default:false" json:"is_online"`
	Rating       float64 `gorm:"type:decimal(3,2);default:5.0" json:"rating"`
	RatingCount  int     `gorm:"default:0" json:"rating_count"`

	// 个人信息字段
	Avatar                string     `gorm:"size:500" json:"avatar"`
	Nickname              string     `gorm:"size:50" json:"nickname"`
	RealName              string     `gorm:"size:50" json:"real_name"`
	IDCardNumber          string     `gorm:"size:18" json:"id_card_number"`
	EmergencyContactName  string     `gorm:"size:50" json:"emergency_contact_name"`
	EmergencyContactPhone string     `gorm:"size:20" json:"emergency_contact_phone"`
	IDCardFront           string     `gorm:"size:500" json:"id_card_front"`
	IDCardBack            string     `gorm:"size:500" json:"id_card_back"`
	HealthCert            string     `gorm:"size:500" json:"health_cert"`
	HealthCertExpiry      *time.Time `gorm:"type:datetime" json:"health_cert_expiry"`
	IsVerified            bool       `gorm:"default:false" json:"is_verified"`

	// 段位相关字段
	Level            int `gorm:"default:1" json:"level"`
	TotalOrders      int `gorm:"default:0" json:"total_orders"`
	WeekOrders       int `gorm:"default:0" json:"week_orders"`
	ConsecutiveWeeks int `gorm:"default:0" json:"consecutive_weeks"`

	// 在线时长相关字段
	TodayOnlineMinutes int        `gorm:"default:0" json:"today_online_minutes"`  // 今日在线分钟数
	OnlineStartTime    *time.Time `gorm:"type:datetime" json:"online_start_time"` // 开工时间
	LastOnlineDate     string     `gorm:"size:10" json:"last_online_date"`        // 最后在线日期 YYYY-MM-DD

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

func (Rider) TableName() string {
	return "riders"
}

// Merchant represents merchant account.
type Merchant struct {
	ID uint `gorm:"primaryKey" json:"legacyId,omitempty"`
	UnifiedIdentity
	RoleID               int       `gorm:"index" json:"role_id"`
	Phone                string    `gorm:"size:20;uniqueIndex" json:"phone"`
	Name                 string    `gorm:"size:50" json:"name"`
	OwnerName            string    `gorm:"size:50" json:"owner_name"`
	BusinessLicenseImage string    `gorm:"size:500" json:"business_license_image"`
	PasswordHash         string    `gorm:"size:255" json:"-"`
	IsOnline             bool      `gorm:"default:false" json:"is_online"`
	CreatedAt            time.Time `json:"created_at"`
	UpdatedAt            time.Time `json:"updated_at"`
}

func (Merchant) TableName() string {
	return "merchants"
}

// Shop represents a shop/store.
type Shop struct {
	ID uint `gorm:"primaryKey" json:"legacyId,omitempty"`
	UnifiedIdentity
	MerchantID             uint       `gorm:"index" json:"merchant_id"`
	Name                   string     `gorm:"size:100;not null" json:"name"`
	OrderType              string     `gorm:"size:20;default:'外卖类'" json:"orderType"`              // 订单类型：外卖类/团购类
	MerchantType           string     `gorm:"size:20;default:'takeout';index" json:"merchantType"` // 商户类型：takeout/groupbuy/hybrid
	BusinessCategory       string     `gorm:"size:50;default:'美食'" json:"businessCategory"`        // 业务分类：美食/团购/甜点饮品/超市便利/休闲玩乐/生活服务
	CoverImage             string     `gorm:"size:500" json:"coverImage"`                          // 封面图
	BackgroundImage        string     `gorm:"size:500" json:"backgroundImage"`                     // 店铺详情页背景图
	Logo                   string     `gorm:"size:500" json:"logo"`
	MerchantQualification  string     `gorm:"size:500" json:"merchantQualification"` // 商家资质（营业执照）
	FoodBusinessLicense    string     `gorm:"size:500" json:"foodBusinessLicense"`   // 食品经营许可证
	Rating                 float64    `gorm:"type:decimal(3,2);default:5.0" json:"rating"`
	MonthlySales           int        `gorm:"default:0" json:"monthlySales"`
	PerCapita              float64    `gorm:"type:decimal(10,2);default:0" json:"perCapita"` // 人均消费
	Announcement           string     `gorm:"type:text" json:"announcement"`                 // 公告
	Address                string     `gorm:"size:200" json:"address"`
	Phone                  string     `gorm:"size:20" json:"phone"`
	BusinessHours          string     `gorm:"size:100;default:'09:00-22:00'" json:"businessHours"`
	Tags                   string     `gorm:"type:text" json:"tags"`                         // JSON array stored as string
	Discounts              string     `gorm:"type:text" json:"discounts"`                    // JSON array stored as string，满减优惠券
	MenuNotes              string     `gorm:"type:text" json:"menuNotes"`                    // 菜单配置说明（管理端扩展）
	StaffRecord            string     `gorm:"type:text" json:"staffRecord"`                  // 历史员工基础信息备案文本（兼容旧数据）
	EmployeeName           string     `gorm:"size:100" json:"employeeName"`                  // 员工姓名
	EmployeeAge            int        `gorm:"default:0" json:"employeeAge"`                  // 员工年龄
	EmployeePosition       string     `gorm:"size:100" json:"employeePosition"`              // 岗位
	IDCardFrontImage       string     `gorm:"size:500" json:"idCardFrontImage"`              // 身份证正面
	IDCardBackImage        string     `gorm:"size:500" json:"idCardBackImage"`               // 身份证反面
	IDCardExpireAt         *time.Time `gorm:"type:datetime" json:"idCardExpireAt"`           // 身份证到期时间
	HealthCertFrontImage   string     `gorm:"size:500" json:"healthCertFrontImage"`          // 健康证正面
	HealthCertBackImage    string     `gorm:"size:500" json:"healthCertBackImage"`           // 健康证反面
	HealthCertExpireAt     *time.Time `gorm:"type:datetime" json:"healthCertExpireAt"`       // 健康证到期时间
	EmploymentStartAt      *time.Time `gorm:"type:datetime" json:"employmentStartAt"`        // 入职时间
	EmploymentEndAt        *time.Time `gorm:"type:datetime" json:"employmentEndAt"`          // 离职时间
	IsBrand                bool       `gorm:"default:false" json:"isBrand"`                  // 是否品牌店
	IsFranchise            bool       `gorm:"default:false" json:"isFranchise"`              // 是否加盟店
	IsTodayRecommended     bool       `gorm:"default:false;index" json:"isTodayRecommended"` // 是否加入今日推荐商户
	TodayRecommendPosition int        `gorm:"default:0;index" json:"todayRecommendPosition"` // 今日推荐商户排序
	IsActive               bool       `gorm:"default:true" json:"isActive"`
	MinPrice               float64    `gorm:"type:decimal(10,2);default:0" json:"minPrice"`      // 起送金额
	DeliveryPrice          float64    `gorm:"type:decimal(10,2);default:0" json:"deliveryPrice"` // 配送费
	DeliveryTime           string     `gorm:"size:50;default:'30分钟'" json:"deliveryTime"`        // 预计送达时间
	Distance               string     `gorm:"size:50" json:"distance"`                           // 距离信息
	CreatedAt              time.Time  `json:"created_at"`
	UpdatedAt              time.Time  `json:"updated_at"`
}

func (Shop) TableName() string {
	return "shops"
}

// Review represents a shop review.
type Review struct {
	ID uint `gorm:"primaryKey" json:"legacyId,omitempty"`
	UnifiedIdentity
	ShopID     uint       `gorm:"index;not null" json:"shop_id"`
	UserID     uint       `gorm:"index;not null" json:"user_id"`
	OrderID    uint       `gorm:"index" json:"order_id"`
	Rating     float64    `gorm:"type:decimal(3,2);not null" json:"rating"`
	Content    string     `gorm:"type:text" json:"content"`
	Images     string     `gorm:"type:text" json:"images"` // JSON array stored as string
	Reply      string     `gorm:"type:text" json:"reply"`
	ReplyTime  *time.Time `gorm:"type:datetime" json:"reply_time"`
	UserName   string     `gorm:"size:50" json:"user_name"`
	UserAvatar string     `gorm:"size:500" json:"user_avatar"`
	CreatedAt  time.Time  `json:"created_at"`
	UpdatedAt  time.Time  `json:"updated_at"`
}

func (Review) TableName() string {
	return "reviews"
}

// RiderReview represents a rider review.
type RiderReview struct {
	ID uint `gorm:"primaryKey" json:"legacyId,omitempty"`
	UnifiedIdentity
	RiderID    uint      `gorm:"index;not null" json:"rider_id"`
	UserID     uint      `gorm:"index;not null" json:"user_id"`
	OrderID    uint      `gorm:"index" json:"order_id"`
	Rating     float64   `gorm:"type:decimal(3,2);not null" json:"rating"`
	Content    string    `gorm:"type:text" json:"content"`
	Images     string    `gorm:"type:text" json:"images"` // JSON array stored as string
	UserName   string    `gorm:"size:50" json:"user_name"`
	UserAvatar string    `gorm:"size:500" json:"user_avatar"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
}

func (RiderReview) TableName() string {
	return "rider_reviews"
}

// Category represents a product category.
type Category struct {
	ID uint `gorm:"primaryKey" json:"legacyId,omitempty"`
	UnifiedIdentity
	ShopID    uint      `gorm:"index;not null" json:"shop_id"`
	Name      string    `gorm:"size:100;not null" json:"name"`
	SortOrder int       `gorm:"default:0" json:"sort_order"`
	IsActive  bool      `gorm:"default:true" json:"is_active"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

func (Category) TableName() string {
	return "categories"
}

// Product represents a product/dish.
type Product struct {
	ID uint `gorm:"primaryKey" json:"legacyId,omitempty"`
	UnifiedIdentity
	ShopID        uint      `gorm:"index;not null" json:"shop_id"`
	CategoryID    uint      `gorm:"index;not null" json:"category_id"`
	Name          string    `gorm:"size:200;not null" json:"name"`
	Description   string    `gorm:"type:text" json:"description"`                // 商品描述
	Image         string    `gorm:"size:500" json:"image"`                       // 主图
	Images        string    `gorm:"type:text" json:"images"`                     // JSON array stored as string，详情图
	Price         float64   `gorm:"type:decimal(10,2);not null" json:"price"`    // 价格
	OriginalPrice float64   `gorm:"type:decimal(10,2)" json:"original_price"`    // 原价
	MonthlySales  int       `gorm:"default:0" json:"monthly_sales"`              // 月销量
	Rating        float64   `gorm:"type:decimal(3,2);default:5.0" json:"rating"` // 评分
	GoodReviews   int       `gorm:"default:0" json:"good_reviews"`               // 好评数
	TotalReviews  int       `gorm:"default:0" json:"total_reviews"`              // 总评价数，用于计算好评率
	Stock         int       `gorm:"default:999" json:"stock"`                    // 库存
	Unit          string    `gorm:"size:20;default:'份'" json:"unit"`             // 单位
	Nutrition     string    `gorm:"type:text" json:"nutrition"`                  // JSON object stored as string，营养成分
	Tags          string    `gorm:"type:text" json:"tags"`                       // JSON array stored as string
	IsRecommend   bool      `gorm:"default:false" json:"is_recommend"`           // 是否店内推荐
	IsFeatured    bool      `gorm:"default:false" json:"is_featured"`            // 是否精选（用于旧版今日推荐）
	IsActive      bool      `gorm:"default:true" json:"is_active"`               // 是否上架
	SortOrder     int       `gorm:"default:0" json:"sort_order"`                 // 排序
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

func (Product) TableName() string {
	return "products"
}

// Banner represents a banner/carousel item for shop.
type Banner struct {
	ID uint `gorm:"primaryKey" json:"legacyId,omitempty"`
	UnifiedIdentity
	ShopID    uint      `gorm:"index;not null" json:"shop_id"`
	Title     string    `gorm:"size:200" json:"title"`
	ImageURL  string    `gorm:"size:500;not null" json:"image_url"`
	LinkType  string    `gorm:"size:50" json:"link_type"` // product, category, url
	LinkValue string    `gorm:"size:500" json:"link_value"`
	SortOrder int       `gorm:"default:0" json:"sort_order"`
	IsActive  bool      `gorm:"default:true" json:"is_active"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

func (Banner) TableName() string {
	return "banners"
}

// Setting stores JSON settings by key.
type Setting struct {
	Key string `gorm:"primaryKey;size:100" json:"key"`
	UnifiedIdentity
	Value     string    `gorm:"type:text" json:"value"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

func (Setting) TableName() string {
	return "settings"
}

// Carousel represents carousel item.
type Carousel struct {
	ID uint `gorm:"primaryKey" json:"legacyId,omitempty"`
	UnifiedIdentity
	Title     string    `gorm:"size:200" json:"title"`
	ImageURL  string    `gorm:"size:500" json:"image_url"`
	LinkURL   string    `gorm:"size:500" json:"link_url"`
	LinkType  string    `gorm:"size:50" json:"link_type"`
	SortOrder int       `gorm:"default:0" json:"sort_order"`
	IsActive  bool      `gorm:"default:true" json:"is_active"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

func (Carousel) TableName() string {
	return "carousels"
}

// PushMessage represents a push message item.
type PushMessage struct {
	ID uint `gorm:"primaryKey" json:"legacyId,omitempty"`
	UnifiedIdentity
	Title              string    `gorm:"size:200" json:"title"`
	Content            string    `gorm:"type:text" json:"content"`
	ImageURL           string    `gorm:"size:500" json:"image_url"`
	CompressImage      bool      `gorm:"default:true" json:"compress_image"`
	IsActive           bool      `gorm:"default:false" json:"is_active"`
	ScheduledStartTime string    `gorm:"size:50" json:"scheduled_start_time"`
	ScheduledEndTime   string    `gorm:"size:50" json:"scheduled_end_time"`
	CreatedAt          time.Time `json:"created_at"`
	UpdatedAt          time.Time `json:"updated_at"`
}

func (PushMessage) TableName() string {
	return "push_messages"
}

// PublicAPI represents an API record for admin management.
type PublicAPI struct {
	ID uint `gorm:"primaryKey" json:"legacyId,omitempty"`
	UnifiedIdentity
	Name        string    `gorm:"size:200" json:"name"`
	Path        string    `gorm:"size:500" json:"path"`
	Permissions string    `gorm:"type:text" json:"permissions"`
	APIKey      string    `gorm:"size:100" json:"api_key"`
	Description string    `gorm:"type:text" json:"description"`
	IsActive    bool      `gorm:"default:true" json:"is_active"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

func (PublicAPI) TableName() string {
	return "public_apis"
}

// FeaturedProduct represents today's featured/recommended products.
// 今日推荐商品表，只支持单独的商品推荐，不支持店铺推荐
type FeaturedProduct struct {
	ID uint `gorm:"primaryKey" json:"legacyId,omitempty"`
	UnifiedIdentity
	ProductID uint      `gorm:"index;not null" json:"product_id"` // 关联的商品ID
	Position  int       `gorm:"default:0" json:"position"`        // 推荐位置（第几个）
	IsActive  bool      `gorm:"default:true" json:"is_active"`    // 是否启用
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

func (FeaturedProduct) TableName() string {
	return "featured_products"
}
