package service

import (
	"bufio"
	"context"
	"crypto/md5"
	"encoding/hex"
	"io"
	"net/http"
	"nysoure/server/config"
	"nysoure/server/dao"
	"nysoure/server/model"
	"nysoure/server/storage"
	"nysoure/server/utils"
	"os"
	"path/filepath"
	"strconv"
	"sync/atomic"
	"time"

	"github.com/gofiber/fiber/v3/log"
	"github.com/google/uuid"
)

const (
	blockSize                  = 4 * 1024 * 1024           // 4MB
	storageKeyUnavailable      = "storage_key_unavailable" // Placeholder for unavailable storage key
	MinUnrequireVerifyFileSize = 10 * 1024 * 1024          // 10MB
)

func getUploadingSize() int64 {
	return dao.GetStatistic("uploading_size")
}

func updateUploadingSize(offset int64) {
	_ = dao.UpdateStatistic("uploading_size", offset)
}

func getTempDir() (string, error) {
	name := uuid.NewString()
	path := filepath.Join(utils.GetStoragePath(), "uploading", name)
	if err := os.MkdirAll(path, os.ModePerm); err != nil {
		return "", err
	}
	return path, nil
}

func init() {
	go func() {
		// Wait for 1 minute to ensure the database is ready
		time.Sleep(time.Minute)
		for {
			oneDayAgo := time.Now().Add(-24 * time.Hour)
			oldFiles, err := dao.GetUploadingFilesOlderThan(oneDayAgo)
			if err != nil {
				log.Error("failed to get old uploading files: ", err)
			} else {
				for _, file := range oldFiles {
					if err := os.RemoveAll(file.TempPath); err != nil {
						log.Error("failed to remove temp dir: ", err)
					}
					if err := dao.DeleteUploadingFile(file.ID); err != nil {
						log.Error("failed to delete uploading file: ", err)
					}
					updateUploadingSize(-file.TotalSize)
				}
			}
			// Sleep for 1 hour
			time.Sleep(1 * time.Hour)
		}
	}()
}

func CreateUploadingFile(uid uint, filename string, description string, fileSize int64, resourceID, storageID uint) (*model.UploadingFileView, error) {
	if filename == "" {
		return nil, model.NewRequestError("filename is empty")
	}
	if len([]rune(filename)) > 128 {
		return nil, model.NewRequestError("filename is too long")
	}
	canUpload, err := checkUserCanUpload(uid)
	if err != nil {
		log.Error("failed to check user permission: ", err)
		return nil, model.NewInternalServerError("failed to check user permission")
	}
	if !canUpload {
		if !config.AllowNormalUserUpload() || fileSize > config.MaxNormalUserUploadSize()*1024*1024 {
			return nil, model.NewUnAuthorizedError("user cannot upload file")
		}
	}

	if fileSize > config.MaxFileSize() {
		return nil, model.NewRequestError("file size exceeds the limit")
	}

	currentUploadingSize := getUploadingSize()
	if currentUploadingSize+fileSize > config.MaxUploadingSize() {
		log.Info("A new uploading file is rejected due to max uploading size limit")
		return nil, model.NewRequestError("server is busy, please try again later")
	}

	tempPath, err := getTempDir()
	if err != nil {
		log.Error("failed to create temp dir: ", err)
		return nil, model.NewInternalServerError("failed to create temp dir")
	}
	uploadingFile, err := dao.CreateUploadingFile(filename, description, fileSize, blockSize, tempPath, resourceID, storageID, uid)
	if err != nil {
		log.Error("failed to create uploading file: ", err)
		_ = os.Remove(tempPath)
		return nil, model.NewInternalServerError("failed to create uploading file")
	}
	updateUploadingSize(fileSize)
	return uploadingFile.ToView(), nil
}

