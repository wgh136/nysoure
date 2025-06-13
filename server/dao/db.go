package dao

import (
	"gorm.io/driver/mysql"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"nysoure/server/model"
	"os"
	"time"
)

var db *gorm.DB

func init() {
	if os.Getenv("DB_PORT") != "" {
		host := os.Getenv("DB_HOST")
		port := os.Getenv("DB_PORT")
		user := os.Getenv("DB_USER")
		password := os.Getenv("DB_PASSWORD")
		dbName := os.Getenv("DB_NAME")
		dsn := user + ":" + password + "@tcp(" + host + ":" + port + ")/" + dbName + "?charset=utf8mb4&parseTime=True&loc=Local"
		var err error
		// wait for mysql to be ready
		time.Sleep(5 * time.Second)
		db, err = gorm.Open(mysql.Open(dsn), &gorm.Config{})
		if err != nil {
			panic("failed to connect database")
		}
	} else {
		var err error
		db, err = gorm.Open(sqlite.Open("test.db"), &gorm.Config{})
		if err != nil {
			panic("failed to connect database")
		}
	}

	_ = db.AutoMigrate(
		&model.User{},
		&model.Resource{},
		&model.Image{},
		&model.Tag{},
		&model.Storage{},
		&model.File{},
		&model.UploadingFile{},
		&model.Statistic{},
		&model.Comment{},
		&model.Activity{},
	)
}

func GetDB() *gorm.DB {
	return db
}
