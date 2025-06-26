package service

import (
	"nysoure/server/dao"
	"nysoure/server/model"
	"nysoure/server/utils"
	"time"

	"github.com/gofiber/fiber/v3/log"
)

const (
	maxImagePerComment = 9
	maxCommentsPerIP   = 512  // Maximum number of comments allowed per IP address per day
	maxCommentLength   = 1024 // Maximum length of a comment
)

var (
	commentsLimiter = utils.NewRequestLimiter(maxCommentsPerIP, 24*time.Hour)
)

type CommentRequest struct {
	Content string `json:"content"`
	Images  []uint `json:"images"`
}

func CreateComment(req CommentRequest, userID uint, refID uint, ip string, cType model.CommentType) (*model.CommentView, error) {
	if !commentsLimiter.AllowRequest(ip) {
		log.Warnf("IP %s has exceeded the comment limit of %d comments per day", ip, maxCommentsPerIP)
		return nil, model.NewRequestError("Too many comments from this IP address, please try again later")
	}

	if len(req.Content) == 0 {
		return nil, model.NewRequestError("Content cannot be empty")
	}
	if len([]rune(req.Content)) > maxCommentLength {
		return nil, model.NewRequestError("Comment content exceeds maximum length of 1024 characters")
	}

	if len(req.Images) > maxImagePerComment {
		return nil, model.NewRequestError("Too many images, maximum is 9")
	}
	resourceExists, err := dao.ExistsResource(refID)
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
	c, err := dao.CreateComment(req.Content, userID, refID, req.Images, cType)
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

func ListResourceComments(resourceID uint, page int) ([]model.CommentView, int, error) {
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
		r, err := dao.GetResourceByID(c.RefID)
		if err != nil {
			log.Error("Error getting resource for comment:", err)
			return nil, 0, model.NewInternalServerError("Error getting resource for comment")
		}
		res = append(res, *c.ToViewWithResource(&r))
	}
	return res, totalPages, nil
}

func UpdateComment(commentID, userID uint, req CommentRequest) (*model.CommentView, error) {
	if len(req.Content) == 0 {
		return nil, model.NewRequestError("Content cannot be empty")
	}
	if len([]rune(req.Content)) > maxCommentLength {
		return nil, model.NewRequestError("Comment content exceeds maximum length of 1024 characters")
	}

	if len(req.Images) > maxImagePerComment {
		return nil, model.NewRequestError("Too many images, maximum is 9")
	}
	comment, err := dao.GetCommentByID(commentID)
	if err != nil {
		return nil, model.NewNotFoundError("Comment not found")
	}
	if comment.UserID != userID {
		return nil, model.NewRequestError("You can only update your own comments")
	}
	updated, err := dao.UpdateCommentContent(commentID, req.Content, req.Images)
	if err != nil {
		return nil, model.NewInternalServerError("Error updating comment")
	}
	return updated.ToView(), nil
}

func DeleteComment(commentID, userID uint) error {
	comment, err := dao.GetCommentByID(commentID)
	if err != nil {
		return model.NewNotFoundError("Comment not found")
	}
	if comment.UserID != userID {
		return model.NewRequestError("You can only delete your own comments")
	}
	if err := dao.DeleteCommentByID(commentID); err != nil {
		return model.NewInternalServerError("Error deleting comment")
	}
	return nil
}
