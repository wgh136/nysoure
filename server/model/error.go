package model

import (
	"errors"
)

type RequestError struct {
	Message string `json:"message"`
}

func (e *RequestError) Error() string {
	return e.Message
}

func NewRequestError(message string) *RequestError {
	return &RequestError{
		Message: message,
	}
}

func IsRequestError(err error) bool {
	var requestError *RequestError
	ok := errors.As(err, &requestError)
	return ok
}

type UnAuthorizedError struct {
	Message string `json:"message"`
}

func (e *UnAuthorizedError) Error() string {
	return e.Message
}

func NewUnAuthorizedError(message string) *UnAuthorizedError {
	return &UnAuthorizedError{
		Message: message,
	}
}

func IsUnAuthorizedError(err error) bool {
	var unAuthorizedError *UnAuthorizedError
	ok := errors.As(err, &unAuthorizedError)
	return ok
}

type NotFoundError struct {
	Message string `json:"message"`
}

func (e *NotFoundError) Error() string {
	return e.Message
}

func NewNotFoundError(message string) *NotFoundError {
	return &NotFoundError{
		Message: message,
	}
}

func IsNotFoundError(err error) bool {
	var notFoundError *NotFoundError
	ok := errors.As(err, &notFoundError)
	return ok
}

type InternalServerError struct {
	Message string `json:"message"`
}

func (e *InternalServerError) Error() string {
	return e.Message
}

func NewInternalServerError(message string) *InternalServerError {
	return &InternalServerError{
		Message: message,
	}
}
