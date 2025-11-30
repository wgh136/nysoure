package service

import (
	"nysoure/server/dao"
	"nysoure/server/model"
)

func GetActivityList(page int) ([]model.ActivityView, int, error) {
	offset := (page - 1) * pageSize
	limit := pageSize

	activities, total, err := dao.GetActivityList(offset, limit)
	if err != nil {
		return nil, 0, err
	}

	var views []model.ActivityView
	for _, activity := range activities {
		user, err := dao.GetUserByID(activity.UserID)
		if err != nil {
			return nil, 0, err
		}
		var comment *model.CommentView
		var resource *model.ResourceView
		var file *model.FileView
		switch activity.Type {
		case model.ActivityTypeNewComment:
			c, err := dao.GetCommentByID(activity.RefID)
			if err != nil {
				return nil, 0, err
			}
			comment = c.ToView()
			comment.Content, comment.ContentTruncated = restrictCommentLength(c.Content)
		case model.ActivityTypeNewResource, model.ActivityTypeUpdateResource:
			r, err := dao.GetResourceByID(activity.RefID)
			if err != nil {
				return nil, 0, err
			}
			rv := r.ToView()
			resource = &rv
		case model.ActivityTypeNewFile:
			f, err := dao.GetFileByID(activity.RefID)
			if err != nil {
				return nil, 0, err
			}
			fv := f.ToView()
			file = fv
			r, err := dao.GetResourceByID(f.ResourceID)
			if err != nil {
				return nil, 0, err
			}
			rv := r.ToView()
			resource = &rv
		}
		view := model.ActivityView{
			ID:       activity.ID,
			User:     user.ToView(),
			Type:     activity.Type,
			Time:     activity.CreatedAt,
			Comment:  comment,
			Resource: resource,
			File:     file,
		}
		views = append(views, view)
	}

	totalPages := (total + pageSize - 1) / pageSize

	return views, totalPages, nil
}

func GetUserNotifications(userID uint, page int) ([]model.ActivityView, int, error) {
	offset := (page - 1) * pageSize
	limit := pageSize

	activities, total, err := dao.GetUserNotifications(userID, offset, limit)
	if err != nil {
		return nil, 0, err
	}

	var views []model.ActivityView
	for _, activity := range activities {
		user, err := dao.GetUserByID(activity.UserID)
		if err != nil {
			return nil, 0, err
		}
		var comment *model.CommentView
		var resource *model.ResourceView
		var file *model.FileView
		switch activity.Type {
		case model.ActivityTypeNewComment:
			c, err := dao.GetCommentByID(activity.RefID)
			if err != nil {
				return nil, 0, err
			}
			comment = c.ToView()
			comment.Content, comment.ContentTruncated = restrictCommentLength(c.Content)
		case model.ActivityTypeNewResource, model.ActivityTypeUpdateResource:
			r, err := dao.GetResourceByID(activity.RefID)
			if err != nil {
				return nil, 0, err
			}
			rv := r.ToView()
			resource = &rv
		case model.ActivityTypeNewFile:
			f, err := dao.GetFileByID(activity.RefID)
			if err != nil {
				return nil, 0, err
			}
			fv := f.ToView()
			file = fv
			r, err := dao.GetResourceByID(f.ResourceID)
			if err != nil {
				return nil, 0, err
			}
			rv := r.ToView()
			resource = &rv
		}
		view := model.ActivityView{
			ID:       activity.ID,
			User:     user.ToView(),
			Type:     activity.Type,
			Time:     activity.CreatedAt,
			Comment:  comment,
			Resource: resource,
			File:     file,
		}
		views = append(views, view)
	}

	totalPages := (total + pageSize - 1) / pageSize

	return views, totalPages, nil
}
