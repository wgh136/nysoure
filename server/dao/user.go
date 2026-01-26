package dao

import (
	"errors"
	"nysoure/server/model"

	"gorm.io/gorm"
)

func CreateUser(username string, hashedPassword []byte) (model.User, error) {
	isEmpty, err := IsUserDataBaseEmpty()
	if err != nil {
		return model.User{}, err
	}
	user := model.User{
		Username:     username,
		PasswordHash: hashedPassword,
	}
	if isEmpty {
		user.Permission = model.PermissionAdmin
	}
	exists, err := ExistsUser(username)
	if err != nil {
		return user, err
	}
	if exists {
		return user, model.NewRequestError("User already exists")
	}
	if err := db.Create(&user).Error; err != nil {
		return user, err
	}
	return user, nil
}

func ExistsUser(username string) (bool, error) {
	var count int64
	if err := db.Unscoped().Model(&model.User{}).Where("username = ?", username).Count(&count).Error; err != nil {
		return false, err
	}
	return count > 0, nil
}

func ExistsUserByID(id uint) (bool, error) {
	var count int64
	if err := db.Model(&model.User{}).Where("id = ?", id).Count(&count).Error; err != nil {
		return false, err
	}
	return count > 0, nil
}

func GetUserByUsername(username string) (model.User, error) {
	var user model.User
	if err := db.Where("username = ?", username).First(&user).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return user, model.NewNotFoundError("User not found")
		}
		return user, err
	}
	return user, nil
}

func GetUserByID(id uint) (model.User, error) {
	var user model.User
	if err := db.First(&user, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return user, model.NewNotFoundError("User not found")
		}
		return user, err
	}
	return user, nil
}

func UpdateUser(user model.User) error {
	if err := db.Save(&user).Error; err != nil {
		return err
	}
	return nil
}

func IsUserDataBaseEmpty() (bool, error) {
	var user model.User
	if err := db.First(&user).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return true, nil
		}
		return false, err
	}
	return false, nil
}

func ListUsers(page, pageSize int) ([]model.User, int64, error) {
	var users []model.User
	var total int64

	if err := db.Model(&model.User{}).Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * pageSize
	if err := db.Offset(offset).Limit(pageSize).Order("id desc").Find(&users).Error; err != nil {
		return nil, 0, err
	}

	return users, total, nil
}

func SearchUsersByUsername(username string, page, pageSize int) ([]model.User, int64, error) {
	var users []model.User
	var total int64

	if err := db.Model(&model.User{}).Where("username LIKE ?", "%"+username+"%").Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * pageSize
	if err := db.Where("username LIKE ?", "%"+username+"%").Offset(offset).Limit(pageSize).Order("id desc").Find(&users).Error; err != nil {
		return nil, 0, err
	}

	return users, total, nil
}

func DeleteUser(id uint) error {
	var user model.User
	if err := db.First(&user, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil
		}
		return err
	}
	return db.Delete(&model.User{}, id).Error
}

func ResetUserNotificationsCount(userID uint) error {
	return db.Model(&model.User{}).Where("id = ?", userID).Update("unread_notifications_count", 0).Error
}

func GetUserNotificationCount(userID uint) (uint, error) {
	var count uint
	if err := db.Model(&model.User{}).Where("id = ?", userID).Select("unread_notifications_count").Scan(&count).Error; err != nil {
		return 0, err
	}
	return count, nil
}

func BanUser(userID uint) error {
	return db.Model(&model.User{}).Where("id = ?", userID).Update("banned", true).Error
}

func UnbanUser(userID uint) error {
	return db.Model(&model.User{}).Where("id = ?", userID).Update("banned", false).Error
}

func ListBannedUsers(page, pageSize int) ([]model.User, int64, error) {
	var users []model.User
	var total int64

	if err := db.Model(&model.User{}).Where("banned = ?", true).Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * pageSize
	if err := db.Where("banned = ?", true).Offset(offset).Limit(pageSize).Order("id desc").Find(&users).Error; err != nil {
		return nil, 0, err
	}

	return users, total, nil
}

func GetUserPermission(id uint) (model.Permission, error) {
	var permission model.Permission
	if err := db.Model(&model.User{}).Where("id = ?", id).Select("permission").Scan(&permission).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return model.PermissionNone, model.NewNotFoundError("User not found")
		}
		return model.PermissionNone, err
	}
	return permission, nil
}
