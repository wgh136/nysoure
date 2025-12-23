package middleware

import (
	"nysoure/server/config"
	"nysoure/server/model"

	"github.com/gofiber/fiber/v3"
)

func PrivateMiddleware(c fiber.Ctx) error {
	if !config.PrivateDeployment() {
		return c.Next()
	}
	if c.Path() == "/api/user/register" || c.Path() == "/api/user/login" {
		return c.Next()
	}
	_, ok := c.Locals("uid").(uint)
	if !ok {
		return model.NewUnAuthorizedError("Unauthorized")
	}
	return c.Next()
}
