package api

import (
	"encoding/base64"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/url"
	"nysoure/server/cache"
	"nysoure/server/model"
	"os"
	"regexp"
	"strings"
	"time"

	"github.com/gofiber/fiber/v3"
)

var (
	allowedUrlRegexps []*regexp.Regexp
)

type proxyResponse struct {
	Content     string `json:"content"`
	ContentType string `json:"content_type"`
	StatusCode  int    `json:"status_code"`
}

func init() {
	regexps := os.Getenv("ALLOWED_URL_REGEXPS")
	for _, expr := range strings.Split(regexps, ",") {
		if expr == "" {
			continue
		}
		re, err := regexp.Compile(expr)
		if err != nil {
			panic("Invalid regex in ALLOWED_URL_REGEXPS: " + expr)
		}
		allowedUrlRegexps = append(allowedUrlRegexps, re)
	}
}

func handleProxyCall(c fiber.Ctx) error {
	uriBase64 := c.Query("uri")
	if uriBase64 == "" {
		return model.NewRequestError("Missing uri parameter")
	}
	uriStr, err := base64.URLEncoding.DecodeString(uriBase64)
	if err != nil {
		return model.NewRequestError("Invalid base64 encoding")
	}
	uri, err := url.Parse(string(uriStr))
	if err != nil {
		return model.NewRequestError("Invalid URL")
	}
	allowed := false
	for _, re := range allowedUrlRegexps {
		if re.MatchString(uri.String()) {
			allowed = true
			break
		}
	}
	if !allowed {
		return model.NewRequestError("URL not allowed")
	}

	var resp *proxyResponse

	rawVal, err := cache.Get("proxy:" + uri.String())
	if err == nil {
		var r proxyResponse
		err = json.Unmarshal([]byte(rawVal), &r)
		if err != nil {
			slog.ErrorContext(c, "Failed to unmarshal cached proxy response", "error", err)
			return model.NewInternalServerError("Error")
		}
		resp = &r
	} else {
		resp, err = proxy(uri)
		if err != nil {
			slog.ErrorContext(c, "Proxy request failed", "error", err)
			return model.NewInternalServerError("Error")
		}
	}

	c.Status(resp.StatusCode)
	c.Response().Header.SetContentType(resp.ContentType)
	return c.SendString(resp.Content)
}

func proxy(uri *url.URL) (*proxyResponse, error) {
	client := http.Client{}
	req, err := http.NewRequest("GET", uri.String(), nil)
	if err != nil {
		return nil, err
	}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	contentType := resp.Header.Get("Content-Type")
	data, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}
	proxyResp := &proxyResponse{
		Content:     string(data),
		ContentType: contentType,
		StatusCode:  resp.StatusCode,
	}

	j, err := json.Marshal(proxyResp)
	if err != nil {
		return nil, err
	}
	err = cache.Set("proxy:"+uri.String(), string(j), 24*time.Hour)
	if err != nil {
		slog.Error("Failed to cache proxy response", "error", err)
	}
	return proxyResp, nil
}

func AddProxyRoutes(router fiber.Router) {
	router.Get("/proxy", handleProxyCall)
}
