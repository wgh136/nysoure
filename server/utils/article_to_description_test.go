package utils

import (
	"strings"
	"testing"
)

func TestArticleToDescription_ExtractsTextFromCollapseAndTabView(t *testing.T) {
	article := `[![](/api/image/19016)](https://whirlpool.co.jp/relirium/)

:::collapse+ 简介

:::tab_view 翻译/原文

距今30年前。
	
---
今を遡ること30年前。
:::

:::`

	description := ArticleToDescription(article, 255)
	if strings.TrimSpace(description) == "" {
		t.Fatal("expected non-empty description")
	}
	if !strings.Contains(description, "距今30年前") && !strings.Contains(description, "今を遡ること30年前") {
		t.Fatalf("expected description to include article text, got %q", description)
	}
}
