package middleware

import (
	"nysoure/server/utils"
	"path/filepath"

	"github.com/gofiber/fiber/v3"
)

func StaticContentMiddleware(c fiber.Ctx) error {
	path := c.Path()

	// 只处理特定的静态内容路径
	if path == "/robots.txt" {
		return handleRobotsTxt(c)
	} else if path == "/sitemap.xml" {
		return handleSiteMap(c)
	} else if path == "/rss.xml" {
		return handleRss(c)
	}

	// 其他请求继续传递
	return c.Next()
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
