package aireview

import (
	"bytes"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"nysoure/server/config"
	"strings"
	"time"
)

// OpenAI types
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

// Google AI types
type GoogleAIRequest struct {
	Contents []GoogleAIContent `json:"contents"`
}

type GoogleAIContent struct {
	Parts []GoogleAIPart `json:"parts"`
}

type GoogleAIPart struct {
	Text string `json:"text"`
}

type GoogleAIResponse struct {
	Candidates []struct {
		Content struct {
			Parts []GoogleAIPart `json:"parts"`
		} `json:"content"`
	} `json:"candidates"`
	Error *struct {
		Message string `json:"message"`
	} `json:"error,omitempty"`
}

// AIProvider represents the AI service provider
type AIProvider int

const (
	ProviderOpenAI AIProvider = iota
	ProviderGoogleAI
)

// detectProvider determines the AI provider based on the API URL
func detectProvider(apiUrl string) AIProvider {
	if strings.Contains(apiUrl, "generativelanguage.googleapis.com") {
		return ProviderGoogleAI
	}
	return ProviderOpenAI
}

// Chat sends a message to AI API and returns the response
// Automatically detects and adapts to OpenAI or Google AI based on API URL
func Chat(content string) string {
	apiUrl := config.OpenAIUrl()
	apiKey := config.OpenAIApiKey()
	model := config.OpenAIModel()

	// Check if AI is configured
	if apiUrl == "" || apiKey == "" || model == "" {
		slog.Warn("AI not configured, skipping AI check")
		return ""
	}

	provider := detectProvider(apiUrl)

	switch provider {
	case ProviderGoogleAI:
		return chatWithGoogleAI(apiUrl, apiKey, model, content)
	default:
		return chatWithOpenAI(apiUrl, apiKey, model, content)
	}
}

// chatWithOpenAI sends a message to OpenAI API
func chatWithOpenAI(apiUrl, apiKey, model, content string) string {
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

// chatWithGoogleAI sends a message to Google AI API
func chatWithGoogleAI(apiUrl, apiKey, model, content string) string {
	// Google AI uses API key in URL query parameter
	fullUrl := apiUrl
	if !strings.Contains(apiUrl, "?") {
		fullUrl += "?key=" + apiKey
	} else if !strings.Contains(apiUrl, "key=") {
		fullUrl += "&key=" + apiKey
	}

	reqBody := GoogleAIRequest{
		Contents: []GoogleAIContent{
			{
				Parts: []GoogleAIPart{
					{
						Text: content,
					},
				},
			},
		},
	}

	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		slog.Error("Failed to marshal Google AI request", "error", err)
		return ""
	}

	req, err := http.NewRequest("POST", fullUrl, bytes.NewBuffer(jsonData))
	if err != nil {
		slog.Error("Failed to create Google AI request", "error", err)
		return ""
	}

	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{
		Timeout: 30 * time.Second,
	}

	resp, err := client.Do(req)
	if err != nil {
		slog.Error("Failed to send Google AI request", "error", err)
		return ""
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		slog.Error("Failed to read Google AI response", "error", err)
		return ""
	}

	if resp.StatusCode != http.StatusOK {
		slog.Error("Google AI API returned error", "status", resp.StatusCode, "body", string(body))
		return ""
	}

	var googleResp GoogleAIResponse
	if err := json.Unmarshal(body, &googleResp); err != nil {
		slog.Error("Failed to unmarshal Google AI response", "error", err)
		return ""
	}

	if googleResp.Error != nil {
		slog.Error("Google AI API error", "message", googleResp.Error.Message)
		return ""
	}

	if len(googleResp.Candidates) == 0 || len(googleResp.Candidates[0].Content.Parts) == 0 {
		slog.Error("No candidates in Google AI response")
		return ""
	}

	return googleResp.Candidates[0].Content.Parts[0].Text
}
