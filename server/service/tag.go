package service

import (
	"github.com/gofiber/fiber/v3/log"
	"nysoure/server/dao"
	"nysoure/server/model"
)

func CreateTag(uid uint, name string) (*model.TagView, error) {
	canUpload, err := checkUserCanUpload(uid)
	if err != nil {
		log.Error("Error checking user permissions:", err)
		return nil, model.NewInternalServerError("Error checking user permissions")
	}
	if !canUpload {
		return nil, model.NewUnAuthorizedError("User cannot create tags")
	}
	t, err := dao.CreateTag(name)
	if err != nil {
		return nil, err
	}
	return t.ToView(), nil
}

func GetTag(id uint) (*model.TagView, error) {
	t, err := dao.GetTagByID(id)
	if err != nil {
		return nil, err
	}
	return t.ToView(), nil
}

func SearchTag(name string) ([]model.TagView, error) {
	tags, err := dao.SearchTag(name)
	if err != nil {
		return nil, err
	}
	var tagViews []model.TagView
	for _, t := range tags {
		tagViews = append(tagViews, *t.ToView())
	}
	return tagViews, nil
}

func DeleteTag(id uint) error {
	return dao.DeleteTag(id)
}
