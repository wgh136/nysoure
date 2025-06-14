package dao

import (
	"errors"
	"nysoure/server/model"
	"strings"

	"gorm.io/gorm"
)

func CreateTag(tag string) (model.Tag, error) {
	// Create a new tag in the database
	if strings.Contains(tag, "%") {
		return model.Tag{}, model.NewRequestError("Tag name cannot contain '%' character")
	}
	t := model.Tag{Name: tag}
	if err := db.Create(&t).Error; err != nil {
		return model.Tag{}, err
	}
	return t, nil
}

func CreateTagWithType(tag string, tagType string) (model.Tag, error) {
	// Create a new tag with a specific type in the database
	if strings.Contains(tag, "%") {
		return model.Tag{}, model.NewRequestError("Tag name cannot contain '%' character")
	}
	t := model.Tag{Name: tag, Type: tagType}
	if err := db.Create(&t).Error; err != nil {
		return model.Tag{}, err
	}
	return t, nil
}

func SearchTag(keyword string, mainTag bool) ([]model.Tag, error) {
	// Search for a tag by its name in the database
	var t []model.Tag
	query := db.Model(&model.Tag{}).Where("name Like ?", "%"+keyword+"%")
	if mainTag {
		query = query.Where("alias_of IS NULL")
	}
	if err := query.Limit(10).Find(&t).Error; err != nil {
		return nil, err
	}
	return t, nil
}

func DeleteTag(id uint) error {
	// Delete a tag from the database
	t := model.Tag{}
	t.ID = id
	if err := db.Delete(&t).Error; err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return err
	}
	return nil
}

func GetTagByID(id uint) (model.Tag, error) {
	// Retrieve a tag by its ID from the database
	var t model.Tag
	if err := db.Preload("Aliases").First(&t, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return model.Tag{}, model.NewNotFoundError("Tag not found")
		}
		return model.Tag{}, err
	}
	return t, nil
}

func GetTagByName(name string) (model.Tag, error) {
	// Retrieve a tag by its name from the database
	var t model.Tag
	if err := db.Preload("Aliases").Where("name = ?", name).First(&t).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return model.Tag{}, model.NewNotFoundError("Tag not found")
		}
		return model.Tag{}, err
	}
	return t, nil
}

func SetTagInfo(id uint, description string, aliasOf *uint, tagType string) error {
	old, err := GetTagByID(id)
	if err != nil {
		return err
	}
	if aliasOf != nil && len(old.Aliases) > 0 {
		return model.NewRequestError("Tag already has aliases, cannot set alias_of")
	}
	t := model.Tag{Model: gorm.Model{
		ID: id,
	}, Description: description, Type: tagType, AliasOf: aliasOf}
	if err := db.Model(&t).Updates(t).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return model.NewNotFoundError("Tag not found")
		}
		return err
	}
	return nil
}

// ListTags retrieves all tags from the database.
// Only returns the ID, name, and type of each tag.
func ListTags() ([]model.Tag, error) {
	var tags []model.Tag
	if err := db.Select("id", "name", "type").Where("alias_of is null").Find(&tags).Error; err != nil {
		return nil, err
	}
	return tags, nil
}

// SetTagAlias sets a tag with the given ID having the given alias.
func SetTagAlias(tagID uint, alias string) error {
	// Set a tag as an alias of another tag
	var t model.Tag
	if err := db.Where("name = ?", alias).First(&t).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			// create
			newTag, err := CreateTag(alias)
			if err != nil {
				return err
			}
			t = newTag
		} else {
			return err
		}
	}
	if t.ID == tagID {
		return model.NewRequestError("Tag cannot be an alias of itself")
	}
	return db.Model(&t).Update("alias_of", tagID).Error
}

// RemoveTagAliasOf sets a tag is an independent tag, removing its alias relationship.
func RemoveTagAliasOf(tagID uint) error {
	// Remove the alias of a tag
	return db.Model(&model.Tag{
		Model: gorm.Model{
			ID: tagID,
		},
	}).Update("alias_of", nil).Error
}

// ClearUnusedTags removes tags that are not associated with any resources.
func ClearUnusedTags() error {
	var tags []model.Tag
	if err := db.Where("alias_of IS NULL").Find(&tags).Error; err != nil {
		return err
	}
	for _, tag := range tags {
		resources, _, err := GetResourceByTag(tag.ID, 1, 1)
		if err != nil {
			return err
		}
		if len(resources) == 0 {
			// The tag maybe associated with a deleted resource, so we need to remove it from the resource_tags table first
			if err := db.Exec("DELETE FROM resource_tags WHERE tag_id = ?", tag.ID).Error; err != nil {
				return err
			}
			// Remove all aliases of the tag
			if err := db.Where("alias_of = ?", tag.ID).Update("alias_of", nil).Error; err != nil {
				return err
			}
			// Use hard delete to remove the tag to ensure the tag can be re-created later
			if err := db.Unscoped().Delete(&tag).Error; err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
				return err
			}
		}
	}
	return nil
}
