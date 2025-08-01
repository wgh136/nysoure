package dao

import (
	"nysoure/server/model"

	"gorm.io/gorm"
)

func CreateCollection(uid uint, title string, article string, images []uint, public bool) (model.Collection, error) {
	var collection model.Collection
	err := db.Transaction(func(tx *gorm.DB) error {
		collection = model.Collection{
			UserID:  uid,
			Title:   title,
			Article: article,
			Public:  public, // 新增
		}

		if err := tx.Create(&collection).Error; err != nil {
			return err
		}

		if err := tx.Model(&collection).Association("Images").Replace(images); err != nil {
			return err
		}

		return nil
	})

	if err != nil {
		return model.Collection{}, err
	}
	return collection, nil
}

func UpdateCollection(id uint, title string, article string, images []uint, public bool) error {
	return db.Transaction(func(tx *gorm.DB) error {
		collection := &model.Collection{}

		// First find the existing collection
		if err := tx.Where("id = ?", id).First(collection).Error; err != nil {
			return err
		}

		// Update the fields
		updates := map[string]interface{}{
			"title":   title,
			"article": article,
			"public":  public,
		}

		if err := tx.Model(collection).Updates(updates).Error; err != nil {
			return err
		}

		if err := tx.Model(collection).Association("Images").Replace(images); err != nil {
			return err
		}

		return nil
	})
}

func DeleteCollection(id uint) error {
	return db.Transaction(func(tx *gorm.DB) error {
		collection := &model.Collection{}

		if err := tx.Where("id = ?", id).First(collection).Error; err != nil {
			return err
		}

		if err := tx.Model(collection).Association("Images").Clear(); err != nil {
			return err
		}

		if err := tx.Model(collection).Association("Resources").Clear(); err != nil {
			return err
		}

		if err := tx.Delete(collection).Error; err != nil {
			return err
		}

		return nil
	})
}

func AddResourceToCollection(collectionID uint, resourceID uint) error {
	return db.Transaction(func(tx *gorm.DB) error {
		collection := &model.Collection{}

		if err := tx.Where("id = ?", collectionID).First(collection).Error; err != nil {
			return model.NewRequestError("Invalid collection ID")
		}

		if err := tx.Model(&model.Resource{}).Where("id = ?", resourceID).First(&model.Resource{}).Error; err != nil {
			return model.NewRequestError("Invalid resource ID")
		}

		if err := tx.Model(collection).Association("Resources").Append(&model.Resource{
			Model: gorm.Model{
				ID: resourceID,
			},
		}); err != nil {
			return err
		}

		if err := tx.Model(collection).UpdateColumn("resources_count", gorm.Expr("resources_count + ?", 1)).Error; err != nil {
			return err
		}

		return nil
	})
}

func RemoveResourceFromCollection(collectionID uint, resourceID uint) error {
	return db.Transaction(func(tx *gorm.DB) error {
		collection := &model.Collection{}

		if err := tx.Where("id = ?", collectionID).First(collection).Error; err != nil {
			return model.NewRequestError("Invalid collection ID")
		}

		if err := tx.Model(&model.Resource{}).Where("id = ?", resourceID).First(&model.Resource{}).Error; err != nil {
			return model.NewRequestError("Invalid resource ID")
		}

		if err := tx.Model(collection).Association("Resources").Delete(&model.Resource{
			Model: gorm.Model{
				ID: resourceID,
			},
		}); err != nil {
			return err
		}

		if err := tx.Model(collection).UpdateColumn("resources_count", gorm.Expr("resources_count - ?", 1)).Error; err != nil {
			return err
		}

		return nil
	})
}

func GetCollectionByID(id uint) (*model.Collection, error) {
	collection := &model.Collection{}
	if err := db.Preload("Images").Preload("Resources").Preload("User").Where("id = ?", id).First(collection).Error; err != nil {
		return nil, err
	}
	return collection, nil
}

func ListUserCollections(uid uint, page int, pageSize int, showPrivate bool) ([]*model.Collection, int64, error) {
	var collections []*model.Collection
	var total int64

	query := db.Model(&model.Collection{}).Where("user_id = ?", uid)
	if !showPrivate {
		query = query.Where("public = ?", true)
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	if err := query.
		Preload("Images").
		Preload("Resources").
		Offset((page - 1) * pageSize).
		Limit(pageSize).
		Find(&collections).Error; err != nil {
		return nil, 0, err
	}

	totalPages := (total + int64(pageSize) - 1) / int64(pageSize)

	return collections, totalPages, nil
}

func ListCollectionResources(collectionID uint, page int, pageSize int) ([]*model.Resource, int64, error) {
	var resources []*model.Resource
	var total int64

	if err := db.Raw(`
		select count(*) from collection_resources
		where collection_id = ?`, collectionID).Scan(&total).Error; err != nil {
		return nil, 0, err
	}

	if err := db.
		Model(&model.Resource{}).
		Preload("User").
		Preload("Images").
		Preload("Tags").
		Joins("JOIN collection_resources ON collection_resources.resource_id = resources.id").
		Where("collection_resources.collection_id = ?", collectionID).
		Offset((page - 1) * pageSize).
		Limit(pageSize).
		Find(&resources).Error; err != nil {
		return nil, 0, err
	}

	totalPages := (total + int64(pageSize) - 1) / int64(pageSize)

	return resources, totalPages, nil
}

// SearchUserCollections searches for collections by user ID and keyword limited to 10 results.
// excludedRID: if >0, only return collections not containing this resource.
func SearchUserCollections(uid uint, keyword string, excludedRID uint, showPrivate bool) ([]*model.Collection, error) {
	var collections []*model.Collection

	query := db.Model(&model.Collection{}).
		Where("user_id = ?", uid)

	if !showPrivate {
		query = query.Where("public = ?", true)
	}

	if keyword != "" {
		query = query.Where("title LIKE ?", "%"+keyword+"%")
	}

	if excludedRID > 0 {
		// Use LEFT JOIN with IS NULL for better performance
		query = query.
			Joins("LEFT JOIN collection_resources cr ON collections.id = cr.collection_id AND cr.resource_id = ?", excludedRID).
			Where("cr.collection_id IS NULL")
	}

	if err := query.
		Preload("Images").
		Preload("Resources").
		Limit(10).
		Find(&collections).Error; err != nil {
		return nil, err
	}

	return collections, nil
}
