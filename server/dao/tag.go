package dao

import (
	"errors"
	"nysoure/server/model"

	"gorm.io/gorm"
)

func CreateTag(tag string) (model.Tag, error) {
	// Create a new tag in the database
	t := model.Tag{Name: tag}
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
