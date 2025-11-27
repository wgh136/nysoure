package service

import (
	"nysoure/server/dao"
	"nysoure/server/model"
	"nysoure/server/storage"
	"os"

	"github.com/gofiber/fiber/v3/log"
)

type CreateS3StorageParams struct {
	Name            string `json:"name"`
	EndPoint        string `json:"endPoint"`
	AccessKeyID     string `json:"accessKeyID"`
	SecretAccessKey string `json:"secretAccessKey"`
	Domain          string `json:"domain"`
	BucketName      string `json:"bucketName"`
	MaxSizeInMB     uint   `json:"maxSizeInMB"`
}

func CreateS3Storage(uid uint, params CreateS3StorageParams) error {
	isAdmin, err := CheckUserIsAdmin(uid)
	if err != nil {
		log.Errorf("check user is admin failed: %s", err)
		return model.NewInternalServerError("check user is admin failed")
	}
	if !isAdmin {
		return model.NewUnAuthorizedError("only admin can create s3 storage")
	}
	s3 := storage.S3Storage{
		EndPoint:        params.EndPoint,
		AccessKeyID:     params.AccessKeyID,
		SecretAccessKey: params.SecretAccessKey,
		BucketName:      params.BucketName,
		Domain:          params.Domain,
	}
	s := model.Storage{
		Name:    params.Name,
		Type:    s3.Type(),
		Config:  s3.ToString(),
		MaxSize: int64(params.MaxSizeInMB) * 1024 * 1024,
	}
	_, err = dao.CreateStorage(s)
	return err
}

type CreateLocalStorageParams struct {
	Name        string `json:"name"`
	Path        string `json:"path"`
	MaxSizeInMB uint   `json:"maxSizeInMB"`
}

func CreateLocalStorage(uid uint, params CreateLocalStorageParams) error {
	isAdmin, err := CheckUserIsAdmin(uid)
	if err != nil {
		log.Errorf("check user is admin failed: %s", err)
		return model.NewInternalServerError("check user is admin failed")
	}
	if !isAdmin {
		return model.NewUnAuthorizedError("only admin can create local storage")
	}
	local := storage.LocalStorage{
		Path: params.Path,
	}
	err = os.MkdirAll(params.Path, os.ModePerm)
	if err != nil {
		log.Errorf("create local storage dir failed: %s", err)
		return model.NewInternalServerError("create local storage dir failed")
	}
	s := model.Storage{
		Name:    params.Name,
		Type:    local.Type(),
		Config:  local.ToString(),
		MaxSize: int64(params.MaxSizeInMB) * 1024 * 1024,
	}
	_, err = dao.CreateStorage(s)
	return err
}

type CreateFTPStorageParams struct {
	Name        string `json:"name"`
	Host        string `json:"host"`
	Username    string `json:"username"`
	Password    string `json:"password"`
	BasePath    string `json:"basePath"`
	Domain      string `json:"domain"`
	MaxSizeInMB uint   `json:"maxSizeInMB"`
}

func CreateFTPStorage(uid uint, params CreateFTPStorageParams) error {
	isAdmin, err := CheckUserIsAdmin(uid)
	if err != nil {
		log.Errorf("check user is admin failed: %s", err)
		return model.NewInternalServerError("check user is admin failed")
	}
	if !isAdmin {
		return model.NewUnAuthorizedError("only admin can create ftp storage")
	}
	ftp := storage.FTPStorage{
		Host:     params.Host,
		Username: params.Username,
		Password: params.Password,
		BasePath: params.BasePath,
		Domain:   params.Domain,
	}
	s := model.Storage{
		Name:    params.Name,
		Type:    ftp.Type(),
		Config:  ftp.ToString(),
		MaxSize: int64(params.MaxSizeInMB) * 1024 * 1024,
	}
	_, err = dao.CreateStorage(s)
	return err
}

func ListStorages() ([]model.StorageView, error) {
	storages, err := dao.GetStorages()
	if err != nil {
		return nil, err
	}
	var result []model.StorageView
	for _, s := range storages {
		result = append(result, s.ToView())
	}
	return result, nil
}

func DeleteStorage(uid, id uint) error {
	isAdmin, err := CheckUserIsAdmin(uid)
	if err != nil {
		log.Errorf("check user is admin failed: %s", err)
		return model.NewInternalServerError("check user is admin failed")
	}
	if !isAdmin {
		return model.NewUnAuthorizedError("only admin can delete storage")
	}
	err = dao.DeleteStorage(id)
	if err != nil {
		return err
	}
	return nil
}

func SetDefaultStorage(uid, id uint) error {
	isAdmin, err := CheckUserIsAdmin(uid)
	if err != nil {
		log.Errorf("check user is admin failed: %s", err)
		return model.NewInternalServerError("check user is admin failed")
	}
	if !isAdmin {
		return model.NewUnAuthorizedError("only admin can set default storage")
	}
	err = dao.SetDefaultStorage(id)
	if err != nil {
		return err
	}
	return nil
}
