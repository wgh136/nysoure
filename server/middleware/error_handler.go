package middleware

import (
	"errors"
	"nysoure/server/model"

	"github.com/gofiber/fiber/v3/log"

	"github.com/gofiber/fiber/v3"
)

func ErrorHandler(c fiber.Ctx) error {
	err := c.Next()
	if err != nil {
		var fiberErr *fiber.Error
		if errors.As(err, &fiberErr) {
			if fiberErr.Code != fiber.StatusInternalServerError {
				return c.Status(fiberErr.Code).JSON(model.Response[any]{
					Success: false,
					Data:    nil,
					Message: fiberErr.Message,
				})
			}
		}
		log.Error("Internal Server Error: ", err)
		return c.Status(fiber.StatusInternalServerError).JSON(model.Response[any]{
			Success: false,
			Data:    nil,
			Message: "Internal server error",
		})
	}
	return nil
}
