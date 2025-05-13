package dao

import "nysoure/server/model"

func CreateComment(content string, userID uint, resourceID uint) (model.Comment, error) {
	c := model.Comment{
		Content:    content,
		UserID:     userID,
		ResourceID: resourceID,
	}
	err := db.Save(&c).Error
	return c, err
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
