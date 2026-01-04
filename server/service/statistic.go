package service

import (
	"fmt"
	"nysoure/server/dao"
	"nysoure/server/utils"
	"os"
	"time"
)

type Statistic struct {
	TotalResources int64 `json:"total_resources"`
	TotalFiles     int64 `json:"total_files"`
	StartTime      int64 `json:"start_time"`
}

var (
	startTime int64
	statCache = utils.NewMemValueCache[*Statistic](1 * time.Minute)
)

func init() {
	timeFile := utils.GetStoragePath() + "/.start_time"
	if _, err := os.Stat(timeFile); os.IsNotExist(err) {
		startTime = time.Now().Unix()
		str := fmt.Sprintf("%d", startTime)
		err := os.WriteFile(timeFile, []byte(str), 0644)
		if err != nil {
			panic("Failed to write start time file: " + err.Error())
		}
	} else {
		data, err := os.ReadFile(timeFile)
		if err != nil {
			panic("Failed to read start time file: " + err.Error())
		}
		var t int64
		_, err = fmt.Sscanf(string(data), "%d", &t)
		if err != nil {
			panic("Failed to parse start time: " + err.Error())
		}
		startTime = t
	}
}

func getStatistic() (*Statistic, error) {
	totalResources, err := dao.CountResources()
	if err != nil {
		return nil, err
	}
	totalFiles, err := dao.CountFiles()
	if err != nil {
		return nil, err
	}
	return &Statistic{
		TotalResources: totalResources,
		TotalFiles:     totalFiles,
		StartTime:      startTime,
	}, nil
}

func GetStatistic() (*Statistic, error) {
	return statCache.Get(getStatistic)
}
