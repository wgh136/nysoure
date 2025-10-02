package model

import (
	"time"

	"gorm.io/gorm"
)

type Comment struct {
	gorm.Model
	Content    string      `gorm:"not null"`
	RefID      uint        `gorm:"not null;index:idx_refid_type,priority:1"`
	Type       CommentType `gorm:"not null;index:idx_refid_type,priority:2"`
	UserID     uint        `gorm:"not null"`
	User       User        `gorm:"foreignKey:UserID"`
	Images     []Image     `gorm:"many2many:comment_images;"`
	ReplyCount uint        `gorm:"default:0;not null"`
}

type CommentType uint

const (
	CommentTypeResource CommentType = iota + 1
	CommentTypeReply
)

type CommentView struct {
	ID               uint          `json:"id"`
	Content          string        `json:"content"`
	CreatedAt        time.Time     `json:"created_at"`
	User             UserView      `json:"user"`
	Images           []ImageView   `json:"images"`
	ReplyCount       uint          `json:"reply_count"`
	ContentTruncated bool          `json:"content_truncated"`
	Replies          []CommentView `json:"replies,omitempty"`
}

func (c *Comment) ToView() *CommentView {
	imageViews := make([]ImageView, 0, len(c.Images))
	for _, img := range c.Images {
		imageViews = append(imageViews, img.ToView())
	}

	return &CommentView{
		ID:         c.ID,
		Content:    c.Content,
		CreatedAt:  c.CreatedAt,
		User:       c.User.ToView(),
		Images:     imageViews,
		ReplyCount: c.ReplyCount,
	}
}

type CommentWithResourceView struct {
	ID               uint         `json:"id"`
	Content          string       `json:"content"`
	CreatedAt        time.Time    `json:"created_at"`
	Resource         ResourceView `json:"resource"`
	User             UserView     `json:"user"`
	Images           []ImageView  `json:"images"`
	ReplyCount       uint         `json:"reply_count"`
	ContentTruncated bool         `json:"content_truncated"`
}

func (c *Comment) ToViewWithResource(r *Resource) *CommentWithResourceView {
	imageViews := make([]ImageView, 0, len(c.Images))
	for _, img := range c.Images {
		imageViews = append(imageViews, img.ToView())
	}

	return &CommentWithResourceView{
		ID:         c.ID,
		Content:    c.Content,
		CreatedAt:  c.CreatedAt,
		Resource:   r.ToView(),
		User:       c.User.ToView(),
		Images:     imageViews,
		ReplyCount: c.ReplyCount,
	}
}

type CommentWithRefView struct {
	ID         uint          `json:"id"`
	Content    string        `json:"content"`
	CreatedAt  time.Time     `json:"created_at"`
	User       UserView      `json:"user"`
	Images     []ImageView   `json:"images"`
	ReplyCount uint          `json:"reply_count"`
	Resource   *ResourceView `json:"resource,omitempty"`
	ReplyTo    *CommentView  `json:"reply_to,omitempty"`
}

func (c *Comment) ToViewWithRef(r *Resource, replyTo *Comment) *CommentWithRefView {
	imageViews := make([]ImageView, 0, len(c.Images))
	for _, img := range c.Images {
		imageViews = append(imageViews, img.ToView())
	}

	var replyToView *CommentView
	if replyTo != nil {
		replyToView = replyTo.ToView()
	}

	var rView *ResourceView
	if r != nil {
		v := r.ToView()
		rView = &v
	}

	return &CommentWithRefView{
		ID:         c.ID,
		Content:    c.Content,
		CreatedAt:  c.CreatedAt,
		User:       c.User.ToView(),
		Images:     imageViews,
		ReplyCount: c.ReplyCount,
		Resource:   rView,
		ReplyTo:    replyToView,
	}
}
