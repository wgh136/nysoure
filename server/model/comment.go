package model

import (
	"gorm.io/gorm"
	"time"
)

type Comment struct {
	gorm.Model
	Content    string   `gorm:"not null"`
	ResourceID uint     `gorm:"not null"`
	UserID     uint     `gorm:"not null"`
	User       User     `gorm:"foreignKey:UserID"`
	Resource   Resource `gorm:"foreignKey:ResourceID"`
}

type CommentView struct {
	ID        uint      `json:"id"`
	Content   string    `json:"content"`
	CreatedAt time.Time `json:"created_at"`
	User      UserView  `json:"user"`
}

func (c *Comment) ToView() *CommentView {
	return &CommentView{
		ID:        c.ID,
		Content:   c.Content,
		CreatedAt: c.CreatedAt,
		User:      c.User.ToView(),
	}
}
