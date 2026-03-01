package utils

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"strings"

	"github.com/gofiber/fiber/v3/log"
)

const (
	cloudreveManifestName = "Inclusive cloud storage for everyone"
)

func FetchRedirectFileSize(link string) (int64, error) {
	u, err := url.Parse(link)
	if err != nil {
		return 0, errors.New("invalid URL")
	}
	if isCloudreveUrl(u) {
		return fetchCloudreveFileSize(u)
	}
	return 0, errors.New("unsupported redirect URL")
}

func isCloudreveUrl(u *url.URL) bool {
	manifestUrl := fmt.Sprintf("%s://%s/manifest.json", u.Scheme, u.Host)
	req, err := http.NewRequest("GET", manifestUrl, nil)
	if err != nil {
		log.Error("failed to create cloudreve manifest request: ", err)
		return false
	}
	req.Header.Set("X-ACCESS-KEY", os.Getenv("DEV_ACCESS_KEY"))

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		log.Error("failed to fetch cloudreve manifest: ", err)
		return false
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		log.Error("failed to read cloudreve manifest: ", err)
		return false
	}
	var manifest map[string]interface{}
	err = json.Unmarshal(body, &manifest)
	if err != nil {
		return false
	}
	return manifest["name"] == cloudreveManifestName
}

func fetchCloudreveFileSize(u *url.URL) (int64, error) {
	splited := strings.Split(u.Path, "/")
	id := splited[len(splited)-1]
	infoUrl := fmt.Sprintf("%s://%s/api/v3/share/info/%s", u.Scheme, u.Host, id)

	req, err := http.NewRequest("GET", infoUrl, nil)
	if err != nil {
		return 0, err
	}
	req.Header.Set("X-ACCESS-KEY", os.Getenv("DEV_ACCESS_KEY"))

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return 0, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		log.Error("failed to fetch cloudreve file size: ", resp.StatusCode)
		return 0, errors.New("failed to fetch cloudreve file size")
	}
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		log.Error("failed to read cloudreve file size: ", err)
		return 0, errors.New("failed to read cloudreve file size")
	}
	type CloudreveInfo struct {
		Data struct {
			Source struct {
				Size int64 `json:"size"`
			} `json:"source"`
		} `json:"data"`
	}
	var info CloudreveInfo
	err = json.Unmarshal(body, &info)
	if err != nil {
		log.Error("failed to unmarshal cloudreve file size: ", err)
		return 0, errors.New("failed to unmarshal cloudreve file size")
	}
	return info.Data.Source.Size, nil
}
