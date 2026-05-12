package redis

import (
	"context"
	"log"

	"sanrio-coffee-api/config"

	"github.com/redis/go-redis/v9"
)

type noopLogger struct{}

func (noopLogger) Printf(_ context.Context, _ string, _ ...interface{}) {}

func NewClient(cfg config.RedisConfig) *redis.Client {
	redis.SetLogger(&noopLogger{})

	client := redis.NewClient(&redis.Options{
		Addr:     cfg.Addr,
		Password: cfg.Password,
		DB:       cfg.DB,
	})

	if err := client.Ping(context.Background()).Err(); err != nil {
		log.Printf("WARNING: Redis unavailable — caching disabled")
		return nil
	}

	return client
}
