package middleware

import (
	"fmt"
	"nysoure/server/config"
	"nysoure/server/service"
	"os"
	"strconv"
	"strings"

	"github.com/gofiber/fiber/v3"
	"github.com/gomarkdown/markdown"
	"github.com/gomarkdown/markdown/html"
	"github.com/gomarkdown/markdown/parser"
	"github.com/k3a/html2text"
)

func FrontendMiddleware(c fiber.Ctx) error {
	if strings.HasPrefix(c.Path(), "/api") {
		return c.Next()
	}

	path := c.Path()
	file := "static" + path

	if _, err := os.Stat(file); path == "/" || os.IsNotExist(err) {
		return serveIndexHtml(c)
	} else {
		return c.SendFile(file)
	}
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
			r, err := service.GetResource(uint(id))
			if err == nil {
				if len(r.Images) > 0 {
					preview = fmt.Sprintf("%s/api/image/%d", serverBaseURL, r.Images[0].ID)
				}
				title = r.Title
				description = getResourceDescription(r.Article)
			}
		}
	} else if strings.HasPrefix(path, "/user/") {
		username := strings.TrimPrefix(path, "/user/")
		u, err := service.GetUserByUsername(username)
		if err == nil {
			preview = fmt.Sprintf("/avatar/%d", u.ID)
			title = u.Username
			description = "User " + u.Username + "'s profile"
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

func mergeSpaces(str string) string {
	// Replace multiple spaces with a single space
	builder := strings.Builder{}
	for i, r := range str {
		if r == '\t' || r == '\r' {
			continue
		}
		if r == ' ' || r == '\n' {
			if i > 0 && str[i-1] != ' ' && str[i-1] != '\n' {
				builder.WriteRune(' ')
			}
		} else {
			builder.WriteRune(r)
		}
	}
	return builder.String()
}

func getResourceDescription(article string) string {
	htmlContent := mdToHTML([]byte(article))
	plain := html2text.HTML2Text(string(htmlContent))
	plain = strings.TrimSpace(plain)
	plain = mergeSpaces(plain)
	if len([]rune(plain)) > 100 {
		plain = string([]rune(plain)[:100])
	}
	return plain
}

func mdToHTML(md []byte) []byte {
	// create Markdown parser with extensions
	extensions := parser.CommonExtensions | parser.NoEmptyLineBeforeBlock | parser.MathJax
	p := parser.NewWithExtensions(extensions)
	doc := p.Parse(md)

	// create HTML renderer with extensions
	htmlFlags := html.CommonFlags | html.HrefTargetBlank
	opts := html.RendererOptions{Flags: htmlFlags}
	renderer := html.NewRenderer(opts)

	return markdown.Render(doc, renderer)
}
