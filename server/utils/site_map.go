package utils

import (
	"fmt"
	"github.com/gofiber/fiber/v3/log"
	"nysoure/server/model"
	"os"
	"path/filepath"
	"strings"
)

const (
	SiteMapFileName = "sitemap.xml"
)

func GenerateSiteMap(baseURL string, resources []model.Resource) {
	path := filepath.Join(GetStoragePath(), SiteMapFileName)
	builder := strings.Builder{}
	builder.WriteString(`<?xml version="1.0" encoding="UTF-8"?>`)
	builder.WriteRune('\n')
	builder.WriteString(`<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`)
	builder.WriteRune('\n')
	for _, resource := range resources {
		builder.WriteString("  <url>\n")
		builder.WriteString("    <loc>")
		builder.WriteString(fmt.Sprintf("%s/resources/%d", baseURL, resource.ID))
		builder.WriteString("</loc>\n")
		builder.WriteString("    <lastmod>")
		builder.WriteString(resource.UpdatedAt.Format("2006-01-02"))
		builder.WriteString("</lastmod>\n")
		builder.WriteString("  </url>\n")
	}
	builder.WriteString(`</urlset>`)
	builder.WriteRune('\n')
	data := builder.String()
	if err := os.WriteFile(path, []byte(data), 0644); err != nil {
		log.Error("failed to write site map file", err)
	}
}
