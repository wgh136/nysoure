package service

import (
	"nysoure/server/dao"
	"nysoure/server/model"
)

// Create a new collection.
func CreateCollection(uid uint, title, article string, host string) (*model.CollectionView, error) {
	if uid == 0 || title == "" || article == "" {
		return nil, model.NewRequestError("invalid parameters")
	}
	c, err := dao.CreateCollection(uid, title, article, findImagesInContent(article, host))
	if err != nil {
		return nil, err
	}
	view := c.ToView()
	return view, nil
}

// Update an existing collection with user validation.
func UpdateCollection(uid, id uint, title, article string, host string) error {
	if uid == 0 || id == 0 || title == "" || article == "" {
		return model.NewRequestError("invalid parameters")
	}
	collection, err := dao.GetCollectionByID(id)
	if err != nil {
		return err
	}
	if collection.UserID != uid {
		return model.NewUnAuthorizedError("user does not have permission to update this collection")
	}
	return dao.UpdateCollection(id, title, article, findImagesInContent(article, host))
}

// Delete a collection by ID.
func DeleteCollection(uid, id uint) error {
	user, err := dao.GetUserByID(uid)
	if err != nil {
		return err
	}

	collection, err := dao.GetCollectionByID(id)
	if err != nil {
		return err
	}

	if user.ID != collection.UserID && !user.IsAdmin {
		return model.NewUnAuthorizedError("user does not have permission to delete this collection")
	}

	return dao.DeleteCollection(id)
}

// Add a resource to a collection with user validation.
func AddResourceToCollection(uid, collectionID, resourceID uint) error {
	if uid == 0 || collectionID == 0 || resourceID == 0 {
		return model.NewRequestError("invalid parameters")
	}
	collection, err := dao.GetCollectionByID(collectionID)
	if err != nil {
		return err
	}
	if collection.UserID != uid {
		return model.NewUnAuthorizedError("user does not have permission to modify this collection")
	}
	return dao.AddResourceToCollection(collectionID, resourceID)
}

// Remove a resource from a collection with user validation.
func RemoveResourceFromCollection(uid, collectionID, resourceID uint) error {
	if uid == 0 || collectionID == 0 || resourceID == 0 {
		return model.NewRequestError("invalid parameters")
	}
	collection, err := dao.GetCollectionByID(collectionID)
	if err != nil {
		return err
	}
	if collection.UserID != uid {
		return model.NewUnAuthorizedError("user does not have permission to modify this collection")
	}
	return dao.RemoveResourceFromCollection(collectionID, resourceID)
}

// Get a collection by ID.
func GetCollectionByID(id uint) (*model.CollectionView, error) {
	if id == 0 {
		return nil, model.NewRequestError("invalid collection id")
	}
	c, err := dao.GetCollectionByID(id)
	if err != nil {
		return nil, err
	}
	return c.ToView(), nil
}

// List collections of a user with pagination.
func ListUserCollections(username string, page int) ([]*model.CollectionView, int64, error) {
	if username == "" || page < 1 {
		return nil, 0, model.NewRequestError("invalid parameters")
	}
	user, err := dao.GetUserByUsername(username)
	if err != nil {
		return nil, 0, err
	}
	uid := user.ID
	collections, total, err := dao.ListUserCollections(uid, page, pageSize)
	if err != nil {
		return nil, 0, err
	}
	var views []*model.CollectionView
	for _, c := range collections {
		views = append(views, c.ToView())
	}
	return views, total, nil
}

// List resources in a collection with pagination.
func ListCollectionResources(collectionID uint, page int) ([]*model.ResourceView, int64, error) {
	if collectionID == 0 || page < 1 {
		return nil, 0, model.NewRequestError("invalid parameters")
	}
	resources, total, err := dao.ListCollectionResources(collectionID, page, pageSize)
	if err != nil {
		return nil, 0, err
	}
	var views []*model.ResourceView
	for _, r := range resources {
		v := r.ToView()
		views = append(views, &v)
	}
	return views, total, nil
}

// Search user collections by keyword, limited to 10 results.
// excludedRID: if >0, only return collections not containing this resource.
func SearchUserCollections(username string, keyword string, excludedRID uint) ([]*model.CollectionView, error) {
	if username == "" {
		return nil, model.NewRequestError("invalid parameters")
	}
	user, err := dao.GetUserByUsername(username)
	if err != nil {
		return nil, err
	}
	uid := user.ID
	collections, err := dao.SearchUserCollections(uid, keyword, excludedRID)
	if err != nil {
		return nil, err
	}
	var views []*model.CollectionView
	for _, c := range collections {
		views = append(views, c.ToView())
	}
	return views, nil
}
