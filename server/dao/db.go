package dao

import (
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"nysoure/server/model"
)

var db *gorm.DB

func init() {
	var err error
	db, err = gorm.Open(sqlite.Open("test.db"), &gorm.Config{})
	if err != nil {
		panic("failed to connect database")
	}

	_ = db.AutoMigrate(&model.User{}, &model.Resource{}, &model.Image{}, &model.Tag{}, &model.Storage{}, &model.File{}, &model.UploadingFile{}, &model.Statistic{})
}

func GetDB() *gorm.DB {
	return db
}
