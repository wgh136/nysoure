package aireview

import (
	"bytes"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"nysoure/server/config"
	"time"
)

type OpenAIRequest struct {
	Model    string          `json:"model"`
	Messages []OpenAIMessage `json:"messages"`
}

type OpenAIMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type OpenAIResponse struct {
	Choices []struct {
		Message OpenAIMessage `json:"message"`
	} `json:"choices"`
	Error *struct {
		Message string `json:"message"`
	} `json:"error,omitempty"`
}

// Chat sends a message to OpenAI API and returns the response
func Chat(content string) string {
	apiUrl := config.OpenAIUrl()
	apiKey := config.OpenAIApiKey()
	model := config.OpenAIModel()

	// Check if OpenAI is configured
	if apiUrl == "" || apiKey == "" || model == "" {
		slog.Warn("OpenAI not configured, skipping AI check")
		return ""
	}

	reqBody := OpenAIRequest{
		Model: model,
		Messages: []OpenAIMessage{
			{
				Role:    "user",
				Content: content,
			},
		},
	}

	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		slog.Error("Failed to marshal OpenAI request", "error", err)
		return ""
	}

	req, err := http.NewRequest("POST", apiUrl, bytes.NewBuffer(jsonData))
	if err != nil {
		slog.Error("Failed to create OpenAI request", "error", err)
		return ""
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+apiKey)

	client := &http.Client{
		Timeout: 30 * time.Second,
	}

	resp, err := client.Do(req)
	if err != nil {
		slog.Error("Failed to send OpenAI request", "error", err)
		return ""
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		slog.Error("Failed to read OpenAI response", "error", err)
		return ""
	}

	if resp.StatusCode != http.StatusOK {
		slog.Error("OpenAI API returned error", "status", resp.StatusCode, "body", string(body))
		return ""
	}

	var openAIResp OpenAIResponse
	if err := json.Unmarshal(body, &openAIResp); err != nil {
		slog.Error("Failed to unmarshal OpenAI response", "error", err)
		return ""
	}

	if openAIResp.Error != nil {
		slog.Error("OpenAI API error", "message", openAIResp.Error.Message)
		return ""
	}

	if len(openAIResp.Choices) == 0 {
		slog.Error("No choices in OpenAI response")
		return ""
	}

	return openAIResp.Choices[0].Message.Content
}
