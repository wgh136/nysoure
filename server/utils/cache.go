package utils

import "time"

type MemValueCache[T any] struct {
	value    T
	duration time.Duration
	expiry   time.Time
}

func NewMemValueCache[T any](duration time.Duration) *MemValueCache[T] {
	return &MemValueCache[T]{
		duration: duration,
	}
}

func (c *MemValueCache[T]) Get(fetchFunc func() (T, error)) (T, error) {
	var zero T
	if time.Now().Before(c.expiry) {
		return c.value, nil
	}
	v, err := fetchFunc()
	if err != nil {
		return zero, err
	}
	c.value = v
	c.expiry = time.Now().Add(c.duration)
	return v, nil
}
