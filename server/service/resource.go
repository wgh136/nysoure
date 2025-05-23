package service

import (
	"net/url"
	"nysoure/server/dao"
	"nysoure/server/model"
	"strconv"
	"strings"

	"github.com/gofiber/fiber/v3/log"

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

func findRelatedResources(r model.Resource, host string) []model.ResourceView {
	lines := strings.Split(r.Article, "\n")
	var relatedResources []model.ResourceView
	for _, line := range lines {
		r := parseResourceIfPresent(line, host)
		if r != nil {
			relatedResources = append(relatedResources, *r)
		}
	}
	return relatedResources
}

func parseResourceIfPresent(line string, host string) *model.ResourceView {
	if len(line) < 4 {
		return nil
	}
	if !strings.HasPrefix(line, "[") || !strings.HasSuffix(line, ")") {
		return nil
	}
	if !strings.Contains(line, "](") {
		return nil
	}
	splites := strings.Split(line, "(")
	if len(splites) != 2 {
		return nil
	}
	u := strings.TrimSuffix(splites[1], ")")
	u = strings.TrimSpace(u)
	parsed, err := url.Parse(u)
	if err != nil {
		return nil
	}
	if parsed.IsAbs() && parsed.Hostname() != host {
		return nil
	}
	path := parsed.Path
	if !strings.HasPrefix(path, "/resources/") {
		return nil
	}
	idStr := strings.TrimPrefix(path, "/resources/")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		return nil
	}
	r, err := dao.GetResourceByID(uint(id))
	if err != nil {
		return nil
	}
	v := r.ToView()
	return &v
}

func GetResource(id uint, host string) (*model.ResourceDetailView, error) {
	r, err := dao.GetResourceByID(id)
	_ = dao.AddResourceViewCount(id)
	if err != nil {
		return nil, err
	}
	v := r.ToDetailView()
	if host != "" {
		related := findRelatedResources(r, host)
		v.Related = related
	}
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
	isAdmin, err := CheckUserIsAdmin(uid)
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

func GetResourcesWithUser(username string, page int) ([]model.ResourceView, int, error) {
	resources, totalPages, err := dao.GetResourcesByUsername(username, page, pageSize)
	if err != nil {
		return nil, 0, err
	}
	var views []model.ResourceView
	for _, r := range resources {
		views = append(views, r.ToView())
	}
	return views, totalPages, nil
}

func EditResource(uid, rid uint, params *ResourceCreateParams) error {
	isAdmin, err := checkUserCanUpload(uid)
	if err != nil {
		log.Error("checkUserCanUpload error: ", err)
		return model.NewInternalServerError("Failed to check user permission")
	}
	r, err := dao.GetResourceByID(rid)
	if err != nil {
		return err
	}
	if r.UserID != uid && !isAdmin {
		return model.NewUnAuthorizedError("You have not permission to edit this resource")
	}

	r.Title = params.Title
	r.AlternativeTitles = params.AlternativeTitles
	r.Article = params.Article

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
	r.Images = images
	r.Tags = tags
	if err := dao.UpdateResource(r); err != nil {
		log.Error("UpdateResource error: ", err)
		return model.NewInternalServerError("Failed to update resource")
	}
	return nil
}
