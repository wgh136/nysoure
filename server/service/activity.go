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
		var comment *model.CommentWithResourceView
		var resource *model.ResourceView
		if activity.Type == model.ActivityTypeNewComment {
			c, err := dao.GetCommentByID(activity.RefID)
			if err != nil {
				return nil, 0, err
			}
			r, err := dao.GetResourceByID(c.RefID)
			if err != nil {
				return nil, 0, err
			}
			comment = c.ToViewWithResource(&r)
		} else if activity.Type == model.ActivityTypeNewResource || activity.Type == model.ActivityTypeUpdateResource {
			r, err := dao.GetResourceByID(activity.RefID)
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
		}
		views = append(views, view)
	}

	totalPages := (total + pageSize - 1) / pageSize

	return views, totalPages, nil
}
