package ctx

import (
	"context"
	"nysoure/server/model"
	"time"

	"github.com/gofiber/fiber/v3"
)

type Context interface {
	context.Context
	Set(key string, value any)
	Get(key string) any
	FiberCtx() fiber.Ctx
	UserID() (uint, bool)
	MustUserID() uint
	MaybeUserID() uint
	LoggedIn() bool
	IsRealUser() bool
	IsDevAccess() bool
	UserPermission() model.Permission
}

type contextImpl struct {
	context.Context
	fiberCtx fiber.Ctx
}

func NewContext(fiberCtx fiber.Ctx) Context {
	return &contextImpl{
		Context:  context.Background(),
		fiberCtx: fiberCtx,
	}
}

func (c *contextImpl) Set(key string, value any) {
	c.fiberCtx.Locals(key, value)
}

func (c *contextImpl) Get(key string) any {
	return c.fiberCtx.Locals(key)
}

func (c *contextImpl) FiberCtx() fiber.Ctx {
	return c.fiberCtx
}

func (c *contextImpl) UserID() (uint, bool) {
	uid, ok := c.fiberCtx.Locals("uid").(uint)
	return uid, ok
}

func (c *contextImpl) MustUserID() uint {
	uid, ok := c.UserID()
	if !ok {
		panic("user ID not found")
	}
	return uid
}

func (c *contextImpl) MaybeUserID() uint {
	uid, ok := c.UserID()
	if !ok {
		return 0
	}
	return uid
}

func (c *contextImpl) LoggedIn() bool {
	_, ok := c.UserID()
	return ok
}

func (c *contextImpl) IsRealUser() bool {
	return c.fiberCtx.Locals("real_user").(bool)
}

func (c *contextImpl) IsDevAccess() bool {
	return c.fiberCtx.Locals("dev_access").(bool)
}

func (c *contextImpl) UserPermission() model.Permission {
	return c.fiberCtx.Locals("permission").(model.Permission)
}

// fakeContext 是一个简单的context实现,用于内部函数调用
type fakeContext struct {
	userID     uint
	permission model.Permission
}

// NewFakeContext 创建一个用于内部调用的fake context
func NewFakeContext(userID uint, permission model.Permission) Context {
	return &fakeContext{
		userID:     userID,
		permission: permission,
	}
}

func (f *fakeContext) Deadline() (time.Time, bool)      { return time.Time{}, false }
func (f *fakeContext) Done() <-chan struct{}            { return nil }
func (f *fakeContext) Err() error                       { return nil }
func (f *fakeContext) Value(key any) any                { return nil }
func (f *fakeContext) Set(key string, value any)        {}
func (f *fakeContext) Get(key string) any               { return nil }
func (f *fakeContext) FiberCtx() fiber.Ctx              { return nil }
func (f *fakeContext) UserID() (uint, bool)             { return f.userID, true }
func (f *fakeContext) MustUserID() uint                 { return f.userID }
func (f *fakeContext) MaybeUserID() uint                { return f.userID }
func (f *fakeContext) LoggedIn() bool                   { return true }
func (f *fakeContext) IsRealUser() bool                 { return false }
func (f *fakeContext) IsDevAccess() bool                { return false }
func (f *fakeContext) UserPermission() model.Permission { return f.permission }
