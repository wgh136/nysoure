package utils

import (
	"crypto/rand"
	"errors"
	"os"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

var (
	key []byte
)

func init() {
	secretFilePath := GetStoragePath() + "/jwt_secret.key"
	secret, err := os.ReadFile(secretFilePath)
	if err == nil {
		key = secret
	} else {
		// Initialize the key with a random value
		key = make([]byte, 32)
		_, err := rand.Read(key)
		if err != nil {
			panic("Failed to generate random key: " + err.Error())
		}
		_ = os.WriteFile(secretFilePath, key, 0644)
	}
}

func GenerateToken(userID uint) (string, error) {
	t := jwt.NewWithClaims(jwt.SigningMethodHS256,
		jwt.MapClaims{
			"id":  userID,
			"exp": time.Now().Add(7 * 24 * time.Hour).Unix(),
		})
	s, err := t.SignedString(key)
	if err != nil {
		return "", err
	}
	return s, nil
}

func ParseToken(token string) (uint, error) {
	t, err := jwt.Parse(token, func(t *jwt.Token) (interface{}, error) {
		return key, nil
	})
	if err != nil {
		return 0, err
	}
	if claims, ok := t.Claims.(jwt.MapClaims); ok && t.Valid {
		id := uint(claims["id"].(float64))
		expF := claims["exp"].(float64)
		exp := time.Unix(int64(expF), 0)
		if time.Now().After(exp) {
			return 0, errors.New("token expired")
		}
		return id, nil
	}
	return 0, errors.New("invalid token")
}

// GenerateTemporaryToken creates a JWT token that expires in 15 minutes
func GenerateTemporaryToken(data string) (string, error) {
	t := jwt.NewWithClaims(jwt.SigningMethodHS256,
		jwt.MapClaims{
			"data": data,
			"exp":  time.Now().Add(15 * time.Minute).Unix(),
		})
	s, err := t.SignedString(key)
	if err != nil {
		return "", err
	}
	return s, nil
}

// ParseTemporaryToken parses a JWT token and returns the data if valid
func ParseTemporaryToken(token string) (string, error) {
	t, err := jwt.Parse(token, func(t *jwt.Token) (interface{}, error) {
		return key, nil
	})
	if err != nil {
		return "", err
	}
	if claims, ok := t.Claims.(jwt.MapClaims); ok && t.Valid {
		data := claims["data"].(string)
		expF := claims["exp"].(float64)
		exp := time.Unix(int64(expF), 0)
		if time.Now().After(exp) {
			return "", errors.New("token expired")
		}
		return data, nil
	}
	return "", errors.New("invalid token")
}

func GenerateDownloadToken(fileKey string) (string, error) {
	secretKeyStr := os.Getenv("DOWNLOAD_SECRET_KEY")
	var secretKey []byte
	if secretKeyStr == "" {
		secretKey = key
	} else {
		secretKey = []byte(secretKeyStr)
	}

	t := jwt.NewWithClaims(jwt.SigningMethodHS256,
		jwt.MapClaims{
			"fileKey": fileKey,
			"exp":     time.Now().Add(1 * time.Hour).Unix(),
		})
	s, err := t.SignedString(secretKey)
	if err != nil {
		return "", err
	}
	return s, nil
}
