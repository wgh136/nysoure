package dao

import (
	"nysoure/server/model"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

func CreateStorage(s model.Storage) (model.Storage, error) {
	err := db.Model(&s).Create(&s).Error
	return s, err
}

func DeleteStorage(id uint) error {
	return db.Model(&model.Storage{}).Where("id = ?", id).Delete(&model.Storage{}).Error
}

func GetStorages() ([]model.Storage, error) {
	var storages []model.Storage
	err := db.Model(&model.Storage{}).Find(&storages).Error
	return storages, err
}

func GetStorage(id uint) (model.Storage, error) {
	var storage model.Storage
	err := db.Model(&model.Storage{}).Where("id = ?", id).First(&storage).Error
	return storage, err
}

func AddStorageUsage(id uint, offset int64) error {
	return db.Transaction(func(tx *gorm.DB) error {
		var storage model.Storage
		err := tx.Clauses(clause.Locking{Strength: clause.LockingStrengthUpdate}).Model(&model.Storage{}).Where("id = ?", id).First(&storage).Error
		if err != nil {
			return err
		}
		return tx.Model(&model.Storage{}).Where("id = ?", id).Update("current_size", storage.CurrentSize+offset).Error
	})
}

func SetDefaultStorage(id uint) error {
	return db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Model(&model.Storage{}).Where("is_default = ?", true).Update("is_default", false).Error; err != nil {
			return err
		}
		return tx.Model(&model.Storage{}).Where("id = ?", id).Update("is_default", true).Error
	})
}
