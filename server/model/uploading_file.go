package model

import (
	"context"
	"reflect"

	"gorm.io/gorm"
	"gorm.io/gorm/schema"
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
	Blocks           []bool `gorm:"type:blob;serializer:blocks"`
	TempPath         string
	Resource         Resource `gorm:"foreignKey:TargetResourceID"`
	Storage          Storage  `gorm:"foreignKey:TargetStorageID"`
	Sha1             string
}

func (uf *UploadingFile) BlocksCount() int {
	return int((uf.TotalSize + uf.BlockSize - 1) / uf.BlockSize)
}

type BoolListSerializer struct{}

func (BoolListSerializer) Scan(ctx context.Context, field *schema.Field, dst reflect.Value, dbValue interface{}) (err error) {
	fieldValue := reflect.New(field.FieldType)

	if dbValue == nil {
		fieldValue.Set(reflect.Zero(field.FieldType))
	} else if b, ok := dbValue.([]byte); ok {
		data := make([]bool, len(b)*8)
		for i := 0; i < len(b); i++ {
			for j := 0; j < 8; j++ {
				data[i*8+j] = (b[i] & (1 << j)) != 0
			}
		}
		i := fieldValue.Interface()
		d, ok := i.(*[]bool)
		if !ok {
			panic("failed to convert to *[]bool")
		}
		*d = data
	} else {
		return gorm.ErrInvalidValue
	}

	field.ReflectValueOf(ctx, dst).Set(fieldValue.Elem())
	return nil
}

func (BoolListSerializer) Value(ctx context.Context, field *schema.Field, dst reflect.Value, fieldValue interface{}) (interface{}, error) {
	if fieldValue == nil {
		return nil, nil
	}
	if data, ok := fieldValue.([]bool); ok {
		b := make([]byte, (len(data)+7)/8)
		for i := 0; i < len(data); i++ {
			if data[i] {
				b[i/8] |= 1 << (i % 8)
			}
		}
		return b, nil
	}
	return nil, gorm.ErrInvalidValue
}

func init() {
	// Register the custom serializer for the Blocks field
	schema.RegisterSerializer("blocks", BoolListSerializer{})
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
	Sha1        string `json:"sha1"`
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
		Sha1:        uf.Sha1,
	}
}
