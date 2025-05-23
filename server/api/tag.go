package api

import (
	"github.com/gofiber/fiber/v3"
	"net/url"
	"nysoure/server/model"
	"nysoure/server/service"
	"strconv"
	"strings"
)

func handleCreateTag(c fiber.Ctx) error {
	tag := c.FormValue("name")
	if tag == "" {
		return model.NewRequestError("name is required")
	}
	tag = strings.TrimSpace(tag)
	uid, ok := c.Locals("uid").(uint)
	if !ok {
		return model.NewUnAuthorizedError("You must be logged in to create a tag")
	}
	t, err := service.CreateTag(uid, tag)
	if err != nil {
		return err
	}
	return c.Status(fiber.StatusOK).JSON(model.Response[model.TagView]{
		Success: true,
		Data:    *t,
		Message: "Tag created successfully",
	})
}

func handleSearchTag(c fiber.Ctx) error {
	keyword := c.Query("keyword")
	if keyword == "" {
		return model.NewRequestError("Keyword is required")
	}
	keyword = strings.TrimSpace(keyword)
	tags, err := service.SearchTag(keyword)
	if tags == nil {
		tags = []model.TagView{}
	}
	if err != nil {
		return err
	}
	return c.Status(fiber.StatusOK).JSON(model.Response[*[]model.TagView]{
		Success: true,
		Data:    &tags,
		Message: "Tags retrieved successfully",
	})
}

func handleDeleteTag(c fiber.Ctx) error {
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return model.NewRequestError("Invalid tag ID")
	}
	err = service.DeleteTag(uint(id))
	if err != nil {
		return err
	}
	return c.Status(fiber.StatusOK).JSON(model.Response[any]{
		Success: true,
		Data:    nil,
		Message: "Tag deleted successfully",
	})
}

func handleSetTagDescription(c fiber.Ctx) error {
	uid, ok := c.Locals("uid").(uint)
	if !ok {
		return model.NewUnAuthorizedError("You must be logged in to set tag description")
	}
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return model.NewRequestError("Invalid tag ID")
	}
	description := c.FormValue("description")
	if description == "" {
		return model.NewRequestError("Description is required")
	}
	description = strings.TrimSpace(description)
	t, err := service.SetTagDescription(uid, uint(id), description)
	if err != nil {
		return err
	}
	return c.Status(fiber.StatusOK).JSON(model.Response[model.TagView]{
		Success: true,
		Data:    *t,
		Message: "Tag description updated successfully",
	})
}

func handleGetTagByName(c fiber.Ctx) error {
	name := c.Params("name")
	if name == "" {
		return model.NewRequestError("Tag name is required")
	}
	name, err := url.PathUnescape(name)
	if err != nil {
		return model.NewRequestError("Invalid tag name format")
	}
	name = strings.TrimSpace(name)
	t, err := service.GetTagByName(name)
	if err != nil {
		return err
	}
	return c.Status(fiber.StatusOK).JSON(model.Response[model.TagView]{
		Success: true,
		Data:    *t,
		Message: "Tag retrieved successfully",
	})
}

func AddTagRoutes(api fiber.Router) {
	tag := api.Group("/tag")
	{
		tag.Post("/", handleCreateTag)
		tag.Get("/search", handleSearchTag)
		tag.Delete("/:id", handleDeleteTag)
		tag.Put("/:id/description", handleSetTagDescription)
		tag.Get("/:name", handleGetTagByName)
	}
}
