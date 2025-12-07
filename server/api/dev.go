package api

import (
	"log/slog"
	"nysoure/server/dao"
	"nysoure/server/middleware"
	"time"

	"nysoure/server/search"

	"github.com/gofiber/fiber/v3"
)

func rebuildSearchIndex(c fiber.Ctx) error {
	err := search.RebuildSearchIndex()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to rebuild search index: " + err.Error(),
		})
	}
	return c.JSON(fiber.Map{
		"message": "Search index rebuilt successfully",
	})
}

func updateResourceReleaseDate(c fiber.Ctx) error {
	type Request struct {
		ResourceID  uint   `json:"resource_id"`
		ReleaseDate string `json:"release_date"`
	}
	var req Request
	if err := c.Bind().JSON(req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body: " + err.Error(),
		})
	}
	date, err := time.Parse("2006-01-02", req.ReleaseDate)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid date format: " + err.Error(),
		})
	}
	err = dao.UpdateResourceReleaseDate(req.ResourceID, date)
	if err != nil {
		slog.Error("Failed to update release date", "error", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to update release date",
		})
	}
	return c.JSON(fiber.Map{
		"message": "Release date updated successfully",
	})
}

func AddDevAPI(router fiber.Router) {
	devGroup := router.Group("/dev")
	devGroup.Use(middleware.DevMiddleware())
	{
		devGroup.Post("/rebuild_search_index", rebuildSearchIndex)
		devGroup.Post("/update_resource_release_date", updateResourceReleaseDate)
	}
}
