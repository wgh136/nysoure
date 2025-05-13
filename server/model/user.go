package model

import (
	"fmt"
	"gorm.io/gorm"
	"time"
)

type User struct {
	gorm.Model
	Username      string `gorm:"uniqueIndex;not null"`
	PasswordHash  []byte
	IsAdmin       bool
	CanUpload     bool
	AvatarVersion int
	UploadsCount  int
	CommentsCount int
	Resources     []Resource `gorm:"foreignKey:UserID"`
}

type UserView struct {
	ID            uint      `json:"id"`
	Username      string    `json:"username"`
	CreatedAt     time.Time `json:"created_at"`
	AvatarPath    string    `json:"avatar_path"`
	IsAdmin       bool      `json:"is_admin"`
	CanUpload     bool      `json:"can_upload"`
	UploadsCount  int       `json:"uploads_count"`
	CommentsCount int       `json:"comments_count"`
}

type UserViewWithToken struct {
	UserView
	Token string `json:"token"`
}

func (u User) ToView() UserView {
	return UserView{
		ID:            u.ID,
		Username:      u.Username,
		CreatedAt:     u.CreatedAt,
		AvatarPath:    fmt.Sprintf("/api/user/avatar/%d?v=%d", u.ID, u.AvatarVersion),
		IsAdmin:       u.IsAdmin,
		CanUpload:     u.CanUpload || u.IsAdmin,
		UploadsCount:  u.UploadsCount,
		CommentsCount: u.CommentsCount,
	}
}

func (u UserView) WithToken(token string) UserViewWithToken {
	return UserViewWithToken{
		UserView: u,
		Token:    token,
	}
}
