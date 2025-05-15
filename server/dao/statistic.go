package dao

import "nysoure/server/model"

func SetStatistic(key string, value int64) error {
	statistic := &model.Statistic{
		Key:   key,
		Value: value,
	}
	if err := db.Save(statistic).Error; err != nil {
		return err
	}
	return nil
}

func GetStatistic(key string) int64 {
	statistic := &model.Statistic{}
	if err := db.Where(&model.Statistic{
		Key: key,
	}).First(statistic).Error; err != nil {
		return 0
	}
	return statistic.Value
}
