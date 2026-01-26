package api

import (
	"nysoure/server/config"
	"nysoure/server/ctx"
	"nysoure/server/model"
	"nysoure/server/service"
	"time"

	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/log"
)

func getServerConfig(c fiber.Ctx) error {
	ctx := ctx.NewContext(c)
	if ctx.UserPermission() != model.PermissionAdmin {
		return model.NewUnAuthorizedError("You do not have permission to access this resource")
	}
	sc := config.GetConfig()
	return c.JSON(model.Response[config.ServerConfig]{
		Success: true,
		Data:    sc,
	})
}

func setServerConfig(c fiber.Ctx) error {
	ctx := ctx.NewContext(c)
	if ctx.UserPermission() != model.PermissionAdmin {
		return model.NewUnAuthorizedError("You do not have permission to access this resource")
	}

	var sc config.ServerConfig
	if err := c.Bind().Body(&sc); err != nil {
		return model.NewRequestError("Invalid request parameters")
	}

	if err := config.SetConfig(sc); err != nil {
		return model.NewInternalServerError("Failed to save configuration")
	}

	if err := sc.Validate(); err != nil {
		return model.NewRequestError(err.Error())
	}

	return c.JSON(model.Response[any]{
		Success: true,
	})
}

func getStatistics(c fiber.Ctx) error {
	s, err := service.GetStatistic()
	if err != nil {
		return model.NewInternalServerError("Failed to get statistics")
	}
	return c.JSON(model.Response[*service.Statistic]{
		Success: true,
		Data:    s,
	})
}

func getFrontendConfig(c fiber.Ctx) error {
	sc := config.GetConfig()
	ctx := ctx.NewContext(c)
	var user *model.UserView
	if ctx.LoggedIn() {
		u, err := service.GetMe(ctx)
		if err == nil {
			user = &u.UserView
			c.Cookie(&fiber.Cookie{
				Name:     "token",
				Value:    u.Token,
				Expires:  time.Now().Add(7 * 24 * time.Hour),
				HTTPOnly: true,
				Secure:   true,
				SameSite: "Strict",
			})
		}
	}
	random, err := service.RandomCover()
	if err != nil {
		log.Error("Failed to get random cover: ", err)
		random = 0
	}
	pinned, err := service.GetPinnedResources()
	if err != nil {
		log.Error("Failed to get pinned resources: ", err)
		pinned = []model.ResourceView{}
	}
	return c.JSON(model.Response[any]{
		Success: true,
		Data: map[string]any{
			"user":                              user,
			"server_name":                       sc.ServerName,
			"pinned_resources":                  pinned,
			"allow_register":                    sc.AllowRegister,
			"allow_normal_user_upload":          sc.AllowNormalUserUpload,
			"max_normal_user_upload_size_in_mb": sc.MaxNormalUserUploadSizeInMB,
			"upload_prompt":                     sc.UploadPrompt,
			"site_info":                         sc.SiteInfo,
			"site_description":                  sc.ServerDescription,
			"private_deployment":                config.PrivateDeployment(),
			"background":                        random,
		},
	})
}

func AddConfigRoutes(r fiber.Router) {
	configGroup := r.Group("/config")
	{
		configGroup.Get("/", getServerConfig)
		configGroup.Post("/", setServerConfig)
		configGroup.Get("/frontend", getFrontendConfig)
		configGroup.Get("/statistics", getStatistics)
	}
}
