package api

import (
	"net/http"
	"nysoure/server/middleware"
	"nysoure/server/model"
	"nysoure/server/service"
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v3"
)

func handleUploadImage(c fiber.Ctx) error {
	uid, ok := c.Locals("uid").(uint)
	if !ok {
		return model.NewUnAuthorizedError("You must be logged in to upload an image")
	}
	data := c.Body()
	contentType := http.DetectContentType(data)
	if !strings.HasPrefix(contentType, "image/") {
		return model.NewRequestError("Invalid image format")
	}
	ip := c.IP()
	id, err := service.CreateImage(uid, ip, data)
	if err != nil {
		return err
	}
	return c.Status(fiber.StatusOK).JSON(model.Response[uint]{
		Success: true,
		Data:    id,
		Message: "Image uploaded successfully",
	})
}

func handleGetImage(c fiber.Ctx) error {
	idStr := c.Params("id")
	if idStr == "" {
		return model.NewRequestError("Image ID is required")
	}
	id, err := strconv.Atoi(idStr)
	if err != nil {
		return model.NewRequestError("Invalid image ID")
	}
	image, err := service.GetImage(uint(id))
	if err != nil {
		return err
	}
	contentType := http.DetectContentType(image)
	c.Set("Content-Type", contentType)
	c.Set("Cache-Control", "public, max-age=31536000")
	return c.Send(image)
}

func handleDeleteImage(c fiber.Ctx) error {
	idStr := c.Params("id")
	if idStr == "" {
		return model.NewRequestError("Image ID is required")
	}
	id, err := strconv.Atoi(idStr)
	if err != nil {
		return model.NewRequestError("Invalid image ID")
	}
	uid, ok := c.Locals("uid").(uint)
	if !ok {
		return model.NewUnAuthorizedError("Unauthorized")
	}
	if err := service.DeleteImage(uid, uint(id)); err != nil {
		return err
	}
	return c.Status(fiber.StatusOK).JSON(model.Response[any]{
		Success: true,
		Message: "Image deleted successfully",
	})
}

func handleGetResampledImage(c fiber.Ctx) error {
	idStr := c.Params("id")
	if idStr == "" {
		return model.NewRequestError("Image ID is required")
	}
	id, err := strconv.Atoi(idStr)
	if err != nil {
		return model.NewRequestError("Invalid image ID")
	}
	image, err := service.GetResampledImage(uint(id))
	if err != nil {
		return err
	}
	if image == nil {
		// No resampled image, redirect to original
		return c.Redirect().To("/api/image/" + idStr)
	}
	contentType := http.DetectContentType(image)
	c.Set("Content-Type", contentType)
	c.Set("Cache-Control", "public, max-age=31536000")
	return c.Send(image)
}

func AddImageRoutes(api fiber.Router) {
	image := api.Group("/image")
	{
		image.Put("/", handleUploadImage, middleware.NewRequestLimiter(50, time.Hour))
		image.Get("/resampled/:id", handleGetResampledImage)
		image.Get("/:id", handleGetImage)
		image.Delete("/:id", handleDeleteImage)
	}
}
