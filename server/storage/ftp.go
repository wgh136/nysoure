package storage

import (
	"encoding/json"
	"errors"
	"os"
	"path"
	"time"

	"github.com/gofiber/fiber/v3/log"
	"github.com/google/uuid"
	"github.com/jlaffaye/ftp"
)

type FTPStorage struct {
	Host     string // FTP服务器地址，例如: "ftp.example.com:21"
	Username string // FTP用户名
	Password string // FTP密码
	BasePath string // FTP服务器上的基础路径，例如: "/uploads"
	Domain   string // 文件服务器域名，用于生成下载链接，例如: "files.example.com"
}

func (f *FTPStorage) Upload(filePath string, fileName string) (string, error) {
	// 连接到FTP服务器
	conn, err := ftp.Dial(f.Host, ftp.DialWithTimeout(10*time.Second), ftp.DialWithExplicitTLS(nil))
	if err != nil {
		log.Error("Failed to connect to FTP server: ", err)
		return "", errors.New("failed to connect to FTP server")
	}
	defer conn.Quit()

	// 登录
	err = conn.Login(f.Username, f.Password)
	if err != nil {
		log.Error("Failed to login to FTP server: ", err)
		return "", errors.New("failed to login to FTP server")
	}

	// 生成唯一的存储键
	storageKey := uuid.NewString() + "/" + fileName
	remotePath := path.Join(f.BasePath, storageKey)

	// 创建远程目录
	remoteDir := path.Dir(remotePath)
	err = f.createRemoteDir(conn, remoteDir)
	if err != nil {
		log.Error("Failed to create remote directory: ", err)
		return "", errors.New("failed to create remote directory")
	}

	// 打开本地文件
	file, err := os.Open(filePath)
	if err != nil {
		log.Error("Failed to open local file: ", err)
		return "", errors.New("failed to open local file")
	}
	defer file.Close()

	// 上传文件
	err = conn.Stor(remotePath, file)
	if err != nil {
		log.Error("Failed to upload file to FTP server: ", err)
		return "", errors.New("failed to upload file to FTP server")
	}

	return storageKey, nil
}

func (f *FTPStorage) Download(storageKey string, fileName string) (string, error) {
	// 返回文件下载链接：域名 + 存储键
	if f.Domain == "" {
		return "", errors.New("domain is not configured")
	}
	return "https://" + f.Domain + "/" + storageKey, nil
}

func (f *FTPStorage) Delete(storageKey string) error {
	// 连接到FTP服务器
	conn, err := ftp.Dial(f.Host, ftp.DialWithTimeout(10*time.Second), ftp.DialWithExplicitTLS(nil))
	if err != nil {
		log.Error("Failed to connect to FTP server: ", err)
		return errors.New("failed to connect to FTP server")
	}
	defer conn.Quit()

	// 登录
	err = conn.Login(f.Username, f.Password)
	if err != nil {
		log.Error("Failed to login to FTP server: ", err)
		return errors.New("failed to login to FTP server")
	}

	// 删除文件
	remotePath := path.Join(f.BasePath, storageKey)
	err = conn.Delete(remotePath)
	if err != nil {
		log.Error("Failed to delete file from FTP server: ", err)
		return errors.New("failed to delete file from FTP server")
	}

	return nil
}

func (f *FTPStorage) ToString() string {
	data, _ := json.Marshal(f)
	return string(data)
}

func (f *FTPStorage) FromString(config string) error {
	var ftpConfig FTPStorage
	if err := json.Unmarshal([]byte(config), &ftpConfig); err != nil {
		return err
	}
	f.Host = ftpConfig.Host
	f.Username = ftpConfig.Username
	f.Password = ftpConfig.Password
	f.BasePath = ftpConfig.BasePath
	f.Domain = ftpConfig.Domain

	if f.Host == "" || f.Username == "" || f.Password == "" || f.Domain == "" {
		return errors.New("invalid FTP configuration")
	}
	if f.BasePath == "" {
		f.BasePath = "/"
	}
	return nil
}

func (f *FTPStorage) Type() string {
	return "ftp"
}

// createRemoteDir 递归创建远程目录
func (f *FTPStorage) createRemoteDir(conn *ftp.ServerConn, dirPath string) error {
	if dirPath == "" || dirPath == "/" || dirPath == "." {
		return nil
	}

	// 尝试进入目录，如果失败则创建
	err := conn.ChangeDir(dirPath)
	if err == nil {
		// 目录存在，返回根目录
		conn.ChangeDir("/")
		return nil
	}

	// 递归创建父目录
	parentDir := path.Dir(dirPath)
	if parentDir != dirPath {
		err = f.createRemoteDir(conn, parentDir)
		if err != nil {
			return err
		}
	}

	// 创建当前目录
	err = conn.MakeDir(dirPath)
	if err != nil {
		// 忽略目录已存在的错误
		return nil
	}

	return nil
}
