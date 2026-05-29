package task

import (
	"archive/zip"
	"bufio"
	"context"
	"crypto/md5"
	"encoding/hex"
	"errors"
	"io"
	"net/http"
	"nysoure/server/config"
	"nysoure/server/dao"
	"nysoure/server/model"
	"nysoure/server/storage"
	"nysoure/server/utils"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"github.com/cenkalti/rain/v2/torrent"
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
	useBT         bool

	ctx    context.Context
	cancel context.CancelFunc

	downloadedBytes atomic.Int64
	totalBytes      atomic.Int64
	accountedBytes  atomic.Int64

	mu         sync.RWMutex
	status     TaskStatus
	err        error
	finishTime time.Time
}

func NewServerDownloadTask(fileID uint, fileUUID, url, filename string, storageID uint, contentLength int64, useBT bool) *ServerDownloadTask {
	ctx, cancel := context.WithCancel(context.Background())
	t := &ServerDownloadTask{
		id:            uuid.NewString(),
		fileID:        fileID,
		fileUUID:      fileUUID,
		url:           url,
		filename:      filename,
		storageID:     storageID,
		contentLength: contentLength,
		useBT:         useBT,
		ctx:           ctx,
		cancel:        cancel,
		status:        TaskStatusPending,
	}
	t.totalBytes.Store(contentLength)
	t.accountedBytes.Store(contentLength)
	return t
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
		if accounted := t.accountedBytes.Load(); accounted > 0 {
			_ = dao.UpdateStatistic("uploading_size", -accounted)
		}
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

	var (
		hash     string
		uploaded = tempPath
		err      error
	)

	if t.useBT {
		hash, uploaded, err = t.downloadByBT(tempDir, tempPath)
		if err != nil {
			if errors.Is(err, context.Canceled) {
				return t.handleCanceled()
			}
			log.Error("failed to download by BT: ", err)
			return t.failAndCleanupFile(err)
		}
	} else {
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
	}

	if err := t.ctx.Err(); err != nil {
		return t.handleCanceled()
	}

	stat, err := os.Stat(uploaded)
	if err != nil {
		log.Error("failed to get temp file info: ", err)
		return t.failAndCleanupFile(model.NewInternalServerError("failed to get temp file info"))
	}
	size := stat.Size()
	if size == 0 {
		log.Error("downloaded file is empty")
		return t.failAndCleanupFile(model.NewInternalServerError("downloaded file is empty"))
	}
	expected := t.totalBytes.Load()
	if !t.useBT && expected > 0 && size != expected {
		log.Error("downloaded file size does not match expected size: ", size, " != ", expected)
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
	storageKey, err := iStorage.Upload(uploaded, t.filename)
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

	if total := t.totalBytes.Load(); total > 0 {
		t.downloadedBytes.Store(total)
	} else {
		t.downloadedBytes.Store(size)
	}
	t.finishWith(TaskStatusCompleted, nil)
	return nil
}

func (t *ServerDownloadTask) downloadByBT(tempDir, outputPath string) (hash, uploadPath string, err error) {
	btRoot := filepath.Join(tempDir, "bt-"+uuid.NewString())
	if err = os.MkdirAll(btRoot, os.ModePerm); err != nil {
		return "", "", model.NewInternalServerError("failed to create bt temp dir")
	}
	defer func() {
		if rmErr := os.RemoveAll(btRoot); rmErr != nil && !errors.Is(rmErr, os.ErrNotExist) {
			log.Error("failed to remove bt temp dir: ", rmErr)
		}
	}()

	cfg := torrent.DefaultConfig
	cfg.Database = filepath.Join(btRoot, "session.db")
	cfg.DataDir = filepath.Join(btRoot, "data")
	cfg.DataDirIncludesTorrentID = true
	cfg.ResumeOnStartup = false
	cfg.RPCEnabled = false

	ses, err := torrent.NewSession(cfg)
	if err != nil {
		return "", "", model.NewInternalServerError("failed to create bt session")
	}
	defer ses.Close()

	tor, err := ses.AddURI(t.url, &torrent.AddTorrentOptions{
		StopAfterDownload: false,
	})
	if err != nil {
		return "", "", model.NewRequestError("failed to add bt torrent")
	}

	stopC := tor.NotifyStop()
	completeC := tor.NotifyComplete()
	ticker := time.NewTicker(time.Second)
	defer ticker.Stop()

	completed := false
	for !completed {
		select {
		case <-t.ctx.Done():
			_ = tor.Stop()
			return "", "", context.Canceled
		case stopErr := <-stopC:
			if stopErr != nil {
				return "", "", model.NewInternalServerError("bt torrent stopped unexpectedly")
			}
			if !completed {
				return "", "", model.NewInternalServerError("bt torrent stopped before completion")
			}
		case <-completeC:
			completed = true
		case <-ticker.C:
			stats := tor.Stats()
			if stats.Bytes.Total > 0 {
				if err := t.syncUploadingSize(stats.Bytes.Total); err != nil {
					_ = tor.Stop()
					return "", "", err
				}
				t.totalBytes.Store(stats.Bytes.Total)
			}
			t.downloadedBytes.Store(stats.Bytes.Completed)
		}
	}

	stats := tor.Stats()
	if stats.Bytes.Total > 0 {
		if err := t.syncUploadingSize(stats.Bytes.Total); err != nil {
			return "", "", err
		}
		t.totalBytes.Store(stats.Bytes.Total)
	}
	t.downloadedBytes.Store(stats.Bytes.Completed)

	if seedFor := btSeedingDuration(); seedFor > 0 {
		seedTimer := time.NewTimer(seedFor)
		select {
		case <-t.ctx.Done():
			seedTimer.Stop()
			_ = tor.Stop()
			return "", "", context.Canceled
		case <-seedTimer.C:
		}
	}

	_ = tor.Stop()
	select {
	case <-time.After(10 * time.Second):
	case <-stopC:
	}

	files, err := tor.Files()
	if err != nil {
		return "", "", model.NewInternalServerError("failed to list bt files")
	}
	if len(files) == 0 {
		return "", "", model.NewInternalServerError("bt torrent has no files")
	}

	torrentDir := filepath.Join(cfg.DataDir, tor.ID())
	if len(files) == 1 {
		singlePath := filepath.Join(torrentDir, filepath.FromSlash(files[0].Path()))
		if err := copyFile(singlePath, outputPath); err != nil {
			return "", "", model.NewInternalServerError("failed to prepare bt single file")
		}
		hash, err = fileMD5(outputPath)
		if err != nil {
			return "", "", model.NewInternalServerError("failed to calculate bt file md5")
		}
		return hash, outputPath, nil
	}

	if err := zipTorrentFiles(outputPath, torrentDir, files); err != nil {
		return "", "", model.NewInternalServerError("failed to pack bt files")
	}
	hash, err = fileMD5(outputPath)
	if err != nil {
		return "", "", model.NewInternalServerError("failed to calculate bt archive md5")
	}
	return hash, outputPath, nil
}

func zipTorrentFiles(zipPath, rootDir string, files []torrent.File) error {
	f, err := os.Create(zipPath)
	if err != nil {
		return err
	}
	defer f.Close()

	zw := zip.NewWriter(f)

	for _, file := range files {
		relPath := filepath.ToSlash(file.Path())
		if relPath == "" {
			continue
		}
		relPath = strings.TrimPrefix(relPath, "/")
		if strings.Contains(relPath, "..") {
			return errors.New("invalid torrent file path")
		}
		srcPath := filepath.Join(rootDir, filepath.FromSlash(file.Path()))
		sf, err := os.Open(srcPath)
		if err != nil {
			return err
		}

		w, err := zw.Create(relPath)
		if err != nil {
			sf.Close()
			return err
		}
		if _, err := io.Copy(w, sf); err != nil {
			sf.Close()
			return err
		}
		if err := sf.Close(); err != nil {
			return err
		}
	}
	return zw.Close()
}

func fileMD5(path string) (string, error) {
	f, err := os.Open(path)
	if err != nil {
		return "", err
	}
	defer f.Close()

	h := md5.New()
	if _, err := io.Copy(h, f); err != nil {
		return "", err
	}
	return hex.EncodeToString(h.Sum(nil)), nil
}

func copyFile(src, dst string) error {
	in, err := os.Open(src)
	if err != nil {
		return err
	}
	defer in.Close()

	out, err := os.OpenFile(dst, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, 0o644)
	if err != nil {
		return err
	}
	defer out.Close()

	if _, err := io.Copy(out, in); err != nil {
		return err
	}
	return out.Sync()
}

func btSeedingDuration() time.Duration {
	v := strings.TrimSpace(os.Getenv("BT_SEED_DURATION"))
	if v == "" {
		return 0
	}
	d, err := time.ParseDuration(v)
	if err != nil {
		log.Warnf("invalid BT_SEED_DURATION %q, fallback to default 0", v)
		return 0
	}
	if d < 0 {
		log.Warn("BT_SEED_DURATION cannot be negative, fallback to 0")
		return 0
	}
	return d
}

func (t *ServerDownloadTask) syncUploadingSize(total int64) error {
	if total <= 0 {
		return nil
	}

	accounted := t.accountedBytes.Load()
	if accounted == total {
		return nil
	}

	delta := total - accounted
	if delta > 0 {
		currentUploadingSize := dao.GetStatistic("uploading_size")
		if currentUploadingSize+delta > config.MaxUploadingSize() {
			return model.NewRequestError("server is busy, please try again later")
		}
	}

	if err := dao.UpdateStatistic("uploading_size", delta); err != nil {
		return model.NewInternalServerError("failed to update uploading size")
	}
	t.accountedBytes.Store(total)
	return nil
}

func (t *ServerDownloadTask) Progress() float64 {
	total := t.totalBytes.Load()
	if total <= 0 {
		return 0
	}
	progress := float64(t.downloadedBytes.Load()) / float64(total)
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
