package model

import "gorm.io/gorm"

type Collection struct {
	gorm.Model
	Title          string  `gorm:"not null"`
	Article        string  `gorm:"not null"`
	UserID         uint    `gorm:"not null"`
	User           User    `gorm:"foreignKey:UserID;references:ID"`
	ResourcesCount int     `gorm:"default:0"`
	Images         []Image `gorm:"many2many:collection_images;"`
	Public         bool    `gorm:"default:false"` // 新增公开/私有字段
}

type CollectionView struct {
	ID             uint     `json:"id"`
	Title          string   `json:"title"`
	Article        string   `json:"article"`
	User           UserView `json:"user"`
	ResourcesCount int      `json:"resources_count"`
	Images         []Image  `json:"images"`
	IsPublic       bool     `json:"isPublic"` // 新增公开/私有字段
}

func (c Collection) ToView() *CollectionView {
	return &CollectionView{
		ID:             c.ID,
		Title:          c.Title,
		Article:        c.Article,
		User:           c.User.ToView(),
		ResourcesCount: c.ResourcesCount,
		Images:         c.Images,
		IsPublic:       c.Public, // 新增
	}
}
