package service

import "nysoure/server/dao"

func checkUserCanUpload(uid uint) (bool, error) {
	user, err := dao.GetUserByID(uid)
	if err != nil {
		return false, err
	}
	return user.IsAdmin || user.CanUpload, nil
}

func CheckUserIsAdmin(uid uint) (bool, error) {
	user, err := dao.GetUserByID(uid)
	if err != nil {
		return false, err
	}
	return user.IsAdmin, nil
}
