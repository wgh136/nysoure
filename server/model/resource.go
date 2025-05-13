package model

import (
	"time"

	"gorm.io/gorm"
)

type Resource struct {
	gorm.Model
	Title             string
	AlternativeTitles []string `gorm:"serializer:json"`
	Article           string
	Images            []Image `gorm:"many2many:resource_images;"`
	Tags              []Tag   `gorm:"many2many:resource_tags;"`
	Files             []File  `gorm:"foreignKey:ResourceID"`
	UserID            uint
	User              User
	Views             uint
	Downloads         uint
}

type ResourceView struct {
	ID        uint       `json:"id"`
	Title     string     `json:"title"`
	CreatedAt time.Time  `json:"created_at"`
	Tags      []TagView  `json:"tags"`
	Image     *ImageView `json:"image"`
	Author    UserView   `json:"author"`
}

type ResourceDetailView struct {
	ID                uint        `json:"id"`
	Title             string      `json:"title"`
	AlternativeTitles []string    `json:"alternativeTitles"`
	Article           string      `json:"article"`
	CreatedAt         time.Time   `json:"createdAt"`
	Tags              []TagView   `json:"tags"`
	Images            []ImageView `json:"images"`
	Files             []FileView  `json:"files"`
	Author            UserView    `json:"author"`
	Views             uint        `json:"views"`
	Downloads         uint        `json:"downloads"`
}

func (r *Resource) ToView() ResourceView {
	tags := make([]TagView, len(r.Tags))
	for i, tag := range r.Tags {
		tags[i] = *tag.ToView()
	}

	var image *ImageView
	if len(r.Images) > 0 {
		v := r.Images[0].ToView()
		image = &v
	}

	return ResourceView{
		ID:        r.ID,
		Title:     r.Title,
		CreatedAt: r.CreatedAt,
		Tags:      tags,
		Image:     image,
		Author:    r.User.ToView(),
	}
}

func (r *Resource) ToDetailView() ResourceDetailView {
	images := make([]ImageView, len(r.Images))
	for i, image := range r.Images {
		images[i] = image.ToView()
	}
	tags := make([]TagView, len(r.Tags))
	for i, tag := range r.Tags {
		tags[i] = *tag.ToView()
	}

	files := make([]FileView, len(r.Files))
	for i, file := range r.Files {
		files[i] = *file.ToView()
	}
	return ResourceDetailView{
		ID:                r.ID,
		Title:             r.Title,
		AlternativeTitles: r.AlternativeTitles,
		Article:           r.Article,
		CreatedAt:         r.CreatedAt,
		Tags:              tags,
		Images:            images,
		Files:             files,
		Author:            r.User.ToView(),
		Views:             r.Views,
		Downloads:         r.Downloads,
	}
}
