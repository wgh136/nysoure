package service

import (
	"github.com/gofiber/fiber/v3/log"
	"github.com/google/uuid"
	"nysoure/server/dao"
	"nysoure/server/model"
	"nysoure/server/storage"
	"nysoure/server/utils"
	"os"
	"path/filepath"
	"strconv"
	"time"
)

const (
	blockSize = 4 * 1024 * 1024 // 4MB
)

var (
	maxUploadingSize = int64(1024 * 1024 * 1024 * 20) // TODO: make this configurable
	maxFileSize      = int64(1024 * 1024 * 1024 * 8)  // TODO: make this configurable
)

func getUploadingSize(uid uint) int64 {
	return dao.GetStatistic("uploading_size")
}

func updateUploadingSize(offset int64) {
	c := dao.GetStatistic("uploading_size")
	c += offset
	_ = dao.SetStatistic("uploading_size", c)
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
	canUpload, err := checkUserCanUpload(uid)
	if err != nil {
		log.Error("failed to check user permission: ", err)
		return nil, model.NewInternalServerError("failed to check user permission")
	}
	if !canUpload {
		return nil, model.NewUnAuthorizedError("user cannot upload file")
	}

	if fileSize > maxFileSize {
		return nil, model.NewRequestError("file size exceeds the limit")
	}

	currentUploadingSize := getUploadingSize(uid)
	if currentUploadingSize+fileSize > maxUploadingSize {
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
	if uploadingFile.Blocks[index] {
		return model.NewRequestError("block already uploaded")
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

func FinishUploadingFile(uid uint, fid uint) (*model.FileView, error) {
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

	for i := 0; i < uploadingFile.BlocksCount(); i++ {
		blockPath := filepath.Join(uploadingFile.TempPath, strconv.Itoa(i))
		data, err := os.ReadFile(blockPath)
		if err != nil {
			log.Error("failed to read block file: ", err)
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

	dbFile, err := dao.CreateFile(uploadingFile.Filename, uploadingFile.Description, uploadingFile.TargetResourceID, &uploadingFile.TargetStorageID, "", "")
	if err != nil {
		log.Error("failed to create file in db: ", err)
		_ = os.Remove(resultFilePath)
		return nil, model.NewInternalServerError("failed to finish uploading file. please re-upload")
	}

	go func() {
		defer func() {
			_ = os.Remove(resultFilePath)
		}()
		storageKey, err := iStorage.Upload(resultFilePath)
		if err != nil {
			log.Error("failed to upload file to storage: ", err)
		} else {
			err = dao.SetFileStorageKey(dbFile.ID, storageKey)
			if err != nil {
				_ = iStorage.Delete(storageKey)
				_ = dao.DeleteFile(dbFile.ID)
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
	if !canUpload {
		return nil, model.NewUnAuthorizedError("user cannot upload file")
	}

	file, err := dao.CreateFile(filename, description, resourceID, nil, "", redirectUrl)
	if err != nil {
		log.Error("failed to create file in db: ", err)
		return nil, model.NewInternalServerError("failed to create file in db")
	}
	return file.ToView(), nil
}

func DeleteFile(uid uint, fid uint) error {
	file, err := dao.GetFile(fid)
	if err != nil {
		log.Error("failed to get file: ", err)
		return model.NewNotFoundError("file not found")
	}

	isAdmin, err := checkUserIsAdmin(uid)
	if err != nil {
		log.Error("failed to check user permission: ", err)
		return model.NewInternalServerError("failed to check user permission")
	}

	if !isAdmin && file.UserID != uid {
		return model.NewUnAuthorizedError("user cannot delete file")
	}

	iStorage := storage.NewStorage(file.Storage)
	if iStorage == nil {
		log.Error("failed to find storage: ", err)
		return model.NewInternalServerError("failed to find storage")
	}

	if err := iStorage.Delete(file.StorageKey); err != nil {
		log.Error("failed to delete file from storage: ", err)
		return model.NewInternalServerError("failed to delete file from storage")
	}

	if err := dao.DeleteFile(fid); err != nil {
		log.Error("failed to delete file from db: ", err)
		return model.NewInternalServerError("failed to delete file from db")
	}

	return nil
}

func UpdateFile(uid uint, fid uint, filename string, description string) (*model.FileView, error) {
	file, err := dao.GetFile(fid)
	if err != nil {
		log.Error("failed to get file: ", err)
		return nil, model.NewNotFoundError("file not found")
	}

	isAdmin, err := checkUserIsAdmin(uid)
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

func GetFile(fid uint) (*model.FileView, error) {
	file, err := dao.GetFile(fid)
	if err != nil {
		log.Error("failed to get file: ", err)
		return nil, model.NewNotFoundError("file not found")
	}

	return file.ToView(), nil
}

func DownloadFile(fid uint) (string, string, error) {
	file, err := dao.GetFile(fid)
	if err != nil {
		log.Error("failed to get file: ", err)
		return "", "", model.NewNotFoundError("file not found")
	}

	if file.StorageID == nil {
		if file.RedirectUrl != "" {
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

	path, err := iStorage.Download(file.StorageKey)

	return path, file.Filename, err
}
