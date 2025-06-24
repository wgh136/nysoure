package utils

import (
	"sync"
	"time"
)

type RequestLimiter struct {
	limit        int
	requestsByIP map[string]int
	mu           sync.Mutex
}

func NewRequestLimiter(limit int, duration time.Duration) *RequestLimiter {
	l := &RequestLimiter{
		limit:        limit,
		requestsByIP: make(map[string]int),
	}

	if duration > 0 {
		go func() {
			for {
				time.Sleep(duration)
				l.resetCounts()
			}
		}()
	}

	return l
}

func (rl *RequestLimiter) AllowRequest(ip string) bool {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	count, exists := rl.requestsByIP[ip]
	if !exists {
		count = 0
	}

	if count >= rl.limit {
		return false // Exceeded request limit for this IP
	}

	rl.requestsByIP[ip] = count + 1
	return true // Request allowed
}

func (rl *RequestLimiter) resetCounts() {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	rl.requestsByIP = make(map[string]int) // Reset all counts
}
