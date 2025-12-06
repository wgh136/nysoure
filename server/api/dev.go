package api

import (
	"nysoure/server/middleware"

	"github.com/gofiber/fiber/v3"
)

func AddDevAPI(router fiber.Router) {
	devGroup := router.Group("/dev")
	{
		devGroup.Use(middleware.DevMiddleware())
	}
}
