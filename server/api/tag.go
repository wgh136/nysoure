package api

import (
	"github.com/gofiber/fiber/v3"
	"nysoure/server/model"
	"nysoure/server/service"
	"strconv"
)

func handleCreateTag(c fiber.Ctx) error {
	tag := c.FormValue("name")
	if tag == "" {
		return model.NewRequestError("name is required")
	}
	t, err := service.CreateTag(tag)
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

func AddTagRoutes(api fiber.Router) {
	tag := api.Group("/tag")
	{
		tag.Post("/", handleCreateTag)
		tag.Get("/search", handleSearchTag)
		tag.Delete("/:id", handleDeleteTag)
	}
}
