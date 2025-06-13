package dao

import "nysoure/server/model"

func AddNewResourceActivity(userID, resourceID uint) error {
	activity := &model.Activity{
		UserID: userID,
		Type:   model.ActivityTypeNewResource,
		RefID:  resourceID,
	}
	return db.Create(activity).Error
}

func AddUpdateResourceActivity(userID, resourceID uint) error {
	activity := &model.Activity{
		UserID: userID,
		Type:   model.ActivityTypeUpdateResource,
		RefID:  resourceID,
	}
	return db.Create(activity).Error
}

func AddNewCommentActivity(userID, commentID uint) error {
	activity := &model.Activity{
		UserID: userID,
		Type:   model.ActivityTypeNewComment,
		RefID:  commentID,
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
