package service

import (
	"bytes"
	"errors"
	"github.com/gofiber/fiber/v3/log"
	"github.com/google/uuid"
	"image"
	"net/http"
	"nysoure/server/dao"
	"nysoure/server/model"
	"nysoure/server/utils"
	"os"
	"time"

	_ "image/gif"
	_ "image/jpeg"
	_ "image/png"

	_ "golang.org/x/image/webp"

	"github.com/chai2010/webp"
)

func init() {
	// Start a goroutine to delete unused images every hour
	go func() {
		// Wait for 1 minute to ensure the database is ready
		time.Sleep(time.Minute)
		for {
			images, err := dao.GetUnusedImages()
			if err != nil {
				log.Errorf("Failed to get unused images: %v", err)
			}
			if len(images) > 0 {
				for _, i := range images {
					err := deleteImage(i.ID)
					if err != nil {
						log.Errorf("Failed to delete unused image %d: %v", i.ID, err)
					}
				}
			}
			time.Sleep(time.Hour)
		}
	}()
}

func CreateImage(uid uint, data []byte) (uint, error) {
	canUpload, err := checkUserCanUpload(uid)
	if err != nil {
		log.Error("Error checking user upload permission:", err)
		return 0, model.NewInternalServerError("Error checking user upload permission")
	}
	if !canUpload {
		return 0, model.NewUnAuthorizedError("User cannot upload images")
	}

	if len(data) == 0 {
		return 0, model.NewRequestError("Image data is empty")
	} else if len(data) > 1024*1024*5 {
		return 0, model.NewRequestError("Image data is too large")
	}

	imageDir := utils.GetStoragePath() + "/images/"
	if _, err := os.Stat(imageDir); os.IsNotExist(err) {
		if err := os.MkdirAll(imageDir, 0755); err != nil {
			return 0, err
		}
	}

	contentType := http.DetectContentType(data)
	if contentType != "image/jpeg" && contentType != "image/png" && contentType != "image/gif" && contentType != "image/webp" {
		return 0, model.NewRequestError("Invalid image format")
	}

	// Reformat the image data to webp format if necessary
	img, _, err := image.Decode(bytes.NewReader(data))
	if err != nil {
		return 0, errors.New("failed to decode image data")
	}
	if img.Bounds().Dx() == 0 || img.Bounds().Dy() == 0 {
		return 0, errors.New("invalid image dimensions")
	}
	if contentType != "image/webp" {
		buf := new(bytes.Buffer)
		if err := webp.Encode(buf, img, &webp.Options{Quality: 80}); err != nil {
			return 0, errors.New("failed to encode image data to webp format")
		}
		data = buf.Bytes()
		contentType = "image/webp"
	}

	filename := uuid.New().String()
	if err := os.WriteFile(imageDir+filename, data, 0644); err != nil {
		return 0, errors.New("failed to save image file")
	}

	i, err := dao.CreateImage(filename, img.Bounds().Dx(), img.Bounds().Dy())
	if err != nil {
		_ = os.Remove(imageDir + filename)
		return 0, err
	}

	return i.ID, nil
}

func GetImage(id uint) ([]byte, error) {
	i, err := dao.GetImageByID(id)
	if err != nil {
		return nil, err
	}

	imageDir := utils.GetStoragePath() + "/images/"
	if _, err := os.Stat(imageDir); os.IsNotExist(err) {
		return nil, model.NewNotFoundError("Image not found")
	}
	data, err := os.ReadFile(imageDir + i.FileName)
	if err != nil {
		return nil, errors.New("Failed to read image file")
	}
	return data, nil
}

func DeleteImage(uid, id uint) error {
	canUpload, err := checkUserCanUpload(uid)
	if err != nil {
		log.Error("Error checking user upload permission:", err)
		return model.NewInternalServerError("Error checking user upload permission")
	}
	if !canUpload {
		return model.NewUnAuthorizedError("User cannot upload images")
	}
	err = deleteImage(id)
	if err != nil {
		log.Error("Error deleting image:", err)
		return model.NewInternalServerError("Error deleting image")
	}
	return nil
}

func deleteImage(id uint) error {
	i, err := dao.GetImageByID(id)
	if err != nil {
		return err
	}

	imageDir := utils.GetStoragePath() + "/images/"

	_ = os.Remove(imageDir + i.FileName)

	if err := dao.DeleteImage(id); err != nil {
		return err
	}
	return nil
}
