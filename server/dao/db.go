package dao

import (
	"nysoure/server/model"
	"os"
	"time"

	"gorm.io/driver/mysql"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

var db *gorm.DB

var (
	ready = false
)

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
		retrys := 5
		for {
			db, err = gorm.Open(mysql.Open(dsn), &gorm.Config{})
			if err == nil {
				ready = true
				break
			}
			retrys--
			if retrys < 0 {
				panic("failed to connect database: " + err.Error())
			}
			time.Sleep(1 * time.Second)
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
		&model.Collection{},
		&model.CollectionResource{},
		&model.Charactor{},
	)
}

func GetDB() *gorm.DB {
	return db
}

func IsReady() bool {
	return ready
}

func Close() error {
	sqlDB, err := db.DB()
	if err != nil {
		return err
	}
	return sqlDB.Close()
}
