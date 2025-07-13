package dao

import (
	"errors"
	"math/rand"
	"nysoure/server/model"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"github.com/gofiber/fiber/v3/log"

	"gorm.io/gorm"
)

func CreateResource(r model.Resource) (model.Resource, error) {
	err := db.Transaction(func(tx *gorm.DB) error {
		err := tx.Create(&r).Error
		if err != nil {
			return err
		}
		if err := tx.Model(&model.User{}).Where("id = ?", r.UserID).Update("resources_count", gorm.Expr("resources_count + ?", 1)).Error; err != nil {
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
	if err := db.Preload("User").
		Preload("Images").
		Preload("Tags").
		Preload("Files").
		Preload("Files.User").
		First(&r, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return model.Resource{}, model.NewNotFoundError("Resource not found")
		}
		return model.Resource{}, err
	}
	for i, tag := range r.Tags {
		if tag.AliasOf != nil {
			t, err := GetTagByID(*tag.AliasOf)
			if err != nil {
				return model.Resource{}, err
			} else {
				r.Tags[i].Type = t.Type
			}
		}
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
	r.Files = nil
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
		if err := tx.Model(&model.User{}).Where("id = ?", r.UserID).Update("resources_count", gorm.Expr("resources_count - ?", 1)).Error; err != nil {
			return err
		}
		if err := tx.Delete(&r).Error; err != nil {
			return err
		}
		if err := tx.Model(&model.Activity{}).Where("type = ? AND ref_id = ?", model.ActivityTypeNewResource, id).Delete(&model.Activity{}).Error; err != nil {
			return err
		}
		if err := tx.Model(&model.Activity{}).Where("type = ? AND ref_id = ?", model.ActivityTypeUpdateResource, id).Delete(&model.Activity{}).Error; err != nil {
			return err
		}
		return nil
	})
}

func splitQuery(query string) []string {
	var keywords []string

	query = strings.TrimSpace(query)
	if query == "" {
		return keywords
	}

	l, r := 0, 0
	inQuote := false
	quoteChar := byte(0)

	for r < len(query) {
		if (query[r] == '"' || query[r] == '\'') && (r == 0 || query[r-1] != '\\') {
			if !inQuote {
				inQuote = true
				quoteChar = query[r]
				l = r + 1
			} else if query[r] == quoteChar {
				if r > l {
					keywords = append(keywords, strings.TrimSpace(query[l:r]))
				}
				inQuote = false
				r++
				l = r
				continue
			}
		} else if !inQuote && query[r] == ' ' {
			if r > l {
				keywords = append(keywords, strings.TrimSpace(query[l:r]))
			}
			for r < len(query) && query[r] == ' ' {
				r++
			}
			l = r
			continue
		}

		r++
	}

	if l < len(query) {
		keywords = append(keywords, strings.TrimSpace(query[l:r]))
	}

	return keywords
}

func Search(query string, page, pageSize int) ([]model.Resource, int, error) {
	query = strings.TrimSpace(query)

	keywords := splitQuery(query)
	if len(keywords) == 0 {
		return nil, 0, nil
	}
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
	} else if len([]rune(keyword)) > 100 {
		return nil, model.NewRequestError("Keyword is too long")
	}

	var resources []model.Resource

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
			subQuery := db.Table("resource_tags").
				Select("resource_id").
				Where("tag_id IN ?", tagIds).
				Group("resource_id")
			if err := db.Where("id IN (?)", subQuery).Select("id", "title", "alternative_titles").Preload("Tags").Find(&resources).Error; err != nil {
				return nil, err
			}
		}
	}

	var titleResult []model.Resource
	if err := db.Where("title LIKE ?", "%"+keyword+"%").Or("alternative_titles LIKE ?", "%"+keyword+"%").Select("id", "title", "alternative_titles").Preload("Tags").Find(&titleResult).Error; err != nil {
		return nil, err
	}

	if len(titleResult) > 0 {
		if len(resources) == 0 {
			resources = titleResult
		} else {
			resourceMap := make(map[uint]model.Resource)
			for _, res := range resources {
				resourceMap[res.ID] = res
			}
			for _, res := range titleResult {
				if _, exists := resourceMap[res.ID]; !exists {
					resources = append(resources, res)
				}
			}
		}
	}

	return resources, nil
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

// CountResourcesByTag counts the number of resources associated with a specific tag.
func CountResourcesByTag(tagID uint) (int64, error) {
	tag, err := GetTagByID(tagID)
	if err != nil {
		return 0, err
	}
	if tag.AliasOf != nil {
		tag, err = GetTagByID(*tag.AliasOf)
		if err != nil {
			return 0, err
		}
	}
	var tagIds []uint
	tagIds = append(tagIds, tag.ID)
	for _, alias := range tag.Aliases {
		tagIds = append(tagIds, alias.ID)
	}
	var count int64
	subQuery := db.Table("resource_tags").
		Select("resource_id").
		Where("tag_id IN ?", tagIds).
		Group("resource_id")
	if err := db.Model(&model.Resource{}).
		Where("id IN (?)", subQuery).
		Count(&count).Error; err != nil {
		return 0, err
	}
	return count, nil
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

func RandomResource() (model.Resource, error) {
	var maxID int64
	if err := db.Model(&model.Resource{}).Select("MAX(id)").Scan(&maxID).Error; err != nil {
		return model.Resource{}, err
	}
	for {
		randomID := uint(1 + rand.Int63n(maxID-1))
		var resource model.Resource
		if err := db.
			Preload("User").
			Preload("Images").
			Preload("Tags").
			Preload("Files").
			Where("id = ?", randomID).
			First(&resource).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				continue // Try again if the resource does not exist
			}
			return model.Resource{}, err // Return error if any other issue occurs
		}
		return resource, nil // Return the found resource
	}
}
