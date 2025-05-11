package middleware

import (
	"errors"
	"github.com/gofiber/fiber/v3/log"
	"nysoure/server/model"

	"github.com/gofiber/fiber/v3"
)

func ErrorHandler(c fiber.Ctx) error {
	err := c.Next()
	if err != nil {
		var requestErr *model.RequestError
		var unauthorizedErr *model.UnAuthorizedError
		var notFoundErr *model.NotFoundError
		if errors.As(err, &requestErr) {
			log.Error("Request Error: ", err)
			return c.Status(fiber.StatusBadRequest).JSON(model.Response[any]{
				Success: false,
				Data:    nil,
				Message: requestErr.Error(),
			})
		} else if errors.As(err, &unauthorizedErr) {
			log.Error("Unauthorized Error: ", err)
			return c.Status(fiber.StatusUnauthorized).JSON(model.Response[any]{
				Success: false,
				Data:    nil,
				Message: unauthorizedErr.Error(),
			})
		} else if errors.As(err, &notFoundErr) {
			log.Error("Not Found Error: ", err)
			return c.Status(fiber.StatusNotFound).JSON(model.Response[any]{
				Success: false,
				Data:    nil,
				Message: notFoundErr.Error(),
			})
		} else if errors.Is(err, fiber.ErrNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(model.Response[any]{
				Success: false,
				Data:    nil,
				Message: "Not found",
			})
		} else if errors.Is(err, fiber.ErrMethodNotAllowed) {
			return c.Status(fiber.StatusMethodNotAllowed).JSON(model.Response[any]{
				Success: false,
				Data:    nil,
				Message: "Method not allowed",
			})
		} else {
			var fiberErr *fiber.Error
			if errors.As(err, &fiberErr) {
				if fiberErr.Code == fiber.StatusNotFound {
					return c.Status(fiber.StatusNotFound).JSON(model.Response[any]{
						Success: false,
						Data:    nil,
						Message: "Not found",
					})
				}
			}
			return c.Status(fiber.StatusInternalServerError).JSON(model.Response[any]{
				Success: false,
				Data:    nil,
				Message: "Internal server error",
			})
		}
	}
	return nil
}
