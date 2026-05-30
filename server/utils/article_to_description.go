package utils

import (
	"strings"

	"github.com/gomarkdown/markdown"
	"github.com/gomarkdown/markdown/html"
	"github.com/gomarkdown/markdown/parser"
	"github.com/k3a/html2text"
)

func ArticleToDescription(article string, maxLength int) string {
	if maxLength < 3 {
		maxLength = 3
	}
	article = stripMarkdownDirectiveLines(article)
	htmlContent := mdToHTML([]byte(article))
	plain := html2text.HTML2Text(string(htmlContent))
	plain = strings.TrimSpace(plain)
	plain = mergeSpaces(plain)
	plain = removeLinks(plain)
	plain = removeMarkdownExtensions(plain)
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

func removeLinks(str string) string {
	parts := strings.Split(str, " ")
	builder := strings.Builder{}
	for _, part := range parts {
		if !strings.HasPrefix(part, "http://") && !strings.HasPrefix(part, "https://") {
			builder.WriteString(part + " ")
		}
	}
	return strings.TrimSpace(builder.String())
}

func stripMarkdownDirectiveLines(str string) string {
	lines := strings.Split(str, "\n")
	builder := strings.Builder{}
	var fence string

	for _, line := range lines {
		trimmed := strings.TrimSpace(line)
		if marker := parseFenceMarker(trimmed); marker != "" {
			if fence == "" {
				fence = marker
			} else if fence == marker {
				fence = ""
			}
			builder.WriteString(line)
			builder.WriteRune('\n')
			continue
		}

		if fence == "" && (trimmed == ":::" || isDirectiveLine(trimmed)) {
			continue
		}

		builder.WriteString(line)
		builder.WriteRune('\n')
	}

	return strings.TrimSpace(builder.String())
}

func parseFenceMarker(line string) string {
	if len(line) < 3 {
		return ""
	}
	if strings.HasPrefix(line, "```") {
		return "`"
	}
	if strings.HasPrefix(line, "~~~") {
		return "~"
	}
	return ""
}

func isDirectiveLine(line string) bool {
	if len(line) < 4 || line[:3] != ":::" {
		return false
	}
	if len(line) == 3 {
		return false
	}
	next := line[3]
	return (next >= 'a' && next <= 'z') || (next >= 'A' && next <= 'Z')
}

func removeMarkdownExtensions(str string) string {
	// Remove lines starts with `:::`
	lines := strings.Split(str, "\n")
	builder := strings.Builder{}
	for _, line := range lines {
		if !strings.HasPrefix(line, ":::") {
			builder.WriteString(line + "\n")
		}
	}
	return strings.TrimSpace(builder.String())
}
