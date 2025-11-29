package service

import (
	"bytes"
	"errors"
	"image"
	"math"
	"net/http"
	"nysoure/server/dao"
	"nysoure/server/model"
	"nysoure/server/utils"
	"os"
	"strconv"
	"time"

	"github.com/disintegration/imaging"

	"github.com/gofiber/fiber/v3/log"
	"github.com/google/uuid"

	_ "image/gif"
	_ "image/jpeg"
	_ "image/png"

	_ "golang.org/x/image/bmp"

	_ "golang.org/x/image/webp"

	"github.com/chai2010/webp"
)

const (
	resampledMaxPixels = 1280 * 720
	subdirsCount       = 256 // Number of subdirectories (0-255)
)

// getImageSubdir returns the subdirectory name for an image filename
// Uses the first 2 characters of the filename to distribute across 256 subdirs
func getImageSubdir(filename string) string {
	if len(filename) < 2 {
		return "00"
	}
	// Use first 2 hex chars to determine subdir (e.g., "a1b2c3..." -> "a1")
	return filename[:2]
}

// getImagePath returns the full path to an image, checking new subdirectory structure first,
// then falling back to legacy flat structure for backward compatibility
func getImagePath(filename string) string {
	baseDir := utils.GetStoragePath() + "/images/"

	// Try new subdirectory structure first
	subdir := getImageSubdir(filename)
	newPath := baseDir + subdir + "/" + filename
	if _, err := os.Stat(newPath); err == nil {
		return newPath
	}

	// Fall back to legacy flat structure
	legacyPath := baseDir + filename
	return legacyPath
}

// ensureImageSubdir creates the subdirectory for a filename if it doesn't exist
func ensureImageSubdir(filename string) error {
	baseDir := utils.GetStoragePath() + "/images/"
	subdir := getImageSubdir(filename)
	subdirPath := baseDir + subdir

	if _, err := os.Stat(subdirPath); os.IsNotExist(err) {
		if err := os.MkdirAll(subdirPath, 0755); err != nil {
			return err
		}
	}
	return nil
}

// getResampledImagePath returns the full path to a resampled image using subdirectory structure
// Subdirectory is based on image ID modulo 256 (e.g., id=1234 -> subdir="d2" from 1234%256=210=0xd2)
func getResampledImagePath(imageID uint) string {
	baseDir := utils.GetStoragePath() + "/resampled/"
	subdir := strconv.FormatUint(uint64(imageID%subdirsCount), 16)
	if len(subdir) == 1 {
		subdir = "0" + subdir
	}
	return baseDir + subdir + "/" + strconv.Itoa(int(imageID)) + ".webp"
}

// ensureResampledSubdir creates the subdirectory for a resampled image if it doesn't exist
func ensureResampledSubdir(imageID uint) error {
	baseDir := utils.GetStoragePath() + "/resampled/"
	subdir := strconv.FormatUint(uint64(imageID%subdirsCount), 16)
	if len(subdir) == 1 {
		subdir = "0" + subdir
	}
	subdirPath := baseDir + subdir

	if _, err := os.Stat(subdirPath); os.IsNotExist(err) {
		if err := os.MkdirAll(subdirPath, 0755); err != nil {
			return err
		}
	}
	return nil
}

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

func CreateImage(uid uint, ip string, data []byte) (uint, error) {
	canUpload, err := checkUserCanUpload(uid)
	if err != nil {
		log.Error("Error checking user upload permission:", err)
		return 0, model.NewInternalServerError("Error checking user upload permission")
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

	// Create subdirectory for new storage structure
	if err := ensureImageSubdir(filename); err != nil {
		return 0, errors.New("failed to create image subdirectory")
	}

	// Save to new subdirectory structure
	subdir := getImageSubdir(filename)
	filepath := imageDir + subdir + "/" + filename
	if err := os.WriteFile(filepath, data, 0644); err != nil {
		return 0, errors.New("failed to save image file")
	}

	i, err := dao.CreateImage(filename, img.Bounds().Dx(), img.Bounds().Dy())
	if err != nil {
		// Clean up the file if database creation fails
		subdir := getImageSubdir(filename)
		_ = os.Remove(imageDir + subdir + "/" + filename)
		return 0, err
	}

	return i.ID, nil
}

func GetImage(id uint) ([]byte, error) {
	i, err := dao.GetImageByID(id)
	if err != nil {
		return nil, err
	}

	filepath := getImagePath(i.FileName)
	if _, err := os.Stat(filepath); os.IsNotExist(err) {
		return nil, model.NewNotFoundError("Image not found")
	}
	data, err := os.ReadFile(filepath)
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

	// Delete from both potential locations (new subdir and legacy flat)
	filepath := getImagePath(i.FileName)
	_ = os.Remove(filepath)

	// Delete resampled image from subdirectory structure
	resampledPath := getResampledImagePath(i.ID)
	_ = os.Remove(resampledPath)

	if err := dao.DeleteImage(id); err != nil {
		return err
	}
	return nil
}

// GetResampledImage returns a resampled version of the image if it exceeds the maximum pixel limit, otherwise returns nil.
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
	// Check if resampled image already exists
	resampledFilepath := getResampledImagePath(i.ID)
	if _, err := os.Stat(resampledFilepath); err != nil {
		if !os.IsNotExist(err) {
			return nil, err
		}
	} else {
		return os.ReadFile(resampledFilepath)
	}

	originalFilepath := getImagePath(i.FileName)
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

	// Ensure subdirectory exists before saving
	if err := ensureResampledSubdir(i.ID); err != nil {
		return nil, errors.New("failed to create resampled image subdirectory")
	}

	if err := os.WriteFile(resampledFilepath, buf.Bytes(), 0644); err != nil {
		return nil, errors.New("failed to save resampled image file")
	}

	return buf.Bytes(), nil
}
