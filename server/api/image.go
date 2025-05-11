package api

import (
	"github.com/gofiber/fiber/v3"
	"net/http"
	"nysoure/server/model"
	"nysoure/server/service"
	"strconv"
	"strings"
)

func handleUploadImage(c fiber.Ctx) error {
	uid, ok := c.Locals("uid").(uint)
	if !ok {
		return model.NewUnAuthorizedError("Unauthorized")
	}
	if err := service.HavePermissionToUpload(uid); err != nil {
		return err
	}
	data := c.Body()
	contentType := http.DetectContentType(data)
	if !strings.HasPrefix(contentType, "image/") {
		return model.NewRequestError("Invalid image format")
	}
	id, err := service.CreateImage(data)
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
	if err := service.HavePermissionToUpload(uid); err != nil {
		return err
	}
	if err := service.DeleteImage(uint(id)); err != nil {
		return err
	}
	return c.Status(fiber.StatusOK).JSON(model.Response[any]{
		Success: true,
		Message: "Image deleted successfully",
	})
}

func AddImageRoutes(api fiber.Router) {
	image := api.Group("/image")
	{
		image.Put("/", handleUploadImage)
		image.Get("/:id", handleGetImage)
		image.Delete("/:id", handleDeleteImage)
	}
}