func UploadBlock(uid uint, fid uint, index int, data []byte) error {
	uploadingFile, err := dao.GetUploadingFile(fid)
	if err != nil {
		log.Error("failed to get uploading file: ", err)
		return model.NewNotFoundError("file not found")
	}
	if uploadingFile.UserID != uid {
		return model.NewUnAuthorizedError("user cannot upload file")
	}
	if len(data) > int(uploadingFile.BlockSize) {
		return model.NewRequestError("block size exceeds the limit")
	}
	if index != uploadingFile.BlocksCount()-1 && len(data) != int(uploadingFile.BlockSize) {
		return model.NewRequestError("block size is not correct")
	}
	if index < 0 || index >= uploadingFile.BlocksCount() {
		return model.NewRequestError("block index is not correct")
	}

	path := filepath.Join(uploadingFile.TempPath, strconv.Itoa(index))
	if err := os.WriteFile(path, data, os.ModePerm); err != nil {
		log.Error("failed to write block file: ", err)
		return model.NewInternalServerError("failed to write block file")
	}
	uploadingFile.Blocks[index] = true
	if err := dao.UpdateUploadingBlock(fid, index); err != nil {
		log.Error("failed to update uploading file: ", err)
		_ = os.Remove(path)
		return model.NewInternalServerError("failed to update uploading file")
	}

	return nil
}

func FinishUploadingFile(uid uint, fid uint, md5Str string) (*model.FileView, error) {
	uploadingFile, err := dao.GetUploadingFile(fid)
	if err != nil {
		log.Error("failed to get uploading file: ", err)
		return nil, model.NewNotFoundError("file not found")
	}
	if uploadingFile.UserID != uid {
		return nil, model.NewUnAuthorizedError("user cannot upload file")
	}

	for i := 0; i < uploadingFile.BlocksCount(); i++ {
		if !uploadingFile.Blocks[i] {
			return nil, model.NewRequestError("file is not completely uploaded")
		}
	}

	tempRemoved := false

	defer func() {
		if !tempRemoved {
			if err := os.RemoveAll(uploadingFile.TempPath); err != nil {
				log.Error("failed to remove temp dir: ", err)
			}
		}
		if err := dao.DeleteUploadingFile(fid); err != nil {
			log.Error("failed to delete uploading file: ", err)
		}
		updateUploadingSize(-uploadingFile.TotalSize)
	}()

	resultFilePath := filepath.Join(utils.GetStoragePath(), uuid.NewString())
	file, err := os.OpenFile(resultFilePath, os.O_CREATE|os.O_WRONLY, os.ModePerm)
	if err != nil {
		log.Error("failed to open result file: ", err)
		return nil, model.NewInternalServerError("failed to finish uploading file. please re-upload")
	}

	h := md5.New()

	for i := 0; i < uploadingFile.BlocksCount(); i++ {
		blockPath := filepath.Join(uploadingFile.TempPath, strconv.Itoa(i))
		data, err := os.ReadFile(blockPath)
		if err != nil {
			log.Error("failed to read block file: ", err)
			_ = file.Close()
			_ = os.Remove(resultFilePath)
			return nil, model.NewInternalServerError("failed to finish uploading file. please re-upload")
		}
		_, err = h.Write(data)
		if err != nil {
			log.Error("failed to write block data to sha1: ", err)
			_ = file.Close()
			_ = os.Remove(resultFilePath)
			return nil, model.NewInternalServerError("failed to finish uploading file. please re-upload")
		}
		if _, err := file.Write(data); err != nil {
			log.Error("failed to write result file: ", err)
			_ = file.Close()
			_ = os.Remove(resultFilePath)
			return nil, model.NewInternalServerError("failed to finish uploading file. please re-upload")
		}
	}

	_ = file.Close()
	_ = os.RemoveAll(uploadingFile.TempPath)
	tempRemoved = true

	sum := h.Sum(nil)
	sumStr := hex.EncodeToString(sum)
	if sumStr != md5Str {
		_ = os.Remove(resultFilePath)
		return nil, model.NewRequestError("md5 checksum is not correct")
	}

	s, err := dao.GetStorage(uploadingFile.TargetStorageID)
	if err != nil {
		log.Error("failed to get storage: ", err)
		_ = os.Remove(resultFilePath)
		return nil, model.NewInternalServerError("failed to finish uploading file. please re-upload")
	}

	iStorage := storage.NewStorage(s)
	if iStorage == nil {
		log.Error("failed to find storage: ", err)
		_ = os.Remove(resultFilePath)
		return nil, model.NewInternalServerError("failed to finish uploading file. please re-upload")
	}

	dbFile, err := dao.CreateFile(uploadingFile.Filename, uploadingFile.Description, uploadingFile.TargetResourceID, &uploadingFile.TargetStorageID, storageKeyUnavailable, "", uploadingFile.TotalSize, uid, sumStr)
	if err != nil {
		log.Error("failed to create file in db: ", err)
		_ = os.Remove(resultFilePath)
		return nil, model.NewInternalServerError("failed to finish uploading file. please re-upload")
	}

	go func() {
		defer func() {
			_ = os.Remove(resultFilePath)
		}()
		err := dao.AddStorageUsage(uploadingFile.TargetStorageID, uploadingFile.TotalSize)
		if err != nil {
			log.Error("failed to add storage usage: ", err)
			_ = dao.DeleteFile(dbFile.UUID)
			return
		}
		storageKey, err := iStorage.Upload(resultFilePath, uploadingFile.Filename)
		if err != nil {
			_ = dao.AddStorageUsage(uploadingFile.TargetStorageID, -uploadingFile.TotalSize)
			log.Error("failed to upload file to storage: ", err)
			_ = dao.DeleteFile(dbFile.UUID)
		} else {
			err = dao.SetFileStorageKey(dbFile.UUID, storageKey)
			if err != nil {
				_ = dao.AddStorageUsage(uploadingFile.TargetStorageID, -uploadingFile.TotalSize)
				_ = iStorage.Delete(storageKey)
				_ = dao.DeleteFile(dbFile.UUID)
				log.Error("failed to set file storage key: ", err)
			}
		}
	}()

	return dbFile.ToView(), nil
}

