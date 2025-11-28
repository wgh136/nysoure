package middleware

import (
	"strings"

	"github.com/gofiber/fiber/v3"
)

func UnsupportedRegionMiddleware(c fiber.Ctx) error {
	path := string(c.Request().URI().Path())

	// Skip static file requests
	if strings.Contains(path, ".") {
		return c.Next()
	}

	// Skip API requests
	if strings.HasPrefix(path, "/api") {
		return c.Next()
	}

	if string(c.Request().Header.Peek("Unsupported-Region")) == "true" {
		// Return a 403 Forbidden response with an empty html for unsupported regions
		c.Response().Header.Add("Content-Type", "text/html")
		c.Status(fiber.StatusForbidden)
		return c.SendString("<html></html>")
	}
	return c.Next()
}
