package utils

import (
	"github.com/gomarkdown/markdown"
	"github.com/gomarkdown/markdown/html"
	"github.com/gomarkdown/markdown/parser"
	"github.com/k3a/html2text"
	"strings"
)

func ArticleToDescription(article string, maxLength int) string {
	if maxLength < 3 {
		maxLength = 3
	}
	htmlContent := mdToHTML([]byte(article))
	plain := html2text.HTML2Text(string(htmlContent))
	plain = strings.TrimSpace(plain)
	plain = mergeSpaces(plain)
	if len([]rune(plain)) > maxLength {
		plain = string([]rune(plain)[:(maxLength-3)]) + "..."
	}
	return plain
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
