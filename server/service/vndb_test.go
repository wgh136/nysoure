package service

import (
	"testing"

	govndb "git.nyne.dev/o/go_vndb"
)

func TestCharactersFromVndbAllowsMissingCharacterImage(t *testing.T) {
	role := "main"
	vn := &govndb.VN{
		ID: "v123",
		VoiceActors: []govndb.VoiceActor{
			{
				Character: &govndb.Character{
					ID:   "c1",
					Name: "Heroine",
					VNs: []govndb.CharacterVN{
						{
							VN:   govndb.VN{ID: "v123"},
							Role: &role,
						},
					},
				},
				Staff: &govndb.Staff{Name: "CV Name"},
			},
		},
	}

	characters, err := charactersFromVndb(vn)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if len(characters) != 1 {
		t.Fatalf("expected 1 character, got %d", len(characters))
	}
	if characters[0].Name != "Heroine" {
		t.Fatalf("expected character name to be preserved, got %q", characters[0].Name)
	}
	if characters[0].CV != "CVName" {
		t.Fatalf("expected CV name fallback to work, got %q", characters[0].CV)
	}
	if characters[0].Image != 0 {
		t.Fatalf("expected missing image to keep default image ID, got %d", characters[0].Image)
	}
	if characters[0].Role != role {
		t.Fatalf("expected role %q, got %q", role, characters[0].Role)
	}
}
