package dao

import (
	"errors"
	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
	"nysoure/server/model"
	"time"
)

func CreateUploadingFile(filename string, description string, fileSize int64, blockSize int64, tempPath string, resourceID, storageID, userID uint) (*model.UploadingFile, error) {
	blocksCount := (fileSize + blockSize - 1) / blockSize
	uf := &model.UploadingFile{
		Filename:         filename,
		Description:      description,
		TotalSize:        fileSize,
		BlockSize:        blockSize,
		TempPath:         tempPath,
		Blocks:           make([]bool, blocksCount),
		TargetResourceID: resourceID,
		TargetStorageID:  storageID,
		UserID:           userID,
	}
	if err := db.Create(uf).Error; err != nil {
		return nil, err
	}
	return uf, nil
}

func GetUploadingFile(id uint) (*model.UploadingFile, error) {
	uf := &model.UploadingFile{}
	if err := db.Where("id = ?", id).First(uf).Error; err != nil {
		return nil, err
	}
	return uf, nil
}

func UpdateUploadingBlock(id uint, blockIndex int) error {
	return db.Transaction(func(tx *gorm.DB) error {
		// 使用 FOR UPDATE 锁获取记录
		uf := &model.UploadingFile{}
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Where("id = ?", id).First(uf).Error; err != nil {
			return err
		}

		if blockIndex < 0 || blockIndex >= uf.BlocksCount() {
			return nil
		}

		uf.Blocks[blockIndex] = true

		// 在事务中立即保存更改
		return tx.Save(uf).Error
	})
}

func DeleteUploadingFile(id uint) error {
	uf := &model.UploadingFile{}
	if err := db.Where("id = ?", id).First(uf).Error; err != nil {
		return err
	}
	if err := db.Delete(uf).Error; err != nil {
		return err
	}
	return nil
}

func GetUploadingFilesOlderThan(time time.Time) ([]model.UploadingFile, error) {
	var files []model.UploadingFile
	if err := db.Where("updated_at < ?", time).Find(&files).Error; err != nil {
		return nil, err
	}
	return files, nil
}

func CreateFile(filename string, description string, resourceID uint, storageID *uint, storageKey string, redirectUrl string, size int64) (*model.File, error) {
	if storageID == nil && redirectUrl == "" {
		return nil, errors.New("storageID and redirectUrl cannot be both empty")
	}
	f := &model.File{
		UUID:        uuid.NewString(),
		Filename:    filename,
		Description: description,
		ResourceID:  resourceID,
		StorageID:   storageID,
		RedirectUrl: redirectUrl,
		StorageKey:  storageKey,
		Size:        size,
	}
	if err := db.Create(f).Error; err != nil {
		return nil, err
	}
	return f, nil
}

func GetFile(id string) (*model.File, error) {
	f := &model.File{}
	if err := db.Preload("Storage").Where("uuid = ?", id).First(f).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, model.NewNotFoundError("file not found")
		}
		return nil, err
	}
	return f, nil
}

func DeleteFile(id string) error {
	f := &model.File{}
	if err := db.Where("uuid = ?", id).First(f).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return model.NewNotFoundError("file not found")
		}
		return err
	}
	if err := db.Delete(f).Error; err != nil {
		return err
	}
	return nil
}

func UpdateFile(id string, filename string, description string) (*model.File, error) {
	f := &model.File{}
	if err := db.Where("uuid = ?", id).First(f).Error; err != nil {
		return nil, err
	}
	if filename != "" {
		f.Filename = filename
	}
	if description != "" {
		f.Description = description
	}
	if err := db.Save(f).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, model.NewNotFoundError("file not found")
		}
		return nil, err
	}
	return f, nil
}

func SetFileStorageKey(id string, storageKey string) error {
	f := &model.File{}
	if err := db.Where("uuid = ?", id).First(f).Error; err != nil {
		return err
	}
	f.StorageKey = storageKey
	if err := db.Save(f).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return model.NewNotFoundError("file not found")
		}
		return err
	}
	return nil
}
