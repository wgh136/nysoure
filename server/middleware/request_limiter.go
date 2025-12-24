package middleware

import (
	"nysoure/server/utils"
	"time"

	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/log"
)

func NewRequestLimiter(maxRequests int, duration time.Duration) func(c fiber.Ctx) error {
	limiter := utils.NewRequestLimiter(func() int {
		return maxRequests
	}, duration)

	return func(c fiber.Ctx) error {
		dev_access := c.Locals("dev_access").(bool)
		if dev_access {
			return c.Next()
		}
		if !limiter.AllowRequest(c.IP()) {
			log.Warnf("IP %s has exceeded the request limit of %d requests in %s", c.IP(), maxRequests, duration)
			return fiber.NewError(fiber.StatusTooManyRequests, "Too many requests")
		}
		return c.Next()
	}
}

func NewDynamicRequestLimiter(maxRequestsFunc func() int, duration time.Duration) func(c fiber.Ctx) error {
	limiter := utils.NewRequestLimiter(maxRequestsFunc, duration)

	return func(c fiber.Ctx) error {
		dev_access := c.Locals("dev_access").(bool)
		if dev_access {
			return c.Next()
		}
		if !limiter.AllowRequest(c.IP()) {
			return fiber.NewError(fiber.StatusTooManyRequests, "Too many requests")
		}
		return c.Next()
	}
}
