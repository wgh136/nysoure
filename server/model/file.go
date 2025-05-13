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
}

func (f *File) ToView() *FileView {
	return &FileView{
		ID:          f.UUID,
		Filename:    f.Filename,
		Description: f.Description,
	}
}
