package dao

import (
	"errors"
	"nysoure/server/model"

	"gorm.io/gorm"
)

func CreateTag(tag string) (model.Tag, error) {
	// Create a new tag in the database
	t := model.Tag{Name: tag}
	if err := db.Create(&t).Error; err != nil {
		return model.Tag{}, err
	}
	return t, nil
}

func SearchTag(keyword string) ([]model.Tag, error) {
	// Search for a tag by its name in the database
	var t []model.Tag
	if err := db.Model(&model.Tag{}).Where("name Like ?", "%"+keyword+"%").Limit(10).Find(&t).Error; err != nil {
		return nil, err
	}
	return t, nil
}

func DeleteTag(id uint) error {
	// Delete a tag from the database
	t := model.Tag{}
	t.ID = id
	if err := db.Delete(&t).Error; err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return err
	}
	return nil
}

func GetTagByID(id uint) (model.Tag, error) {
	// Retrieve a tag by its ID from the database
	var t model.Tag
	if err := db.First(&t, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return model.Tag{}, model.NewNotFoundError("Tag not found")
		}
		return model.Tag{}, err
	}
	return t, nil
}

func GetTagByName(name string) (model.Tag, error) {
	// Retrieve a tag by its name from the database
	var t model.Tag
	if err := db.Where("name = ?", name).First(&t).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return model.Tag{}, model.NewNotFoundError("Tag not found")
		}
		return model.Tag{}, err
	}
	return t, nil
}

func SetTagDescription(id uint, description string) error {
	if err := db.Model(model.Tag{}).Where("id = ?", id).Update("description", description).Error; err != nil {
		return err
	}
	return nil
}
