package main

import (
	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/middleware/cors"
	"github.com/gofiber/fiber/v3/middleware/logger"
	"log"
	"nysoure/server/api"
	"nysoure/server/middleware"
)

func main() {
	app := fiber.New(fiber.Config{
		BodyLimit: 8 * 1024 * 1024,
	})

	app.Use(logger.New(logger.Config{
		Format: "[${ip}]:${port} ${status} - ${method} ${path}\n",
	}))

	app.Use(middleware.ErrorHandler)

	app.Use(middleware.JwtMiddleware)

	app.Use(cors.New(cors.ConfigDefault))

	apiG := app.Group("/api")
	{
		api.AddUserRoutes(apiG)
		api.AddTagRoutes(apiG)
		api.AddImageRoutes(apiG)
		api.AddResourceRoutes(apiG)
		api.AddStorageRoutes(apiG)
		api.AddFileRoutes(apiG)
		api.AddCommentRoutes(apiG)
	}

	log.Fatal(app.Listen(":3000"))
}
