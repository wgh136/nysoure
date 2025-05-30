package dao

import (
	"errors"
	"github.com/gofiber/fiber/v3/log"
	"nysoure/server/model"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"gorm.io/gorm"
)

func CreateResource(r model.Resource) (model.Resource, error) {
	err := db.Transaction(func(tx *gorm.DB) error {
		err := tx.Create(&r).Error
		if err != nil {
			return err
		}
		if err := tx.Model(&model.User{}).Where("id = ?", r.UserID).Update("uploads_count", gorm.Expr("uploads_count + ?", 1)).Error; err != nil {
			return err
		}
		return nil
	})
	if err != nil {
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

func GetResourceList(page, pageSize int, sort model.RSort) ([]model.Resource, int, error) {
	// Retrieve a list of resources with pagination
	var resources []model.Resource
	var total int64

	if err := db.Model(&model.Resource{}).Count(&total).Error; err != nil {
		return nil, 0, err
	}

	order := ""
	switch sort {
	case model.RSortTimeAsc:
		order = "created_at ASC"
	case model.RSortTimeDesc:
		order = "created_at DESC"
	case model.RSortViewsAsc:
		order = "views ASC"
	case model.RSortViewsDesc:
		order = "views DESC"
	case model.RSortDownloadsAsc:
		order = "downloads ASC"
	case model.RSortDownloadsDesc:
		order = "downloads DESC"
	default:
		order = "created_at DESC" // Default sort order
	}

	if err := db.Offset((page - 1) * pageSize).Limit(pageSize).Preload("User").Preload("Images").Preload("Tags").Order(order).Find(&resources).Error; err != nil {
		return nil, 0, err
	}

	totalPages := (total + int64(pageSize) - 1) / int64(pageSize)

	return resources, int(totalPages), nil
}

func UpdateResource(r model.Resource) error {
	// Update a resource in the database
	images := r.Images
	tags := r.Tags
	r.Images = nil
	r.Tags = nil
	if err := db.Save(&r).Error; err != nil {
		return err
	}
	if err := db.Model(&r).Association("Images").Replace(images); err != nil {
		return err
	}
	if err := db.Model(&r).Association("Tags").Replace(tags); err != nil {
		return err
	}
	return nil
}

func DeleteResource(id uint) error {
	return db.Transaction(func(tx *gorm.DB) error {
		var r model.Resource
		if err := tx.Where("id = ?", id).First(&r).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return model.NewNotFoundError("Resource not found")
			}
			return err
		}
		if err := tx.Model(&model.User{}).Where("id = ?", r.UserID).Update("uploads_count", gorm.Expr("uploads_count - ?", 1)).Error; err != nil {
			return err
		}
		if err := tx.Delete(&r).Error; err != nil {
			return err
		}
		return nil
	})
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
	totalPages := (len(resource) + pageSize - 1) / pageSize

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
		var err error
		if tag, err = GetTagByName(keyword); err != nil {
			if !model.IsNotFoundError(err) {
				return nil, err
			}
		} else {
			if tag.AliasOf != nil {
				tag, err = GetTagByID(*tag.AliasOf)
				if err != nil {
					return nil, err
				}
			}
			var tagIds []uint
			tagIds = append(tagIds, tag.ID)
			for _, alias := range tag.Aliases {
				tagIds = append(tagIds, alias.ID)
			}
			var resources []model.Resource
			subQuery := db.Table("resource_tags").
				Select("resource_id").
				Where("tag_id IN ?", tagIds).
				Group("resource_id")
			if err := db.Where("id IN (?)", subQuery).Select("id", "title", "alternative_titles").Preload("Tags").Find(&resources).Error; err != nil {
				return nil, err
			}
			return resources, nil
		}
	}
	if len([]rune(keyword)) < 80 {
		var resources []model.Resource
		if err := db.Where("title LIKE ?", "%"+keyword+"%").Or("alternative_titles LIKE ?", "%"+keyword+"%").Select("id", "title", "alternative_titles").Preload("Tags").Find(&resources).Error; err != nil {
			return nil, err
		}
		return resources, nil
	}
	return nil, model.NewRequestError("Keyword too long")
}

