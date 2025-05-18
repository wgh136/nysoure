package utils

import (
	"github.com/gofiber/fiber/v3/log"
	"net/url"
	"nysoure/server/model"
	"os"
	"path/filepath"
	"strconv"
	"strings"
)

const (
	RssFileName = "rss.xml"
)

func GenerateRss(baseURL string, resources []model.Resource) {
	path := filepath.Join(GetStoragePath(), RssFileName)
	builder := strings.Builder{}
	builder.WriteString(`<?xml version="1.0" encoding="UTF-8"?>`)
	builder.WriteRune('\n')
	builder.WriteString(`<rss version="2.0">`)
	builder.WriteRune('\n')
	builder.WriteString(`<channel>`)
	builder.WriteRune('\n')
	for _, resource := range resources {
		builder.WriteString("  <item>\n")
		builder.WriteString("    <title>")
		builder.WriteString(url.PathEscape(resource.Title))
		builder.WriteString("</title>\n")
		builder.WriteString("    <link>")
		builder.WriteString(baseURL + "/resources/" + strconv.Itoa(int(resource.ID)))
		builder.WriteString("</link>\n")
		builder.WriteString("    <description>")
		builder.WriteString(url.PathEscape(ArticleToDescription(resource.Article, 255)))
		builder.WriteString("</description>\n")
		builder.WriteString("    <pubDate>")
		builder.WriteString(resource.UpdatedAt.Format("Mon, 02 Jan 2006 15:04:05 MST"))
		builder.WriteString("</pubDate>\n")
		builder.WriteString("  </item>\n")
	}
	builder.WriteString(`</channel>`)
	builder.WriteRune('\n')
	builder.WriteString(`</rss>`)
	data := builder.String()
	if err := os.WriteFile(path, []byte(data), 0644); err != nil {
		log.Error("failed to write RSS file", err)
	}
}
