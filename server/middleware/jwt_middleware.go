package middleware

import (
	"github.com/gofiber/fiber/v3"
	"nysoure/server/model"
	"nysoure/server/utils"
)

func JwtMiddleware(c fiber.Ctx) error {
	token := c.Get("Authorization")
	if token != "" {
		id, err := utils.ParseToken(token)
		if err != nil {
			return model.NewUnAuthorizedError("Invalid token")
		}
		c.Locals("uid", id)
	}
	return c.Next()
}
