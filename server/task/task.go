package task

import (
	"sync"
	"time"
)

type TaskStatus string

const (
	TaskStatusPending   TaskStatus = "pending"
	TaskStatusRunning   TaskStatus = "running"
	TaskStatusCompleted TaskStatus = "completed"
	TaskStatusFailed    TaskStatus = "failed"
)

type Task interface {
	ID() string
	Run() error
	Progress() float64
	Status() TaskStatus
	Error() error
	Stop()
	FinishTime() time.Time
}

var (
	tasks   = make(map[string]Task)
	tasksMu sync.RWMutex
)

func RegisterTask(task Task) {
	tasksMu.Lock()
	defer tasksMu.Unlock()
	tasks[task.ID()] = task
}

func GetTask(id string) (Task, bool) {
	tasksMu.RLock()
	defer tasksMu.RUnlock()
	task, exists := tasks[id]
	return task, exists
}

func StopTask(id string) {
	tasksMu.RLock()
	task, exists := tasks[id]
	tasksMu.RUnlock()

	if exists {
		task.Stop()
	}
}

func GetAllTasks() []Task {
	tasksMu.RLock()
	defer tasksMu.RUnlock()
	allTasks := make([]Task, 0, len(tasks))
	for _, task := range tasks {
		allTasks = append(allTasks, task)
	}
	return allTasks
}

func CleanupTasks() {
	tasksMu.Lock()
	defer tasksMu.Unlock()
	for id, task := range tasks {
		if task.Status() == TaskStatusCompleted || task.Status() == TaskStatusFailed {
			if time.Since(task.FinishTime()) > 24*time.Hour {
				delete(tasks, id)
			}
		}
	}
}

func init() {
	go func() {
		ticker := time.NewTicker(1 * time.Hour)
		defer ticker.Stop()
		for {
			select {
			case <-ticker.C:
				CleanupTasks()
			}
		}
	}()
}
