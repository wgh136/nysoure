package model

import (
	"context"
	"gorm.io/gorm"
	"gorm.io/gorm/schema"
	"reflect"
)

type UploadingFile struct {
	gorm.Model
	Filename         string
	Description      string
	TargetResourceID uint
	TargetStorageID  uint
	UserID           uint
	BlockSize        int64
	TotalSize        int64
	Blocks           UploadingFileBlocks `gorm:"type:blob"`
	TempPath         string
	Resource         Resource `gorm:"foreignKey:TargetResourceID"`
	Storage          Storage  `gorm:"foreignKey:TargetStorageID"`
}

func (uf *UploadingFile) BlocksCount() int {
	return int((uf.TotalSize + uf.BlockSize - 1) / uf.BlockSize)
}

type UploadingFileBlocks []bool

func (ufb *UploadingFileBlocks) Scan(ctx context.Context, field *schema.Field, dst reflect.Value, dbValue interface{}) (err error) {
	data, ok := dbValue.([]byte)
	if !ok {
		return nil
	}
	*ufb = make([]bool, len(data)*8)
	for i, b := range data {
		for j := 0; j < 8; j++ {
			(*ufb)[i*8+j] = (b>>j)&1 == 1
		}
	}
	return nil
}

func (ufb UploadingFileBlocks) Value(ctx context.Context, field *schema.Field, dbValue reflect.Value) (value interface{}, err error) {
	data := make([]byte, (len(ufb)+7)/8)
	for i, b := range ufb {
		if b {
			data[i/8] |= 1 << (i % 8)
		}
	}
	return data, nil
}

type UploadingFileView struct {
	ID          uint   `json:"id"`
	Filename    string `json:"filename"`
	Description string `json:"description"`
	TotalSize   int64  `json:"totalSize"`
	BlockSize   int64  `json:"blockSize"`
	BlocksCount int    `json:"blocksCount"`
	StorageID   uint   `json:"storageId"`
	ResourceID  uint   `json:"resourceId"`
}

func (uf *UploadingFile) ToView() *UploadingFileView {
	return &UploadingFileView{
		ID:          uf.ID,
		Filename:    uf.Filename,
		Description: uf.Description,
		TotalSize:   uf.TotalSize,
		BlockSize:   uf.BlockSize,
		BlocksCount: uf.BlocksCount(),
		StorageID:   uf.TargetStorageID,
		ResourceID:  uf.TargetResourceID,
	}
}
