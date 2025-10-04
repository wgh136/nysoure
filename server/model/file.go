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
	Hash        string `gorm:"default:null"`
}

type FileView struct {
	ID          string        `json:"id"`
	Filename    string        `json:"filename"`
	Description string        `json:"description"`
	Size        int64         `json:"size"`
	IsRedirect  bool          `json:"is_redirect"`
	User        UserView      `json:"user"`
	Resource    *ResourceView `json:"resource,omitempty"`
	Hash        string        `json:"hash,omitempty"`
	StorageName string        `json:"storage_name,omitempty"`
}

func (f *File) ToView() *FileView {
	return &FileView{
		ID:          f.UUID,
		Filename:    f.Filename,
		Description: f.Description,
		Size:        f.Size,
		IsRedirect:  f.RedirectUrl != "",
		User:        f.User.ToView(),
		Hash:        f.Hash,
		StorageName: f.Storage.Name,
	}
}

func (f *File) ToViewWithResource() *FileView {
	var resource *ResourceView
	if f.Resource.ID != 0 {
		rv := f.Resource.ToView()
		resource = &rv
	}

	return &FileView{
		ID:          f.UUID,
		Filename:    f.Filename,
		Description: f.Description,
		Size:        f.Size,
		IsRedirect:  f.RedirectUrl != "",
		User:        f.User.ToView(),
		Resource:    resource,
		Hash:        f.Hash,
	}
}
