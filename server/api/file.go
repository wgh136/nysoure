package api

import (
	"fmt"
	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/log"
	"mime/multipart"
	"nysoure/server/model"
	"nysoure/server/service"
	"strconv"
)

func AddFileRoutes(router fiber.Router) {
	fileGroup := router.Group("/files")
	{
		fileGroup.Post("/upload/init", initUpload)
		fileGroup.Post("/upload/block/:id/:index", uploadBlock)
		fileGroup.Post("/upload/finish/:id", finishUpload)
		fileGroup.Post("/redirect", createRedirectFile)
		fileGroup.Get("/:id", getFile)
		fileGroup.Put("/:id", updateFile)
		fileGroup.Delete("/:id", deleteFile)
	}
}

// initUpload 初始化文件上传过程
func initUpload(c fiber.Ctx) error {
	uid := c.Locals("uid").(uint)

	type InitUploadRequest struct {
		Filename    string `json:"filename"`
		Description string `json:"description"`
		FileSize    int64  `json:"file_size"`
		ResourceID  uint   `json:"resource_id"`
		StorageID   uint   `json:"storage_id"`
	}

	var req InitUploadRequest
	if err := c.Bind().Body(&req); err != nil {
		return c.JSON(model.Response[any]{
			Success: false,
			Message: "无效的请求参数",
		})
	}

	result, err := service.CreateUploadingFile(uid, req.Filename, req.Description, req.FileSize, req.ResourceID, req.StorageID)
	if err != nil {
		return err
	}

	return c.JSON(model.Response[*model.UploadingFileView]{
		Success: true,
		Data:    result,
	})
}

// uploadBlock 上传文件块
func uploadBlock(c fiber.Ctx) error {
	uid := c.Locals("uid").(uint)

	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.JSON(model.Response[any]{
			Success: false,
			Message: "无效的文件ID",
		})
	}

	index, err := strconv.Atoi(c.Params("index"))
	if err != nil {
		return c.JSON(model.Response[any]{
			Success: false,
			Message: "无效的块索引",
		})
	}

	file, err := c.Request().MultipartForm()
	if err != nil {
		return c.JSON(model.Response[any]{
			Success: false,
			Message: "无效的文件数据",
		})
	}

	if len(file.File["block"]) == 0 {
		return c.JSON(model.Response[any]{
			Success: false,
			Message: "没有找到文件块",
		})
	}

	fileHeader := file.File["block"][0]
	fileContent, err := fileHeader.Open()
	if err != nil {
		log.Error("打开文件块失败: ", err)
		return c.JSON(model.Response[any]{
			Success: false,
			Message: "打开文件块失败",
		})
	}
	defer func(fileContent multipart.File) {
		_ = fileContent.Close()
	}(fileContent)

	data := make([]byte, fileHeader.Size)
	if _, err := fileContent.Read(data); err != nil {
		log.Error("读取文件块失败: ", err)
		return c.JSON(model.Response[any]{
			Success: false,
			Message: "读取文件块失败",
		})
	}

	if err := service.UploadBlock(uid, uint(id), index, data); err != nil {
		return err
	}

	return c.JSON(model.Response[any]{
		Success: true,
		Message: fmt.Sprintf("块 %d 上传成功", index),
	})
}

// finishUpload 完成文件上传
func finishUpload(c fiber.Ctx) error {
	uid := c.Locals("uid").(uint)

	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.JSON(model.Response[any]{
			Success: false,
			Message: "无效的文件ID",
		})
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

// createRedirectFile 创建重定向文件
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
		return c.JSON(model.Response[any]{
			Success: false,
			Message: "无效的请求参数",
		})
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

// getFile 获取文件信息
func getFile(c fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.JSON(model.Response[any]{
			Success: false,
			Message: "无效的文件ID",
		})
	}

	file, err := service.GetFile(uint(id))
	if err != nil {
		return err
	}

	return c.JSON(model.Response[*model.FileView]{
		Success: true,
		Data:    file,
	})
}

// updateFile 更新文件信息
func updateFile(c fiber.Ctx) error {
	uid := c.Locals("uid").(uint)

	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.JSON(model.Response[any]{
			Success: false,
			Message: "无效的文件ID",
		})
	}

	type UpdateFileRequest struct {
		Filename    string `json:"filename"`
		Description string `json:"description"`
	}

	var req UpdateFileRequest
	if err := c.Bind().Body(&req); err != nil {
		return c.JSON(model.Response[any]{
			Success: false,
			Message: "无效的请求参数",
		})
	}

	result, err := service.UpdateFile(uid, uint(id), req.Filename, req.Description)
	if err != nil {
		return err
	}

	return c.JSON(model.Response[*model.FileView]{
		Success: true,
		Data:    result,
	})
}

// deleteFile 删除文件
func deleteFile(c fiber.Ctx) error {
	uid := c.Locals("uid").(uint)

	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.JSON(model.Response[any]{
			Success: false,
			Message: "无效的文件ID",
		})
	}

	if err := service.DeleteFile(uid, uint(id)); err != nil {
		return err
	}

	return c.JSON(model.Response[any]{
		Success: true,
		Message: "文件删除成功",
	})
}
