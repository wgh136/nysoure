package utils

import (
	"net/url"
	"os"
	"testing"
)

func TestGenerateDownloadTokenUsesPath(t *testing.T) {
	t.Setenv("DOWNLOAD_SECRET_KEY", "test-secret")

	baseURL, err := url.Parse("https://download.example.com/assets/file.zip")
	if err != nil {
		t.Fatalf("parse base url: %v", err)
	}
	variantURL, err := url.Parse("https://download.example.com/assets/other-file.zip")
	if err != nil {
		t.Fatalf("parse variant url: %v", err)
	}

	baseToken, baseExpiresAt := GenerateDownloadToken(baseURL)
	variantToken, variantExpiresAt := GenerateDownloadToken(variantURL)

	if baseToken == variantToken {
		t.Fatal("expected token to change when path changes")
	}
	if baseExpiresAt == 0 || variantExpiresAt == 0 {
		t.Fatal("expected non-zero expires_at")
	}
}

func TestGenerateDownloadTokenIgnoresHostAndQuery(t *testing.T) {
	t.Setenv("DOWNLOAD_SECRET_KEY", "test-secret")

	withQuery, err := url.Parse("https://download-a.example.com/assets/file.zip?download=1")
	if err != nil {
		t.Fatalf("parse url with query: %v", err)
	}
	withoutQuery, err := url.Parse("https://download-b.example.com/assets/file.zip")
	if err != nil {
		t.Fatalf("parse url without query: %v", err)
	}

	withQueryToken, _ := GenerateDownloadToken(withQuery)
	withoutQueryToken, _ := GenerateDownloadToken(withoutQuery)

	if withQueryToken != withoutQueryToken {
		t.Fatal("expected host and query differences to not affect the token")
	}
}

func TestGenerateDownloadTokenUsesConfiguredSecret(t *testing.T) {
	t.Setenv("DOWNLOAD_SECRET_KEY", "first-secret")
	u, err := url.Parse("https://download.example.com/assets/file.zip")
	if err != nil {
		t.Fatalf("parse url: %v", err)
	}

	firstToken, _ := GenerateDownloadToken(u)

	if err := os.Setenv("DOWNLOAD_SECRET_KEY", "second-secret"); err != nil {
		t.Fatalf("set env: %v", err)
	}

	secondToken, _ := GenerateDownloadToken(u)

	if firstToken == secondToken {
		t.Fatal("expected token to change when secret changes")
	}
}
