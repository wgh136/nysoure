package middleware

import (
	"encoding/json"
	"fmt"
	"net/url"
	"nysoure/server/config"
	"nysoure/server/ctx"
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

	if strings.HasPrefix(c.Path(), "/metrics") {
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
		c.Set("Cache-Control", "no-cache")
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
	htmlUrl := serverBaseURL + c.Path()
	cfTurnstileSiteKey := config.CloudflareTurnstileSiteKey()
	siteInfo := config.SiteInfo()
	path := c.Path()
	preFetchData := ""

	if strings.HasPrefix(path, "/resources/") {
		idStr := strings.TrimPrefix(path, "/resources/")
		id, err := strconv.Atoi(idStr)
		if err == nil {
			r, err := service.GetResource(uint(id), ctx.NewContext(c))
			if err == nil {
				if len(r.Images) > 0 {
					preview = fmt.Sprintf("%s/api/image/%d", serverBaseURL, r.Images[0].ID)
				}
				title = r.Title
				description = utils.ArticleToDescription(r.Article, 200)
				preFetchDataJson, _ := json.Marshal(map[string]interface{}{
					"resource": r,
				})
				preFetchData = url.PathEscape(string(preFetchDataJson))
			}
		}
	} else if strings.HasPrefix(path, "/user/") {
		username := strings.TrimPrefix(path, "/user/")
		u, err := service.GetUserByUsername(username)
		if err == nil {
			preview = fmt.Sprintf("%s/api/avatar/%d", serverBaseURL, u.ID)
			title = u.Username
			description = "User " + u.Username + "'s profile"
			preFetchDataJson, _ := json.Marshal(map[string]interface{}{
				"user": u,
			})
			preFetchData = url.PathEscape(string(preFetchDataJson))
		}
	} else if strings.HasPrefix(path, "/tag/") {
		tagName := strings.TrimPrefix(path, "/tag/")
		tagName, err := url.PathUnescape(tagName)
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
				preview = fmt.Sprintf("%s/api/avatar/%d", serverBaseURL, cmt.User.ID)
				if len(cmt.Images) > 0 {
					preview = fmt.Sprintf("%s/api/image/%d", serverBaseURL, cmt.Images[0].ID)
				}
				preFetchDataJson, _ := json.Marshal(map[string]interface{}{
					"comment": cmt,
				})
				preFetchData = url.PathEscape(string(preFetchDataJson))
			}
		}
	} else if strings.HasPrefix(path, "/collection/") {
		collectionIDStr := strings.TrimPrefix(path, "/collection/")
		collectionID, err := strconv.Atoi(collectionIDStr)
		if err == nil {
			coll, err := service.GetCollectionByID(uint(collectionID), 0)
			if err == nil {
				title = coll.Title
				description = utils.ArticleToDescription(coll.Article, 256)
				if len(coll.Images) > 0 {
					preview = fmt.Sprintf("%s/api/image/%d", serverBaseURL, coll.Images[0].ID)
				} else {
					preview = fmt.Sprintf("%s/api/avatar/%d", serverBaseURL, coll.User.ID)
				}
				if len(coll.Images) > 0 {
					preview = fmt.Sprintf("%s/api/image/%d", serverBaseURL, coll.Images[0].ID)
				}
				preFetchDataJson, _ := json.Marshal(map[string]interface{}{
					"collection": coll,
				})
				preFetchData = url.PathEscape(string(preFetchDataJson))
			}
		}
	} else if path == "/" || path == "" {
		pinned, err := service.GetPinnedResources()
		random, err1 := service.RandomCover()
		statistic, err2 := service.GetStatistic()
		if err == nil && err1 == nil && err2 == nil {
			preFetchDataJson, _ := json.Marshal(map[string]interface{}{
				"pinned":     pinned,
				"background": random,
				"statistic":  statistic,
			})
			preFetchData = url.PathEscape(string(preFetchDataJson))
		}
	}

	content = strings.ReplaceAll(content, "{{SiteName}}", siteName)
	content = strings.ReplaceAll(content, "{{Description}}", description)
	content = strings.ReplaceAll(content, "{{SiteDescription}}", config.ServerDescription())
	content = strings.ReplaceAll(content, "{{Preview}}", preview)
	content = strings.ReplaceAll(content, "{{Title}}", title)
	content = strings.ReplaceAll(content, "{{Url}}", htmlUrl)
	content = strings.ReplaceAll(content, "{{CFTurnstileSiteKey}}", cfTurnstileSiteKey)
	content = strings.ReplaceAll(content, "{{SiteInfo}}", siteInfo)
	content = strings.ReplaceAll(content, "{{UploadPrompt}}", config.UploadPrompt())
	content = strings.ReplaceAll(content, "{{AllowNormalUserUpload}}", strconv.FormatBool(config.AllowNormalUserUpload()))
	content = strings.ReplaceAll(content, "{{PrivateDeployment}}", strconv.FormatBool(config.PrivateDeployment()))
	content = strings.ReplaceAll(content, "<script id=\"pre_fetch_data\"></script>", fmt.Sprintf("<script type=\"application/json\" id=\"pre_fetch_data\">%s</script>", preFetchData))
	content = strings.ReplaceAll(content, "{{SupportEmailAddress}}", config.SupportEmailAddress())

	c.Set("Content-Type", "text/html; charset=utf-8")
	return c.SendString(content)
}
