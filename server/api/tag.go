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
	mainTagStr := c.Query("main_tag")
	mainTag := mainTagStr == "true" || mainTagStr == "1"
	tags, err := service.SearchTag(keyword, mainTag)
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

func handleSetTagInfo(c fiber.Ctx) error {
	uid, ok := c.Locals("uid").(uint)
	if !ok {
		return model.NewUnAuthorizedError("You must be logged in to set tag description")
	}
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return model.NewRequestError("Invalid tag ID")
	}
	description := c.FormValue("description")
	description = strings.TrimSpace(description)
	aliasOfStr := c.FormValue("alias_of")
	var aliasOf *uint
	if aliasOfStr != "" {
		aliasID, err := strconv.Atoi(aliasOfStr)
		if err != nil {
			return model.NewRequestError("Invalid alias ID")
		}
		aliasUint := uint(aliasID)
		aliasOf = &aliasUint
	}
	tagType := c.FormValue("type")
	t, err := service.SetTagInfo(uid, uint(id), description, aliasOf, tagType)
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

func getAllTags(c fiber.Ctx) error {
	tags, err := service.GetTagList()
	if err != nil {
		return err
	}
	if tags == nil {
		tags = []model.TagViewWithCount{}
	}
	return c.Status(fiber.StatusOK).JSON(model.Response[*[]model.TagViewWithCount]{
		Success: true,
		Data:    &tags,
		Message: "All tags retrieved successfully",
	})
}

func getOrCreateTags(c fiber.Ctx) error {
	uid, ok := c.Locals("uid").(uint)
	if !ok {
		return model.NewUnAuthorizedError("You must be logged in to get or create tags")
	}

	type GetOrCreateTagsRequest struct {
		Names   []string `json:"names"`
		TagType string   `json:"type"`
	}

	var req GetOrCreateTagsRequest
	if err := c.Bind().JSON(&req); err != nil {
		return model.NewRequestError("Invalid request format")
	}

	names := make([]string, 0, len(req.Names))
	for _, name := range req.Names {
		name = strings.TrimSpace(name)
		if name == "" {
			continue
		}
		names = append(names, name)
	}

	if len(names) == 0 {
		return model.NewRequestError("At least one tag name is required")
	}

	tagType := strings.TrimSpace(req.TagType)

	tags, err := service.GetOrCreateTags(uid, names, tagType)
	if err != nil {
		return err
	}

	return c.Status(fiber.StatusOK).JSON(model.Response[*[]model.TagView]{
		Success: true,
		Data:    &tags,
		Message: "Tags retrieved or created successfully",
	})
}

func editTagAlias(c fiber.Ctx) error {
	uid, ok := c.Locals("uid").(uint)
	if !ok {
		return model.NewUnAuthorizedError("You must be logged in to edit tag aliases")
	}

	idStr := c.Params("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		return model.NewRequestError("Invalid tag ID")
	}

	var req struct {
		Aliases []string `json:"aliases"`
	}
	if err := c.Bind().JSON(&req); err != nil {
		return model.NewRequestError("Invalid request format")
	}

	tag, err := service.EditTagAlias(uid, uint(id), req.Aliases)
	if err != nil {
		return err
	}

	return c.Status(fiber.StatusOK).JSON(model.Response[model.TagView]{
		Success: true,
		Data:    *tag,
		Message: "Tag aliases updated successfully",
	})
}

func AddTagRoutes(api fiber.Router) {
	tag := api.Group("/tag")
	{
		tag.Post("/", handleCreateTag)
		tag.Get("/search", handleSearchTag)
		tag.Delete("/:id", handleDeleteTag)
		tag.Put("/:id/alias", editTagAlias)
		tag.Put("/:id/info", handleSetTagInfo)
		tag.Get("/:name", handleGetTagByName)
		tag.Get("/", getAllTags)
		tag.Post("/batch", getOrCreateTags)
	}
}
