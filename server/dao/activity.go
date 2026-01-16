package dao

import (
	"errors"
	"nysoure/server/model"
	"time"

	"gorm.io/gorm"
)

func AddNewResourceActivity(userID, resourceID uint) error {
	activity := &model.Activity{
		UserID: userID,
		Type:   model.ActivityTypeNewResource,
		RefID:  resourceID,
	}
	return db.Create(activity).Error
}

func AddUpdateResourceActivity(userID, resourceID uint) error {
	var userLastActivity model.Activity
	if err := db.
		Model(&userLastActivity).
		Where("user_id = ?", userID).
		Order("created_at DESC").First(&userLastActivity).
		Error; err != nil {
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			return err
		}
	}
	if userLastActivity.Type == model.ActivityTypeUpdateResource && userLastActivity.RefID == resourceID {
		if time.Since(userLastActivity.CreatedAt) < 10*time.Minute {
			// If the last activity is an update to the same resource within 10 minutes, skip creating a new activity
			return nil
		}
	}

	activity := &model.Activity{
		UserID: userID,
		Type:   model.ActivityTypeUpdateResource,
		RefID:  resourceID,
	}
	return db.Create(activity).Error
}

func AddNewCommentActivity(userID, commentID, notifyTo uint) error {
	return db.Transaction(func(tx *gorm.DB) error {
		activity := &model.Activity{
			UserID:   userID,
			Type:     model.ActivityTypeNewComment,
			RefID:    commentID,
			NotifyTo: notifyTo,
		}
		err := tx.Create(activity).Error
		if err != nil {
			return err
		}
		return tx.Model(&model.User{}).Where("id = ?", notifyTo).UpdateColumn("unread_notifications_count", gorm.Expr("unread_notifications_count + ?", 1)).Error
	})
}

func AddNewFileActivity(userID, fileID uint) error {
	activity := &model.Activity{
		UserID: userID,
		Type:   model.ActivityTypeNewFile,
		RefID:  fileID,
	}
	return db.Create(activity).Error
}

func DeleteResourceActivity(resourceID uint) error {
	return db.Where("ref_id = ? AND (type = ? OR type = ?)", resourceID, model.ActivityTypeNewResource, model.ActivityTypeUpdateResource).Delete(&model.Activity{}).Error
}

func DeleteCommentActivity(commentID uint) error {
	return db.Where("ref_id = ? AND type = ?", commentID, model.ActivityTypeNewComment).Delete(&model.Activity{}).Error
}

func GetActivityList(offset, limit int) ([]model.Activity, int, error) {
	var activities []model.Activity
	var total int64

	if err := db.Model(&model.Activity{}).Count(&total).Error; err != nil {
		return nil, 0, err
	}

	if err := db.Offset(offset).Limit(limit).Order("id DESC").Find(&activities).Error; err != nil {
		return nil, 0, err
	}

	return activities, int(total), nil
}

func GetUserNotifications(userID uint, offset, limit int) ([]model.Activity, int, error) {
	var activities []model.Activity
	var total int64

	if err := db.Model(&model.Activity{}).Where("notify_to = ?", userID).Count(&total).Error; err != nil {
		return nil, 0, err
	}

	if err := db.Where("notify_to = ?", userID).Offset(offset).Limit(limit).Order("id DESC").Find(&activities).Error; err != nil {
		return nil, 0, err
	}

	return activities, int(total), nil
}

// DeleteActivitiesByUserID deletes all activities created by a user
func DeleteActivitiesByUserID(userID uint) error {
	return db.Where("user_id = ?", userID).Delete(&model.Activity{}).Error
}

// DeleteActivitiesNotifyingUser deletes all activities that notify a specific user
func DeleteActivitiesNotifyingUser(userID uint) error {
	return db.Where("notify_to = ?", userID).Delete(&model.Activity{}).Error
}