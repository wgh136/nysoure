package model

type Response[T any] struct {
	Success bool   `json:"success"`
	Data    T      `json:"data,omitempty"`
	Message string `json:"message,omitempty"`
}

type PageResponse[T any] struct {
	Success    bool   `json:"success"`
	TotalPages int    `json:"totalPages"`
	Data       []T    `json:"data"`
	Message    string `json:"message,omitempty"`
}
