package service

import (
	"nysoure/server/dao"
	"nysoure/server/model"
)

func CreateTag(name string) (*model.TagView, error) {
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
