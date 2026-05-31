package task

import (
	"testing"
	"time"
)

func TestSelectBTMainFileReturnsSingleFileTorrent(t *testing.T) {
	mainFile, ok := selectBTMainFile([]btFileCandidate{{path: "video.mkv", length: 700 << 20}})
	if !ok {
		t.Fatal("expected single file torrent to be treated as main file")
	}
	if mainFile.path != "video.mkv" {
		t.Fatalf("expected main file path to be video.mkv, got %q", mainFile.path)
	}
}

func TestSelectBTMainFileReturnsDominantFile(t *testing.T) {
	mainFile, ok := selectBTMainFile([]btFileCandidate{
		{path: "movie.mkv", length: 900 << 20},
		{path: "README.txt", length: 2 << 10},
		{path: "poster.jpg", length: 3 << 20},
	})
	if !ok {
		t.Fatal("expected dominant file to be selected")
	}
	if mainFile.path != "movie.mkv" {
		t.Fatalf("expected movie.mkv to be selected, got %q", mainFile.path)
	}
}

func TestSelectBTMainFileRejectsMultipleLargeFiles(t *testing.T) {
	if _, ok := selectBTMainFile([]btFileCandidate{
		{path: "disc1.mkv", length: 700 << 20},
		{path: "disc2.mkv", length: 650 << 20},
		{path: "README.txt", length: 2 << 10},
	}); ok {
		t.Fatal("expected multi-part torrent to keep archive behavior")
	}
}

func TestBTSeedingDurationDefaultsToZero(t *testing.T) {
	t.Setenv("BT_SEED_DURATION", "")

	if got := btSeedingDuration(); got != 0 {
		t.Fatalf("expected default BT seeding duration to be 0, got %s", got)
	}
}

func TestBTSeedingDurationRespectsConfiguredValue(t *testing.T) {
	t.Setenv("BT_SEED_DURATION", "45s")

	if got := btSeedingDuration(); got != 45*time.Second {
		t.Fatalf("expected configured BT seeding duration to be 45s, got %s", got)
	}
}

func TestBTSeedingDurationRejectsInvalidValue(t *testing.T) {
	t.Setenv("BT_SEED_DURATION", "invalid")

	if got := btSeedingDuration(); got != 0 {
		t.Fatalf("expected invalid BT seeding duration to fall back to 0, got %s", got)
	}
}
