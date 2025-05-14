package dao

import (
	"nysoure/server/model"

	"gorm.io/gorm"
)

func CreateComment(content string, userID uint, resourceID uint) (model.Comment, error) {
	var comment model.Comment
	err := db.Transaction(func(tx *gorm.DB) error {
		comment = model.Comment{
			Content:    content,
			UserID:     userID,
			ResourceID: resourceID,
		}
		if err := tx.Create(&comment).Error; err != nil {
			return err
		}
		if err := tx.Model(&model.User{}).Where("id = ?", userID).Update("comments_count", gorm.Expr("comments_count + 1")).Error; err != nil {
			return err
		}
		return nil
	})
	if err != nil {
		return model.Comment{}, err
	}
	return comment, nil
}

func GetCommentByResourceID(resourceID uint, page, pageSize int) ([]model.Comment, int, error) {
	var comments []model.Comment
	var total int64

	if err := db.Model(&model.Comment{}).Where("resource_id = ?", resourceID).Count(&total).Error; err != nil {
		return nil, 0, err
	}

	if err := db.Where("resource_id = ?", resourceID).Offset((page - 1) * pageSize).Limit(pageSize).Preload("User").Order("created_at DESC").Find(&comments).Error; err != nil {
		return nil, 0, err
	}

	totalPages := (int(total) + pageSize - 1) / pageSize

	return comments, totalPages, nil
}

func GetCommentsWithUser(username string, page, pageSize int) ([]model.Comment, int, error) {
	var user model.User

	if err := db.Where("username = ?", username).First(&user).Error; err != nil {
		return nil, 0, err
	}
	var comments []model.Comment
	var total int64
	if err := db.Model(&model.Comment{}).Where("user_id = ?", user.ID).Count(&total).Error; err != nil {
		return nil, 0, err
	}
	if err := db.Where("user_id = ?", user.ID).Offset((page - 1) * pageSize).Limit(pageSize).Preload("User").Preload("Resource").Order("created_at DESC").Find(&comments).Error; err != nil {
		return nil, 0, err
	}
	totalPages := (int(total) + pageSize - 1) / pageSize
	return comments, totalPages, nil
}