func CancelUploadingFile(uid uint, fid uint) error {
	uploadingFile, err := dao.GetUploadingFile(fid)
	if err != nil {
		log.Error("failed to get uploading file: ", err)
		return model.NewNotFoundError("file not found")
	}
	if uploadingFile.UserID != uid {
		return model.NewUnAuthorizedError("user cannot cancel uploading file")
	}

	if err := dao.DeleteUploadingFile(fid); err != nil {
		log.Error("failed to delete uploading file: ", err)
		return model.NewInternalServerError("failed to delete uploading file")
	}

	go func() {
		// Wait for 1 second to ensure there is no block being uploading
		time.Sleep(time.Second)
		if err := os.RemoveAll(uploadingFile.TempPath); err != nil {
			log.Error("failed to remove temp dir: ", err)
		}
	}()

	updateUploadingSize(-uploadingFile.TotalSize)

	return nil
}

func CreateRedirectFile(uid uint, filename string, description string, resourceID uint, redirectUrl string) (*model.FileView, error) {
	canUpload, err := checkUserCanUpload(uid)
	if err != nil {
		log.Error("failed to check user permission: ", err)
		return nil, model.NewInternalServerError("failed to check user permission")
	}
	if !canUpload && !config.AllowNormalUserUpload() {
		return nil, model.NewUnAuthorizedError("user cannot upload file")
	}

	file, err := dao.CreateFile(filename, description, resourceID, nil, "", redirectUrl, 0, uid, "")
	if err != nil {
		log.Error("failed to create file in db: ", err)
		return nil, model.NewInternalServerError("failed to create file in db")
	}
	return file.ToView(), nil
}

func DeleteFile(uid uint, fid string) error {
	file, err := dao.GetFile(fid)
	if err != nil {
		log.Error("failed to get file: ", err)
		return model.NewNotFoundError("file not found")
	}

	isAdmin, err := CheckUserIsAdmin(uid)
	if err != nil {
		log.Error("failed to check user permission: ", err)
		return model.NewInternalServerError("failed to check user permission")
	}

	if !isAdmin && file.UserID != uid {
		return model.NewUnAuthorizedError("user cannot delete file")
	}

	if file.StorageID != nil {
		iStorage := storage.NewStorage(file.Storage)
		if iStorage != nil {
			if err := iStorage.Delete(file.StorageKey); err != nil {
				log.Error("failed to delete file from storage: ", err)
				return model.NewInternalServerError("failed to delete file from storage")
			}
			_ = dao.AddStorageUsage(*file.StorageID, -file.Size)
		}
	}

	if err := dao.DeleteFile(fid); err != nil {
		log.Error("failed to delete file from db: ", err)
		return model.NewInternalServerError("failed to delete file from db")
	}

	return nil
}

