package service

import (
	"errors"
	"fmt"
	"nysoure/server/config"
	"nysoure/server/dao"
	"nysoure/server/model"
	"nysoure/server/static"
	"nysoure/server/utils"
	"os"
	"strconv"
	"sync"
	"time"
	"unicode"

	"github.com/gofiber/fiber/v3/log"

	"golang.org/x/crypto/bcrypt"
)

const (
	embedAvatarCount = 1
)

type UserLoginAttempt struct {
	Attempts    uint
	LockedUntil *time.Time
	mu          sync.Mutex
}

var loginAttempts = sync.Map{}

func addLoginAttempt(username string) {
	val, _ := loginAttempts.LoadOrStore(username, &UserLoginAttempt{})
	attempt := val.(*UserLoginAttempt)
	attempt.mu.Lock()
	defer attempt.mu.Unlock()
	attempt.Attempts++
	if attempt.Attempts >= 5 {
		lockDuration := time.Duration(5*(1+attempt.Attempts/5)) * time.Minute
		until := time.Now().Add(lockDuration)
		attempt.LockedUntil = &until
	}
}

func resetLoginAttempts(username string) {
	loginAttempts.Delete(username)
}

func isUserLocked(username string) bool {
	attempts, ok := loginAttempts.Load(username)
	if !ok {
		return false
	}
	if attempts.(*UserLoginAttempt).LockedUntil == nil {
		return false
	}
	if time.Now().After(*attempts.(*UserLoginAttempt).LockedUntil) {
		loginAttempts.Delete(username)
		return false
	}
	return true
}

func CreateUser(username, password, cfToken string) (model.UserViewWithToken, error) {
	if !config.AllowRegister() {
		return model.UserViewWithToken{}, model.NewRequestError("User registration is not allowed")
	}

	if err := validateUsername(username); err != nil {
		return model.UserViewWithToken{}, err
	}

	if len(password) < 6 || len(password) > 20 {
		return model.UserViewWithToken{}, model.NewRequestError("Password must be between 6 and 20 characters")
	}
	passed, err := verifyCfToken(cfToken)
	if err != nil {
		log.Error("Error verifying Cloudflare token:", err)
		return model.UserViewWithToken{}, model.NewInternalServerError("Failed to verify Cloudflare token")
	}
	if !passed {
		return model.UserViewWithToken{}, model.NewRequestError("invalid Cloudflare token")
	}
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return model.UserViewWithToken{}, err
	}
	user, err := dao.CreateUser(username, hashedPassword)
	if err != nil {
		return model.UserViewWithToken{}, err
	}
	token, err := utils.GenerateToken(user.ID)
	if err != nil {
		return model.UserViewWithToken{}, err
	}
	return user.ToView().WithToken(token), nil
}

func Login(username, password string) (model.UserViewWithToken, error) {
	if isUserLocked(username) {
		return model.UserViewWithToken{}, model.NewRequestError("User is temporarily locked due to too many failed login attempts")
	}
	user, err := dao.GetUserByUsername(username)
	if err != nil {
		if model.IsNotFoundError(err) {
			return model.UserViewWithToken{}, model.NewRequestError("User not found")
		}
		return model.UserViewWithToken{}, err
	}
	if err := bcrypt.CompareHashAndPassword(user.PasswordHash, []byte(password)); err != nil {
		addLoginAttempt(username)
		return model.UserViewWithToken{}, model.NewRequestError("Invalid password")
	}
	resetLoginAttempts(username)
	token, err := utils.GenerateToken(user.ID)
	if err != nil {
		return model.UserViewWithToken{}, err
	}
	return user.ToView().WithToken(token), nil
}

