package middleware

import (
	"nysoure/server/model"
	"nysoure/server/utils"

	"github.com/gofiber/fiber/v3"
)

func JwtMiddleware(c fiber.Ctx) error {
	token := c.Get("Authorization")
	if token == "" {
		token = c.Cookies("token")
	}
	if token != "" {
		id, err := utils.ParseToken(token)
		if err != nil {
			return model.NewUnAuthorizedError("Invalid token")
		}
		c.Locals("uid", id)
	}
	return c.Next()
}
