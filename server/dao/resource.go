package dao

import (
	"errors"
	"math/rand"
	"nysoure/server/model"
	"sync"
	"sync/atomic"
	"time"

	"github.com/gofiber/fiber/v3/log"

	"gorm.io/gorm"
)

func CreateResource(r model.Resource) (model.Resource, error) {
	err := db.Transaction(func(tx *gorm.DB) error {
		r.ModifiedTime = time.Now()
		characters := r.Characters
		r.Characters = nil
		err := tx.Create(&r).Error
		if err != nil {
			return err
		}
		for _, c := range characters {
			c.ResourceID = r.ID
			// If ImageID is 0, set it to nil to avoid foreign key constraint error
			if c.ImageID != nil && *c.ImageID == 0 {
				c.ImageID = nil
			}
			if err := tx.Create(&c).Error; err != nil {
				return err
			}
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
		Preload("Tags", func(db *gorm.DB) *gorm.DB {
			return db.Select("id", "name", "type", "alias_of")
		}).
		Preload("Files").
		Preload("Files.User").
		Preload("Files.Storage").
		Preload("Characters").
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
		order = "modified_time ASC"
	case model.RSortTimeDesc:
		order = "modified_time DESC"
	case model.RSortViewsAsc:
		order = "views ASC"
	case model.RSortViewsDesc:
		order = "views DESC"
	case model.RSortDownloadsAsc:
		order = "downloads ASC"
	case model.RSortDownloadsDesc:
		order = "downloads DESC"
	default:
		order = "modified_time DESC" // Default sort order
	}

	if err := db.Offset((page - 1) * pageSize).Limit(pageSize).Preload("User").Preload("Images").Preload("Tags").Order(order).Find(&resources).Error; err != nil {
		return nil, 0, err
	}

	totalPages := (total + int64(pageSize) - 1) / int64(pageSize)

	return resources, int(totalPages), nil
}

func UpdateResource(r model.Resource) error {
	// Update a resource in the database
	return db.Transaction(func(tx *gorm.DB) error {
		images := r.Images
		tags := r.Tags
		characters := r.Characters
		r.Characters = nil
		r.Images = nil
		r.Tags = nil
		r.Files = nil
		r.ModifiedTime = time.Now()
		oldCharacters := []model.Character{}
		if err := db.Model(&model.Character{}).Where("resource_id = ?", r.ID).Find(&oldCharacters).Error; err != nil {
			return err
		}
		if err := db.Save(&r).Error; err != nil {
			return err
		}
		if err := db.Model(&r).Association("Images").Replace(images); err != nil {
			return err
		}
		if err := db.Model(&r).Association("Tags").Replace(tags); err != nil {
			return err
		}
		for _, c := range oldCharacters {
			shouldDelete := true
			for _, nc := range characters {
				if c.ID == nc.ID {
					shouldDelete = false
					break
				}
			}
			if shouldDelete {
				if err := tx.Delete(&c).Error; err != nil {
					return err
				}
			}
		}
		for _, c := range characters {
			shouldAdd := true
			for _, oc := range oldCharacters {
				if c.Equal(&oc) {
					shouldAdd = false
					break
				}
			}
			if shouldAdd {
				c.ID = 0
				c.ResourceID = r.ID
				// If ImageID is 0, set it to nil to avoid foreign key constraint error
				if c.ImageID != nil && *c.ImageID == 0 {
					c.ImageID = nil
				}
				if err := tx.Create(&c).Error; err != nil {
					return err
				}
			}
		}
		return nil
	})
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
		if err := tx.Model(&model.File{}).Where("resource_id = ?", id).Delete(&model.File{}).Error; err != nil {
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
		randomID := uint(1)
		if maxID > 1 {
			randomID = uint(1 + rand.Int63n(maxID-1))
		}
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

func GetResourcesIdWithTag(tagID uint) ([]uint, error) {
	tag, err := GetTagByID(tagID)
	if err != nil {
		return nil, err
	}
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
	var result []model.Resource
	subQuery := db.Table("resource_tags").
		Select("resource_id").
		Where("tag_id IN ?", tagIds).
		Group("resource_id")
	if err := db.Model(&model.Resource{}).
		Where("id IN (?)", subQuery).
		Order("created_at DESC").
		Limit(10000).
		Select("id", "created_at").
		Find(&result).
		Error; err != nil {
		return nil, err
	}

	ids := make([]uint, len(result))
	for i, r := range result {
		ids[i] = r.ID
	}
	return ids, nil
}

func BatchGetResources(ids []uint) ([]model.Resource, error) {
	var resources []model.Resource

	for _, id := range ids {
		var r model.Resource
		if err := db.
			Preload("User").
			Preload("Images").
			Preload("Tags").
			First(&r, id).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				continue
			}
			return nil, err
		}
		for i, tag := range r.Tags {
			if tag.AliasOf != nil {
				t, err := GetTagByID(*tag.AliasOf)
				if err != nil {
					return nil, err
				} else {
					r.Tags[i].Type = t.Type
				}
			}
		}
		resources = append(resources, r)
	}

	return resources, nil
}

func CountResources() (int64, error) {
	var count int64
	if err := db.Model(&model.Resource{}).Count(&count).Error; err != nil {
		return 0, err
	}
	return count, nil
}

// UpdateCharacterImage 更新角色的图片ID
func UpdateCharacterImage(characterID, imageID uint) error {
	var updateValue interface{}
	if imageID == 0 {
		updateValue = nil
	} else {
		updateValue = imageID
	}

	result := db.Model(&model.Character{}).Where("id = ?", characterID).Update("image_id", updateValue)
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return model.NewNotFoundError("Character not found")
	}
	return nil
}
