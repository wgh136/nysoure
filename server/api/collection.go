package api

import (
	"nysoure/server/model"
	"nysoure/server/service"
	"strconv"

	"github.com/gofiber/fiber/v3"
)

func handleCreateCollection(c fiber.Ctx) error {
	uid, ok := c.Locals("uid").(uint)
	if !ok {
		return model.NewUnAuthorizedError("Unauthorized")
	}
	title := c.FormValue("title")
	article := c.FormValue("article")
	if title == "" || article == "" {
		return model.NewRequestError("Title and article are required")
	}
	host := c.Hostname()
	col, err := service.CreateCollection(uid, title, article, host)
	if err != nil {
		return err
	}
	return c.Status(fiber.StatusOK).JSON(model.Response[model.CollectionView]{
		Success: true,
		Data:    *col,
		Message: "Collection created successfully",
	})
}

func handleUpdateCollection(c fiber.Ctx) error {
	uid, ok := c.Locals("uid").(uint)
	if !ok {
		return model.NewUnAuthorizedError("Unauthorized")
	}
	idStr := c.FormValue("id")
	title := c.FormValue("title")
	article := c.FormValue("article")
	if idStr == "" || title == "" || article == "" {
		return model.NewRequestError("ID, title and article are required")
	}
	id, err := strconv.Atoi(idStr)
	if err != nil {
		return model.NewRequestError("Invalid collection ID")
	}
	host := c.Hostname()
	if err := service.UpdateCollection(uid, uint(id), title, article, host); err != nil {
		return err
	}
	return c.Status(fiber.StatusOK).JSON(model.Response[any]{
		Success: true,
		Message: "Collection updated successfully",
	})
}

func handleDeleteCollection(c fiber.Ctx) error {
	uid, ok := c.Locals("uid").(uint)
	if !ok {
		return model.NewUnAuthorizedError("Unauthorized")
	}
	idStr := c.FormValue("id")
	if idStr == "" {
		return model.NewRequestError("ID is required")
	}
	id, err := strconv.Atoi(idStr)
	if err != nil {
		return model.NewRequestError("Invalid collection ID")
	}
	if err := service.DeleteCollection(uid, uint(id)); err != nil {
		return err
	}
	return c.Status(fiber.StatusOK).JSON(model.Response[any]{
		Success: true,
		Message: "Collection deleted successfully",
	})
}

func handleGetCollection(c fiber.Ctx) error {
	idStr := c.Params("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		return model.NewRequestError("Invalid collection ID")
	}
	col, err := service.GetCollectionByID(uint(id))
	if err != nil {
		return err
	}
	return c.Status(fiber.StatusOK).JSON(model.Response[model.CollectionView]{
		Success: true,
		Data:    *col,
		Message: "Collection retrieved successfully",
	})
}

func handleListUserCollections(c fiber.Ctx) error {
	pageStr := c.Query("page", "1")
	page, err := strconv.Atoi(pageStr)
	if err != nil || page < 1 {
		page = 1
	}
	username := c.Query("username", "")
	if username == "" {
		return model.NewRequestError("Username is required")
	}
	cols, total, err := service.ListUserCollections(username, page)
	if err != nil {
		return err
	}
	return c.Status(fiber.StatusOK).JSON(model.PageResponse[*model.CollectionView]{
		Success:    true,
		TotalPages: int(total),
		Data:       cols,
		Message:    "Collections retrieved successfully",
	})
}

func handleListCollectionResources(c fiber.Ctx) error {
	idStr := c.Params("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		return model.NewRequestError("Invalid collection ID")
	}
	pageStr := c.Query("page", "1")
	page, err := strconv.Atoi(pageStr)
	if err != nil || page < 1 {
		page = 1
	}
	res, total, err := service.ListCollectionResources(uint(id), page)
	if err != nil {
		return err
	}
	return c.Status(fiber.StatusOK).JSON(model.PageResponse[*model.ResourceView]{
		Success:    true,
		TotalPages: int(total),
		Data:       res,
		Message:    "Resources retrieved successfully",
	})
}

func handleAddResourceToCollection(c fiber.Ctx) error {
	uid, ok := c.Locals("uid").(uint)
	if !ok {
		return model.NewUnAuthorizedError("Unauthorized")
	}
	collectionIDStr := c.FormValue("collection_id")
	resourceIDStr := c.FormValue("resource_id")
	if collectionIDStr == "" || resourceIDStr == "" {
		return model.NewRequestError("collection_id and resource_id are required")
	}
	collectionID, err := strconv.Atoi(collectionIDStr)
	if err != nil {
		return model.NewRequestError("Invalid collection_id")
	}
	resourceID, err := strconv.Atoi(resourceIDStr)
	if err != nil {
		return model.NewRequestError("Invalid resource_id")
	}
	if err := service.AddResourceToCollection(uid, uint(collectionID), uint(resourceID)); err != nil {
		return err
	}
	return c.Status(fiber.StatusOK).JSON(model.Response[any]{
		Success: true,
		Message: "Resource added to collection successfully",
	})
}

func handleRemoveResourceFromCollection(c fiber.Ctx) error {
	uid, ok := c.Locals("uid").(uint)
	if !ok {
		return model.NewUnAuthorizedError("Unauthorized")
	}
	collectionIDStr := c.FormValue("collection_id")
	resourceIDStr := c.FormValue("resource_id")
	if collectionIDStr == "" || resourceIDStr == "" {
		return model.NewRequestError("collection_id and resource_id are required")
	}
	collectionID, err := strconv.Atoi(collectionIDStr)
	if err != nil {
		return model.NewRequestError("Invalid collection_id")
	}
	resourceID, err := strconv.Atoi(resourceIDStr)
	if err != nil {
		return model.NewRequestError("Invalid resource_id")
	}
	if err := service.RemoveResourceFromCollection(uid, uint(collectionID), uint(resourceID)); err != nil {
		return err
	}
	return c.Status(fiber.StatusOK).JSON(model.Response[any]{
		Success: true,
		Message: "Resource removed from collection successfully",
	})
}

func handleSearchUserCollections(c fiber.Ctx) error {
	keyword := c.Query("keyword", "")
	if keyword == "" {
		return model.NewRequestError("keyword is required")
	}
	username := c.Query("username", "")
	if username == "" {
		return model.NewRequestError("username is required")
	}
	cols, err := service.SearchUserCollections(username, keyword)
	if err != nil {
		return err
	}
	return c.Status(fiber.StatusOK).JSON(model.Response[[]*model.CollectionView]{
		Success: true,
		Data:    cols,
		Message: "Collections found successfully",
	})
}

func AddCollectionRoutes(r fiber.Router) {
	cg := r.Group("collection")
	cg.Post("/create", handleCreateCollection)
	cg.Post("/update", handleUpdateCollection)
	cg.Post("/delete", handleDeleteCollection)
	cg.Get("/list", handleListUserCollections)
	cg.Post("/add_resource", handleAddResourceToCollection)
	cg.Post("/remove_resource", handleRemoveResourceFromCollection)
	cg.Get("/search", handleSearchUserCollections)
	cg.Get("/:id/resources", handleListCollectionResources)
	cg.Get("/:id", handleGetCollection)
}
