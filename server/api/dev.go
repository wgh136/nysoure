package api

import (
	"nysoure/server/middleware"

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

func AddDevAPI(router fiber.Router) {
	devGroup := router.Group("/dev")
	devGroup.Use(middleware.DevMiddleware())
	{
		devGroup.Post("/rebuild_search_index", rebuildSearchIndex)
	}
}
