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
	err = updateCachedTagList()
	if err != nil {
		log.Error("Error updating cached tag list:", err)
	}
	return t.ToView(), nil
}

func GetTag(id uint) (*model.TagView, error) {
	t, err := dao.GetTagByID(id)
	if err != nil {
		return nil, err
	}
	if t.AliasOf != nil {
		t, err = dao.GetTagByID(*t.AliasOf)
		if err != nil {
			return nil, err
		}
	}
	return t.ToView(), nil
}

func GetTagByName(name string) (*model.TagView, error) {
	t, err := dao.GetTagByName(name)
	if err != nil {
		return nil, err
	}
	if t.AliasOf != nil {
		t, err = dao.GetTagByID(*t.AliasOf)
		if err != nil {
			return nil, err
		}
	}
	return t.ToView(), nil
}

func SearchTag(name string, mainTag bool) ([]model.TagView, error) {
	tags, err := dao.SearchTag(name, mainTag)
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
	err := updateCachedTagList()
	if err != nil {
		log.Error("Error updating cached tag list:", err)
	}
	return dao.DeleteTag(id)
}

func SetTagInfo(uid uint, id uint, description string, aliasOf *uint, tagType string) (*model.TagView, error) {
	canUpload, err := checkUserCanUpload(uid)
	if err != nil {
		log.Error("Error checking user permissions:", err)
		return nil, model.NewInternalServerError("Error checking user permissions")
	}
	if !canUpload {
		return nil, model.NewUnAuthorizedError("User cannot set tag description")
	}
	if aliasOf != nil && *aliasOf == id {
		return nil, model.NewRequestError("Tag cannot be an alias of itself")
	}
	if err := dao.SetTagInfo(id, description, aliasOf, tagType); err != nil {
		return nil, err
	}
	t, err := dao.GetTagByID(id)
	if err != nil {
		return nil, err
	}
	if t.AliasOf != nil {
		t, err = dao.GetTagByID(*t.AliasOf)
		if err != nil {
			return nil, err
		}
	}
	err = updateCachedTagList()
	if err != nil {
		log.Error("Error updating cached tag list:", err)
	}
	return t.ToView(), nil
}

var cachedTagList []model.TagViewWithCount

func updateCachedTagList() error {
	tags, err := dao.ListTags()
	if err != nil {
		return err
	}
	cachedTagList = make([]model.TagViewWithCount, 0, len(tags))
	for _, tag := range tags {
		count, err := dao.CountResourcesByTag(tag.ID)
		if err != nil {
			return err
		}
		if count > 0 {
			cachedTagList = append(cachedTagList, *tag.ToView().WithCount(int(count)))
		}
	}
	return nil
}

func GetTagList() ([]model.TagViewWithCount, error) {
	if cachedTagList == nil {
		if err := updateCachedTagList(); err != nil {
			return nil, err
		}
	}
	return cachedTagList, nil
}
