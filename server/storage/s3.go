package storage

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/url"
	"time"

	"github.com/gofiber/fiber/v3/log"
	"github.com/google/uuid"
	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
)

type S3Storage struct {
	EndPoint        string
	AccessKeyID     string
	SecretAccessKey string
	BucketName      string
	Domain          string
}

func (s *S3Storage) Upload(filePath string, fileName string) (string, error) {
	minioClient, err := minio.New(s.EndPoint, &minio.Options{
		Creds:  credentials.NewStaticV4(s.AccessKeyID, s.SecretAccessKey, ""),
		Secure: true,
	})
	if err != nil {
		log.Error("Failed to create S3 client: ", err)
		return "", errors.New("failed to create S3 client")
	}

	ctx := context.Background()
	objectKey := uuid.NewString()
	objectKey += "/" + fileName
	_, err = minioClient.FPutObject(ctx, s.BucketName, objectKey, filePath, minio.PutObjectOptions{})
	if err != nil {
		log.Error("Failed to upload file to S3: ", err)
		return "", errors.New("failed to upload file to S3")
	}

	return objectKey, nil
}

func (s *S3Storage) Download(storageKey string, fileName string) (string, error) {
	if s.Domain != "" {
		return "https://" + s.Domain + "/" + storageKey, nil
	}

	minioClient, err := minio.New(s.EndPoint, &minio.Options{
		Creds:  credentials.NewStaticV4(s.AccessKeyID, s.SecretAccessKey, ""),
		Secure: true,
	})
	if err != nil {
		log.Error("Failed to create S3 client: ", err)
		return "", errors.New("failed to create S3 client")
	}
	reqParams := make(url.Values)
	reqParams.Set("response-content-disposition", "attachment; filename=\""+url.QueryEscape(fileName)+"\"")
	presignedURL, err := minioClient.PresignedGetObject(context.Background(), s.BucketName, storageKey, 20*time.Second, reqParams)
	if err != nil {
		fmt.Println(err)
		return "", errors.New("failed to generate presigned URL")
	}
	return presignedURL.String(), nil
}

func (s *S3Storage) Delete(storageKey string) error {
	minioClient, err := minio.New(s.EndPoint, &minio.Options{
		Creds:  credentials.NewStaticV4(s.AccessKeyID, s.SecretAccessKey, ""),
		Secure: true,
	})
	if err != nil {
		log.Error("Failed to create S3 client: ", err)
		return errors.New("failed to create S3 client")
	}

	ctx := context.Background()
	err = minioClient.RemoveObject(ctx, s.BucketName, storageKey, minio.RemoveObjectOptions{})
	if err != nil {
		log.Error("Failed to delete file from S3: ", err)
		return errors.New("failed to delete file from S3")
	}
	return nil
}

func (s *S3Storage) ToString() string {
	data, _ := json.Marshal(s)
	return string(data)
}

func (s *S3Storage) FromString(config string) error {
	var s3Config S3Storage
	if err := json.Unmarshal([]byte(config), &s3Config); err != nil {
		return err
	}
	s.EndPoint = s3Config.EndPoint
	s.AccessKeyID = s3Config.AccessKeyID
	s.SecretAccessKey = s3Config.SecretAccessKey
	s.BucketName = s3Config.BucketName
	s.Domain = s3Config.Domain
	if s.EndPoint == "" || s.AccessKeyID == "" || s.SecretAccessKey == "" || s.BucketName == "" {
		return errors.New("invalid S3 configuration")
	}
	return nil
}

func (s *S3Storage) Type() string {
	return "s3"
}
