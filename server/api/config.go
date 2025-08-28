package api

import (
	"nysoure/server/config"
	"nysoure/server/model"
	"nysoure/server/service"

	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/log"
)

func getServerConfig(c fiber.Ctx) error {
	uid, ok := c.Locals("uid").(uint)
	if !ok {
		return model.NewRequestError("You are not logged in")
	}
	isAdmin, err := service.CheckUserIsAdmin(uid)
	if err != nil {
		log.Error("Error checking user admin status: ", err)
		return model.NewInternalServerError("Error checking user admin status")
	}
	if !isAdmin {
		return model.NewUnAuthorizedError("You do not have permission to access this resource")
	}
	sc := config.GetConfig()
	return c.JSON(model.Response[config.ServerConfig]{
		Success: true,
		Data:    sc,
	})
}

func setServerConfig(c fiber.Ctx) error {
	uid, ok := c.Locals("uid").(uint)
	if !ok {
		return model.NewRequestError("You are not logged in")
	}
	isAdmin, err := service.CheckUserIsAdmin(uid)
	if err != nil {
		log.Error("Error checking user admin status: ", err)
		return model.NewInternalServerError("Error checking user admin status")
	}
	if !isAdmin {
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

func AddConfigRoutes(r fiber.Router) {
	configGroup := r.Group("/config")
	{
		configGroup.Get("/", getServerConfig)
		configGroup.Post("/", setServerConfig)
	}
}
