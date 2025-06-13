package api

import (
	"github.com/gofiber/fiber/v3"
	"nysoure/server/model"
	"nysoure/server/service"
	"strconv"
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

func AddActivityRoutes(router fiber.Router) {
	router.Get("/activity", handleGetActivity)
}
