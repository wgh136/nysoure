package model

import (
	"gorm.io/gorm"
)

type File struct {
	gorm.Model
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
}

type FileView struct {
	ID          uint   `json:"id"`
	Filename    string `json:"filename"`
	Description string `json:"description"`
}

func (f *File) ToView() *FileView {
	return &FileView{
		ID:          f.ID,
		Filename:    f.Filename,
		Description: f.Description,
	}
}
