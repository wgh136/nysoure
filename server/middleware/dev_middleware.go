package middleware

import (
	"nysoure/server/model"
	"os"

	"github.com/gofiber/fiber/v3"
)

func DevMiddleware() func(c fiber.Ctx) error {
	AccessKey := os.Getenv("DEV_ACCESS_KEY")
	return func(c fiber.Ctx) error {
		if AccessKey == "" {
			return model.NewUnAuthorizedError("Unauthorized")
		}
		providedKey := c.Get("X-DEV-ACCESS-KEY")
		if providedKey != AccessKey {
			return model.NewUnAuthorizedError("Unauthorized")
		}
		return c.Next()
	}
}

func GlobalDevMiddleware() func(c fiber.Ctx) error {
	AccessKey := os.Getenv("DEV_ACCESS_KEY")
	return func(c fiber.Ctx) error {
		if AccessKey == "" {
			c.Locals("dev_access", false)
			return c.Next()
		}
		providedKey := c.Get("X-DEV-ACCESS-KEY")
		if providedKey != AccessKey {
			c.Locals("dev_access", false)
			return c.Next()
		}
		c.Locals("dev_access", true)
		return c.Next()
	}
}
