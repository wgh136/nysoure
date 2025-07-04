package middleware

import (
	"fmt"
	url2 "net/url"
	"nysoure/server/config"
	"nysoure/server/service"
	"nysoure/server/utils"
	"os"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/gofiber/fiber/v3"
)

func FrontendMiddleware(c fiber.Ctx) error {
	if strings.HasPrefix(c.Path(), "/api") {
		return c.Next()
	}

	path := c.Path()
	file := "static" + path

	if path == "/robots.txt" {
		return handleRobotsTxt(c)
	} else if path == "/sitemap.xml" {
		return handleSiteMap(c)
	} else if path == "/rss.xml" {
		return handleRss(c)
	}

	if _, err := os.Stat(file); path == "/" || os.IsNotExist(err) {
		return serveIndexHtml(c)
	} else {
		c.Set("Cache-Control", "public, max-age=31536000, immutable")
		return c.SendFile(file)
	}
}

func handleRobotsTxt(c fiber.Ctx) error {
	c.Set("Content-Type", "text/plain; charset=utf-8")
	c.Set("Cache-Control", "no-cache")
	c.Set("X-Robots-Tag", "noindex")
	return c.SendString("User-agent: *\nDisallow: /api/\n\nSitemap: " + c.BaseURL() + "/sitemap.xml\n")
}

func handleSiteMap(c fiber.Ctx) error {
	path := filepath.Join(utils.GetStoragePath(), utils.SiteMapFileName)
	return c.SendFile(path)
}

func handleRss(c fiber.Ctx) error {
	path := filepath.Join(utils.GetStoragePath(), utils.RssFileName)
	return c.SendFile(path)
}

func serveIndexHtml(c fiber.Ctx) error {
	data, err := os.ReadFile("static/index.html")
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).SendString("Internal Server Error")
	}
	content := string(data)

	serverBaseURL := c.BaseURL()

	siteName := config.ServerName()
	description := config.ServerDescription()
	preview := serverBaseURL + "/icon-192.png"
	title := siteName
	url := serverBaseURL + c.Path()
	cfTurnstileSiteKey := config.CloudflareTurnstileSiteKey()
	siteInfo := config.SiteInfo()
	path := c.Path()

	if strings.HasPrefix(path, "/resources/") {
		idStr := strings.TrimPrefix(path, "/resources/")
		id, err := strconv.Atoi(idStr)
		if err == nil {
			r, err := service.GetResource(uint(id), "")
			if err == nil {
				if len(r.Images) > 0 {
					preview = fmt.Sprintf("%s/api/image/%d", serverBaseURL, r.Images[0].ID)
				}
				title = r.Title
				description = utils.ArticleToDescription(r.Article, 200)
			}
		}
	} else if strings.HasPrefix(path, "/user/") {
		username := strings.TrimPrefix(path, "/user/")
		u, err := service.GetUserByUsername(username)
		if err == nil {
			preview = fmt.Sprintf("%s/avatar/%d", serverBaseURL, u.ID)
			title = u.Username
			description = "User " + u.Username + "'s profile"
		}
	} else if strings.HasPrefix(path, "/tag/") {
		tagName := strings.TrimPrefix(path, "/tag/")
		tagName, err := url2.PathUnescape(tagName)
		tagName = strings.TrimSpace(tagName)
		if err == nil {
			t, err := service.GetTagByName(tagName)
			if err == nil {
				title = "Tag: " + t.Name
				description = utils.ArticleToDescription(t.Description, 256)
			}
		}
	} else if strings.HasPrefix(path, "/comments/") {
		commentIDStr := strings.TrimPrefix(path, "/comments/")
		commentID, err := strconv.Atoi(commentIDStr)
		if err == nil {
			cmt, err := service.GetCommentByID(uint(commentID))
			if err == nil {
				title = "Comment Details"
				description = utils.ArticleToDescription(cmt.Content, 200)
				preview = fmt.Sprintf("%s/avatar/%d", serverBaseURL, cmt.User.ID)
			}
		}
	}

	content = strings.ReplaceAll(content, "{{SiteName}}", siteName)
	content = strings.ReplaceAll(content, "{{Description}}", description)
	content = strings.ReplaceAll(content, "{{Preview}}", preview)
	content = strings.ReplaceAll(content, "{{Title}}", title)
	content = strings.ReplaceAll(content, "{{Url}}", url)
	content = strings.ReplaceAll(content, "{{CFTurnstileSiteKey}}", cfTurnstileSiteKey)
	content = strings.ReplaceAll(content, "{{SiteInfo}}", siteInfo)

	c.Set("Content-Type", "text/html; charset=utf-8")
	return c.SendString(content)
}
