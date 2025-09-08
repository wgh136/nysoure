package utils

import "regexp"

func RemoveSpaces(s string) string {
	reg := regexp.MustCompile(`\s+`)
	return reg.ReplaceAllString(s, " ")
}
