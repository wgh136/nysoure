package service

import (
	"bytes"
	"errors"
	"github.com/disintegration/imaging"
	"image"
	"math"
	"net/http"
	"nysoure/server/dao"
	"nysoure/server/model"
	"nysoure/server/utils"
	"os"
	"strconv"
	"time"

	"github.com/gofiber/fiber/v3/log"
	"github.com/google/uuid"

	_ "golang.org/x/image/bmp"
	_ "image/gif"
	_ "image/jpeg"
	_ "image/png"

	_ "golang.org/x/image/webp"

	"github.com/chai2010/webp"
)

const (
	resampledMaxPixels = 1280 * 720
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

var (
	imageLimiter = utils.NewRequestLimiter(maxUploadsPerIP, 24*time.Hour)
)

const maxUploadsPerIP = 100

func CreateImage(uid uint, ip string, data []byte) (uint, error) {
	canUpload, err := checkUserCanUpload(uid)
	if err != nil {
		log.Error("Error checking user upload permission:", err)
		return 0, model.NewInternalServerError("Error checking user upload permission")
	}
	if !canUpload {
		// For a normal user, check the IP upload limit
		if !imageLimiter.AllowRequest(ip) {
			return 0, model.NewUnAuthorizedError("You have reached the maximum upload limit")
		}
	}

	if len(data) == 0 {
		return 0, model.NewRequestError("Image data is empty")
	} else if len(data) > 1024*1024*8 {
		return 0, model.NewRequestError("Image data is too large")
	}

	imageDir := utils.GetStoragePath() + "/images/"
	if _, err := os.Stat(imageDir); os.IsNotExist(err) {
		if err := os.MkdirAll(imageDir, 0755); err != nil {
			return 0, err
		}
	}

	contentType := http.DetectContentType(data)
	if contentType != "image/jpeg" && contentType != "image/png" && contentType != "image/gif" && contentType != "image/webp" && contentType != "image/bmp" {
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

	// If the image is still too large after conversion, return an error
	if len(data) > 1024*1024*4 {
		return 0, model.NewRequestError("Image data is too large")
	}
	// Normal user has a smaller upload limit
	if !canUpload && len(data) > 1024*1024*2 {
		return 0, model.NewRequestError("Image data is too large")
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
		return nil, errors.New("failed to read image file")
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

	resampledDir := utils.GetStoragePath() + "/resampled/"
	_ = os.Remove(resampledDir + strconv.Itoa(int(i.ID)) + ".webp")

	if err := dao.DeleteImage(id); err != nil {
		return err
	}
	return nil
}

func GetResampledImage(id uint) ([]byte, error) {
	i, err := dao.GetImageByID(id)
	if err != nil {
		return nil, err
	}

	data, err := getOrCreateResampledImage(i)
	if err != nil {
		log.Error("Error getting or creating resampled image:", err)
		return nil, model.NewInternalServerError("Error processing image")
	}

	return data, nil
}

func getOrCreateResampledImage(i model.Image) ([]byte, error) {
	baseDir := utils.GetStoragePath() + "/resampled/"
	if _, err := os.Stat(baseDir); os.IsNotExist(err) {
		if err := os.MkdirAll(baseDir, 0755); err != nil {
			return nil, err
		}
	}

	resampledFilepath := baseDir + strconv.Itoa(int(i.ID)) + ".webp"
	if _, err := os.Stat(resampledFilepath); err != nil {
		if !os.IsNotExist(err) {
			return nil, err
		}
	} else {
		return os.ReadFile(resampledFilepath)
	}

	originalFilepath := utils.GetStoragePath() + "/images/" + i.FileName
	if _, err := os.Stat(originalFilepath); os.IsNotExist(err) {
		return nil, model.NewNotFoundError("Original image not found")
	}
	imgData, err := os.ReadFile(originalFilepath)
	if err != nil {
		return nil, errors.New("failed to read original image file")
	}
	if i.Width*i.Height <= resampledMaxPixels {
		return imgData, nil
	}

	log.Info("Resampling image", "id", i.ID, "original size", i.Width, "x", i.Height)
	img, _, err := image.Decode(bytes.NewReader(imgData))
	if err != nil {
		return nil, errors.New("failed to decode original image data")
	}
	pixels := img.Bounds().Dx() * img.Bounds().Dy()
	if pixels <= resampledMaxPixels {
		return imgData, nil // No need to resample if the image is small enough
	}

	scale := math.Sqrt(float64(resampledMaxPixels) / float64(pixels))
	dstWidth := int(float64(img.Bounds().Dx()) * scale)
	dstHeight := int(float64(img.Bounds().Dy()) * scale)
	dstImg := imaging.Resize(img, dstWidth, dstHeight, imaging.Lanczos)

	buf := new(bytes.Buffer)
	if err := webp.Encode(buf, dstImg, &webp.Options{Quality: 80}); err != nil {
		return nil, errors.New("failed to encode resampled image data to webp format")
	}
	if err := os.WriteFile(resampledFilepath, buf.Bytes(), 0644); err != nil {
		return nil, errors.New("failed to save resampled image file")
	}

	return buf.Bytes(), nil
}
