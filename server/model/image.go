package model

import "gorm.io/gorm"

type Image struct {
	gorm.Model
	FileName string
	Width    int
	Height   int
	// An image can only belong to one resource, or it doesn't belong to any resource and is waiting for usage.
	Resource []Resource `gorm:"many2many:resource_images;"`
}

type ImageView struct {
	ID     uint `json:"id"`
	Width  int  `json:"width"`
	Height int  `json:"height"`
}

func (i *Image) ToView() ImageView {
	return ImageView{
		ID:     i.ID,
		Width:  i.Width,
		Height: i.Height,
	}
}
