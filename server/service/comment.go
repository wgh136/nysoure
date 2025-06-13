package service

import (
	"nysoure/server/dao"
	"nysoure/server/model"

	"github.com/gofiber/fiber/v3/log"
)

func CreateComment(content string, userID uint, resourceID uint) (*model.CommentView, error) {
	resourceExists, err := dao.ExistsResource(resourceID)
	if err != nil {
		log.Error("Error checking resource existence:", err)
		return nil, model.NewInternalServerError("Error checking resource existence")
	}
	if !resourceExists {
		return nil, model.NewNotFoundError("Resource not found")
	}
	userExists, err := dao.ExistsUserByID(userID)
	if err != nil {
		log.Error("Error checking user existence:", err)
		return nil, model.NewInternalServerError("Error checking user existence")
	}
	if !userExists {
		return nil, model.NewNotFoundError("User not found")
	}
	c, err := dao.CreateComment(content, userID, resourceID)
	if err != nil {
		log.Error("Error creating comment:", err)
		return nil, model.NewInternalServerError("Error creating comment")
	}
	err = dao.AddNewCommentActivity(userID, c.ID)
	if err != nil {
		log.Error("Error creating comment activity:", err)
	}
	return c.ToView(), nil
}

func ListComments(resourceID uint, page int) ([]model.CommentView, int, error) {
	resourceExists, err := dao.ExistsResource(resourceID)
	if err != nil {
		log.Error("Error checking resource existence:", err)
		return nil, 0, model.NewInternalServerError("Error checking resource existence")
	}
	if !resourceExists {
		return nil, 0, model.NewNotFoundError("Resource not found")
	}
	comments, totalPages, err := dao.GetCommentByResourceID(resourceID, page, pageSize)
	if err != nil {
		log.Error("Error getting comments:", err)
		return nil, 0, model.NewInternalServerError("Error getting comments")
	}
	res := make([]model.CommentView, 0, len(comments))
	for _, c := range comments {
		res = append(res, *c.ToView())
	}
	return res, totalPages, nil
}

func ListCommentsWithUser(username string, page int) ([]model.CommentWithResourceView, int, error) {
	comments, totalPages, err := dao.GetCommentsWithUser(username, page, pageSize)
	if err != nil {
		log.Error("Error getting comments:", err)
		return nil, 0, model.NewInternalServerError("Error getting comments")
	}
	res := make([]model.CommentWithResourceView, 0, len(comments))
	for _, c := range comments {
		res = append(res, *c.ToViewWithResource())
	}
	return res, totalPages, nil
}
