package dao

import (
	"errors"
	"nysoure/server/model"
	"strings"

	"gorm.io/gorm"
)

func CreateResource(r model.Resource) (model.Resource, error) {
	// Create a new resource in the database
	if err := db.Create(&r).Error; err != nil {
		return model.Resource{}, err
	}
	return r, nil
}

func GetResourceByID(id uint) (model.Resource, error) {
	// Retrieve a resource by its ID from the database
	var r model.Resource
	if err := db.Preload("User").Preload("Images").Preload("Tags").Preload("Files").First(&r, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return model.Resource{}, model.NewNotFoundError("Resource not found")
		}
		return model.Resource{}, err
	}
	return r, nil
}

func GetResourceList(page, pageSize int) ([]model.Resource, int, error) {
	// Retrieve a list of resources with pagination
	var resources []model.Resource
	var total int64

	if err := db.Model(&model.Resource{}).Count(&total).Error; err != nil {
		return nil, 0, err
	}

	if err := db.Offset((page - 1) * pageSize).Limit(pageSize).Preload("User").Preload("Images").Preload("Tags").Order("created_at DESC").Find(&resources).Error; err != nil {
		return nil, 0, err
	}

	totalPages := int(total) / pageSize

	return resources, int(totalPages), nil
}

func UpdateResource(r model.Resource) error {
	// Update a resource in the database
	if err := db.Save(&r).Error; err != nil {
		return err
	}
	return nil
}

func DeleteResource(id uint) error {
	// Delete a resource from the database
	r := model.Resource{}
	r.ID = id
	if err := db.Delete(&r).Error; err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return err
	}
	return nil
}

func Search(query string, page, pageSize int) ([]model.Resource, int, error) {
	query = strings.TrimSpace(query)
	keywords := strings.Split(query, " ")
	resource, err := searchWithKeyword(keywords[0])
	if err != nil {
		return nil, 0, err
	}
	if len(keywords) > 1 {
		for _, keyword := range keywords[1:] {
			r := make([]model.Resource, 0, len(resource))
			for _, res := range resource {
				if strings.Contains(res.Title, keyword) {
					r = append(r, res)
					continue
				}
				ok := false
				for _, at := range res.AlternativeTitles {
					if strings.Contains(at, keyword) {
						r = append(r, res)
						ok = true
						break
					}
				}
				if ok {
					continue
				}
				for _, tag := range res.Tags {
					if tag.Name == keyword {
						r = append(r, res)
						ok = true
						break
					}
				}
			}
			resource = r
		}
	}

	startIndex := (page - 1) * pageSize
	endIndex := startIndex + pageSize
	if startIndex > len(resource) {
		return nil, 0, nil
	}
	if endIndex > len(resource) {
		endIndex = len(resource)
	}
	totalPages := len(resource) / pageSize

	result := make([]model.Resource, 0, endIndex-startIndex)
	for i := startIndex; i < endIndex; i++ {
		var r model.Resource
		if err := db.Model(&r).Preload("User").Preload("Images").Preload("Tags").Where("id=?", resource[i].ID).First(&r).Error; err != nil {
			return nil, 0, err
		}
		result = append(result, r)
	}

	return result, totalPages, nil
}

func searchWithKeyword(keyword string) ([]model.Resource, error) {
	if len(keyword) == 0 {
		return nil, nil
	}
	if len([]rune(keyword)) < 20 {
		var tag model.Tag
		if err := db.Where("name = ?", keyword).First(&tag).Error; err != nil {
			if !errors.Is(err, gorm.ErrRecordNotFound) {
				return nil, err
			}
		} else {
			if err := db.Model(&tag).Preload("Resources").Find(&tag).Error; err != nil {
				return nil, err
			}
			return tag.Resources, nil
		}
	}
	if len([]rune(keyword)) < 80 {
		var resources []model.Resource
		if err := db.Where("title LIKE ?", "%"+keyword+"%").Or("alternative_titles LIKE ?", "%"+keyword+"%").Find(&resources).Error; err != nil {
			return nil, err
		}
		return resources, nil
	}
	return nil, model.NewRequestError("Keyword too long")
}

func GetResourceByTag(tagID uint, page int, pageSize int) ([]model.Resource, int, error) {
	var tag model.Tag
	var total int64

	total = db.Model(&model.Tag{}).Where("id = ?", tagID).Association("Resources").Count()

	if err := db.Model(&model.Tag{}).Where("id = ?", tagID).Preload("User").Preload("Resources", func(tx *gorm.DB) *gorm.DB {
		return tx.Offset((page - 1) * pageSize).Limit(pageSize)
	}).First(&tag).Error; err != nil {
		return nil, 0, err
	}

	totalPages := int(total) / pageSize

	return tag.Resources, totalPages, nil
}
