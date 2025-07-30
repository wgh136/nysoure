package service

import (
	"nysoure/server/dao"
	"nysoure/server/model"
	"regexp"
	"strings"

	"github.com/gofiber/fiber/v3/log"
)

const (
	maxCommentsPerIP      = 512  // Maximum number of comments allowed per IP address per day
	maxCommentLength      = 2048 // Maximum length of a comment
	maxCommentBriefLines  = 16   // Maximum number of lines in a comment brief
	maxCommentBriefLength = 256  // Maximum length of a comment brief
)

type CommentRequest struct {
	Content string `json:"content"` // markdown
	// Images  []uint `json:"images"` // Unrequired after new design
}

func CreateComment(req CommentRequest, userID uint, refID uint, ip string, cType model.CommentType, host string) (*model.CommentView, error) {
	if len(req.Content) == 0 {
		return nil, model.NewRequestError("Content cannot be empty")
	}
	if len([]rune(req.Content)) > maxCommentLength {
		return nil, model.NewRequestError("Comment content exceeds maximum length of 1024 characters")
	}

	switch cType {
	case model.CommentTypeResource:
		resourceExists, err := dao.ExistsResource(refID)
		if err != nil {
			log.Error("Error checking resource existence:", err)
			return nil, model.NewInternalServerError("Error checking resource existence")
		}
		if !resourceExists {
			return nil, model.NewNotFoundError("Resource not found")
		}
	case model.CommentTypeReply:
		_, err := dao.GetCommentByID(refID)
		if err != nil {
			log.Error("Error getting reply comment:", err)
			return nil, model.NewNotFoundError("Reply comment not found")
		}
	}

	userExists, err := dao.ExistsUserByID(userID)
	if err != nil {
		log.Error("Error checking user existence:", err)
		return nil, model.NewInternalServerError("Error checking user existence")
	}
	if !userExists {
		return nil, model.NewNotFoundError("User not found")
	}

	images := findImagesInContent(req.Content, host)

	c, err := dao.CreateComment(req.Content, userID, refID, images, cType)
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

func restrictCommentLength(content string) (c string, truncated bool) {
	lines := strings.Split(content, "\n")
	lineCount := 0
	for i, line := range lines {
		reg := regexp.MustCompile(`!\[.*?\]\(.*?\)`)
		if reg.MatchString(line) {
			// Count the line with image as 5 lines
			lineCount += 5
		} else {
			lineCount++
		}

		if lineCount > maxCommentBriefLines {
			lines = lines[:i+1] // Keep the current line
			content = strings.Join(lines, "\n")
			truncated = true
			break
		}
	}

	if len([]rune(content)) > maxCommentBriefLength {
		i := len(lines) - 1
		for count := len([]rune(content)); count > maxCommentBriefLength && i > 0; i-- {
			count -= len([]rune(lines[i]))
		}
		if i == 0 && len([]rune(lines[0])) > maxCommentBriefLength {
			content = string([]rune(lines[0])[:maxCommentBriefLength])
		} else {
			content = strings.Join(lines[:i+1], "\n")
		}
		truncated = true
	}
	return content, truncated
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
		v := *c.ToView()
		var truncated bool
		v.Content, truncated = restrictCommentLength(v.Content)
		v.ContentTruncated = truncated
		res = append(res, v)
	}
	return res, totalPages, nil
}

func ListCommentReplies(commentID uint, page int) ([]model.CommentView, int, error) {
	replies, totalPages, err := dao.GetCommentReplies(commentID, page, pageSize)
	if err != nil {
		log.Error("Error getting replies:", err)
		return nil, 0, model.NewInternalServerError("Error getting replies")
	}
	res := make([]model.CommentView, 0, len(replies))
	for _, r := range replies {
		v := *r.ToView()
		var truncated bool
		v.Content, truncated = restrictCommentLength(v.Content)
		v.ContentTruncated = truncated
		res = append(res, v)
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
		v := *c.ToViewWithResource(&r)
		var truncated bool
		v.Content, truncated = restrictCommentLength(v.Content)
		v.ContentTruncated = truncated
		res = append(res, v)
	}
	return res, totalPages, nil
}

func UpdateComment(commentID, userID uint, req CommentRequest, host string) (*model.CommentView, error) {
	if len(req.Content) == 0 {
		return nil, model.NewRequestError("Content cannot be empty")
	}
	if len([]rune(req.Content)) > maxCommentLength {
		return nil, model.NewRequestError("Comment content exceeds maximum length of 1024 characters")
	}

	comment, err := dao.GetCommentByID(commentID)
	if err != nil {
		return nil, model.NewNotFoundError("Comment not found")
	}
	if comment.UserID != userID {
		isAdmin, err := CheckUserIsAdmin(userID)
		if err != nil {
			log.Error("Error checking if user is admin:", err)
			return nil, model.NewInternalServerError("Error checking user permissions")
		}
		if !isAdmin {
			return nil, model.NewUnAuthorizedError("You can only update your own comments")
		}
	}
	images := findImagesInContent(req.Content, host)
	updated, err := dao.UpdateCommentContent(commentID, req.Content, images)
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

func GetCommentByID(commentID uint) (*model.CommentWithRefView, error) {
	comment, err := dao.GetCommentByID(commentID)
	if err != nil {
		return nil, model.NewNotFoundError("Comment not found")
	}

	var resource *model.Resource
	var replyTo *model.Comment
	if comment.Type == model.CommentTypeResource {
		r, err := dao.GetResourceByID(comment.RefID)
		if err != nil {
			log.Error("Error getting resource for comment:", err)
			return nil, model.NewInternalServerError("Error getting resource for comment")
		}
		resource = &r
	} else {
		reply, err := dao.GetCommentByID(comment.RefID)
		if err != nil {
			log.Error("Error getting reply for comment:", err)
			return nil, model.NewInternalServerError("Error getting reply for comment")
		}
		replyTo = reply
	}

	v := comment.ToViewWithRef(resource, replyTo)

	if v.ReplyTo != nil {
		v.ReplyTo.Content, v.ReplyTo.ContentTruncated = restrictCommentLength(v.ReplyTo.Content)
	}

	return v, nil
}
