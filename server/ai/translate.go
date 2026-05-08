package ai

import (
	"encoding/json"
	"fmt"
	"log/slog"
	"reflect"
	"strings"
)

const translatePrompt = `你是一个专业翻译器。请将下面 JSON 中所有可读文本翻译为简体中文，并严格保持原始结构。

要求：
1. 只翻译字符串值，不修改 JSON 的 key。
2. 不要修改数字、布尔值、null、数组顺序、对象层级。
3. URL、路径、邮箱、ID、代码片段等非自然语言内容保持不变。
4. 输出必须是合法 JSON，且只输出 JSON 本身，不要额外说明。

JSON:
%s`

func Translate[T any](content T) T {
	contentType := reflect.TypeOf(content)
	contentValue := reflect.ValueOf(content)
	if !contentValue.IsValid() || contentType == nil {
		return content
	}

	// The contract here is translating structs while preserving shape.
	rootType := contentType
	isPointer := contentType.Kind() == reflect.Ptr
	if isPointer {
		if contentValue.IsNil() {
			return content
		}
		rootType = contentType.Elem()
	}
	if rootType.Kind() != reflect.Struct {
		return content
	}

	payload, err := json.Marshal(content)
	if err != nil {
		slog.Warn("translate marshal failed", "error", err)
		return content
	}

	response := Chat(fmt.Sprintf(translatePrompt, string(payload)))
	if strings.TrimSpace(response) == "" {
		return content
	}

	translatedJSON, ok := extractJSON(response)
	if !ok {
		slog.Warn("translate response does not contain valid JSON")
		return content
	}

	targetPtr := reflect.New(rootType).Interface()
	if err := json.Unmarshal([]byte(translatedJSON), targetPtr); err != nil {
		slog.Warn("translate unmarshal failed", "error", err)
		return content
	}

	if isPointer {
		if translated, ok := any(targetPtr).(T); ok {
			return translated
		}
		return content
	}

	if translated, ok := reflect.ValueOf(targetPtr).Elem().Interface().(T); ok {
		return translated
	}
	return content
}

func extractJSON(raw string) (string, bool) {
	candidates := []string{strings.TrimSpace(raw)}

	trimmed := strings.TrimSpace(raw)
	if strings.HasPrefix(trimmed, "```") {
		firstNewline := strings.Index(trimmed, "\n")
		lastFence := strings.LastIndex(trimmed, "```")
		if firstNewline > 0 && lastFence > firstNewline {
			candidates = append(candidates, strings.TrimSpace(trimmed[firstNewline:lastFence]))
		}
	}

	if idx := strings.IndexAny(trimmed, "{["); idx >= 0 {
		candidates = append(candidates, strings.TrimSpace(trimmed[idx:]))
	}

	for _, c := range candidates {
		if c == "" {
			continue
		}
		var js json.RawMessage
		if err := json.Unmarshal([]byte(c), &js); err == nil {
			return c, true
		}
	}

	return "", false
}
