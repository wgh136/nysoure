package model

import (
	"fmt"
	"time"

	"gorm.io/gorm"
)

type User struct {
	gorm.Model
	Username                 string `gorm:"uniqueIndex;not null"`
	PasswordHash             []byte
	IsAdmin                  bool
	CanUpload                bool
	AvatarVersion            int
	ResourcesCount           int
	FilesCount               int
	CommentsCount            int
	Resources                []Resource `gorm:"foreignKey:UserID"`
	Bio                      string
	UnreadNotificationsCount uint `gorm:"not null;default:0"`
	Banned                   bool `gorm:"default:false"`
}

type UserView struct {
	ID             uint      `json:"id"`
	Username       string    `json:"username"`
	CreatedAt      time.Time `json:"created_at"`
	AvatarPath     string    `json:"avatar_path"`
	IsAdmin        bool      `json:"is_admin"`
	CanUpload      bool      `json:"can_upload"`
	ResourcesCount int       `json:"resources_count"`
	FilesCount     int       `json:"files_count"`
	CommentsCount  int       `json:"comments_count"`
	Bio            string    `json:"bio"`
	Banned         bool      `json:"banned"`
}

type UserViewWithToken struct {
	UserView
	Token string `json:"token"`
}

func (u User) ToView() UserView {
	return UserView{
		ID:             u.ID,
		Username:       u.Username,
		CreatedAt:      u.CreatedAt,
		AvatarPath:     fmt.Sprintf("/api/user/avatar/%d?v=%d", u.ID, u.AvatarVersion),
		IsAdmin:        u.IsAdmin,
		CanUpload:      u.CanUpload || u.IsAdmin,
		ResourcesCount: u.ResourcesCount,
		FilesCount:     u.FilesCount,
		CommentsCount:  u.CommentsCount,
		Bio:            u.Bio,
		Banned:         u.Banned,
	}
}

func (u UserView) WithToken(token string) UserViewWithToken {
	return UserViewWithToken{
		UserView: u,
		Token:    token,
	}
}
