package utils

import (
	"hash/fnv"
	"sync"
	"time"
)

const numShards = 32

type shard struct {
	mu           sync.Mutex
	requestsByIP map[string]int
}

type RequestLimiter struct {
	limit  func() int
	shards [numShards]*shard
}

func NewRequestLimiter(limit func() int, duration time.Duration) *RequestLimiter {
	l := &RequestLimiter{
		limit: limit,
	}

	for i := 0; i < numShards; i++ {
		l.shards[i] = &shard{
			requestsByIP: make(map[string]int),
		}
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

func (rl *RequestLimiter) getShard(ip string) *shard {
	h := fnv.New32a()
	h.Write([]byte(ip))
	return rl.shards[h.Sum32()%numShards]
}

func (rl *RequestLimiter) AllowRequest(ip string) bool {
	shard := rl.getShard(ip)
	shard.mu.Lock()
	defer shard.mu.Unlock()

	count, exists := shard.requestsByIP[ip]
	if !exists {
		count = 0
	}

	if count >= rl.limit() {
		return false // Exceeded request limit for this IP
	}

	shard.requestsByIP[ip] = count + 1
	return true // Request allowed
}

func (rl *RequestLimiter) resetCounts() {
	var wg sync.WaitGroup
	for i := 0; i < numShards; i++ {
		wg.Add(1)
		go func(s *shard) {
			defer wg.Done()
			s.mu.Lock()
			defer s.mu.Unlock()
			s.requestsByIP = make(map[string]int)
		}(rl.shards[i])
	}
	wg.Wait()
}
