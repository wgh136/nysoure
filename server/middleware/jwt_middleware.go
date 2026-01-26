package middleware

import (
	"nysoure/server/model"
	"nysoure/server/service"
	"nysoure/server/utils"

	"github.com/gofiber/fiber/v3"
)

func JwtMiddleware(c fiber.Ctx) error {
	token := c.Get("Authorization")
	fromCookie := false
	if token == "" {
		token = c.Cookies("token")
		fromCookie = true
	}
	if token != "" {
		id, err := utils.ParseToken(token)
		if err != nil {
			if fromCookie {
				c.ClearCookie("token")
				return c.Next()
			} else {
				return model.NewUnAuthorizedError("Invalid token")
			}
		}

		p, err := service.GetUserPermission(id)
		if err != nil {
			if model.IsNotFoundError(err) {
				if fromCookie {
					c.ClearCookie("token")
					return c.Next()
				} else {
					return model.NewUnAuthorizedError("Invalid token")
				}
			} else {
				return err
			}
		}

		c.Locals("uid", id)
		c.Locals("permission", p)
	}
	return c.Next()
}
