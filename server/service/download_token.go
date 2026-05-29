package service

import (
	"crypto/sha256"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"nysoure/server/cache"
	"nysoure/server/dao"
	"nysoure/server/model"
	"nysoure/server/utils"

	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/log"
)

const (
	temporaryDownloadTokenType      = "download_access"
	maxTemporaryDownloadTokenPerDay = 3
	temporaryDownloadTokenTTL       = 5 * time.Minute
)

var temporaryDownloadTokenLimiter = utils.NewRequestLimiter(func() int {
	return maxTemporaryDownloadTokenPerDay
}, 24*time.Hour)

var temporaryDownloadTokenSetNX = func(key string, expiration time.Duration) (bool, error) {
	return cache.SetNX(key, "1", expiration)
}

type temporaryDownloadTokenPayload struct {
	Type   string `json:"type"`
	FileID string `json:"file_id"`
	Random string `json:"random"`
}

func requiresDownloadVerification(file *model.File) bool {
	return file.Size > MinUnrequireVerifyFileSize && file.RedirectUrl == ""
}

func CreateTemporaryDownloadToken(fid string, clientIP string, isDevAccess bool) (string, error) {
	file, err := dao.GetFile(fid)
	if err != nil {
		log.Error("failed to get file: ", err)
		return "", model.NewNotFoundError("file not found")
	}
	if file.StorageKey == storageKeyUnavailable {
		return "", model.NewRequestError("file is not available, please try again later")
	}
	if !requiresDownloadVerification(file) {
		return "", model.NewRequestError("download verification is not required")
	}
	if !isDevAccess && !temporaryDownloadTokenLimiter.AllowRequest(clientIP) {
		return "", fiber.NewError(fiber.StatusTooManyRequests, "Too many requests")
	}

	payload, err := json.Marshal(temporaryDownloadTokenPayload{
		Type:   temporaryDownloadTokenType,
		FileID: file.UUID,
	})
	if err != nil {
		return "", model.NewInternalServerError("Failed to generate download token")
	}

	token, err := utils.GenerateTemporaryTokenWithExpiration(string(payload), temporaryDownloadTokenTTL)
	if err != nil {
		return "", model.NewInternalServerError("Failed to generate download token")
	}

	return token, nil
}

func temporaryDownloadTokenKey(token string) string {
	sum := sha256.Sum256([]byte(token))
	return fmt.Sprintf("download_token:used:%x", sum[:])
}

func consumeTemporaryDownloadToken(token string) error {
	key := temporaryDownloadTokenKey(token)
	created, err := temporaryDownloadTokenSetNX(key, temporaryDownloadTokenTTL)
	if err != nil {
		return fmt.Errorf("failed to persist temporary download token usage: %w", err)
	}
	if !created {
		return errors.New("temporary download token already used")
	}
	return nil
}

func VerifyTemporaryDownloadToken(token string, fid string) (bool, error) {
	data, err := utils.ParseTemporaryToken(token)
	if err != nil {
		return false, err
	}

	var payload temporaryDownloadTokenPayload
	if err := json.Unmarshal([]byte(data), &payload); err != nil {
		return false, err
	}
	if payload.Type != temporaryDownloadTokenType {
		return false, errors.New("invalid temporary download token type")
	}
	if payload.FileID != fid {
		return false, errors.New("temporary download token does not match file")
	}
	if err := consumeTemporaryDownloadToken(token); err != nil {
		return false, err
	}

	return true, nil
}
