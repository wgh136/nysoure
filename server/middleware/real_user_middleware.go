package middleware

import (
	"strings"

	"github.com/gofiber/fiber/v3"
)

func RealUserMiddleware(c fiber.Ctx) error {
	userAgent := c.Get("User-Agent")
	if strings.Contains(userAgent, "Mozilla") || strings.Contains(userAgent, "AppleWebKit") {
		c.Locals("real_user", true)
	} else {
		c.Locals("real_user", false)
	}
	return c.Next()
}
