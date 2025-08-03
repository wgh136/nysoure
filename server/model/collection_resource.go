package model

import "time"

type CollectionResource struct {
	CollectionID uint `gorm:"primaryKey"`
	ResourceID   uint `gorm:"primaryKey"`
	CreatedAt    time.Time
}
