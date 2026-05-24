package dao

import (
	"nysoure/server/model"

	"gorm.io/gorm"
)

func GetRelations(resourceID uint) ([]model.Relation, error) {
	var relations []model.Relation
	if err := db.Where("from_id = ?", resourceID).Find(&relations).Error; err != nil {
		return nil, err
	}
	return relations, nil
}

func ReplaceRelations(resourceID uint, relations []model.Relation) error {
	return db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("from_id = ?", resourceID).Delete(&model.Relation{}).Error; err != nil {
			return err
		}
		for i := range relations {
			relations[i].FromID = int64(resourceID)
			if err := tx.Create(&relations[i]).Error; err != nil {
				return err
			}
		}
		return nil
	})
}