func UpdateFile(uid uint, fid string, filename string, description string) (*model.FileView, error) {
	file, err := dao.GetFile(fid)
	if err != nil {
		log.Error("failed to get file: ", err)
		return nil, model.NewNotFoundError("file not found")
	}

	isAdmin, err := CheckUserIsAdmin(uid)
	if err != nil {
		log.Error("failed to check user permission: ", err)
		return nil, model.NewInternalServerError("failed to check user permission")
	}

	if !isAdmin && file.UserID != uid {
		return nil, model.NewUnAuthorizedError("user cannot update file")
	}

	file, err = dao.UpdateFile(fid, filename, description)
	if err != nil {
		log.Error("failed to update file in db: ", err)
		return nil, model.NewInternalServerError("failed to update file in db")
	}
	return file.ToView(), nil
}

func GetFile(fid string) (*model.FileView, error) {
	file, err := dao.GetFile(fid)
	if err != nil {
		log.Error("failed to get file: ", err)
		return nil, model.NewNotFoundError("file not found")
	}

	return file.ToView(), nil
}

// DownloadFile handles the file download request. Return a presigned URL or a direct file path.
func DownloadFile(fid, cfToken string, isRealUser bool) (string, string, error) {
	file, err := dao.GetFile(fid)
	if err != nil {
		log.Error("failed to get file: ", err)
		return "", "", model.NewNotFoundError("file not found")
	}
	if file.StorageKey == storageKeyUnavailable {
		return "", "", model.NewRequestError("file is not available, please try again later")
	}

	passed, err := verifyCfToken(cfToken)
	if err != nil {
		log.Error("failed to verify cf token: ", err)
		return "", "", model.NewRequestError("failed to verify cf token")
	}
	if !passed && file.Size > MinUnrequireVerifyFileSize {
		log.Info("cf token verification failed")
		return "", "", model.NewRequestError("cf token verification failed")
	}

	if file.StorageID == nil {
		if file.RedirectUrl != "" {
			err := dao.AddResourceDownloadCount(file.ResourceID)
			if err != nil {
				log.Errorf("failed to add resource download count: %v", err)
			}
			return file.RedirectUrl, file.Filename, nil
		}
		return "", "", model.NewRequestError("file is not available")
	}

	iStorage := storage.NewStorage(file.Storage)
	if iStorage == nil {
		log.Error("failed to find storage: ", err)
		return "", "", model.NewInternalServerError("failed to find storage")
	}

	if file.StorageKey == "" {
		return "", "", model.NewRequestError("file is not available, please try again later")
	}

	path, err := iStorage.Download(file.StorageKey, file.Filename)
	if err != nil {
		log.Error("failed to download file from storage: ", err)
		return "", "", model.NewInternalServerError("failed to download file from storage")
	}

	if isRealUser {
		err = dao.AddResourceDownloadCount(file.ResourceID)
		if err != nil {
			log.Errorf("failed to add resource download count: %v", err)
		}
	}

	return path, file.Filename, nil
}

