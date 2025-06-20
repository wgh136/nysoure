package api

import (
	"net/url"
	"nysoure/server/model"
	"nysoure/server/service"
	"strconv"

	"github.com/gofiber/fiber/v3"
)

func AddCommentRoutes(router fiber.Router) {
	api := router.Group("/comments")
	api.Post("/:resourceID", createComment)
	api.Get("/:resourceID", listComments)
	api.Get("/user/:username", listCommentsWithUser)
	api.Put("/:commentID", updateComment)
}

func createComment(c fiber.Ctx) error {
	userID, ok := c.Locals("uid").(uint)
	if !ok {
		return model.NewRequestError("You must be logged in to comment")
	}
	resourceIDStr := c.Params("resourceID")
	resourceID, err := strconv.Atoi(resourceIDStr)
	if err != nil {
		return model.NewRequestError("Invalid resource ID")
	}
	content := c.FormValue("content")
	if content == "" {
		return model.NewRequestError("Content cannot be empty")
	}
	comment, err := service.CreateComment(content, userID, uint(resourceID))
	if err != nil {
		return err
	}
	return c.Status(fiber.StatusCreated).JSON(model.Response[model.CommentView]{
		Success: true,
		Data:    *comment,
		Message: "Comment created successfully",
	})
}

func listComments(c fiber.Ctx) error {
	resourceIDStr := c.Params("resourceID")
	resourceID, err := strconv.Atoi(resourceIDStr)
	if err != nil {
		return model.NewRequestError("Invalid resource ID")
	}
	pageStr := c.Query("page", "1")
	page, err := strconv.Atoi(pageStr)
	if err != nil {
		return model.NewRequestError("Invalid page number")
	}
	comments, totalPages, err := service.ListComments(uint(resourceID), page)
	if err != nil {
		return err
	}
	return c.JSON(model.PageResponse[model.CommentView]{
		Success:    true,
		Data:       comments,
		TotalPages: totalPages,
		Message:    "Comments retrieved successfully",
	})
}

func listCommentsWithUser(c fiber.Ctx) error {
	username := c.Params("username")
	if username == "" {
		return model.NewRequestError("Username is required")
	}
	username, err := url.PathUnescape(username)
	if err != nil {
		return model.NewRequestError("Invalid username")
	}
	pageStr := c.Query("page", "1")
	page, err := strconv.Atoi(pageStr)
	if err != nil {
		return model.NewRequestError("Invalid page number")
	}
	comments, totalPages, err := service.ListCommentsWithUser(username, page)
	if err != nil {
		return err
	}
	return c.JSON(model.PageResponse[model.CommentWithResourceView]{
		Success:    true,
		Data:       comments,
		TotalPages: totalPages,
		Message:    "Comments retrieved successfully",
	})
}

func updateComment(c fiber.Ctx) error {
	userID, ok := c.Locals("uid").(uint)
	if !ok {
		return model.NewRequestError("You must be logged in to update comment")
	}
	commentIDStr := c.Params("commentID")
	commentID, err := strconv.Atoi(commentIDStr)
	if err != nil {
		return model.NewRequestError("Invalid comment ID")
	}
	content := c.FormValue("content")
	if content == "" {
		return model.NewRequestError("Content cannot be empty")
	}
	comment, err := service.UpdateComment(uint(commentID), userID, content)
	if err != nil {
		return err
	}
	return c.JSON(model.Response[model.CommentView]{
		Success: true,
		Data:    *comment,
		Message: "Comment updated successfully",
	})
}
