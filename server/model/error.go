package model

import (
	"errors"

	"github.com/gofiber/fiber/v3"
)

func NewRequestError(message string) error {
	return fiber.NewError(400, message)
}

func NewUnAuthorizedError(message string) error {
	return fiber.NewError(403, message)
}

func NewNotFoundError(message string) error {
	return fiber.NewError(404, message)
}

func IsNotFoundError(err error) bool {
	var fiberError *fiber.Error
	ok := errors.As(err, &fiberError)
	if !ok {
		return false
	}
	return fiberError.Code == 404
}

func NewInternalServerError(message string) error {
	return fiber.NewError(500, message)
}