func testFileUrl(url string) (int64, error) {
	client := http.Client{Timeout: 10 * time.Second}

	// Try HEAD request first, fallback to GET
	for _, method := range []string{"HEAD", "GET"} {
		req, err := http.NewRequest(method, url, nil)
		if err != nil {
			return 0, model.NewRequestError("failed to create HTTP request")
		}

		resp, err := client.Do(req)
		if err != nil {
			if method == "GET" {
				return 0, model.NewRequestError("failed to send HTTP request")
			}
			continue // Try GET if HEAD fails
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			if method == "GET" {
				return 0, model.NewRequestError("URL is not accessible, status code: " + resp.Status)
			}
			continue // Try GET if HEAD fails
		}

		contentLengthStr := resp.Header.Get("Content-Length")
		if contentLengthStr == "" {
			if method == "GET" {
				return 0, model.NewRequestError("URL does not provide content length")
			}
			continue // Try GET if HEAD doesn't provide Content-Length
		}

		contentLength, err := strconv.ParseInt(contentLengthStr, 10, 64)
		if err != nil || contentLength <= 0 {
			if method == "GET" {
				return 0, model.NewRequestError("Content-Length is not valid")
			}
			continue // Try GET if HEAD has invalid Content-Length
		}

		return contentLength, nil
	}

	return 0, model.NewRequestError("failed to get valid content length")
}

// downloadFile return nil if the download is successful or the context is cancelled
func downloadFile(ctx context.Context, url string, path string) (string, error) {
	if _, err := os.Stat(path); err == nil {
		_ = os.Remove(path) // Remove the file if it already exists
	}
	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return "", model.NewRequestError("failed to create HTTP request")
	}
	client := http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		// Check if the error is due to context cancellation
		if ctx.Err() != nil {
			return "", nil
		}
		return "", model.NewRequestError("failed to send HTTP request")
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return "", model.NewRequestError("URL is not accessible, status code: " + resp.Status)
	}
	file, err := os.OpenFile(path, os.O_CREATE|os.O_WRONLY, os.ModePerm)
	if err != nil {
		return "", model.NewInternalServerError("failed to open file for writing")
	}
	defer file.Close()
	writer := bufio.NewWriter(file)

	h := md5.New()

	buf := make([]byte, 64*1024)
	for {
		select {
		case <-ctx.Done():
			return "", nil
		default:
			n, readErr := resp.Body.Read(buf)
			if n > 0 {
				if _, writeErr := writer.Write(buf[:n]); writeErr != nil {
					return "", model.NewInternalServerError("failed to write to file")
				}
				h.Write(buf[:n])
			}
			if readErr != nil {
				if readErr == io.EOF {
					if err := writer.Flush(); err != nil {
						return "", model.NewInternalServerError("failed to flush writer")
					}
					md5Sum := hex.EncodeToString(h.Sum(nil))
					return md5Sum, nil // Download completed successfully
				}
				if ctx.Err() != nil {
					return "", nil // Context cancelled, return nil
				}
				return "", model.NewInternalServerError("failed to read response body")
			}
		}
	}
}

