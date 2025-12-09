package middleware

import (
	"strings"

	"github.com/gofiber/fiber/v3"

	errorpage "github.com/wgh136/cloudflare-error-page"
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
		h, err := generateForbiddenPage(c)
		if err != nil {
			return err
		}
		c.Response().Header.Add("Content-Type", "text/html")
		c.Status(fiber.StatusForbidden)
		return c.SendString(h)
	}
	return c.Next()
}

func generateForbiddenPage(c fiber.Ctx) (string, error) {
	params := errorpage.Params{
		"error_code": 403,
		"title":      "Forbidden",
		"browser_status": map[string]interface{}{
			"status":      "error",
			"status_text": "Error",
		},
		"cloudflare_status": map[string]interface{}{
			"status":      "ok",
			"status_text": "Working",
		},
		"host_status": map[string]interface{}{
			"status":   "ok",
			"location": c.Hostname(),
		},
		"error_source": "cloudflare",

		"what_happened": "<p>The service is not available in your region.</p>",
		"what_can_i_do": "<p>Please try again in a few minutes.</p>",
		"client_ip":     c.IP(),
	}

	return errorpage.Render(params, nil)
}
