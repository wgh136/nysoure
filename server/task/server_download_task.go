package task

import (
	"bufio"
	"context"
	"crypto/md5"
	"encoding/hex"
	"errors"
	"io"
	"net/http"
	"nysoure/server/dao"
	"nysoure/server/model"
	"nysoure/server/storage"
	"nysoure/server/utils"
	"os"
	"path/filepath"
	"sync"
	"sync/atomic"
	"time"

	"github.com/gofiber/fiber/v3/log"
	"github.com/google/uuid"
)

type ServerDownloadTask struct {
	id            string
	fileID        uint
	fileUUID      string
	url           string
	filename      string
	storageID     uint
	contentLength int64

	ctx    context.Context
	cancel context.CancelFunc

	downloadedBytes atomic.Int64

	mu         sync.RWMutex
	status     TaskStatus
	err        error
	finishTime time.Time
}

func NewServerDownloadTask(fileID uint, fileUUID, url, filename string, storageID uint, contentLength int64) *ServerDownloadTask {
	ctx, cancel := context.WithCancel(context.Background())
	return &ServerDownloadTask{
		id:            uuid.NewString(),
		fileID:        fileID,
		fileUUID:      fileUUID,
		url:           url,
		filename:      filename,
		storageID:     storageID,
		contentLength: contentLength,
		ctx:           ctx,
		cancel:        cancel,
		status:        TaskStatusPending,
	}
}

func (t *ServerDownloadTask) ID() string {
	return t.id
}

func (t *ServerDownloadTask) Run() error {
	if !t.setRunning() {
		return model.NewRequestError("task is already finished")
	}
	defer t.cancel()

	defer func() {
		_ = dao.UpdateStatistic("uploading_size", -t.contentLength)
	}()

	go t.watchFileDeletion()

	tempDir := filepath.Join(utils.GetStoragePath(), "temp")
	if err := os.MkdirAll(tempDir, os.ModePerm); err != nil {
		log.Error("failed to create temp dir: ", err)
		return t.failAndCleanupFile(model.NewInternalServerError("failed to create temp dir"))
	}

	tempPath := filepath.Join(tempDir, uuid.NewString())
	defer func() {
		if err := os.Remove(tempPath); err != nil && !errors.Is(err, os.ErrNotExist) {
			log.Error("failed to remove temp file: ", err)
		}
	}()

	var hash string
	var err error
	for attempt := 1; attempt <= 3; attempt++ {
		if err := t.ctx.Err(); err != nil {
			return t.handleCanceled()
		}

		t.downloadedBytes.Store(0)
		hash, err = downloadFileWithProgress(t.ctx, t.url, tempPath, func(downloaded int64) {
			t.downloadedBytes.Store(downloaded)
		})
		if err == nil {
			break
		}
		if errors.Is(err, context.Canceled) {
			return t.handleCanceled()
		}
		log.Error("failed to download file: ", err)
		if attempt == 3 {
			log.Error("Failed to download file after retries, deleting file record: ", t.fileUUID)
			return t.failAndCleanupFile(err)
		}
		log.Info("Retrying download... Attempt: ", attempt+1)
		time.Sleep(2 * time.Second)
	}

	if err := t.ctx.Err(); err != nil {
		return t.handleCanceled()
	}

	stat, err := os.Stat(tempPath)
	if err != nil {
		log.Error("failed to get temp file info: ", err)
		return t.failAndCleanupFile(model.NewInternalServerError("failed to get temp file info"))
	}
	size := stat.Size()
	if size == 0 {
		log.Error("downloaded file is empty")
		return t.failAndCleanupFile(model.NewInternalServerError("downloaded file is empty"))
	}
	if size != t.contentLength {
		log.Error("downloaded file size does not match expected size: ", size, " != ", t.contentLength)
		return t.failAndCleanupFile(model.NewInternalServerError("downloaded file size mismatch"))
	}

	s, err := dao.GetStorage(t.storageID)
	if err != nil {
		log.Error("failed to get storage: ", err)
		return t.failAndCleanupFile(model.NewInternalServerError("failed to get storage"))
	}
	iStorage := storage.NewStorage(s)
	if iStorage == nil {
		log.Error("failed to find storage")
		return t.failAndCleanupFile(model.NewInternalServerError("failed to find storage"))
	}
	storageKey, err := iStorage.Upload(tempPath, t.filename)
	if err != nil {
		log.Error("failed to upload file to storage: ", err)
		return t.failAndCleanupFile(model.NewInternalServerError("failed to upload file to storage"))
	}

	if err := dao.SetFileStorageKeyAndSize(t.fileUUID, storageKey, size, hash); err != nil {
		log.Error("failed to set file storage key: ", err)
		_ = iStorage.Delete(storageKey)
		return t.failAndCleanupFile(model.NewInternalServerError("failed to set file storage key"))
	}
	if err := dao.AddStorageUsage(t.storageID, size); err != nil {
		log.Error("failed to add storage usage: ", err)
		_ = dao.DeleteFile(t.fileUUID)
		_ = iStorage.Delete(storageKey)
		return t.fail(model.NewInternalServerError("failed to add storage usage"))
	}

	t.downloadedBytes.Store(t.contentLength)
	t.finishWith(TaskStatusCompleted, nil)
	return nil
}

