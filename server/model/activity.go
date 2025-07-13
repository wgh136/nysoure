package model

import (
	"time"

	"gorm.io/gorm"
)

type ActivityType uint

const (
	ActivityTypeUnknown ActivityType = iota
	ActivityTypeNewResource
	ActivityTypeUpdateResource
	ActivityTypeNewComment
	ActivityTypeNewFile
)

type Activity struct {
	gorm.Model
	UserID uint         `gorm:"not null"`
	Type   ActivityType `gorm:"not null;index:idx_type_refid"`
	RefID  uint         `gorm:"not null;index:idx_type_refid"`
}

type ActivityView struct {
	ID       uint          `json:"id"`
	Time     time.Time     `json:"time"`
	Type     ActivityType  `json:"type"`
	User     UserView      `json:"user"`
	Comment  *CommentView  `json:"comment,omitempty"`
	Resource *ResourceView `json:"resource,omitempty"`
	File     *FileView     `json:"file,omitempty"`
}
