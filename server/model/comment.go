package model

import (
	"time"

	"gorm.io/gorm"
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

type CommentWithResourceView struct {
	ID        uint         `json:"id"`
	Content   string       `json:"content"`
	CreatedAt time.Time    `json:"created_at"`
	Resource  ResourceView `json:"resource"`
	User      UserView     `json:"user"`
}

func (c *Comment) ToViewWithResource() *CommentWithResourceView {
	return &CommentWithResourceView{
		ID:        c.ID,
		Content:   c.Content,
		CreatedAt: c.CreatedAt,
		Resource:  c.Resource.ToView(),
		User:      c.User.ToView(),
	}
}
