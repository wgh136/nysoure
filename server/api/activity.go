package api

import (
	"nysoure/server/model"
	"nysoure/server/service"
	"strconv"

	"github.com/gofiber/fiber/v3"
)

func handleGetActivity(c fiber.Ctx) error {
	pageStr := c.Query("page", "1")
	page, err := strconv.Atoi(pageStr)
	if err != nil {
		return model.NewRequestError("Invalid page number")
	}
	activities, totalPages, err := service.GetActivityList(page)
	if err != nil {
		return err
	}
	if activities == nil {
		activities = []model.ActivityView{}
	}
	return c.JSON(model.PageResponse[model.ActivityView]{
		Success:    true,
		Data:       activities,
		TotalPages: totalPages,
		Message:    "Activities retrieved successfully",
	})
}

func handleGetUserNotifications(c fiber.Ctx) error {
	uid, ok := c.Locals("uid").(uint)
	if !ok {
		return model.NewUnAuthorizedError("Unauthorized")
	}
	pageStr := c.Query("page", "1")
	page, err := strconv.Atoi(pageStr)
	if err != nil {
		return model.NewRequestError("Invalid page number")
	}
	notifications, totalPages, err := service.GetUserNotifications(uid, page)
	if err != nil {
		return err
	}
	if notifications == nil {
		notifications = []model.ActivityView{}
	}
	return c.JSON(model.PageResponse[model.ActivityView]{
		Success:    true,
		Data:       notifications,
		TotalPages: totalPages,
		Message:    "User notifications retrieved successfully",
	})
}

func handleResetUserNotificationsCount(c fiber.Ctx) error {
	uid, ok := c.Locals("uid").(uint)
	if !ok {
		return model.NewUnAuthorizedError("Unauthorized")
	}
	err := service.ResetUserNotificationsCount(uid)
	if err != nil {
		return err
	}
	return c.JSON(model.Response[any]{
		Success: true,
		Message: "User notifications count reset successfully",
	})
}

func handleGetUserNotificationsCount(c fiber.Ctx) error {
	uid, ok := c.Locals("uid").(uint)
	if !ok {
		return model.NewUnAuthorizedError("Unauthorized")
	}
	count, err := service.GetUserNotificationsCount(uid)
	if err != nil {
		return err
	}
	return c.JSON(model.Response[uint]{
		Success: true,
		Data:    count,
		Message: "User notifications count retrieved successfully",
	})
}

func AddActivityRoutes(router fiber.Router) {
	router.Get("/activity", handleGetActivity)
	notificationrouter := router.Group("/notification")
	{
		notificationrouter.Get("/", handleGetUserNotifications)
		notificationrouter.Post("/reset", handleResetUserNotificationsCount)
		notificationrouter.Get("/count", handleGetUserNotificationsCount)
	}
}
