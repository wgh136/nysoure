package service

import (
	"crypto/sha1"
	"encoding/hex"
	"nysoure/server/config"
	"nysoure/server/dao"
	"nysoure/server/model"
	"nysoure/server/storage"
	"nysoure/server/utils"
	"os"
	"path/filepath"
	"strconv"
	"sync"
	"time"

	"github.com/gofiber/fiber/v3/log"
	"github.com/google/uuid"
)

const (
	blockSize = 4 * 1024 * 1024 // 4MB
)

var (
	ipDownloads = sync.Map{}
)

func init() {
	go func() {
		for {
			// Clean up old IP download records every 24 hours
			time.Sleep(24 * time.Hour)
			ipDownloads.Range(func(key, value interface{}) bool {
				ipDownloads.Delete(key)
				return true
			})
		}
	}()
}

func getUploadingSize() int64 {
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

func CreateUploadingFile(uid uint, filename string, description string, fileSize int64, resourceID, storageID uint, sha1Str string) (*model.UploadingFileView, error) {
	if filename == "" {
		return nil, model.NewRequestError("filename is empty")
	}
	if sha1Str == "" {
		return nil, model.NewRequestError("sha1 is empty")
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
		return nil, model.NewUnAuthorizedError("user cannot upload file")
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
	uploadingFile, err := dao.CreateUploadingFile(filename, description, fileSize, blockSize, tempPath, resourceID, storageID, uid, sha1Str)
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

	h := sha1.New()

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
	if sumStr != uploadingFile.Sha1 {
		_ = os.Remove(resultFilePath)
		return nil, model.NewRequestError("sha1 checksum is not correct")
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

	dbFile, err := dao.CreateFile(uploadingFile.Filename, uploadingFile.Description, uploadingFile.TargetResourceID, &uploadingFile.TargetStorageID, "", "", uploadingFile.TotalSize, uid)
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
	if !canUpload {
		return nil, model.NewUnAuthorizedError("user cannot upload file")
	}

	file, err := dao.CreateFile(filename, description, resourceID, nil, "", redirectUrl, 0, uid)
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

func DownloadFile(ip, fid, cfToken string) (string, string, error) {
	passed, err := verifyCfToken(cfToken)
	if err != nil {
		log.Error("failed to verify cf token: ", err)
		return "", "", model.NewRequestError("failed to verify cf token")
	}
	if !passed {
		log.Info("cf token verification failed")
		return "", "", model.NewRequestError("cf token verification failed")
	}
	log.Info("File download request from: " + ip)
	downloads, _ := ipDownloads.Load(ip)
	if downloads == nil {
		ipDownloads.Store(ip, 1)
	} else {
		count := downloads.(int)
		if count >= config.MaxDownloadsPerDayForSingleIP() {
			return "", "", model.NewRequestError("Too many requests, please try again later")
		}
		ipDownloads.Store(ip, count+1)
	}
	file, err := dao.GetFile(fid)
	if err != nil {
		log.Error("failed to get file: ", err)
		return "", "", model.NewNotFoundError("file not found")
	}

	if file.StorageID == nil {
		if file.RedirectUrl != "" {
			_ = dao.AddResourceDownloadCount(file.ResourceID)
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

	_ = dao.AddResourceDownloadCount(file.ResourceID)

	return path, file.Filename, err
}
