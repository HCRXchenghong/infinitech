package repository

import "time"

// Admin represents admin account.
type Admin struct {
	ID uint `gorm:"primaryKey" json:"legacyId,omitempty"`
	UnifiedIdentity
	Phone        string    `gorm:"size:20;uniqueIndex;not null" json:"phone"`
	Name         string    `gorm:"size:50" json:"name"`
	PasswordHash string    `gorm:"size:255" json:"-"`
	Type         string    `gorm:"size:20" json:"type"`
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

	Avatar                string     `gorm:"size:500" json:"avatar"`
	Nickname              string     `gorm:"size:50" json:"nickname"`
	RealName              string     `gorm:"size:50" json:"real_name"`
	IDCardNumber          string     `gorm:"size:18" json:"id_card_number"`
	EmergencyContactName  string     `gorm:"size:50" json:"emergency_contact_name"`
	EmergencyContactPhone string     `gorm:"size:20" json:"emergency_contact_phone"`
	IDCardFront           string     `gorm:"size:500" json:"id_card_front"`
	IDCardBack            string     `gorm:"size:500" json:"id_card_back"`
	HealthCert            string     `gorm:"size:500" json:"health_cert"`
	HealthCertExpiry      *time.Time `json:"health_cert_expiry"`
	IsVerified            bool       `gorm:"default:false" json:"is_verified"`

	Level            int `gorm:"default:1" json:"level"`
	TotalOrders      int `gorm:"default:0" json:"total_orders"`
	WeekOrders       int `gorm:"default:0" json:"week_orders"`
	ConsecutiveWeeks int `gorm:"default:0" json:"consecutive_weeks"`

	TodayOnlineMinutes int        `gorm:"default:0" json:"today_online_minutes"`
	OnlineStartTime    *time.Time `json:"online_start_time"`
	LastOnlineDate     string     `gorm:"size:10" json:"last_online_date"`

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
	OrderType              string     `gorm:"size:20;default:'外卖类'" json:"orderType"`
	MerchantType           string     `gorm:"size:20;default:'takeout';index" json:"merchantType"`
	BusinessCategory       string     `gorm:"size:50;default:'美食'" json:"businessCategory"`
	BusinessCategoryKey    string     `gorm:"size:64;default:'food';index" json:"businessCategoryKey"`
	CoverImage             string     `gorm:"size:500" json:"coverImage"`
	BackgroundImage        string     `gorm:"size:500" json:"backgroundImage"`
	Logo                   string     `gorm:"size:500" json:"logo"`
	MerchantQualification  string     `gorm:"size:500" json:"merchantQualification"`
	FoodBusinessLicense    string     `gorm:"size:500" json:"foodBusinessLicense"`
	Rating                 float64    `gorm:"type:decimal(3,2);default:5.0" json:"rating"`
	MonthlySales           int        `gorm:"default:0" json:"monthlySales"`
	PerCapita              float64    `gorm:"type:decimal(10,2);default:0" json:"perCapita"`
	Announcement           string     `gorm:"type:text" json:"announcement"`
	Address                string     `gorm:"size:200" json:"address"`
	Phone                  string     `gorm:"size:20" json:"phone"`
	BusinessHours          string     `gorm:"size:100;default:'09:00-22:00'" json:"businessHours"`
	Tags                   string     `gorm:"type:text" json:"tags"`
	Discounts              string     `gorm:"type:text" json:"discounts"`
	MenuNotes              string     `gorm:"type:text" json:"menuNotes"`
	StaffRecord            string     `gorm:"type:text" json:"staffRecord"`
	EmployeeName           string     `gorm:"size:100" json:"employeeName"`
	EmployeeAge            int        `gorm:"default:0" json:"employeeAge"`
	EmployeePosition       string     `gorm:"size:100" json:"employeePosition"`
	IDCardFrontImage       string     `gorm:"size:500" json:"idCardFrontImage"`
	IDCardBackImage        string     `gorm:"size:500" json:"idCardBackImage"`
	IDCardExpireAt         *time.Time `json:"idCardExpireAt"`
	HealthCertFrontImage   string     `gorm:"size:500" json:"healthCertFrontImage"`
	HealthCertBackImage    string     `gorm:"size:500" json:"healthCertBackImage"`
	HealthCertExpireAt     *time.Time `json:"healthCertExpireAt"`
	EmploymentStartAt      *time.Time `json:"employmentStartAt"`
	EmploymentEndAt        *time.Time `json:"employmentEndAt"`
	IsBrand                bool       `gorm:"default:false" json:"isBrand"`
	IsFranchise            bool       `gorm:"default:false" json:"isFranchise"`
	IsTodayRecommended     bool       `gorm:"default:false;index" json:"isTodayRecommended"`
	TodayRecommendPosition int        `gorm:"default:0;index" json:"todayRecommendPosition"`
	IsActive               bool       `gorm:"default:true" json:"isActive"`
	MinPrice               float64    `gorm:"type:decimal(10,2);default:0" json:"minPrice"`
	DeliveryPrice          float64    `gorm:"type:decimal(10,2);default:0" json:"deliveryPrice"`
	DeliveryTime           string     `gorm:"size:50;default:'30分钟'" json:"deliveryTime"`
	Distance               string     `gorm:"size:50" json:"distance"`
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
	Images     string     `gorm:"type:text" json:"images"`
	Reply      string     `gorm:"type:text" json:"reply"`
	ReplyTime  *time.Time `json:"reply_time"`
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
	Images     string    `gorm:"type:text" json:"images"`
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

// Product represents a product or dish.
type Product struct {
	ID uint `gorm:"primaryKey" json:"legacyId,omitempty"`
	UnifiedIdentity
	ShopID        uint      `gorm:"index;not null" json:"shop_id"`
	CategoryID    uint      `gorm:"index;not null" json:"category_id"`
	Name          string    `gorm:"size:200;not null" json:"name"`
	Description   string    `gorm:"type:text" json:"description"`
	Image         string    `gorm:"size:500" json:"image"`
	Images        string    `gorm:"type:text" json:"images"`
	Price         float64   `gorm:"type:decimal(10,2);not null" json:"price"`
	OriginalPrice float64   `gorm:"type:decimal(10,2)" json:"original_price"`
	MonthlySales  int       `gorm:"default:0" json:"monthly_sales"`
	Rating        float64   `gorm:"type:decimal(3,2);default:5.0" json:"rating"`
	GoodReviews   int       `gorm:"default:0" json:"good_reviews"`
	TotalReviews  int       `gorm:"default:0" json:"total_reviews"`
	Stock         int       `gorm:"default:999" json:"stock"`
	Unit          string    `gorm:"size:20;default:'份'" json:"unit"`
	Nutrition     string    `gorm:"type:text" json:"nutrition"`
	Tags          string    `gorm:"type:text" json:"tags"`
	IsRecommend   bool      `gorm:"default:false" json:"is_recommend"`
	IsFeatured    bool      `gorm:"default:false" json:"is_featured"`
	IsActive      bool      `gorm:"default:true" json:"is_active"`
	SortOrder     int       `gorm:"default:0" json:"sort_order"`
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
	LinkType  string    `gorm:"size:50" json:"link_type"`
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
type FeaturedProduct struct {
	ID uint `gorm:"primaryKey" json:"legacyId,omitempty"`
	UnifiedIdentity
	ProductID uint      `gorm:"index;not null" json:"product_id"`
	Position  int       `gorm:"default:0" json:"position"`
	IsActive  bool      `gorm:"default:true" json:"is_active"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

func (FeaturedProduct) TableName() string {
	return "featured_products"
}
