package api

import (
	"fmt"
	"nysoure/server/model"
	"nysoure/server/service"
	"strconv"
	"strings"

	"github.com/gofiber/fiber/v3"
)

func AddFileRoutes(router fiber.Router) {
	fileGroup := router.Group("/files")
	{
		fileGroup.Post("/upload/init", initUpload)
		fileGroup.Post("/upload/block/:id/:index", uploadBlock)
		fileGroup.Post("/upload/finish/:id", finishUpload)
		fileGroup.Post("/upload/cancel/:id", cancelUpload)
		fileGroup.Post("/redirect", createRedirectFile)
		fileGroup.Get("/:id", getFile)
		fileGroup.Put("/:id", updateFile)
		fileGroup.Delete("/:id", deleteFile)
		fileGroup.Get("/download/:id", downloadFile)
	}
}

func initUpload(c fiber.Ctx) error {
	uid := c.Locals("uid").(uint)

	type InitUploadRequest struct {
		Filename    string `json:"filename"`
		Description string `json:"description"`
		FileSize    int64  `json:"file_size"`
		ResourceID  uint   `json:"resource_id"`
		StorageID   uint   `json:"storage_id"`
		Md5         string `json:"md5"`
	}

	var req InitUploadRequest
	if err := c.Bind().Body(&req); err != nil {
		return model.NewRequestError("Invalid request parameters")
	}

	result, err := service.CreateUploadingFile(uid, req.Filename, req.Description, req.FileSize, req.ResourceID, req.StorageID, req.Md5)
	if err != nil {
		return err
	}

	return c.JSON(model.Response[*model.UploadingFileView]{
		Success: true,
		Data:    result,
	})
}

func uploadBlock(c fiber.Ctx) error {
	uid := c.Locals("uid").(uint)

	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return model.NewRequestError("Invalid file ID")
	}

	index, err := strconv.Atoi(c.Params("index"))
	if err != nil {
		return model.NewRequestError("Invalid block index")
	}

	data := c.Body()

	if err := service.UploadBlock(uid, uint(id), index, data); err != nil {
		return err
	}

	return c.JSON(model.Response[any]{
		Success: true,
		Message: fmt.Sprintf("Block %d uploaded successfully", index),
	})
}

func finishUpload(c fiber.Ctx) error {
	uid := c.Locals("uid").(uint)

	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return model.NewRequestError("Invalid file ID")
	}

	result, err := service.FinishUploadingFile(uid, uint(id))
	if err != nil {
		return err
	}

	return c.JSON(model.Response[*model.FileView]{
		Success: true,
		Data:    result,
	})
}

func cancelUpload(c fiber.Ctx) error {
	uid := c.Locals("uid").(uint)

	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return model.NewRequestError("Invalid file ID")
	}

	if err := service.CancelUploadingFile(uid, uint(id)); err != nil {
		return err
	}

	return c.JSON(model.Response[any]{
		Success: true,
		Message: "Upload cancelled successfully",
	})
}

func createRedirectFile(c fiber.Ctx) error {
	uid := c.Locals("uid").(uint)

	type CreateRedirectFileRequest struct {
		Filename    string `json:"filename"`
		Description string `json:"description"`
		ResourceID  uint   `json:"resource_id"`
		RedirectURL string `json:"redirect_url"`
	}

	var req CreateRedirectFileRequest
	if err := c.Bind().Body(&req); err != nil {
		return model.NewRequestError("Invalid request parameters")
	}

	result, err := service.CreateRedirectFile(uid, req.Filename, req.Description, req.ResourceID, req.RedirectURL)
	if err != nil {
		return err
	}

	return c.JSON(model.Response[*model.FileView]{
		Success: true,
		Data:    result,
	})
}

func getFile(c fiber.Ctx) error {
	file, err := service.GetFile(c.Params("id"))
	if err != nil {
		return err
	}

	return c.JSON(model.Response[*model.FileView]{
		Success: true,
		Data:    file,
	})
}

func updateFile(c fiber.Ctx) error {
	uid := c.Locals("uid").(uint)

	type UpdateFileRequest struct {
		Filename    string `json:"filename"`
		Description string `json:"description"`
	}

	var req UpdateFileRequest
	if err := c.Bind().Body(&req); err != nil {
		return model.NewRequestError("Invalid request parameters")
	}

	result, err := service.UpdateFile(uid, c.Params("id"), req.Filename, req.Description)
	if err != nil {
		return err
	}

	return c.JSON(model.Response[*model.FileView]{
		Success: true,
		Data:    result,
	})
}

func deleteFile(c fiber.Ctx) error {
	uid := c.Locals("uid").(uint)

	if err := service.DeleteFile(uid, c.Params("id")); err != nil {
		return err
	}

	return c.JSON(model.Response[any]{
		Success: true,
		Message: "File deleted successfully",
	})
}

func downloadFile(c fiber.Ctx) error {
	cfToken := c.Query("cf_token")
	ip := c.IP()
	s, filename, err := service.DownloadFile(ip, c.Params("id"), cfToken)
	if err != nil {
		return err
	}
	if strings.HasPrefix(s, "http") {
		return c.Redirect().Status(fiber.StatusFound).To(s)
	}
	c.Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", filename))
	return c.SendFile(s)
}
