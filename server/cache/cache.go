package cache

import (
	"context"
	"os"
	"time"

	"github.com/redis/go-redis/v9"
)

var (
	client *redis.Client
	ctx    = context.Background()
)

func init() {
	host := os.Getenv("REDIS_HOST")
	port := os.Getenv("REDIS_PORT")

	if host == "" {
		host = "localhost"
	}
	if port == "" {
		port = "6379"
	}

	client = redis.NewClient(&redis.Options{
		Addr: host + ":" + port,
	})
}

func Get(key string) (string, error) {
	val, err := client.Get(ctx, key).Result()
	if err != nil {
		return "", err
	}
	return val, nil
}

func Set(key, value string, expiration time.Duration) error {
	return client.Set(ctx, key, value, expiration).Err()
}