func (t *ServerDownloadTask) Progress() float64 {
	if t.contentLength <= 0 {
		return 0
	}
	progress := float64(t.downloadedBytes.Load()) / float64(t.contentLength)
	if progress < 0 {
		return 0
	}
	if progress > 1 {
		return 1
	}
	return progress
}

func (t *ServerDownloadTask) Status() TaskStatus {
	t.mu.RLock()
	defer t.mu.RUnlock()
	return t.status
}

func (t *ServerDownloadTask) Error() error {
	t.mu.RLock()
	defer t.mu.RUnlock()
	return t.err
}

func (t *ServerDownloadTask) Stop() {
	if t.isTerminal() {
		return
	}
	t.cancel()
	_ = t.failAndCleanupFile(model.NewRequestError("task stopped"))
}

func (t *ServerDownloadTask) FinishTime() time.Time {
	t.mu.RLock()
	defer t.mu.RUnlock()
	return t.finishTime
}

func (t *ServerDownloadTask) setRunning() bool {
	t.mu.Lock()
	defer t.mu.Unlock()
	if t.status != TaskStatusPending {
		return false
	}
	t.status = TaskStatusRunning
	return true
}

func (t *ServerDownloadTask) finishWith(status TaskStatus, err error) {
	t.mu.Lock()
	defer t.mu.Unlock()
	if t.status == TaskStatusCompleted || t.status == TaskStatusFailed {
		return
	}
	t.status = status
	t.err = err
	t.finishTime = time.Now()
}

func (t *ServerDownloadTask) fail(err error) error {
	t.finishWith(TaskStatusFailed, err)
	return err
}

func (t *ServerDownloadTask) failAndCleanupFile(err error) error {
	if t.isTerminal() {
		return nil
	}
	_ = dao.DeleteFile(t.fileUUID)
	return t.fail(err)
}

func (t *ServerDownloadTask) handleCanceled() error {
	return t.failAndCleanupFile(model.NewRequestError("task stopped"))
}

func (t *ServerDownloadTask) isTerminal() bool {
	t.mu.RLock()
	defer t.mu.RUnlock()
	return t.status == TaskStatusCompleted || t.status == TaskStatusFailed
}

func (t *ServerDownloadTask) watchFileDeletion() {
	ticker := time.NewTicker(10 * time.Second)
	defer ticker.Stop()
	for {
		select {
		case <-t.ctx.Done():
			return
		case <-ticker.C:
			if _, err := dao.GetFileByID(t.fileID); err != nil {
				log.Info("File deleted by user, stopping download task: ", t.fileUUID)
				t.cancel()
				return
			}
		}
	}
}

func downloadFileWithProgress(ctx context.Context, url string, path string, onProgress func(downloaded int64)) (string, error) {
	if _, err := os.Stat(path); err == nil {
		_ = os.Remove(path)
	}

	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return "", model.NewRequestError("failed to create HTTP request")
	}

	client := http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		if ctx.Err() != nil {
			return "", context.Canceled
		}
		return "", model.NewRequestError("failed to send HTTP request")
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", model.NewRequestError("URL is not accessible, status code: " + resp.Status)
	}

	file, err := os.OpenFile(path, os.O_CREATE|os.O_WRONLY, os.ModePerm)
	if err != nil {
		return "", model.NewInternalServerError("failed to open file for writing")
	}
	defer file.Close()

	writer := bufio.NewWriter(file)
	h := md5.New()

	buf := make([]byte, 64*1024)
	var downloaded int64
	for {
		select {
		case <-ctx.Done():
			return "", context.Canceled
		default:
			n, readErr := resp.Body.Read(buf)
			if n > 0 {
				if _, writeErr := writer.Write(buf[:n]); writeErr != nil {
					return "", model.NewInternalServerError("failed to write to file")
				}
				if _, hashErr := h.Write(buf[:n]); hashErr != nil {
					return "", model.NewInternalServerError("failed to calculate md5")
				}
				downloaded += int64(n)
				if onProgress != nil {
					onProgress(downloaded)
				}
			}
			if readErr != nil {
				if readErr == io.EOF {
					if err := writer.Flush(); err != nil {
						return "", model.NewInternalServerError("failed to flush writer")
					}
					return hex.EncodeToString(h.Sum(nil)), nil
				}
				if ctx.Err() != nil {
					return "", context.Canceled
				}
				return "", model.NewInternalServerError("failed to read response body")
			}
		}
	}
}
