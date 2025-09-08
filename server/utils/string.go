package utils

import (
	"regexp"
	"unicode"
)

func RemoveSpaces(s string) string {
	reg := regexp.MustCompile(`\s+`)
	return reg.ReplaceAllString(s, " ")
}

func OnlyPunctuation(s string) bool {
	for _, r := range s {
		if unicode.IsPunct(r) || unicode.IsSpace(r) {
			continue
		}
		return false
	}
	return true
}