func ChangePassword(id uint, oldPassword, newPassword string) (model.UserViewWithToken, error) {
	user, err := dao.GetUserByID(id)
	if err != nil {
		return model.UserViewWithToken{}, err
	}
	if err := bcrypt.CompareHashAndPassword(user.PasswordHash, []byte(oldPassword)); err != nil {
		return model.UserViewWithToken{}, model.NewUnAuthorizedError("Invalid old password")
	}
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return model.UserViewWithToken{}, err
	}
	user.PasswordHash = hashedPassword
	if err := dao.UpdateUser(user); err != nil {
		return model.UserViewWithToken{}, err
	}
	token, err := utils.GenerateToken(user.ID)
	if err != nil {
		return model.UserViewWithToken{}, err
	}
	return user.ToView().WithToken(token), nil
}

func ChangeAvatar(id uint, image []byte) (model.UserView, error) {
	user, err := dao.GetUserByID(id)
	if err != nil {
		return model.UserView{}, err
	}
	if len(image) > 4*1024*1024 {
		return model.UserView{}, errors.New("image size is too large")
	}
	avatarDir := utils.GetStoragePath() + "/avatar"
	if _, err := os.Stat(avatarDir); os.IsNotExist(err) {
		if err := os.MkdirAll(avatarDir, os.ModePerm); err != nil {
			return model.UserView{}, errors.New("failed to create avatar directory")
		}
	}
	avatarPath := avatarDir + "/" + strconv.Itoa(int(user.ID))
	if err := os.WriteFile(avatarPath, image, 0644); err != nil {
		return model.UserView{}, errors.New("failed to save avatar")
	}
	user.AvatarVersion++
	if err := dao.UpdateUser(user); err != nil {
		return model.UserView{}, err
	}
	return user.ToView(), nil
}

func GetAvatar(id uint) ([]byte, error) {
	avatarPath := utils.GetStoragePath() + "/avatar/" + strconv.Itoa(int(id))
	if _, err := os.Stat(avatarPath); os.IsNotExist(err) {
		return getEmbedAvatar(id)
	}
	image, err := os.ReadFile(avatarPath)
	if err != nil {
		return nil, errors.New("failed to read avatar")
	}
	return image, nil
}

func getEmbedAvatar(id uint) ([]byte, error) {
	fileIndex := id%embedAvatarCount + 1
	fileName := fmt.Sprintf("avatars/%d.png", fileIndex)
	return static.Static.ReadFile(fileName)
}

func SetUserAdmin(adminID uint, targetUserID uint, isAdmin bool) (model.UserView, error) {
	if adminID == targetUserID {
		return model.UserView{}, model.NewRequestError("You cannot modify your own admin status")
	}

	adminUser, err := dao.GetUserByID(adminID)
	if err != nil {
		return model.UserView{}, err
	}

	if !adminUser.IsAdmin {
		return model.UserView{}, model.NewUnAuthorizedError("Only administrators can modify admin status")
	}

	targetUser, err := dao.GetUserByID(targetUserID)
	if err != nil {
		return model.UserView{}, err
	}

	targetUser.IsAdmin = isAdmin

	if err := dao.UpdateUser(targetUser); err != nil {
		return model.UserView{}, err
	}

	return targetUser.ToView(), nil
}

func SetUserUploadPermission(adminID uint, targetUserID uint, canUpload bool) (model.UserView, error) {
	adminUser, err := dao.GetUserByID(adminID)
	if err != nil {
		return model.UserView{}, err
	}

	if !adminUser.IsAdmin {
		return model.UserView{}, model.NewUnAuthorizedError("Only administrators can modify upload permissions")
	}

	targetUser, err := dao.GetUserByID(targetUserID)
	if err != nil {
		return model.UserView{}, err
	}

	targetUser.CanUpload = canUpload

	if err := dao.UpdateUser(targetUser); err != nil {
		return model.UserView{}, err
	}

	return targetUser.ToView(), nil
}

