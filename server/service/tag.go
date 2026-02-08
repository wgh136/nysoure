package service

import (
	"nysoure/server/ctx"
	"nysoure/server/dao"
	"nysoure/server/model"
	"slices"
	"strings"
	"sync"
	"time"

	"github.com/gofiber/fiber/v3/log"
)

const (
	maxTagLength = 20
)

var (
	cachedTagList  []model.TagViewWithCount
	cachedTagTable map[uint]int
	tagCacheMutex  sync.Mutex
)

func init() {
	// Start a goroutine to delete unused tags every hour
	go func() {
		// Wait for 1 minute to ensure the database is ready
		time.Sleep(time.Minute)
		for {
			err := dao.ClearUnusedTags()
			if err != nil {
				log.Errorf("Failed to clear unused tags: %v", err)
			}
			time.Sleep(time.Hour)
		}
	}()
}

func CreateTag(c ctx.Context, name string) (*model.TagView, error) {
	if len([]rune(name)) > maxTagLength {
		return nil, model.NewRequestError("Tag name too long")
	}
	if c.UserPermission() < model.PermissionUploader {
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

func SearchTag(name string, mainTag bool) ([]model.TagViewWithCount, error) {
	if cachedTagList == nil {
		tagCacheMutex.Lock()
		defer tagCacheMutex.Unlock()
		if cachedTagList == nil {
			if err := updateCachedTagList(); err != nil {
				return nil, err
			}
		}
	}

	tags, err := dao.SearchTag(name, mainTag)
	if err != nil {
		return nil, err
	}
	var tagViewsWithCount []model.TagViewWithCount
	for _, t := range tags {
		count := 0
		id := t.ID
		if t.AliasOf != nil {
			id = *t.AliasOf
		}
		i, ok := cachedTagTable[id]
		if ok {
			count = cachedTagList[i].ResourceCount
		}
		tagViewsWithCount = append(tagViewsWithCount, *t.ToView().WithCount(count))
	}
	slices.SortFunc(tagViewsWithCount, func(a, b model.TagViewWithCount) int {
		return b.ResourceCount - a.ResourceCount
	})
	if len(tagViewsWithCount) > 10 {
		tagViewsWithCount = tagViewsWithCount[:10]
	}
	return tagViewsWithCount, nil
}

func DeleteTag(id uint) error {
	err := updateCachedTagList()
	if err != nil {
		log.Error("Error updating cached tag list:", err)
	}
	return dao.DeleteTag(id)
}

func SetTagInfo(c ctx.Context, id uint, description string, aliasOf *uint, tagType string) (*model.TagView, error) {
	if c.UserPermission() < model.PermissionUploader {
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

func updateCachedTagList() error {
	tags, err := dao.ListTags()
	if err != nil {
		return err
	}

	// Group tags by type with their resource counts
	tagsByType := make(map[string][]model.TagViewWithCount)

	for _, tag := range tags {
		count, err := dao.CountResourcesByTag(tag.ID)
		if err != nil {
			return err
		}
		if count > 0 {
			tagType := tag.Type
			if tagType == "" {
				tagType = "default"
			}
			tagWithCount := *tag.ToView().WithCount(int(count))
			tagsByType[tagType] = append(tagsByType[tagType], tagWithCount)
		}
	}

	// Sort each type by resource count (descending) and keep top 50
	cachedTagList = make([]model.TagViewWithCount, 0)
	for _, tagsOfType := range tagsByType {
		// Sort by resource count in descending order
		slices.SortFunc(tagsOfType, func(a, b model.TagViewWithCount) int {
			return b.ResourceCount - a.ResourceCount
		})

		// Keep only top 50 tags for this type
		limit := 50
		if len(tagsOfType) < limit {
			limit = len(tagsOfType)
		}
		cachedTagList = append(cachedTagList, tagsOfType[:limit]...)
	}

	cachedTagTable = make(map[uint]int)
	for i, tag := range cachedTagList {
		cachedTagTable[tag.ID] = i
	}

	return nil
}

func GetTagList() ([]model.TagViewWithCount, error) {
	if cachedTagList == nil {
		tagCacheMutex.Lock()
		defer tagCacheMutex.Unlock()
		if cachedTagList == nil {
			if err := updateCachedTagList(); err != nil {
				return nil, err
			}
		}
	}
	return cachedTagList, nil
}

func GetOrCreateTags(c ctx.Context, names []string, tagType string) ([]model.TagView, error) {
	if c.UserPermission() < model.PermissionUploader {
		return nil, model.NewUnAuthorizedError("User cannot create tags")
	}
	tags := make([]model.TagView, 0, len(names))
	for _, name := range names {
		t, err := dao.GetTagByName(name)
		if err != nil {
			if model.IsNotFoundError(err) {
				t, err = dao.CreateTagWithType(name, tagType)
				if err != nil {
					return nil, err
				}
			} else {
				return nil, err
			}
		}
		tags = append(tags, *t.ToView())
	}
	return tags, updateCachedTagList()
}

func EditTagAlias(c ctx.Context, tagID uint, aliases []string) (*model.TagView, error) {
	if c.UserPermission() < model.PermissionUploader {
		return nil, model.NewUnAuthorizedError("User cannot create tags")
	}

	tag, err := dao.GetTagByID(tagID)
	if err != nil {
		return nil, err
	}

	if tag.AliasOf != nil {
		return nil, model.NewRequestError("Cannot edit aliases of a tag that is an alias of another tag")
	}

	// trim params
	for i, alias := range aliases {
		aliases[i] = strings.TrimSpace(alias)
		if aliases[i] == "" {
			return nil, model.NewRequestError("Alias cannot be empty")
		}
	}

	// new aliases
	for _, name := range aliases {
		if name == "" {
			continue
		}
		exists := false
		for _, alias := range tag.Aliases {
			if alias.Name == name {
				exists = true
				break
			}
		}
		if !exists {
			err := dao.SetTagAlias(tagID, name)
			if err != nil {
				return nil, err
			}
		}
	}

	// remove old aliases
	for _, alias := range tag.Aliases {
		if !slices.Contains(aliases, alias.Name) {
			err := dao.RemoveTagAliasOf(alias.ID)
			if err != nil {
				return nil, err
			}
		}
	}

	t, err := dao.GetTagByID(tagID)
	if err != nil {
		return nil, err
	}

	return t.ToView(), updateCachedTagList()
}
