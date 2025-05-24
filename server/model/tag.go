package model

import "gorm.io/gorm"

type Tag struct {
	gorm.Model
	Name        string `gorm:"unique"`
	Description string
	Resources   []Resource `gorm:"many2many:resource_tags;"`
}

type TagView struct {
	ID          uint   `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description"`
}

func (t *Tag) ToView() *TagView {
	return &TagView{
		ID:          t.ID,
		Name:        t.Name,
		Description: t.Description,
	}
}
