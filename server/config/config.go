package config

import (
	"encoding/json"
	"nysoure/server/utils"
	"os"
	"path/filepath"
)

var config *ServerConfig

type ServerConfig struct {
	// MaxUploadingSizeInMB is the maximum size of files that are being uploaded at the same time.
	MaxUploadingSizeInMB int `json:"max_uploading_size_in_mb"`
	// MaxFileSizeInMB is the maximum size of a single file that can be uploaded.
	MaxFileSizeInMB int `json:"max_file_size_in_mb"`
	// MaxDownloadsForSingleIP is the maximum number of downloads allowed from a single IP address.
	MaxDownloadsPerDayForSingleIP int `json:"max_downloads_per_day_for_single_ip"`
	// AllowRegister indicates whether user registration is allowed.
	AllowRegister bool `json:"allow_register"`
	// CloudflareTurnstileSiteKey is the site key for Cloudflare Turnstile.
	CloudflareTurnstileSiteKey string `json:"cloudflare_turnstile_site_key"`
	// CloudflareTurnstileSecretKey is the secret key for Cloudflare Turnstile.
	CloudflareTurnstileSecretKey string `json:"cloudflare_turnstile_secret_key"`
}

func init() {
	filepath := filepath.Join(utils.GetStoragePath(), "config.json")
	if _, err := os.Stat(filepath); os.IsNotExist(err) {
		config = &ServerConfig{
			MaxUploadingSizeInMB:          20 * 1024, // 20GB
			MaxFileSizeInMB:               8 * 1024,  // 8GB
			MaxDownloadsPerDayForSingleIP: 20,
			AllowRegister:                 true,
			CloudflareTurnstileSiteKey:    "",
			CloudflareTurnstileSecretKey:  "",
		}
	} else {
		data, err := os.ReadFile(filepath)
		if err != nil {
			panic(err)
		}
		config = &ServerConfig{}
		if err := json.Unmarshal(data, config); err != nil {
			panic(err)
		}
	}
}

func GetConfig() ServerConfig {
	return *config
}

func SetConfig(newConfig ServerConfig) {
	config = &newConfig
	data, err := json.MarshalIndent(config, "", "  ")
	if err != nil {
		panic(err)
	}
	filepath := filepath.Join(utils.GetStoragePath(), "config.json")
	if err := os.WriteFile(filepath, data, 0644); err != nil {
		panic(err)
	}
}

func MaxUploadingSize() int64 {
	return int64(config.MaxUploadingSizeInMB) * 1024 * 1024
}

func MaxFileSize() int64 {
	return int64(config.MaxFileSizeInMB) * 1024 * 1024
}

func AllowRegister() bool {
	return config.AllowRegister
}
