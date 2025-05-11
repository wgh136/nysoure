package api

import (
	"nysoure/server/model"
	"nysoure/server/service"
	"strconv"

	"github.com/gofiber/fiber/v3"
)

func handleCreateS3Storage(c fiber.Ctx) error {
	var params service.CreateS3StorageParams
	if err := c.Bind().JSON(&params); err != nil {
		return model.NewRequestError("Invalid request body")
	}

	if params.Name == "" || params.EndPoint == "" || params.AccessKeyID == "" ||
		params.SecretAccessKey == "" || params.BucketName == "" {
		return model.NewRequestError("All fields are required")
	}

	if params.MaxSizeInMB <= 0 {
		return model.NewRequestError("Max size must be greater than 0")
	}

	uid, ok := c.Locals("uid").(uint)
	if !ok {
		return model.NewUnAuthorizedError("You are not authorized to perform this action")
	}

	err := service.CreateS3Storage(uid, params)
	if err != nil {
		return err
	}

	return c.Status(fiber.StatusCreated).JSON(model.Response[any]{
		Success: true,
		Message: "S3 storage created successfully",
	})
}

func handleCreateLocalStorage(c fiber.Ctx) error {
	var params service.CreateLocalStorageParams
	if err := c.Bind().JSON(&params); err != nil {
		return model.NewRequestError("Invalid request body")
	}

	if params.Name == "" || params.Path == "" {
		return model.NewRequestError("All fields are required")
	}

	if params.MaxSizeInMB <= 0 {
		return model.NewRequestError("Max size must be greater than 0")
	}

	uid, ok := c.Locals("uid").(uint)
	if !ok {
		return model.NewUnAuthorizedError("You are not authorized to perform this action")
	}

	err := service.CreateLocalStorage(uid, params)
	if err != nil {
		return err
	}

	return c.Status(fiber.StatusCreated).JSON(model.Response[any]{
		Success: true,
		Message: "Local storage created successfully",
	})
}

func handleListStorages(c fiber.Ctx) error {
	storages, err := service.ListStorages()
	if err != nil {
		return err
	}

	if storages == nil {
		storages = []model.StorageView{}
	}

	return c.Status(fiber.StatusOK).JSON(model.Response[*[]model.StorageView]{
		Success: true,
		Data:    &storages,
		Message: "Storages retrieved successfully",
	})
}

func handleDeleteStorage(c fiber.Ctx) error {
	idStr := c.Params("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		return model.NewRequestError("Invalid storage ID")
	}

	uid, ok := c.Locals("uid").(uint)
	if !ok {
		return model.NewUnAuthorizedError("You are not authorized to perform this action")
	}

	err = service.DeleteStorage(uid, uint(id))
	if err != nil {
		return err
	}

	return c.Status(fiber.StatusOK).JSON(model.Response[any]{
		Success: true,
		Message: "Storage deleted successfully",
	})
}

func AddStorageRoutes(r fiber.Router) {
	s := r.Group("storage")
	s.Post("/s3", handleCreateS3Storage)
	s.Post("/local", handleCreateLocalStorage)
	s.Get("/", handleListStorages)
	s.Delete("/:id", handleDeleteStorage)
}
