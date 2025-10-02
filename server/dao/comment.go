package dao

import (
	"nysoure/server/model"

	"gorm.io/gorm"
)

func CreateComment(content string, userID uint, refID uint, imageIDs []uint, cType model.CommentType) (model.Comment, error) {
	var comment model.Comment
	err := db.Transaction(func(tx *gorm.DB) error {
		comment = model.Comment{
			Content: content,
			UserID:  userID,
			RefID:   refID,
			Type:    cType,
		}
		if err := tx.Create(&comment).Error; err != nil {
			return err
		}

		// 关联图片
		if len(imageIDs) > 0 {
			// 查找所有指定的图片
			var images []model.Image
			if err := tx.Where("id IN ?", imageIDs).Find(&images).Error; err != nil {
				return err
			}
			// 建立关联关系
			if err := tx.Model(&comment).Association("Images").Replace(images); err != nil {
				return err
			}
		}

		if err := tx.Model(&model.User{}).Where("id = ?", userID).Update("comments_count", gorm.Expr("comments_count + 1")).Error; err != nil {
			return err
		}

		if cType == model.CommentTypeResource {
			// Update resource comments count
			if err := tx.Model(&model.Resource{}).Where("id = ?", refID).Update("comments", gorm.Expr("comments + 1")).Error; err != nil {
				return err
			}
		} else if cType == model.CommentTypeReply {
			// Update reply count for the parent comment
			if err := tx.Model(&model.Comment{}).Where("id = ?", refID).Update("reply_count", gorm.Expr("reply_count + 1")).Error; err != nil {
				return err
			}
		}

		return nil
	})
	if err != nil {
		return model.Comment{}, err
	}

	// 重新加载评论以获取关联的图片
	db.Preload("Images").Where("id = ?", comment.ID).First(&comment)
	return comment, nil
}

func GetCommentByResourceID(resourceID uint, page, pageSize int) ([]model.Comment, int, error) {
	var comments []model.Comment
	var total int64

	if err := db.
		Model(&model.Comment{}).
		Where("type = ?", model.CommentTypeResource).
		Where("ref_id = ?", resourceID).
		Count(&total).Error; err != nil {
		return nil, 0, err
	}

	if err := db.
		Model(&model.Comment{}).
		Where("type = ?", model.CommentTypeResource).
		Where("ref_id = ?", resourceID).
		Offset((page - 1) * pageSize).
		Limit(pageSize).
		Preload("User").
		Preload("Images").
		Order("created_at DESC").
		Find(&comments).Error; err != nil {
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
	if err := db.
		Model(&model.Comment{}).
		Where("type = ?", model.CommentTypeResource).
		Where("user_id = ?", user.ID).
		Count(&total).Error; err != nil {
		return nil, 0, err
	}
	if err := db.
		Model(&model.Comment{}).
		Where("type = ?", model.CommentTypeResource).
		Where("user_id = ?", user.ID).
		Offset((page - 1) * pageSize).
		Limit(pageSize).Preload("User").
		Preload("Images").
		Order("created_at DESC").
		Find(&comments).Error; err != nil {
		return nil, 0, err
	}
	totalPages := (int(total) + pageSize - 1) / pageSize
	return comments, totalPages, nil
}

func GetCommentByID(commentID uint) (*model.Comment, error) {
	var comment model.Comment
	if err := db.Preload("User").Preload("Images").First(&comment, commentID).Error; err != nil {
		return nil, err
	}
	return &comment, nil
}

func UpdateCommentContent(commentID uint, content string, imageIDs []uint) (*model.Comment, error) {
	var comment model.Comment
	err := db.Transaction(func(tx *gorm.DB) error {
		if err := tx.First(&comment, commentID).Error; err != nil {
			return err
		}
		comment.Content = content
		if err := tx.Save(&comment).Error; err != nil {
			return err
		}

		// 更新图片关联
		if imageIDs != nil {
			// 查找所有指定的图片
			var images []model.Image
			if err := tx.Where("id IN ?", imageIDs).Find(&images).Error; err != nil {
				return err
			}
			// 替换关联关系
			if err := tx.Model(&comment).Association("Images").Replace(images); err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		return nil, err
	}

	// 重新加载评论以获取关联的图片和用户信息
	db.Preload("User").Preload("Images").First(&comment, commentID)
	return &comment, nil
}

func DeleteCommentByID(commentID uint) error {
	return db.Transaction(func(tx *gorm.DB) error {
		var comment model.Comment
		if err := tx.First(&comment, commentID).Error; err != nil {
			return err
		}

		// 清除图片关联
		if err := tx.Model(&comment).Association("Images").Clear(); err != nil {
			return err
		}

		if err := tx.Delete(&comment).Error; err != nil {
			return err
		}
		if err := tx.Model(&model.User{}).Where("id = ?", comment.UserID).Update("comments_count", gorm.Expr("comments_count - 1")).Error; err != nil {
			return err
		}
		if comment.Type == model.CommentTypeResource {
			if err := tx.Model(&model.Resource{}).Where("id = ?", comment.RefID).Update("comments", gorm.Expr("comments - 1")).Error; err != nil {
				return err
			}
		}
		if err := tx.
			Where("type = ? and ref_id = ?", model.ActivityTypeNewComment, commentID).
			Delete(&model.Activity{}).
			Error; err != nil {
			return err
		}
		return nil
	})
}

func GetCommentReplies(commentID uint, page, pageSize int) ([]model.Comment, int, error) {
	var replies []model.Comment
	var total int64

	if err := db.
		Model(&model.Comment{}).
		Where("type = ?", model.CommentTypeReply).
		Where("ref_id = ?", commentID).
		Count(&total).Error; err != nil {
		return nil, 0, err
	}

	if err := db.
		Model(&model.Comment{}).
		Where("type = ?", model.CommentTypeReply).
		Where("ref_id = ?", commentID).
		Offset((page - 1) * pageSize).
		Limit(pageSize).
		Preload("User").
		Order("created_at DESC").
		Find(&replies).Error; err != nil {
		return nil, 0, err
	}

	totalPages := (int(total) + pageSize - 1) / pageSize

	return replies, totalPages, nil
}