func GetResourceByTag(tagID uint, page int, pageSize int) ([]model.Resource, int, error) {
	tag, err := GetTagByID(tagID)
	if err != nil {
		return nil, 0, err
	}

	if tag.AliasOf != nil {
		tag, err = GetTagByID(*tag.AliasOf)
		if err != nil {
			return nil, 0, err
		}
	}

	var tagIds []uint
	tagIds = append(tagIds, tag.ID)
	for _, alias := range tag.Aliases {
		tagIds = append(tagIds, alias.ID)
	}

	var resources []model.Resource
	var total int64

	subQuery := db.Table("resource_tags").
		Select("resource_id").
		Where("tag_id IN ?", tagIds).
		Group("resource_id")

	if err := db.Model(&model.Resource{}).
		Where("id IN (?)", subQuery).
		Count(&total).Error; err != nil {
		return nil, 0, err
	}

	if err := db.Where("id IN (?)", subQuery).
		Offset((page - 1) * pageSize).
		Limit(pageSize).
		Preload("User").
		Preload("Images").
		Preload("Tags").
		Preload("Files").
		Order("created_at DESC").
		Find(&resources).Error; err != nil {
		return nil, 0, err
	}

	totalPages := (total + int64(pageSize) - 1) / int64(pageSize)

	return resources, int(totalPages), nil
}

func ExistsResource(id uint) (bool, error) {
	var r model.Resource
	if err := db.Model(&model.Resource{}).Where("id = ?", id).First(&r).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return false, nil
		}
		return false, err
	}
	return true, nil
}

func GetResourcesByUsername(username string, page, pageSize int) ([]model.Resource, int, error) {
	var user model.User
	if err := db.Where("username = ?", username).First(&user).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, 0, model.NewNotFoundError("User not found")
		}
		return nil, 0, err
	}
	var resources []model.Resource
	var total int64

	if err := db.Model(&model.Resource{}).Where("user_id = ?", user.ID).Count(&total).Error; err != nil {
		return nil, 0, err
	}

	if err := db.Model(&model.Resource{}).Where("user_id = ?", user.ID).Offset((page - 1) * pageSize).Limit(pageSize).Preload("User").Preload("Images").Preload("Tags").Order("created_at DESC").Find(&resources).Error; err != nil {
		return nil, 0, err
	}

	totalPages := (total + int64(pageSize) - 1) / int64(pageSize)

	return resources, int(totalPages), nil
}

// GetAllResources retrieves all resources from the database without all related data.
// It is used to generate a sitemap and rss feed.
func GetAllResources() ([]model.Resource, error) {
	var resources []model.Resource
	if err := db.Find(&resources).Error; err != nil {
		return nil, err
	}
	return resources, nil
}

type CachedResourceStats struct {
	id        uint
	views     atomic.Int64
	downloads atomic.Int64
}

var (
	cachedResourcesStats = make(map[uint]*CachedResourceStats)
	cacheMutex           = sync.RWMutex{}
)

func init() {
	go func() {
		ticker := time.NewTicker(10 * time.Minute)
		defer ticker.Stop()

		for range ticker.C {
			cacheMutex.Lock()
			if len(cachedResourcesStats) == 0 {
				cacheMutex.Unlock()
				continue
			}

			err := db.Transaction(func(tx *gorm.DB) error {
				for id, stats := range cachedResourcesStats {
					var count int64
					if err := tx.Model(&model.Resource{}).Where("id = ?", id).Count(&count).Error; err != nil {
						if errors.Is(err, gorm.ErrRecordNotFound) {
							log.Warnf("Resource with ID %d not found, skipping stats update", id)
							continue
						}
						return err
					}
					if count == 0 {
						continue
					}

					if views := stats.views.Swap(0); views > 0 {
						if err := tx.Model(&model.Resource{}).Where("id = ?", id).Update("views", gorm.Expr("views + ?", views)).Error; err != nil {
							return err
						}
					}
					if downloads := stats.downloads.Swap(0); downloads > 0 {
						if err := tx.Model(&model.Resource{}).Where("id = ?", id).Update("downloads", gorm.Expr("downloads + ?", downloads)).Error; err != nil {
							return err
						}
					}
				}
				return nil
			})
			if err != nil {
				log.Error("Failed to update resource stats cache: ", err)
			}
			clear(cachedResourcesStats)
			cacheMutex.Unlock()
		}
	}()
}

func AddResourceViewCount(id uint) error {
	cacheMutex.RLock()
	stats, exists := cachedResourcesStats[id]
	cacheMutex.RUnlock()

	if !exists {
		cacheMutex.Lock()
		stats, exists = cachedResourcesStats[id]
		if !exists {
			stats = &CachedResourceStats{id: id}
			cachedResourcesStats[id] = stats
		}
		cacheMutex.Unlock()
	}

	stats.views.Add(1)
	return nil
}

func AddResourceDownloadCount(id uint) error {
	cacheMutex.RLock()
	stats, exists := cachedResourcesStats[id]
	cacheMutex.RUnlock()

	if !exists {
		cacheMutex.Lock()
		stats, exists = cachedResourcesStats[id]
		if !exists {
			stats = &CachedResourceStats{id: id}
			cachedResourcesStats[id] = stats
		}
		cacheMutex.Unlock()
	}

	stats.downloads.Add(1)
	return nil
}
