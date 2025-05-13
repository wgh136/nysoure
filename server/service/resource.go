package service

import (
	"nysoure/server/dao"
	"nysoure/server/model"

	"gorm.io/gorm"
)

type ResourceCreateParams struct {
	Title             string   `json:"title" binding:"required"`
	AlternativeTitles []string `json:"alternative_titles"`
	Tags              []uint   `json:"tags"`
	Article           string   `json:"article"`
	Images            []uint   `json:"images"`
}

func CreateResource(uid uint, params *ResourceCreateParams) (uint, error) {
	canUpload, err := checkUserCanUpload(uid)
	if err != nil {
		return 0, err
	}
	if !canUpload {
		return 0, model.NewUnAuthorizedError("You have not permission to upload resources")
	}

	images := make([]model.Image, len(params.Images))
	for i, id := range params.Images {
		images[i] = model.Image{
			Model: gorm.Model{
				ID: id,
			},
		}
	}
	tags := make([]model.Tag, len(params.Tags))
	for i, id := range params.Tags {
		tags[i] = model.Tag{
			Model: gorm.Model{
				ID: id,
			},
		}
	}
	r := model.Resource{
		Title:             params.Title,
		AlternativeTitles: params.AlternativeTitles,
		Article:           params.Article,
		Images:            images,
		Tags:              tags,
		UserID:            uid,
	}
	if r, err = dao.CreateResource(r); err != nil {
		return 0, err
	}
	return r.ID, nil
}

func GetResource(id uint) (*model.ResourceDetailView, error) {
	r, err := dao.GetResourceByID(id)
	_ = dao.AddResourceViewCount(id)
	if err != nil {
		return nil, err
	}
	v := r.ToDetailView()
	return &v, nil
}

func GetResourceList(page int) ([]model.ResourceView, int, error) {
	resources, totalPages, err := dao.GetResourceList(page, pageSize)
	if err != nil {
		return nil, 0, err
	}
	var views []model.ResourceView
	for _, r := range resources {
		views = append(views, r.ToView())
	}
	return views, totalPages, nil
}

func SearchResource(keyword string, page int) ([]model.ResourceView, int, error) {
	resources, totalPages, err := dao.Search(keyword, page, pageSize)
	if err != nil {
		return nil, 0, err
	}
	var views []model.ResourceView
	for _, r := range resources {
		views = append(views, r.ToView())
	}
	return views, totalPages, nil
}

func DeleteResource(uid, id uint) error {
	isAdmin, err := checkUserIsAdmin(uid)
	if err != nil {
		return err
	}
	if !isAdmin {
		r, err := dao.GetResourceByID(id)
		if err != nil {
			return err
		}
		if r.UserID != uid {
			return model.NewUnAuthorizedError("You have not permission to delete this resource")
		}
	}
	if err := dao.DeleteResource(id); err != nil {
		return err
	}
	return nil
}

func GetResourcesWithTag(tag string, page int) ([]model.ResourceView, int, error) {
	t, err := dao.GetTagByName(tag)
	if err != nil {
		return nil, 0, err
	}
	tagID := t.ID
	resources, totalPages, err := dao.GetResourceByTag(tagID, page, pageSize)
	if err != nil {
		return nil, 0, err
	}
	var views []model.ResourceView
	for _, r := range resources {
		views = append(views, r.ToView())
	}
	return views, totalPages, nil
}
