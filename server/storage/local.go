package storage

import (
	"io"
	"os"

	"github.com/google/uuid"
)

type LocalStorage struct {
	Path string
}

func (s *LocalStorage) Upload(filePath string) (string, error) {
	id := uuid.New().String()
	inputPath := s.Path + "/" + id
	input, err := os.OpenFile(inputPath, os.O_RDWR|os.O_CREATE, 0755)
	if err != nil {
		return "", err
	}
	defer input.Close()
	output, err := os.Open(filePath)
	if err != nil {
		return "", err
	}
	defer output.Close()
	_, err = io.Copy(input, output)
	if err != nil {
		return "", err
	}
	return id, nil
}

func (s *LocalStorage) Download(storageKey string) (string, error) {
	path := s.Path + "/" + storageKey
	if _, err := os.Stat(path); os.IsNotExist(err) {
		return "", ErrFileUnavailable
	}
	return path, nil
}

func (s *LocalStorage) Delete(storageKey string) error {
	path := s.Path + "/" + storageKey
	if _, err := os.Stat(path); os.IsNotExist(err) {
		return nil
	}
	return os.Remove(path)
}

func (s *LocalStorage) ToString() string {
	return s.Path
}

func (s *LocalStorage) FromString(config string) error {
	s.Path = config
	return nil
}

func (s *LocalStorage) Type() string {
	return "local"
}
