package service

import (
	"bytes"
	"encoding/json"
	"net/http"
	"nysoure/server/config"
	"nysoure/server/dao"
)

func checkUserCanUpload(uid uint) (bool, error) {
	user, err := dao.GetUserByID(uid)
	if err != nil {
		return false, err
	}
	return user.IsAdmin || user.CanUpload, nil
}

func CheckUserIsAdmin(uid uint) (bool, error) {
	user, err := dao.GetUserByID(uid)
	if err != nil {
		return false, err
	}
	return user.IsAdmin, nil
}

func verifyCfToken(cfToken string) (bool, error) {
	if config.CloudflareTurnstileSecretKey() == "" {
		return true, nil
	}
	client := &http.Client{}
	data, _ := json.Marshal(map[string]string{
		"secret":   config.CloudflareTurnstileSecretKey(),
		"response": cfToken,
	})
	reader := bytes.NewReader(data)
	resp, err := client.Post("https://challenges.cloudflare.com/turnstile/v0/siteverify", "application/json", reader)
	if err != nil {
		return false, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return false, nil
	}
	var result map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return false, err
	}
	if result["success"] == nil {
		return false, nil
	}
	if result["success"].(bool) {
		return true, nil
	} else {
		return false, nil
	}
}
