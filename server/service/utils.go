package service

import (
	"bytes"
	"encoding/json"
	"net/http"
	"nysoure/server/config"
	"nysoure/server/dao"
	"regexp"
	"strconv"
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

func VerifyCfToken(cfToken string) (bool, error) {
	if config.CloudflareTurnstileSecretKey() == "" {
		return true, nil
	}
	if cfToken == "" {
		return false, nil
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

func findImagesInContent(content string, host string) []uint {
	// Handle both absolute and relative URLs
	absolutePattern := `!\[.*?\]\((?:https?://` + host + `)?/api/image/(\d+)(?:\s+["'].*?["'])?\)`
	relativePattern := `!\[.*?\]\(/api/image/(\d+)(?:\s+["'].*?["'])?\)`

	// Combine patterns and compile regex
	patterns := []string{absolutePattern, relativePattern}

	// Store unique image IDs to avoid duplicates
	imageIDs := make(map[uint]struct{})

	for _, pattern := range patterns {
		re := regexp.MustCompile(pattern)
		matches := re.FindAllStringSubmatch(content, -1)

		for _, match := range matches {
			if len(match) >= 2 {
				if id, err := strconv.ParseUint(match[1], 10, 32); err == nil {
					imageIDs[uint(id)] = struct{}{}
				}
			}
		}
	}

	// Convert map keys to slice
	result := make([]uint, 0, len(imageIDs))
	for id := range imageIDs {
		result = append(result, id)
	}

	return result
}
