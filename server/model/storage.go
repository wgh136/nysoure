package model

import (
	"time"

	"gorm.io/gorm"
)

type Storage struct {
	gorm.Model
	Name        string
	Type        string
	Config      string
	MaxSize     int64
	CurrentSize int64
	IsDefault   bool
}

type StorageView struct {
	ID          uint      `json:"id"`
	Name        string    `json:"name"`
	Type        string    `json:"type"`
	MaxSize     int64     `json:"maxSize"`
	CurrentSize int64     `json:"currentSize"`
	CreatedAt   time.Time `json:"createdAt"`
	IsDefault   bool      `json:"isDefault"`
}

func (s *Storage) ToView() StorageView {
	return StorageView{
		ID:          s.ID,
		Name:        s.Name,
		Type:        s.Type,
		MaxSize:     s.MaxSize,
		CurrentSize: s.CurrentSize,
		CreatedAt:   s.CreatedAt,
		IsDefault:   s.IsDefault,
	}
}
