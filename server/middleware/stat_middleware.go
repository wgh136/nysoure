package middleware

import (
	"nysoure/server/stat"

	"github.com/gofiber/fiber/v3"
)

func StatMiddleware(c fiber.Ctx) error {
	err := c.Next()
	status := "200"
	if err != nil {
		if e, ok := err.(*fiber.Error); ok {
			status = string(rune(e.Code))
		} else {
			status = "500"
		}
	}
	stat.RecordRequest(c.Method(), c.Path(), status)
	return err
}
