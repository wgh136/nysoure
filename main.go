package main

import (
	"log"
	"nysoure/server/api"
	"nysoure/server/middleware"
	"os"

	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/middleware/cors"
	"github.com/gofiber/fiber/v3/middleware/logger"
)

func main() {
	debugMode := os.Getenv("DEBUG_MODE") != "false"

	app := fiber.New(fiber.Config{
		BodyLimit:  8 * 1024 * 1024,
		TrustProxy: true,
	})

	app.Use(logger.New(logger.Config{
		Format: "[${ip}]:${port} ${status} - ${method} ${path}\n",
	}))

	app.Use(middleware.ErrorHandler)

	app.Use(middleware.JwtMiddleware)

	app.Use(middleware.FrontendMiddleware)

	if debugMode {
		app.Use(cors.New(cors.ConfigDefault))
	}

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
	}

	log.Fatal(app.Listen(":3000"))
}
