package config

import (
	"encoding/json"
	"errors"
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
	// ServerName is the name of the server. It will be used as the title of the web page.
	ServerName string `json:"server_name"`
	// ServerDescription is the description of the server. It will be used as the description of html meta tag.
	ServerDescription string `json:"server_description"`
	// SiteInfo is an article that describes the site. It will be displayed on the home page. Markdown format.
	SiteInfo string `json:"site_info"`
	// AllowNormalUserUpload indicates whether normal users are allowed to upload files.
	AllowNormalUserUpload bool `json:"allow_normal_user_upload"`
	// MaxNormalUserUploadSizeInMB is the maximum size of files that normal users can upload.
	MaxNormalUserUploadSizeInMB int `json:"max_normal_user_upload_size_in_mb"`
	// Prompt for upload page
	UploadPrompt string `json:"upload_prompt"`
	// PinnedResources is a list of resource IDs that are pinned to the top of the page.
	PinnedResources []uint `json:"pinned_resources"`
}

func (c *ServerConfig) Validate() error {
	if c.MaxUploadingSizeInMB <= 0 {
		return errors.New("MaxUploadingSizeInMB must be positive")
	}
	if c.MaxFileSizeInMB <= 0 {
		return errors.New("MaxFileSizeInMB must be positive")
	}
	if c.MaxDownloadsPerDayForSingleIP <= 0 {
		return errors.New("MaxDownloadsPerDayForSingleIP must be positive")
	}
	if c.ServerName == "" {
		return errors.New("ServerName must not be empty")
	}
	if c.ServerDescription == "" {
		return errors.New("ServerDescription must not be empty")
	}
	if len(c.PinnedResources) > 8 {
		return errors.New("PinnedResources must not exceed 8 items")
	}
	return nil
}

func init() {
	p := filepath.Join(utils.GetStoragePath(), "config.json")
	if _, err := os.Stat(p); os.IsNotExist(err) {
		config = &ServerConfig{
			MaxUploadingSizeInMB:          20 * 1024, // 20GB
			MaxFileSizeInMB:               8 * 1024,  // 8GB
			MaxDownloadsPerDayForSingleIP: 20,
			AllowRegister:                 true,
			CloudflareTurnstileSiteKey:    "",
			CloudflareTurnstileSecretKey:  "",
			ServerName:                    "Nysoure",
			ServerDescription:             "Nysoure is a file sharing service.",
			AllowNormalUserUpload:         true,
			MaxNormalUserUploadSizeInMB:   16,
			UploadPrompt:                  "You can upload your files here.",
			PinnedResources:               []uint{},
		}
	} else {
		data, err := os.ReadFile(p)
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

func SetConfig(newConfig ServerConfig) error {
	config = &newConfig
	data, err := json.MarshalIndent(config, "", "  ")
	if err != nil {
		return err
	}
	p := filepath.Join(utils.GetStoragePath(), "config.json")
	if err := os.WriteFile(p, data, 0644); err != nil {
		return err
	}
	return nil
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

func MaxDownloadsPerDayForSingleIP() int {
	return config.MaxDownloadsPerDayForSingleIP
}

func CloudflareTurnstileSiteKey() string {
	return config.CloudflareTurnstileSiteKey
}

func ServerName() string {
	return config.ServerName
}

func ServerDescription() string {
	return config.ServerDescription
}

func CloudflareTurnstileSecretKey() string {
	return config.CloudflareTurnstileSecretKey
}

func SiteInfo() string {
	return config.SiteInfo
}

func AllowNormalUserUpload() bool {
	return config.AllowNormalUserUpload
}

func MaxNormalUserUploadSize() int64 {
	return int64(config.MaxNormalUserUploadSizeInMB) * 1024 * 1024
}

func UploadPrompt() string {
	return config.UploadPrompt
}

func PinnedResources() []uint {
	return config.PinnedResources
}

func PrivateDeployment() bool {
	return os.Getenv("PRIVATE_DEPLOYMENT") == "true"
}

func UpdateModifiedTimeAfterNewFileUpload() bool {
	return os.Getenv("UPDATE_MODIFIED_TIME_AFTER_NEW_FILE_UPLOAD") != "false"
}
