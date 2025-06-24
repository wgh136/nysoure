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
	Images     []Image  `gorm:"many2many:comment_images;"`
}

type CommentView struct {
	ID        uint        `json:"id"`
	Content   string      `json:"content"`
	CreatedAt time.Time   `json:"created_at"`
	User      UserView    `json:"user"`
	Images    []ImageView `json:"images"`
}

func (c *Comment) ToView() *CommentView {
	imageViews := make([]ImageView, 0, len(c.Images))
	for _, img := range c.Images {
		imageViews = append(imageViews, img.ToView())
	}

	return &CommentView{
		ID:        c.ID,
		Content:   c.Content,
		CreatedAt: c.CreatedAt,
		User:      c.User.ToView(),
		Images:    imageViews,
	}
}

type CommentWithResourceView struct {
	ID        uint         `json:"id"`
	Content   string       `json:"content"`
	CreatedAt time.Time    `json:"created_at"`
	Resource  ResourceView `json:"resource"`
	User      UserView     `json:"user"`
	Images    []ImageView  `json:"images"`
}

func (c *Comment) ToViewWithResource() *CommentWithResourceView {
	imageViews := make([]ImageView, 0, len(c.Images))
	for _, img := range c.Images {
		imageViews = append(imageViews, img.ToView())
	}

	return &CommentWithResourceView{
		ID:        c.ID,
		Content:   c.Content,
		CreatedAt: c.CreatedAt,
		Resource:  c.Resource.ToView(),
		User:      c.User.ToView(),
		Images:    imageViews,
	}
}
