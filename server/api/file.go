package api

import (
	"encoding/json"
	"fmt"
	"net/url"
	"nysoure/server/config"
	"nysoure/server/middleware"
	"nysoure/server/model"
	"nysoure/server/service"
	"nysoure/server/utils"
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v3"
)

func AddFileRoutes(router fiber.Router) {
	fileGroup := router.Group("/files")
	{
		fileGroup.Post("/upload/init", initUpload, middleware.NewRequestLimiter(100, 24*time.Hour))
		fileGroup.Post("/upload/block/:id/:index", uploadBlock)
		fileGroup.Post("/upload/finish/:id", finishUpload)
		fileGroup.Post("/upload/cancel/:id", cancelUpload)
		fileGroup.Post("/redirect", createRedirectFile, middleware.NewRequestLimiter(300, 24*time.Hour))
		fileGroup.Post("/upload/url", createServerDownloadTask)
		fileGroup.Get("/:id", getFile)
		fileGroup.Put("/:id", updateFile)
		fileGroup.Delete("/:id", deleteFile)
		fileGroup.Get("/download/local", downloadLocalFile)
		fileGroup.Get("/download/:id", downloadFile, middleware.NewDynamicRequestLimiter(config.MaxDownloadsPerDayForSingleIP, 24*time.Hour))
		fileGroup.Get("/user/:username", listUserFiles)
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
		Tag         string `json:"tag"`
	}

	var req InitUploadRequest
	if err := c.Bind().Body(&req); err != nil {
		return model.NewRequestError("Invalid request parameters")
	}

	req.Filename = strings.TrimSpace(req.Filename)
	req.Tag = strings.TrimSpace(req.Tag)

	result, err := service.CreateUploadingFile(uid, req.Filename, req.Description, req.FileSize, req.ResourceID, req.StorageID, req.Tag)
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

	md5 := c.Query("md5")
	if md5 == "" {
		return model.NewRequestError("MD5 checksum is required")
	}

	result, err := service.FinishUploadingFile(uid, uint(id), md5)
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
		FileSize    int64  `json:"file_size"`
		Md5         string `json:"md5"`
		Tag         string `json:"tag"`
	}

	var req CreateRedirectFileRequest
	if err := c.Bind().Body(&req); err != nil {
		return model.NewRequestError("Invalid request parameters")
	}

	req.Filename = strings.TrimSpace(req.Filename)
	req.Md5 = strings.TrimSpace(req.Md5)
	req.Tag = strings.TrimSpace(req.Tag)

	result, err := service.CreateRedirectFile(uid, req.Filename, req.Description, req.ResourceID, req.RedirectURL, req.FileSize, req.Md5, req.Tag)
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
		Tag         string `json:"tag"`
	}

	var req UpdateFileRequest
	if err := c.Bind().Body(&req); err != nil {
		return model.NewRequestError("Invalid request parameters")
	}

	req.Filename = strings.TrimSpace(req.Filename)
	req.Tag = strings.TrimSpace(req.Tag)

	result, err := service.UpdateFile(uid, c.Params("id"), req.Filename, req.Description, req.Tag)
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
	s, filename, err := service.DownloadFile(c.Params("id"), cfToken, c.Locals("real_user") == true)
	if err != nil {
		return err
	}
	if strings.HasPrefix(s, "http") {
		uri, err := url.Parse(s)
		if err != nil {
			return err
		}
		token, err := utils.GenerateDownloadToken(s)
		if err != nil {
			return err
		}
		q := uri.Query()
		q.Set("token", token)
		uri.RawQuery = q.Encode()
		return c.Redirect().Status(fiber.StatusFound).To(uri.String())
	}
	data := map[string]string{
		"path":     s,
		"filename": filename,
	}
	j, _ := json.Marshal(data)
	token, err := utils.GenerateTemporaryToken(string(j))
	if err != nil {
		return model.NewInternalServerError("Failed to generate download token")
	}
	return c.Redirect().Status(fiber.StatusFound).To(fmt.Sprintf("%s/api/files/download/local?token=%s", c.BaseURL(), token))
}

func downloadLocalFile(c fiber.Ctx) error {
	token := c.Query("token")
	if token == "" {
		return model.NewRequestError("Download token is required")
	}

	data, err := utils.ParseTemporaryToken(token)
	if err != nil {
		return model.NewRequestError("Invalid or expired download token")
	}

	var fileData map[string]string
	if err := json.Unmarshal([]byte(data), &fileData); err != nil {
		return model.NewInternalServerError("Failed to parse download data")
	}

	path := fileData["path"]
	filename := fileData["filename"]

	c.Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", url.PathEscape(filename)))

	return c.SendFile(path, fiber.SendFile{
		ByteRange: true,
	})
}

func createServerDownloadTask(c fiber.Ctx) error {
	uid := c.Locals("uid").(uint)

	type InitUploadRequest struct {
		Url         string `json:"url"`
		Filename    string `json:"filename"`
		Description string `json:"description"`
		ResourceID  uint   `json:"resource_id"`
		StorageID   uint   `json:"storage_id"`
		Tag         string `json:"tag"`
	}

	var req InitUploadRequest
	if err := c.Bind().Body(&req); err != nil {
		return model.NewRequestError("Invalid request parameters")
	}

	req.Filename = strings.TrimSpace(req.Filename)
	req.Tag = strings.TrimSpace(req.Tag)

	result, err := service.CreateServerDownloadTask(uid, req.Url, req.Filename, req.Description, req.ResourceID, req.StorageID, req.Tag)
	if err != nil {
		return err
	}
	return c.JSON(model.Response[*model.FileView]{
		Success: true,
		Data:    result,
	})
}

func listUserFiles(c fiber.Ctx) error {
	username := c.Params("username")
	var err error
	username, err = url.PathUnescape(username)
	if err != nil {
		return model.NewRequestError("Invalid username")
	}
	page, err := strconv.Atoi(c.Query("page", "1"))
	if err != nil || page < 1 {
		return model.NewRequestError("Invalid page number")
	}

	files, totalPages, err := service.ListUserFiles(username, page)
	if err != nil {
		return err
	}

	return c.JSON(model.PageResponse[*model.FileView]{
		Success:    true,
		Data:       files,
		TotalPages: totalPages,
	})
}
