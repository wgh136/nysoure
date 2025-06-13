package model

import (
	"gorm.io/gorm"
	"time"
)

type ActivityType uint

const (
	ActivityTypeUnknown ActivityType = iota
	ActivityTypeNewResource
	ActivityTypeUpdateResource
	ActivityTypeNewComment
)

type Activity struct {
	gorm.Model
	UserID uint         `gorm:"not null"`
	Type   ActivityType `gorm:"not null"`
	RefID  uint         `gorm:"not null"` // Reference ID for the resource or comment
}

type ActivityView struct {
	ID       uint                     `json:"id"`
	Time     time.Time                `json:"time"`
	Type     ActivityType             `json:"type"`
	User     UserView                 `json:"user"`
	Comment  *CommentWithResourceView `json:"comment,omitempty"`
	Resource *ResourceView            `json:"resource,omitempty"`
}
