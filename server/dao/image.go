package dao

import (
	"errors"
	"nysoure/server/model"
	"time"

	"gorm.io/gorm"
)

func CreateImage(name string, width, height int) (model.Image, error) {
	// Create a new image in the database
	i := model.Image{FileName: name, Width: width, Height: height}
	if err := db.Create(&i).Error; err != nil {
		return model.Image{}, err
	}
	return i, nil
}

func GetImageByID(id uint) (model.Image, error) {
	// Retrieve an image by its ID from the database
	var i model.Image
	if err := db.First(&i, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return model.Image{}, model.NewNotFoundError("Image not found")
		}
		return model.Image{}, err
	}
	return i, nil
}

func DeleteImage(id uint) error {
	// Delete an image from the database
	i := model.Image{}
	i.ID = id
	if err := db.Delete(&i).Error; err != nil {
		return err
	}
	return nil
}

func GetUnusedImages() ([]model.Image, error) {
	// Retrieve all images that are not used in any post
	var images []model.Image
	oneDayAgo := time.Now().Add(-24 * time.Hour)
	if err := db.
		Where("NOT EXISTS (SELECT 1 FROM resource_images WHERE image_id = images.id)").
		Where("NOT EXISTS (SELECT 1 FROM comment_images WHERE image_id = images.id)").
		Where("NOT EXISTS (SELECT 1 FROM collection_images WHERE image_id = images.id)").
		Where("NOT EXISTS (SELECT 1 FROM characters WHERE image_id = images.id)").
		Where("created_at < ?", oneDayAgo).
		Find(&images).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return images, nil
}
