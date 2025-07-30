package model

import "gorm.io/gorm"

type Collection struct {
	gorm.Model
	Title     string     `gorm:"not null"`
	Article   string     `gorm:"not null"`
	UserID    uint       `gorm:"not null"`
	User      User       `gorm:"foreignKey:UserID;references:ID"`
	Images    []Image    `gorm:"many2many:collection_images;"`
	Resources []Resource `gorm:"many2many:collection_resources;"`
}

type CollectionView struct {
	ID      uint     `json:"id"`
	Title   string   `json:"title"`
	Article string   `json:"article"`
	User    UserView `json:"user"`
	Images  []Image  `json:"images"`
}

func (c Collection) ToView() *CollectionView {
	return &CollectionView{
		ID:      c.ID,
		Title:   c.Title,
		Article: c.Article,
		User:    c.User.ToView(),
		Images:  c.Images,
	}
}
