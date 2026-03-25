package repository

import (
	"context"
	"time"

	"gorm.io/gorm"
)

// User represents app user.
type User struct {
	ID uint `gorm:"primaryKey" json:"legacyId,omitempty"`
	UnifiedIdentity
	RoleID         int       `gorm:"index" json:"role_id"`
	Phone          string    `gorm:"size:20;uniqueIndex" json:"phone"`
	Name           string    `gorm:"size:50" json:"name"`
	AvatarURL      string    `gorm:"size:255" json:"avatarUrl"`
	HeaderBg       string    `gorm:"size:255" json:"headerBg"`
	WechatOpenID   string    `gorm:"size:64;index" json:"-"`
	WechatUnionID  string    `gorm:"size:64;index" json:"-"`
	WechatNickname string    `gorm:"size:100" json:"-"`
	WechatAvatar   string    `gorm:"size:255" json:"-"`
	PasswordHash   string    `gorm:"size:255" json:"-"`
	Type           string    `gorm:"size:20;default:customer" json:"type"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}

func (User) TableName() string {
	return "users"
}

type ListUsersParams struct {
	Search string
	Type   string
	Limit  int
	Offset int
}

type UserRepository interface {
	DB() *gorm.DB
	GetByID(ctx context.Context, id uint) (*User, error)
	GetByPhone(ctx context.Context, phone string) (*User, error)
	Create(ctx context.Context, user *User) error
	Update(ctx context.Context, user *User) error
	Delete(ctx context.Context, id uint) error
	List(ctx context.Context, params ListUsersParams) ([]User, int64, error)
}

type userRepository struct {
	db *gorm.DB
}

func NewUserRepository(db *gorm.DB) UserRepository {
	return &userRepository{db: db}
}

func (r *userRepository) DB() *gorm.DB {
	return r.db
}

func (r *userRepository) GetByID(ctx context.Context, id uint) (*User, error) {
	var user User
	if err := r.db.WithContext(ctx).First(&user, id).Error; err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *userRepository) GetByPhone(ctx context.Context, phone string) (*User, error) {
	var user User
	if err := r.db.WithContext(ctx).Where("phone = ?", phone).First(&user).Error; err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *userRepository) Create(ctx context.Context, user *User) error {
	return r.db.WithContext(ctx).Create(user).Error
}

func (r *userRepository) Update(ctx context.Context, user *User) error {
	return r.db.WithContext(ctx).Save(user).Error
}

func (r *userRepository) Delete(ctx context.Context, id uint) error {
	return r.db.WithContext(ctx).Delete(&User{}, id).Error
}

func (r *userRepository) List(ctx context.Context, params ListUsersParams) ([]User, int64, error) {
	var users []User
	var total int64

	query := r.db.WithContext(ctx).Model(&User{})
	if params.Type != "" {
		query = query.Where("type = ?", params.Type)
	}
	if params.Search != "" {
		like := "%" + params.Search + "%"
		query = query.Where("name LIKE ? OR phone LIKE ?", like, like)
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	if params.Limit > 0 {
		query = query.Limit(params.Limit)
	}
	if params.Offset > 0 {
		query = query.Offset(params.Offset)
	}

	if err := query.Order("created_at DESC").Find(&users).Error; err != nil {
		return nil, 0, err
	}

	return users, total, nil
}
