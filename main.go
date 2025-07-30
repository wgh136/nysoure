package main

import (
	"log"
	"nysoure/server/api"
	"nysoure/server/middleware"

	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/middleware/logger"
)

func main() {
	app := fiber.New(fiber.Config{
		BodyLimit:   8 * 1024 * 1024,
		ProxyHeader: "X-Real-IP",
	})

	app.Use(logger.New(logger.Config{
		Format: "[${ip}]:${port} ${status} - ${method} ${path}\n",
	}))

	app.Use(middleware.ErrorHandler)

	app.Use(middleware.JwtMiddleware)

	app.Use(middleware.FrontendMiddleware)

	apiG := app.Group("/api")
	{
		api.AddUserRoutes(apiG)
		api.AddTagRoutes(apiG)
		api.AddImageRoutes(apiG)
		api.AddResourceRoutes(apiG)
		api.AddStorageRoutes(apiG)
		api.AddFileRoutes(apiG)
		api.AddCommentRoutes(apiG)
		api.AddConfigRoutes(apiG)
		api.AddActivityRoutes(apiG)
		api.AddCollectionRoutes(apiG) // 新增
	}

	log.Fatal(app.Listen(":3000"))
}
