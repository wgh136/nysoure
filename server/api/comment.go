package api

import (
	"net/url"
	"nysoure/server/middleware"
	"nysoure/server/model"
	"nysoure/server/service"
	"strconv"
	"time"

	"github.com/gofiber/fiber/v3"
)

func AddCommentRoutes(router fiber.Router) {
	api := router.Group("/comments")
	api.Post("/resource/:resourceID", createResourceComment, middleware.NewRequestLimiter(500, 12*time.Hour))
	api.Post("/reply/:commentID", createReplyComment, middleware.NewRequestLimiter(500, 12*time.Hour))
	api.Get("/resource/:resourceID", listResourceComments)
	api.Get("/reply/:commentID", listReplyComments)
	api.Get("/user/:username", listCommentsByUser)
	api.Get("/:commentID", GetCommentByID)
	api.Put("/:commentID", updateComment)
	api.Delete("/:commentID", deleteComment)
}

func GetCommentByID(c fiber.Ctx) error {
	commentIDStr := c.Params("commentID")
	commentID, err := strconv.Atoi(commentIDStr)
	if err != nil {
		return model.NewRequestError("Invalid comment ID")
	}

	comment, err := service.GetCommentByID(uint(commentID))
	if err != nil {
		return err
	}
	return c.JSON(model.Response[model.CommentWithRefView]{
		Success: true,
		Data:    *comment,
		Message: "Comment retrieved successfully",
	})
}

func createResourceComment(c fiber.Ctx) error {
	userID, ok := c.Locals("uid").(uint)
	if !ok {
		return model.NewRequestError("You must be logged in to comment")
	}
	resourceIDStr := c.Params("resourceID")
	resourceID, err := strconv.Atoi(resourceIDStr)
	if err != nil {
		return model.NewRequestError("Invalid resource ID")
	}

	var req service.CommentRequest
	if err := c.Bind().JSON(&req); err != nil {
		return model.NewRequestError("Invalid request format")
	}

	if req.Content == "" {
		return model.NewRequestError("Content cannot be empty")
	}

	comment, err := service.CreateComment(req, userID, uint(resourceID), c.IP(), model.CommentTypeResource, c.Host())
	if err != nil {
		return err
	}
	return c.Status(fiber.StatusCreated).JSON(model.Response[model.CommentView]{
		Success: true,
		Data:    *comment,
		Message: "Comment created successfully",
	})
}

func createReplyComment(c fiber.Ctx) error {
	userID, ok := c.Locals("uid").(uint)
	if !ok {
		return model.NewRequestError("You must be logged in to reply")
	}
	commentIDStr := c.Params("commentID")
	commentID, err := strconv.Atoi(commentIDStr)
	if err != nil {
		return model.NewRequestError("Invalid comment ID")
	}

	var req service.CommentRequest
	if err := c.Bind().JSON(&req); err != nil {
		return model.NewRequestError("Invalid request format")
	}

	if req.Content == "" {
		return model.NewRequestError("Content cannot be empty")
	}

	comment, err := service.CreateComment(req, userID, uint(commentID), c.IP(), model.CommentTypeReply, c.Host())
	if err != nil {
		return err
	}
	return c.Status(fiber.StatusCreated).JSON(model.Response[model.CommentView]{
		Success: true,
		Data:    *comment,
		Message: "Reply created successfully",
	})
}

func listResourceComments(c fiber.Ctx) error {
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
	comments, totalPages, err := service.ListResourceComments(uint(resourceID), page)
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

func listReplyComments(c fiber.Ctx) error {
	commentIDStr := c.Params("commentID")
	commentID, err := strconv.Atoi(commentIDStr)
	if err != nil {
		return model.NewRequestError("Invalid comment ID")
	}
	pageStr := c.Query("page", "1")
	page, err := strconv.Atoi(pageStr)
	if err != nil {
		return model.NewRequestError("Invalid page number")
	}
	replies, totalPages, err := service.ListCommentReplies(uint(commentID), page)
	if err != nil {
		return err
	}
	return c.JSON(model.PageResponse[model.CommentView]{
		Success:    true,
		Data:       replies,
		TotalPages: totalPages,
		Message:    "Replies retrieved successfully",
	})
}

func listCommentsByUser(c fiber.Ctx) error {
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

	var req service.CommentRequest
	if err := c.Bind().JSON(&req); err != nil {
		return model.NewRequestError("Invalid request format")
	}

	if req.Content == "" {
		return model.NewRequestError("Content cannot be empty")
	}

	comment, err := service.UpdateComment(uint(commentID), userID, req, c.Host())
	if err != nil {
		return err
	}
	return c.JSON(model.Response[model.CommentView]{
		Success: true,
		Data:    *comment,
		Message: "Comment updated successfully",
	})
}

func deleteComment(c fiber.Ctx) error {
	userID, ok := c.Locals("uid").(uint)
	if !ok {
		return model.NewRequestError("You must be logged in to delete comment")
	}
	commentIDStr := c.Params("commentID")
	commentID, err := strconv.Atoi(commentIDStr)
	if err != nil {
		return model.NewRequestError("Invalid comment ID")
	}
	err = service.DeleteComment(uint(commentID), userID)
	if err != nil {
		return err
	}
	return c.JSON(model.Response[any]{
		Success: true,
		Message: "Comment deleted successfully",
	})
}
