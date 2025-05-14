package api

import (
	"io"
	"net/http"
	"nysoure/server/model"
	"nysoure/server/service"
	"strconv"

	"github.com/gofiber/fiber/v3"
)

func handleUserRegister(c fiber.Ctx) error {
	username := c.FormValue("username")
	password := c.FormValue("password")
	if username == "" || password == "" {
		return model.NewRequestError("Username and password are required")
	}
	user, err := service.CreateUser(username, password)
	if err != nil {
		return err
	}
	return c.Status(fiber.StatusOK).JSON(model.Response[model.UserViewWithToken]{
		Success: true,
		Data:    user,
		Message: "User created successfully",
	})
}

func handleUserLogin(c fiber.Ctx) error {
	username := c.FormValue("username")
	password := c.FormValue("password")
	if username == "" || password == "" {
		return model.NewRequestError("Username and password are required")
	}
	user, err := service.Login(username, password)
	if err != nil {
		return err
	}
	return c.Status(fiber.StatusOK).JSON(model.Response[model.UserViewWithToken]{
		Success: true,
		Data:    user,
		Message: "Login successful",
	})
}

func handleUserChangePassword(c fiber.Ctx) error {
	uid, ok := c.Locals("uid").(uint)
	if !ok {
		return model.NewUnAuthorizedError("Unauthorized")
	}
	oldPassword := c.FormValue("old_password")
	newPassword := c.FormValue("new_password")
	if oldPassword == "" || newPassword == "" {
		return model.NewRequestError("Old and new passwords are required")
	}
	user, err := service.ChangePassword(uid, oldPassword, newPassword)
	if err != nil {
		return err
	}
	return c.Status(fiber.StatusOK).JSON(model.Response[model.UserViewWithToken]{
		Success: true,
		Data:    user,
		Message: "Password changed successfully",
	})
}

func handleUserChangeAvatar(c fiber.Ctx) error {
	uid, ok := c.Locals("uid").(uint)
	if !ok {
		return model.NewUnAuthorizedError("Unauthorized")
	}
	file, err := c.FormFile("avatar")
	if err != nil {
		return model.NewRequestError("Avatar file is required")
	}
	f, err := file.Open()
	if err != nil {
		return err
	}
	imageData, err := io.ReadAll(f)
	_ = f.Close()
	if err != nil {
		return err
	}
	user, err := service.ChangeAvatar(uid, imageData)
	if err != nil {
		return err
	}
	return c.Status(fiber.StatusOK).JSON(model.Response[model.UserView]{
		Success: true,
		Data:    user,
		Message: "Avatar changed successfully",
	})
}

func handleGetUserAvatar(c fiber.Ctx) error {
	idStr := c.Params("id")
	uid, err := strconv.Atoi(idStr)
	if err != nil {
		return model.NewRequestError("Invalid user ID")
	}
	avatar, err := service.GetAvatar(uint(uid))
	if err != nil {
		return err
	}
	contentType := http.DetectContentType(avatar)
	c.Set("Content-Type", contentType)
	c.Set("Cache-Control", "public, max-age=31536000")
	return c.Send(avatar)
}

func handleSetUserAdmin(c fiber.Ctx) error {
	adminID, ok := c.Locals("uid").(uint)
	if !ok {
		return model.NewUnAuthorizedError("Unauthorized")
	}

	userIDStr := c.FormValue("user_id")
	if userIDStr == "" {
		return model.NewRequestError("User ID is required")
	}

	userID, err := strconv.Atoi(userIDStr)
	if err != nil {
		return model.NewRequestError("Invalid user ID")
	}

	isAdminStr := c.FormValue("is_admin")
	if isAdminStr == "" {
		return model.NewRequestError("is_admin parameter is required")
	}

	isAdmin := isAdminStr == "true" || isAdminStr == "1"

	user, err := service.SetUserAdmin(adminID, uint(userID), isAdmin)
	if err != nil {
		return err
	}

	return c.Status(fiber.StatusOK).JSON(model.Response[model.UserView]{
		Success: true,
		Data:    user,
		Message: "User admin status updated successfully",
	})
}

