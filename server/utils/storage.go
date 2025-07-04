package utils

import (
	"errors"
	"os"
	"runtime"
)

var path string

func GetStoragePath() string {
	if path != "" {
		return path
	}
	if runtime.GOOS == "linux" {
		path = "/var/lib/nysoure"
	} else {
		userDir, _ := os.UserHomeDir()
		path = userDir + "/.nysoure"
	}
	if _, err := os.Stat(path); os.IsNotExist(err) {
		if err := os.MkdirAll(path, os.ModePerm); err != nil {
			if errors.Is(err, os.ErrPermission) {
				// Fallback to home directory if permission is denied
				userDir, _ := os.UserHomeDir()
				path = userDir + "/.nysoure"
				if _, err := os.Stat(path); os.IsNotExist(err) {
					if err := os.MkdirAll(path, os.ModePerm); err != nil {
						panic("Failed to create storage directory: " + err.Error())
					}
				}
			}
		}
	}
	return path
}
