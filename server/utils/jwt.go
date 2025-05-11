package utils

import (
	"errors"
	"github.com/golang-jwt/jwt/v5"
	"math/rand"
	"os"
	"time"
)

var (
	key []byte
)

func init() {
	secretFilePath := GetStoragePath() + "/jwt_secret.key"
	secret, err := os.ReadFile(secretFilePath)
	if err != nil {
		key = secret
	} else {
		// Initialize the key with a random value
		chars := []rune("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789")
		key = make([]byte, 32)
		for i := range key {
			r := rand.Intn(len(chars))
			key[i] = byte(chars[r])
		}
		err = os.WriteFile(secretFilePath, key, 0644)
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
