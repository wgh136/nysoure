package api

import (
	"encoding/json"
	"net/url"
	"nysoure/server/dao"
	"nysoure/server/model"
	"nysoure/server/service"
	"nysoure/server/utils"
	"strconv"

	"github.com/gofiber/fiber/v3/log"

	"github.com/gofiber/fiber/v3"
)

func updateSiteMapAndRss(baseURL string) {
	resources, err := dao.GetAllResources()
	if err != nil {
		log.Error("Error getting resources: ", err)
	}
	utils.GenerateSiteMap(baseURL, resources)
	utils.GenerateRss(baseURL, resources)
}

func handleCreateResource(c fiber.Ctx) error {
	var params service.ResourceParams
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
	updateSiteMapAndRss(c.BaseURL())
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
	host := c.Hostname()
	resource, err := service.GetResource(uint(id), host)
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
	updateSiteMapAndRss(c.BaseURL())
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
	sortStr := c.Query("sort")
	if sortStr == "" {
		sortStr = "0"
	}
	sortInt, err := strconv.Atoi(sortStr)
	if err != nil {
		return model.NewRequestError("Invalid sort parameter")
	}
	if sortInt < 0 || sortInt > 5 {
		return model.NewRequestError("Sort parameter out of range")
	}
	sort := model.RSort(sortInt)
	resources, maxPage, err := service.GetResourceList(page, sort)
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

func handleListResourcesWithTag(c fiber.Ctx) error {
	tag := c.Params("tag")
	if tag == "" {
		return model.NewRequestError("Tag is required")
	}
	tag, err := url.PathUnescape(tag)
	if err != nil {
		return model.NewRequestError("Invalid tag")
	}
	pageStr := c.Query("page")
	if pageStr == "" {
		pageStr = "1"
	}
	page, err := strconv.Atoi(pageStr)
	if err != nil {
		return model.NewRequestError("Invalid page number")
	}
	resources, totalPages, err := service.GetResourcesWithTag(tag, page)
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

func handleGetResourcesWithUser(c fiber.Ctx) error {
	username := c.Params("username")
	if username == "" {
		return model.NewRequestError("Username is required")
	}
	username, err := url.PathUnescape(username)
	if err != nil {
		return model.NewRequestError("Invalid username")
	}
	pageStr := c.Query("page")
	if pageStr == "" {
		pageStr = "1"
	}
	page, err := strconv.Atoi(pageStr)
	if err != nil {
		return model.NewRequestError("Invalid page number")
	}
	resources, totalPages, err := service.GetResourcesWithUser(username, page)
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

func handleUpdateResource(c fiber.Ctx) error {
	idStr := c.Params("id")
	if idStr == "" {
		return model.NewRequestError("Resource ID is required")
	}
	id, err := strconv.Atoi(idStr)
	if err != nil {
		return model.NewRequestError("Invalid resource ID")
	}
	var params service.ResourceParams
	body := c.Body()
	err = json.Unmarshal(body, &params)
	if err != nil {
		return model.NewRequestError("Invalid request body")
	}
	uid, ok := c.Locals("uid").(uint)
	if !ok {
		return model.NewUnAuthorizedError("You must be logged in to update a resource")
	}
	err = service.EditResource(uid, uint(id), &params)
	if err != nil {
		return err
	}
	updateSiteMapAndRss(c.BaseURL())
	return c.Status(fiber.StatusOK).JSON(model.Response[any]{
		Success: true,
		Data:    nil,
		Message: "Resource updated successfully",
	})
}

func handleGetRandomResource(c fiber.Ctx) error {
	host := c.Hostname()
	resource, err := service.RandomResource(host)
	if err != nil {
		return err
	}
	if resource == nil {
		return model.NewNotFoundError("No resources found")
	}
	return c.Status(fiber.StatusOK).JSON(model.Response[model.ResourceDetailView]{
		Success: true,
		Data:    *resource,
		Message: "Random resource retrieved successfully",
	})
}

func AddResourceRoutes(api fiber.Router) {
	resource := api.Group("/resource")
	{
		resource.Post("/", handleCreateResource)
		resource.Get("/search", handleSearchResources)
		resource.Get("/", handleListResources)
		resource.Get("/random", handleGetRandomResource)
		resource.Get("/:id", handleGetResource)
		resource.Delete("/:id", handleDeleteResource)
		resource.Get("/tag/:tag", handleListResourcesWithTag)
		resource.Get("/user/:username", handleGetResourcesWithUser)
		resource.Post("/:id", handleUpdateResource)
	}
}
