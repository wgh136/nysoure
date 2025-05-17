package model

import (
	"gorm.io/gorm"
)

type File struct {
	gorm.Model
	UUID        string `gorm:"uniqueIndex;not null"`
	Filename    string
	Description string
	StorageKey  string
	StorageID   *uint `gorm:"default:null"`
	Storage     Storage
	ResourceID  uint
	RedirectUrl string
	Resource    Resource `gorm:"foreignKey:ResourceID"`
	UserID      uint
	User        User `gorm:"foreignKey:UserID"`
	Size        int64
}

type FileView struct {
	ID          string `json:"id"`
	Filename    string `json:"filename"`
	Description string `json:"description"`
	Size        int64  `json:"size"`
	IsRedirect  bool   `json:"is_redirect"`
	UserID      uint   `json:"user_id"`
}

func (f *File) ToView() *FileView {
	return &FileView{
		ID:          f.UUID,
		Filename:    f.Filename,
		Description: f.Description,
		Size:        f.Size,
		IsRedirect:  f.RedirectUrl != "",
		UserID:      f.UserID,
	}
}
