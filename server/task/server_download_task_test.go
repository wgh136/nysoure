package task

import (
	"testing"
	"time"
)

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
