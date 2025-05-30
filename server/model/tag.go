package model

import "gorm.io/gorm"

type Tag struct {
	gorm.Model
	Name        string `gorm:"unique"`
	Description string
	AliasOf     *uint `gorm:"default:NULL"` // Foreign key for aliasing, can be NULL
	Type        string
	Resources   []Resource `gorm:"many2many:resource_tags;"`
	Aliases     []Tag      `gorm:"foreignKey:AliasOf;references:ID"`
}

type TagView struct {
	ID          uint     `json:"id"`
	Name        string   `json:"name"`
	Description string   `json:"description"`
	Type        string   `json:"type"`
	Aliases     []string `json:"aliases"`
}

func (t *Tag) ToView() *TagView {
	aliases := make([]string, 0, len(t.Aliases))
	for _, alias := range t.Aliases {
		aliases = append(aliases, alias.Name)
	}
	return &TagView{
		ID:          t.ID,
		Name:        t.Name,
		Description: t.Description,
		Type:        t.Type,
		Aliases:     aliases,
	}
}
