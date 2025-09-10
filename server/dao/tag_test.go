package dao

import (
	"os"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestTag(t *testing.T) {
	// Create tags
	tag1, err := CreateTag("test1")
	assert.Nil(t, err)
	tag2, err := CreateTag("test2")
	assert.Nil(t, err)
	tag3, err := CreateTagWithType("test3", "type1")
	assert.Nil(t, err)

	// Get tag by ID
	fetchedTag, err := GetTagByID(tag1.ID)
	assert.Nil(t, err)
	assert.Equal(t, tag1.Name, fetchedTag.Name)

	// Get tag by Name
	fetchedTag, err = GetTagByName(tag2.Name)
	assert.Nil(t, err)
	assert.Equal(t, tag2.ID, fetchedTag.ID)

	// Search tags
	tags, err := SearchTag("test", true)
	assert.Nil(t, err)
	assert.GreaterOrEqual(t, len(tags), 3)

	// Update tag
	err = SetTagInfo(tag1.ID, "updated description", nil, "updated type")
	assert.Nil(t, err)
	updatedTag, err := GetTagByID(tag1.ID)
	assert.Nil(t, err)
	assert.Equal(t, "updated description", updatedTag.Description)
	assert.Equal(t, "updated type", updatedTag.Type)

	// Set tag alias
	err = SetTagAlias(tag1.ID, tag2.Name)
	assert.Nil(t, err)
	err = SetTagAlias(tag1.ID, tag3.Name)
	assert.Nil(t, err)
	err = SetTagAlias(tag1.ID, "test4")
	assert.Nil(t, err)
	tag4, err := GetTagByName("test4")
	assert.Nil(t, err)
	tag1, err = GetTagByID(tag1.ID)
	assert.Nil(t, err)
	aliasesIDs := []uint{}
	for _, alias := range tag1.Aliases {
		aliasesIDs = append(aliasesIDs, alias.ID)
	}
	assert.Equal(t, []uint{tag2.ID, tag3.ID, tag4.ID}, aliasesIDs)

	// let a tag which has alias point to another tag
	tag5, err := CreateTag("test5")
	assert.Nil(t, err)
	err = SetTagAlias(tag5.ID, tag1.Name)
	assert.Nil(t, err)
	tag1, err = GetTagByID(tag1.ID)
	assert.Nil(t, err)
	tag2, err = GetTagByID(tag2.ID)
	assert.Nil(t, err)
	tag3, err = GetTagByID(tag3.ID)
	assert.Nil(t, err)
	tag4, err = GetTagByID(tag4.ID)
	assert.Nil(t, err)
	tag5, err = GetTagByID(tag5.ID)
	assert.Nil(t, err)
	assert.Empty(t, tag1.Aliases)
	assert.Equal(t, &tag5.ID, tag1.AliasOf)
	assert.Equal(t, &tag5.ID, tag2.AliasOf)
	assert.Equal(t, &tag5.ID, tag3.AliasOf)
	assert.Equal(t, &tag5.ID, tag4.AliasOf)
	assert.Nil(t, tag5.AliasOf)

	// Same operation as above, but using `SetTagInfo`
	tag6, err := CreateTag("test6")
	assert.Nil(t, err)
	err = SetTagInfo(tag5.ID, "", &tag6.ID, "")
	assert.Nil(t, err)
	tag1, err = GetTagByID(tag1.ID)
	assert.Nil(t, err)
	tag2, err = GetTagByID(tag2.ID)
	assert.Nil(t, err)
	tag3, err = GetTagByID(tag3.ID)
	assert.Nil(t, err)
	tag4, err = GetTagByID(tag4.ID)
	assert.Nil(t, err)
	tag5, err = GetTagByID(tag5.ID)
	assert.Nil(t, err)
	tag6, err = GetTagByID(tag6.ID)
	assert.Nil(t, err)
	assert.Equal(t, &tag6.ID, tag1.AliasOf)
	assert.Equal(t, &tag6.ID, tag2.AliasOf)
	assert.Equal(t, &tag6.ID, tag3.AliasOf)
	assert.Equal(t, &tag6.ID, tag4.AliasOf)
	assert.Equal(t, &tag6.ID, tag5.AliasOf)
	assert.Empty(t, tag5.Aliases)
	assert.Nil(t, tag6.AliasOf)

	// cleanup
	d, err := db.DB()
	assert.Nil(t, err)
	_ = d.Close()
	_ = os.Remove("test.db")
}
