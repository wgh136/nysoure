package dao

import "nysoure/server/model"

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