func handleSetUserUploadPermission(c fiber.Ctx) error {
	adminID, ok := c.Locals("uid").(uint)
	if !ok {
		return model.NewUnAuthorizedError("Unauthorized")
	}

	userIDStr := c.FormValue("user_id")
	if userIDStr == "" {
		return model.NewRequestError("User ID is required")
	}

	userID, err := strconv.Atoi(userIDStr)
	if err != nil {
		return model.NewRequestError("Invalid user ID")
	}

	canUploadStr := c.FormValue("can_upload")
	if canUploadStr == "" {
		return model.NewRequestError("can_upload parameter is required")
	}

	canUpload := canUploadStr == "true" || canUploadStr == "1"

	user, err := service.SetUserUploadPermission(adminID, uint(userID), canUpload)
	if err != nil {
		return err
	}

	return c.Status(fiber.StatusOK).JSON(model.Response[model.UserView]{
		Success: true,
		Data:    user,
		Message: "User upload permission updated successfully",
	})
}

func handleListUsers(c fiber.Ctx) error {
	adminID, ok := c.Locals("uid").(uint)
	if !ok {
		return model.NewUnAuthorizedError("Unauthorized")
	}

	pageStr := c.Query("page", "1")
	page, err := strconv.Atoi(pageStr)
	if err != nil || page < 1 {
		page = 1
	}

	users, totalPages, err := service.ListUsers(adminID, page)
	if err != nil {
		return err
	}

	return c.Status(fiber.StatusOK).JSON(model.PageResponse[model.UserView]{
		Success:    true,
		TotalPages: totalPages,
		Data:       users,
		Message:    "Users retrieved successfully",
	})
}

func handleSearchUsers(c fiber.Ctx) error {
	adminID, ok := c.Locals("uid").(uint)
	if !ok {
		return model.NewUnAuthorizedError("Unauthorized")
	}

	username := c.Query("username", "")
	if username == "" {
		return model.NewRequestError("Username search parameter is required")
	}

	pageStr := c.Query("page", "1")
	page, err := strconv.Atoi(pageStr)
	if err != nil || page < 1 {
		page = 1
	}

	users, totalPages, err := service.SearchUsers(adminID, username, page)
	if err != nil {
		return err
	}

	return c.Status(fiber.StatusOK).JSON(model.PageResponse[model.UserView]{
		Success:    true,
		TotalPages: totalPages,
		Data:       users,
		Message:    "Users found successfully",
	})
}

func handleDeleteUser(c fiber.Ctx) error {
	adminID, ok := c.Locals("uid").(uint)
	if !ok {
		return model.NewUnAuthorizedError("Unauthorized")
	}

	userIDStr := c.FormValue("user_id")
	if userIDStr == "" {
		return model.NewRequestError("User ID is required")
	}

	userID, err := strconv.Atoi(userIDStr)
	if err != nil {
		return model.NewRequestError("Invalid user ID")
	}

	if err := service.DeleteUser(adminID, uint(userID)); err != nil {
		return err
	}

	return c.Status(fiber.StatusOK).JSON(model.Response[any]{
		Success: true,
		Message: "User deleted successfully",
	})
}

func handleGetUserInfo(c fiber.Ctx) error {
	username := c.Query("username", "")
	if username == "" {
		return model.NewRequestError("Username is required")
	}
	user, err := service.GetUserByUsername(username)
	if err != nil {
		return err
	}
	return c.Status(fiber.StatusOK).JSON(model.Response[model.UserView]{
		Success: true,
		Data:    user,
		Message: "User information retrieved successfully",
	})
}

func AddUserRoutes(r fiber.Router) {
	u := r.Group("user")
	u.Post("/register", handleUserRegister)
	u.Post("/login", handleUserLogin)
	u.Put("/avatar", handleUserChangeAvatar)
	u.Post("/password", handleUserChangePassword)
	u.Get("/avatar/:id", handleGetUserAvatar)
	u.Post("/set_admin", handleSetUserAdmin)
	u.Post("/set_upload_permission", handleSetUserUploadPermission)
	u.Get("/list", handleListUsers)
	u.Get("/search", handleSearchUsers)
	u.Post("/delete", handleDeleteUser)
	u.Get("/info", handleGetUserInfo)
}