func ListUsers(adminID uint, page int) ([]model.UserView, int, error) {
	admin, err := dao.GetUserByID(adminID)
	if err != nil {
		return nil, 0, err
	}

	if !admin.IsAdmin {
		return nil, 0, model.NewUnAuthorizedError("Only administrators can list users")
	}

	if page < 1 {
		page = 1
	}
	pageSize := 10

	users, total, err := dao.ListUsers(page, pageSize)
	if err != nil {
		return nil, 0, err
	}

	userViews := make([]model.UserView, len(users))
	for i, user := range users {
		userViews[i] = user.ToView()
	}

	totalPages := int((total + int64(pageSize) - 1) / int64(pageSize))
	return userViews, totalPages, nil
}

func SearchUsers(adminID uint, username string, page int) ([]model.UserView, int, error) {
	admin, err := dao.GetUserByID(adminID)
	if err != nil {
		return nil, 0, err
	}

	if !admin.IsAdmin {
		return nil, 0, model.NewUnAuthorizedError("Only administrators can search users")
	}

	if page < 1 {
		page = 1
	}
	pageSize := 10

	users, total, err := dao.SearchUsersByUsername(username, page, pageSize)
	if err != nil {
		return nil, 0, err
	}

	userViews := make([]model.UserView, len(users))
	for i, user := range users {
		userViews[i] = user.ToView()
	}

	totalPages := int((total + int64(pageSize) - 1) / int64(pageSize))
	return userViews, totalPages, nil
}

func DeleteUser(adminID uint, targetUserID uint) error {
	admin, err := dao.GetUserByID(adminID)
	if err != nil {
		return err
	}

	if !admin.IsAdmin {
		return model.NewUnAuthorizedError("Only administrators can delete users")
	}

	// Check if user is trying to delete themselves
	if adminID == targetUserID {
		return model.NewRequestError("You cannot delete your own account")
	}

	// Check if target user exists
	_, err = dao.GetUserByID(targetUserID)
	if err != nil {
		return err
	}

	return dao.DeleteUser(targetUserID)
}

func GetUserByUsername(username string) (model.UserView, error) {
	user, err := dao.GetUserByUsername(username)
	if err != nil {
		return model.UserView{}, err
	}
	return user.ToView(), nil
}

func ChangeUsername(uid uint, newUsername string) (model.UserView, error) {
	if err := validateUsername(newUsername); err != nil {
		return model.UserView{}, err
	}

	user, err := dao.GetUserByID(uid)
	if err != nil {
		return model.UserView{}, err
	}
	user.Username = newUsername
	if err := dao.UpdateUser(user); err != nil {
		return model.UserView{}, err
	}
	return user.ToView(), nil
}

func SetUserBio(uid uint, bio string) (model.UserView, error) {
	if len(bio) > 200 {
		return model.UserView{}, model.NewRequestError("Bio must be less than 200 characters")
	}
	user, err := dao.GetUserByID(uid)
	if err != nil {
		return model.UserView{}, err
	}
	user.Bio = bio
	if err := dao.UpdateUser(user); err != nil {
		return model.UserView{}, err
	}
	return user.ToView(), nil
}

func GetMe(uid uint) (model.UserViewWithToken, error) {
	user, err := dao.GetUserByID(uid)
	if err != nil {
		return model.UserViewWithToken{}, err
	}
	token, err := utils.GenerateToken(user.ID)
	if err != nil {
		return model.UserViewWithToken{}, err
	}
	return user.ToView().WithToken(token), nil
}

func validateUsername(username string) error {
	usernameLen := len([]rune(username))
	if usernameLen < 3 || usernameLen > 20 {
		return model.NewRequestError("Username must be between 3 and 20 characters")
	}
	for _, r := range username {
		if r == ' ' || r == '\n' || r == '\r' || r == '\t' || r == '\v' || r == '\f' {
			return model.NewRequestError("Username cannot contain whitespace characters")
		}
		if (r >= 0 && r <= 31) || r == 127 {
			return model.NewRequestError("Username cannot contain control characters")
		}
		if unicode.IsControl(r) || unicode.Is(unicode.C, r) {
			return model.NewRequestError("Username cannot contain invisible Unicode control characters")
		}
	}
	return nil
}