func CreateServerDownloadTask(uid uint, url, filename, description string, resourceID, storageID uint) (*model.FileView, error) {
	canUpload, err := checkUserCanUpload(uid)
	if err != nil {
		log.Error("failed to check user permission: ", err)
		return nil, model.NewInternalServerError("failed to check user permission")
	}
	if !canUpload {
		return nil, model.NewUnAuthorizedError("user cannot upload file")
	}

	contentLength, err := testFileUrl(url)
	if err != nil {
		log.Error("failed to test file URL: ", err)
		return nil, model.NewRequestError("failed to test file URL: " + err.Error())
	}

	if contentLength+getUploadingSize() > config.MaxUploadingSize() {
		log.Info("A new downloading file is rejected due to max uploading size limit")
		return nil, model.NewRequestError("server is busy, please try again later")
	}

	file, err := dao.CreateFile(filename, description, resourceID, &storageID, storageKeyUnavailable, "", 0, uid, "")
	if err != nil {
		log.Error("failed to create file in db: ", err)
		return nil, model.NewInternalServerError("failed to create file in db")
	}

	updateUploadingSize(contentLength)

	go func() {
		ctx, cancel := context.WithCancel(context.Background())

		done := atomic.Bool{}

		go func() {
			for {
				time.Sleep(10 * time.Second)
				if done.Load() {
					return
				}
				// Stop the task if the file is deleted
				if _, err := dao.GetFileByID(file.ID); err != nil {
					log.Info("File deleted by user, stopping download task: ", file.UUID)
					done.Store(true)
					cancel()
					return
				}
			}
		}()

		defer func() {
			done.Store(true)
		}()

		defer func() {
			updateUploadingSize(-contentLength)
		}()

		tempDir := filepath.Join(utils.GetStoragePath(), "temp")
		if err := os.MkdirAll(tempDir, os.ModePerm); err != nil {
			log.Error("failed to create temp dir: ", err)
			_ = dao.DeleteFile(file.UUID)
			return
		}

		tempPath := filepath.Join(utils.GetStoragePath(), "temp", uuid.NewString())
		defer func() {
			if err := os.Remove(tempPath); err != nil {
				log.Error("failed to remove temp file: ", err)
			}
		}()

		hash := ""

		for i := range 3 {
			if done.Load() {
				return
			}
			hash, err = downloadFile(ctx, url, tempPath)
			if err != nil {
				log.Error("failed to download file: ", err)
				if i == 2 {
					_ = dao.DeleteFile(file.UUID)
					log.Error("Failed to download file after retries, deleting file record: ", file.UUID)
					return
				}
				log.Info("Retrying download... Attempt: ", i+1)
				time.Sleep(2 * time.Second) // Wait before retrying
				continue
			} else {
				log.Info("File downloaded successfully: ", tempPath)
				break
			}
		}

		if done.Load() {
			return
		}

		stat, err := os.Stat(tempPath)
		if err != nil {
			log.Error("failed to get temp file info: ", err)
			_ = dao.DeleteFile(file.UUID)
			_ = os.Remove(tempPath)
			return
		}
		size := stat.Size()
		if size == 0 {
			log.Error("downloaded file is empty")
			_ = dao.DeleteFile(file.UUID)
			_ = os.Remove(tempPath)
			return
		}
		if size != contentLength {
			log.Error("downloaded file size does not match expected size: ", size, " != ", contentLength)
			_ = dao.DeleteFile(file.UUID)
			_ = os.Remove(tempPath)
			return
		}
		s, err := dao.GetStorage(storageID)
		if err != nil {
			log.Error("failed to get storage: ", err)
			_ = dao.DeleteFile(file.UUID)
			_ = os.Remove(tempPath)
			return
		}
		iStorage := storage.NewStorage(s)
		if iStorage == nil {
			log.Error("failed to find storage: ", err)
			_ = dao.DeleteFile(file.UUID)
			_ = os.Remove(tempPath)
			return
		}
		storageKey, err := iStorage.Upload(tempPath, filename)
		if err != nil {
			log.Error("failed to upload file to storage: ", err)
			_ = dao.DeleteFile(file.UUID)
			_ = os.Remove(tempPath)
			return
		}
		if err := dao.SetFileStorageKeyAndSize(file.UUID, storageKey, size, hash); err != nil {
			log.Error("failed to set file storage key: ", err)
			_ = dao.DeleteFile(file.UUID)
			_ = iStorage.Delete(storageKey)
			_ = os.Remove(tempPath)
			return
		}
		if err := dao.AddStorageUsage(storageID, size); err != nil {
			log.Error("failed to add storage usage: ", err)
			_ = dao.DeleteFile(file.UUID)
			_ = iStorage.Delete(storageKey)
			_ = os.Remove(tempPath)
			return
		}
	}()

	return file.ToView(), nil
}

func ListUserFiles(username string, page int) ([]*model.FileView, int, error) {
	user, err := dao.GetUserByUsername(username)
	if err != nil {
		log.Error("failed to get user by username: ", err)
		return nil, 0, model.NewNotFoundError("user not found")
	}
	uid := user.ID
	files, total, err := dao.ListUserFiles(uid, page, pageSize)
	if err != nil {
		log.Error("failed to list user files: ", err)
		return nil, 0, model.NewInternalServerError("failed to list user files")
	}

	fileViews := make([]*model.FileView, len(files))
	for i, file := range files {
		fileViews[i] = file.ToViewWithResource()
	}

	totalPages := (total + pageSize - 1) / pageSize

	return fileViews, int(totalPages), nil
}
