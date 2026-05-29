package service

import (
	"encoding/json"
	"testing"
	"time"

	"nysoure/server/utils"
)

func stubTemporaryDownloadTokenStore(t *testing.T) {
	t.Helper()
	original := temporaryDownloadTokenSetNX
	used := map[string]bool{}
	temporaryDownloadTokenSetNX = func(key string, expiration time.Duration) (bool, error) {
		if used[key] {
			return false, nil
		}
		used[key] = true
		return true, nil
	}
	t.Cleanup(func() {
		temporaryDownloadTokenSetNX = original
	})
}

func TestVerifyTemporaryDownloadToken(t *testing.T) {
	stubTemporaryDownloadTokenStore(t)

	payload, err := json.Marshal(temporaryDownloadTokenPayload{
		Type:   temporaryDownloadTokenType,
		FileID: "file-1",
	})
	if err != nil {
		t.Fatalf("failed to marshal payload: %v", err)
	}

	token, err := utils.GenerateTemporaryToken(string(payload))
	if err != nil {
		t.Fatalf("failed to generate token: %v", err)
	}

	verified, err := VerifyTemporaryDownloadToken(token, "file-1")
	if err != nil {
		t.Fatalf("expected token to verify, got error: %v", err)
	}
	if !verified {
		t.Fatal("expected token to be accepted")
	}
}

func TestVerifyTemporaryDownloadTokenRejectsReuse(t *testing.T) {
	stubTemporaryDownloadTokenStore(t)

	payload, err := json.Marshal(temporaryDownloadTokenPayload{
		Type:   temporaryDownloadTokenType,
		FileID: "file-1",
	})
	if err != nil {
		t.Fatalf("failed to marshal payload: %v", err)
	}

	token, err := utils.GenerateTemporaryToken(string(payload))
	if err != nil {
		t.Fatalf("failed to generate token: %v", err)
	}

	verified, err := VerifyTemporaryDownloadToken(token, "file-1")
	if err != nil || !verified {
		t.Fatalf("expected first verification to succeed, got verified=%v err=%v", verified, err)
	}

	verified, err = VerifyTemporaryDownloadToken(token, "file-1")
	if err == nil {
		t.Fatal("expected reused token to fail")
	}
	if verified {
		t.Fatal("expected reused token to be rejected")
	}
}

func TestVerifyTemporaryDownloadTokenRejectsDifferentFile(t *testing.T) {
	stubTemporaryDownloadTokenStore(t)

	payload, err := json.Marshal(temporaryDownloadTokenPayload{
		Type:   temporaryDownloadTokenType,
		FileID: "file-1",
	})
	if err != nil {
		t.Fatalf("failed to marshal payload: %v", err)
	}

	token, err := utils.GenerateTemporaryToken(string(payload))
	if err != nil {
		t.Fatalf("failed to generate token: %v", err)
	}

	verified, err := VerifyTemporaryDownloadToken(token, "file-2")
	if err == nil {
		t.Fatal("expected mismatched file token to fail")
	}
	if verified {
		t.Fatal("expected mismatched file token to be rejected")
	}
}
