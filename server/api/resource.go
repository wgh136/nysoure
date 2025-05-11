package api

import (
	"encoding/json"
	"nysoure/server/model"
	"nysoure/server/service"
	"strconv"

	"github.com/gofiber/fiber/v3"
)

func handleCreateResource(c fiber.Ctx) error {
	var params service.ResourceCreateParams
	body := c.Body()
	err := json.Unmarshal(body, &params)
	if err != nil {
		return model.NewRequestError("Invalid request body")
	}
	uid, ok := c.Locals("uid").(uint)
	if !ok {
		return model.NewUnAuthorizedError("You must be logged in to create a resource")
	}
	id, err := service.CreateResource(uid, &params)
	if err != nil {
		return err
	}
	return c.Status(fiber.StatusOK).JSON(model.Response[uint]{
		Success: true,
		Data:    id,
		Message: "Resource created successfully",
	})
}

func handleGetResource(c fiber.Ctx) error {
	idStr := c.Params("id")
	if idStr == "" {
		return model.NewRequestError("Resource ID is required")
	}
	id, err := strconv.Atoi(idStr)
	if err != nil {
		return model.NewRequestError("Invalid resource ID")
	}
	resource, err := service.GetResource(uint(id))
	if err != nil {
		return err
	}
	return c.Status(fiber.StatusOK).JSON(model.Response[model.ResourceDetailView]{
		Success: true,
		Data:    *resource,
		Message: "Resource retrieved successfully",
	})
}

func handleDeleteResource(c fiber.Ctx) error {
	idStr := c.Params("id")
	if idStr == "" {
		return model.NewRequestError("Resource ID is required")
	}
	id, err := strconv.Atoi(idStr)
	if err != nil {
		return model.NewRequestError("Invalid resource ID")
	}
	uid, ok := c.Locals("uid").(uint)
	if !ok {
		return model.NewUnAuthorizedError("You must be logged in to delete a resource")
	}
	err = service.DeleteResource(uid, uint(id))
	if err != nil {
		return err
	}
	return c.Status(fiber.StatusOK).JSON(model.Response[any]{
		Success: true,
		Data:    nil,
		Message: "Resource deleted successfully",
	})
}

func handleListResources(c fiber.Ctx) error {
	pageStr := c.Query("page")
	if pageStr == "" {
		pageStr = "1"
	}
	page, err := strconv.Atoi(pageStr)
	if err != nil {
		return model.NewRequestError("Invalid page number")
	}
	resources, maxPage, err := service.GetResourceList(page)
	if err != nil {
		return err
	}
	if resources == nil {
		resources = []model.ResourceView{}
	}
	return c.Status(fiber.StatusOK).JSON(model.PageResponse[model.ResourceView]{
		Success:    true,
		Data:       resources,
		TotalPages: maxPage,
		Message:    "Resources retrieved successfully",
	})
}

func handleSearchResources(c fiber.Ctx) error {
	query := c.Query("keyword")
	if query == "" {
		return model.NewRequestError("Search query is required")
	}
	pageStr := c.Query("page")
	if pageStr == "" {
		pageStr = "1"
	}
	page, err := strconv.Atoi(pageStr)
	if err != nil {
		return model.NewRequestError("Invalid page number")
	}
	resources, totalPages, err := service.SearchResource(query, page)
	if err != nil {
		return err
	}
	if resources == nil {
		resources = []model.ResourceView{}
	}
	return c.Status(fiber.StatusOK).JSON(model.PageResponse[model.ResourceView]{
		Success:    true,
		Data:       resources,
		TotalPages: totalPages,
		Message:    "Resources retrieved successfully",
	})
}

func AddResourceRoutes(api fiber.Router) {
	resource := api.Group("/resource")
	{
		resource.Post("/", handleCreateResource)
		resource.Get("/search", handleSearchResources)
		resource.Get("/", handleListResources)
		resource.Get("/:id", handleGetResource)
		resource.Delete("/:id", handleDeleteResource)
	}
}
